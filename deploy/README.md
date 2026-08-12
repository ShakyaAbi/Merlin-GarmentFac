# MERLIN deploy directory

This folder contains a simple Docker Compose layout and helper scripts to deploy MERLIN Lite to a VPS.

Quick checklist before first deploy

- Copy `deploy/api.env.example` to `deploy/api.env` and fill secrets (especially `JWT_SECRET` and `DATABASE_URL`).
- Copy `deploy/web.env.example` to `deploy/web.env`; the default `/api/v1` uses the deploy nginx same-origin proxy.
- If you serve the app from a subpath like `/merlin/`, also set `VITE_BASE_URL=/merlin/`.
- Copy `deploy/api.env.example` to `deploy/api.env` and set `APP_URL` to the public frontend URL (e.g. `http://YOUR_VPS_IP` or `https://example.com/merlin`).
- If you use Google OAuth, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_AUTH_REDIRECT_URI`.
- Put the repo on the VPS at the chosen path (example `/srv/merlin`).

First-time server setup (example for Ubuntu):

```bash
# on the VPS
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Deploy flow (manual):

```bash
# on VPS, assuming repo at /srv/merlin
cd /srv/merlin
cp deploy/api.env.example deploy/api.env   # edit values
cp deploy/web.env.example deploy/web.env   # edit values
./deploy/deploy.sh /srv/merlin
```

GitHub Actions: A workflow template is included at `.github/workflows/deploy.yml`. Add secrets in the repo settings:
- `VPS_HOST` — your server IP
- `VPS_USER` — SSH user (e.g., `deploy`)
- `VPS_SSH_KEY` — private key for that user
- `VPS_SSH_PORT` — optional (defaults to 22)
- `VPS_REPO_PATH` — path to repository on the VPS (e.g. `/srv/merlin`)

Notes:
- This setup prefers host-driven web builds (the workflow or deploy script builds `apps/web` on the VPS) so the `nginx` container serves the static `dist/` directory directly — updating `dist/` does not require restarting the nginx container.
- The API runs from an immutable Docker image and is restarted by Compose after a successful build and migration.
- The MySQL migration baseline is for a fresh MySQL database. Back up any existing data before changing database providers.

Host nginx integration (safe path-based proxy)
--------------------------------------------
If you already run nginx on the host (for example `geiglobal.org`) and want MERLIN served under a path like `/merlin/` without interrupting the existing site, do the following:

1. Ensure MERLIN's web container is bound to localhost only (deploy/docker-compose.yml uses `127.0.0.1:8080:80`). This prevents direct external access to port 8080.

2. Set the frontend API base in `deploy/web.env` before building on the VPS:

```bash
cp deploy/web.env.example deploy/web.env
# edit deploy/web.env and ensure:
# VITE_API_BASE_URL=/merlin/api/v1
```

3. Add this snippet inside your existing `server { listen 443 ssl; ... }` block for `geiglobal.org` (place it before the generic `location /` block):

```
	# MERLIN application served under /merlin/ (proxy to locally-bound container)
	location = /merlin {
		return 301 $scheme://$host$uri/;
	}

	location ^~ /merlin/ {
		proxy_pass http://127.0.0.1:8080/;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;

		proxy_connect_timeout 60s;
		proxy_send_timeout 60s;
		proxy_read_timeout 90s;

		proxy_buffering on;
		proxy_buffer_size 8k;
		proxy_buffers 16 8k;
		proxy_busy_buffers_size 16k;
	}
```

4. Reload nginx config and redeploy MERLIN:

```bash
sudo nginx -t && sudo systemctl reload nginx
cd /srv/merlin
./deploy/deploy.sh /srv/merlin
```

5. Verify:

```bash
# site
https://geiglobal.org/merlin/

# API (from host)
curl -vk https://geiglobal.org/merlin/api/v1/health
```

Notes:
- Using a path (`/merlin/`) keeps your existing virtual host and certificates intact.
- Binding the MERLIN container to `127.0.0.1:8080` prevents accidental public exposure of the container port.
- If you prefer a subdomain (e.g., `merlin.geiglobal.org`), add a separate `server` block and a DNS A record, and proxy to `127.0.0.1:8080` the same way.
