# Deploy Guide — Vercel (frontend) + Oracle Cloud Free ARM (backend)

Fully free, always-on production setup for ERP-V2.

- **Frontend:** [Vercel](https://vercel.com) (Hobby, $0) — static React SPA
- **Backend:** [Oracle Cloud](https://www.oracle.com/cloud/free/) Always Free ARM VM — Docker Compose runs Django (daphne) + PostgreSQL + Redis + Celery worker/beat + Nginx
- **No expiry:** Vercel Hobby is permanent; Oracle Always Free is permanent.

---

## 1. Backend — Oracle Cloud free ARM VM

### 1.1 Create the instance

1. Sign up at <https://www.oracle.com/cloud/free/> (credit card required for identity verification, **never charged** on Always Free usage).
2. Console → **Compute → Instances → Create instance**.
3. Shape: **VM.Standard.A1.Flex** — set **4 OCPU / 24 GB RAM** (Always Free).
4. Image: **Ubuntu 22.04 LTS (or 24.04)**.
5. Add your **SSH public key**.
6. **Show advanced options → Primary VCN → Security lists → Default security list**, add ingress rules:
   - TCP `80` (HTTP) — source `0.0.0.0/0`
   - TCP `443` (HTTPS) — source `0.0.0.0/0`
   - TCP `22` (SSH) is already open
7. Launch. Note the public IP.

### 1.2 Install Docker

```bash
ssh ubuntu@<YOUR_VM_IP>

sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in (so `docker` works without `sudo`).

### 1.3 Deploy the app

```bash
git clone https://github.com/CodeCortexDigital/ERP-V2-clean.git
cd ERP-V2-clean

cp .env.example .env
# Edit .env — MUST set:
#   SECRET_KEY=<long random string>   (generate: openssl rand -hex 32)
#   DB_PASSWORD=<strong password>
#   ALLOWED_HOSTS=<YOUR_VM_IP>,<your-domain.com>  (or .onrender.com-style hosts)

docker compose up -d --build
```

Wait for the build (2–5 min on first run), then verify:

```bash
curl -s http://localhost/api/v1/health/     # -> {"status":"healthy", ...}
curl -s http://<YOUR_VM_IP>/                # -> serves the SPA
```

> The built SPA uses a **same-origin** API path (`/api/v1/`), and Nginx proxies
> `/api` and `/ws` to the Django backend — so no rebuild is needed when you
> change the domain later.

### 1.4 Create the admin account

```bash
docker compose exec backend python manage.py createsuperuser
```

### 1.5 Updating later

```bash
git pull
docker compose up -d --build
```

---

## 2. Frontend — Vercel (free)

1. Push the repo to GitHub.
2. Vercel → **Add New → Project** → import the repo.
3. Root directory: **`frontend`** (the `frontend/vercel.json` sets Framework=Vite, build=`npm run build`, output=`dist`).
4. Environment variable: `VITE_API_URL=https://<backend-domain>/api/v1/`
   - If you set up HTTPS with a domain (section 3), use `https://yourdomain.com/api/v1/`.
   - Otherwise use the Oracle VM IP: `http://<YOUR_VM_IP>/api/v1/` (works but no TLS; not recommended for production login).
5. **Deploy.** The SPA calls the backend cross-origin; the backend currently sets `CORS_ALLOW_ALL_ORIGINS=True`, so it will work as-is.

---

## 3. HTTPS (free) — Cloudflare Tunnel

Always-On free TLS without opening any extra ports. You need a domain on Cloudflare (free plan).

1. On the VM, install cloudflared:
   ```bash
   sudo apt-get install -y cloudflared
   ```
2. Authenticate and create a tunnel, then run:
   ```bash
   cloudflared tunnel --url http://localhost:80
   ```
   Or use a named tunnel + DNS route to `http://localhost:80` for a permanent public URL on your Cloudflare domain.
3. The nginx container already proxies `/api` and `/ws` (WebSockets) — Cloudflare Tunnel forwards them transparently.
4. Update the Vercel `VITE_API_URL` to `https://yourdomain.com/api/v1/` and re-deploy.

> If you prefer, **Caddy** is a simpler alternative: run it on the VM with your domain and it auto-provisions Let's Encrypt certs in front of `localhost:80`.

---

## 4. Production checklist

- Strong `SECRET_KEY` and `DB_PASSWORD` in the VM `.env` (never commit them).
- Restrict `ALLOWED_HOSTS` and enable HTTPS before using real credentials.
- Once you have S3/R2 keys, set `USE_S3_STORAGE=true` in the VM `.env` for durable media uploads (local volumes otherwise).
- Optional: `EMAIL_*` vars to enable password-reset and notifications.
- Backups: the included `scripts/backup_db.sh` / `backup.sh` work on the VM (point `BACKUP_OUTPUT_DIR` at a persistent path).
