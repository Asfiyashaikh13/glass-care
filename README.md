# Glass Care Estimates

## Run the fully local AI chatbot

The assistant uses Ollama on this computer. Chats are sent to the local Ollama service, not to a cloud AI provider. No API key is required. The first model download needs internet; after it is downloaded, chatting can work offline.

Sqft amounts use exact dimensions (no 76.2 mm rounding). Each item has an editable discount, defaulting to 10%, applied to its base amount before GST: `area × rate × (1 − discount/100)`.

1. Install Ollama for Linux using the official instructions: <https://ollama.com/download/linux>.
2. Open a terminal and download the default model once: `ollama pull llama3.2:1b`.
3. Start Ollama if it did not start automatically: `ollama serve`.
4. In another terminal, from this project folder, run: `python3 server.py`.
5. Open <http://127.0.0.1:8000> (do not open `index.html` as a `file://` page). The chat header should say `Local AI · llama3.2:1b`.

If you already have a different Ollama model, set `LOCAL_MODEL` in `.env` to its installed name. `ollama list` shows installed models. The 1B model is selected to be lighter on this CPU-only computer; larger models may answer better but will be slower and need more memory.

To stop the web server, press Ctrl+C in its terminal. Ollama may continue running as a background service.
