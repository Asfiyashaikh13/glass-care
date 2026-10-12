# VPS deployment (Ubuntu/Debian)

This runs the app and Ollama on the VPS. Chat inference stays on that machine; no external AI API key is used. Use a VPS with at least 8 GB RAM (CPU inference is supported but slower), a public IPv4 address, and a domain/subdomain pointed at that address. Keep ports 8000 and 11434 private; only Caddy should accept public web traffic on 80/443.

## Prerequisites

- Linux VPS with sudo access and a public IP.
- A domain or subdomain whose DNS A record points to the VPS. Allow DNS to propagate.
- Ollama installed and running as `ollama.service`; install using the official Ollama Linux instructions.
- Caddy installed from its official package repository.
- Python 3 available.

## Install app and local model

1. Clone this repository to `/opt/glass-care` and make it readable by the service account. Create the account and configuration directory:

   ```sh
   sudo useradd --system --home /opt/glass-care --shell /usr/sbin/nologin glasscare
   sudo mkdir -p /etc/glass-care
   sudo chown -R root:glasscare /opt/glass-care
   sudo chmod -R g+rX /opt/glass-care
   ```

2. Pull the small local model as the Ollama service user: `sudo -u ollama ollama pull llama3.2:1b`.
3. Install `deploy/glass-care.service` as `/etc/systemd/system/glass-care.service`.
4. Copy `deploy/glass-care.env.example` to `/etc/glass-care/glass-care.env`, review the model name, then secure it: `sudo chown root:glasscare /etc/glass-care/glass-care.env && sudo chmod 640 /etc/glass-care/glass-care.env`.
5. Start the app: `sudo systemctl daemon-reload && sudo systemctl enable --now glass-care`.

## HTTPS and access protection

1. Create a password hash using `caddy hash-password` and choose a strong client password. Keep the plaintext password out of the repository.
2. Copy `deploy/Caddyfile.example` to `/etc/caddy/Caddyfile`; replace `estimate.example.com` with your real domain and the hash placeholder with Caddy's hash output.
3. Ensure DNS points at this VPS and the firewall allows inbound ports 80 and 443. Do not open ports 8000 or 11434.
4. Validate and reload Caddy: `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy`.
5. Send the client the HTTPS domain and the Basic Auth username/password separately. Do not send passwords in a public GitHub issue or commit them.

Check service logs with `sudo journalctl -u glass-care -f`. The browser chatbot status should report `Local AI · llama3.2:1b` after Ollama finishes loading the model.

## Updating after a Git push

On the VPS, pull the latest `main` commit in `/opt/glass-care`, then restart the service: `sudo systemctl restart glass-care`. Keep `/etc/glass-care/glass-care.env` and `/etc/caddy/Caddyfile` outside the Git checkout.
