#!/usr/bin/env python3
"""Local static server and Ollama chat proxy for Glass Care."""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
MAX_REQUEST_BYTES = 16_000
MAX_MESSAGE_CHARS = 2_000
DEFAULT_MODEL = "llama3.2:1b"


def load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip("\"'")
        if name and name not in os.environ:
            os.environ[name] = value


def get_model() -> str:
    load_dotenv()
    return os.environ.get("LOCAL_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def get_ollama_models() -> set[str] | None:
    try:
        with urlopen(f"{OLLAMA_URL}/api/tags", timeout=2) as result:
            data = json.loads(result.read())
        return {
            str(item.get("name", ""))
            for item in data.get("models", [])
            if isinstance(item, dict)
        }
    except (URLError, TimeoutError, json.JSONDecodeError, AttributeError):
        return None


def response_bytes(handler: SimpleHTTPRequestHandler, status: int, data: dict) -> None:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


class GlassCareHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            model = get_model()
            installed_models = get_ollama_models()
            model_present = installed_models is not None and model in installed_models
            response_bytes(self, 200, {
                "configured": model_present,
                "running": installed_models is not None,
                "model": model
            })
            return

        requested = self.path.split("?", 1)[0]
        decoded_path = unquote(requested)
        if any(part.startswith(".") for part in Path(decoded_path.lstrip("/")).parts):
            self.send_error(404)
            return
        if decoded_path.rstrip("/") == "/server.py":
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path != "/api/chat":
            response_bytes(self, 404, {"error": "Endpoint not found."})
            return

        model = get_model()
        installed_models = get_ollama_models()
        if installed_models is None:
            response_bytes(self, 503, {
                "error": "Ollama is not running. Install Ollama, start it, then refresh this page."
            })
            return
        if model not in installed_models:
            response_bytes(self, 503, {
                "error": f"Local model '{model}' is not installed. Run `ollama pull {model}` in a terminal, then refresh this page."
            })
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            response_bytes(self, 400, {"error": "Invalid request size."})
            return
        if content_length < 1 or content_length > MAX_REQUEST_BYTES:
            response_bytes(self, 413, {"error": "Message is too large."})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
            messages = payload.get("messages")
            estimate = payload.get("estimate", {})
            if not isinstance(messages, list) or not messages or not isinstance(estimate, dict):
                raise ValueError
            safe_messages = []
            for message in messages[-12:]:
                if not isinstance(message, dict):
                    raise ValueError
                role = message.get("role")
                content = message.get("content")
                if role not in ("user", "assistant") or not isinstance(content, str):
                    raise ValueError
                content = content.strip()
                if not content or len(content) > MAX_MESSAGE_CHARS:
                    raise ValueError
                safe_messages.append({"role": role, "content": content})
            if safe_messages[-1]["role"] != "user":
                raise ValueError
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError, AttributeError):
            response_bytes(self, 400, {"error": "Invalid chat request."})
            return

        allowed_context = (
            "unit", "amount", "area", "rate", "discountPercent", "quantity", "height", "width",
            "state", "subtotal", "gst1Label", "gst1", "gst2Label", "gst2", "total"
        )
        context = {key: str(estimate.get(key, ""))[:120] for key in allowed_context}
        system_prompt = (
            "You are the Glass Care Enterprises assistant in a glass estimate app. Answer only the "
            "user's direct question in at most three short sentences. Do not restate the JSON, list "
            "all fields, or perform calculations unless the user asks. For vague questions such as "
            "'is this correct?', ask what they want checked. Never invent dimensions, prices, or "
            "tax advice; zero dimensions mean no size was entered, not a default size. Treat the "
            "provided numbers as the current form preview, not necessarily as a saved estimate. "
            "When asked how a price was calculated, include the full base amount and discount in "
            "the formula: Sqft amount=(height*width*qty/92903.04)*rate*(1-discountPercent/100), "
            "with exact dimensions and no size rounding; R.ft amount=(2*(height+width)*qty/304.8)"
            "*rate*(1-discountPercent/100); Pcs/Job amount=qty*rate*(1-discountPercent/100). "
            "The default discount is 10%, but the user can edit it per item. Apply discounts before "
            "GST. Never claim to edit "
            "the app; explain how the user can do it. "
            "Current form preview (JSON): "
            + json.dumps(context, ensure_ascii=False)
        )
        request_body = json.dumps({
            "model": model,
            "messages": [{"role": "system", "content": system_prompt}, *safe_messages],
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 220}
        }).encode("utf-8")
        request = Request(
            f"{OLLAMA_URL}/api/chat",
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urlopen(request, timeout=180) as result:
                provider_data = json.loads(result.read())
            reply = provider_data["message"]["content"]
            if not isinstance(reply, str) or not reply.strip():
                raise ValueError("Empty response from local model")
            response_bytes(self, 200, {"reply": reply.strip()})
        except HTTPError as error:
            print(f"Ollama returned HTTP {error.code}", flush=True)
            if error.code == 404:
                response_bytes(self, 503, {"error": f"Local model '{model}' is missing. Run `ollama pull {model}` in a terminal."})
            else:
                response_bytes(self, 502, {"error": "The local model could not complete that request. Check Ollama and try again."})
        except (URLError, TimeoutError):
            response_bytes(self, 502, {"error": "Could not connect to local Ollama. Check that Ollama is running."})
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
            print("Ollama returned an invalid response", flush=True)
            response_bytes(self, 502, {"error": "The local model returned an invalid response."})

    def log_message(self, format: str, *args) -> None:
        # Avoid access logs containing submitted user messages.
        if self.path.startswith("/api/"):
            print(f"{self.address_string()} {format % args}", flush=True)
        else:
            super().log_message(format, *args)


if __name__ == "__main__":
    load_dotenv()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), GlassCareHandler)
    print(f"Glass Care is running at http://127.0.0.1:{port}", flush=True)
    print("Press Ctrl+C to stop the server.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Glass Care server.", flush=True)
    finally:
        server.server_close()
