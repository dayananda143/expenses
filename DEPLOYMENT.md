# Deployment Guide — Expenses Tracker

## Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React + Vite + Tailwind CSS       |
| Backend   | Node.js + Express                 |
| Database  | SQLite (via Node built-in sqlite) |
| Process   | PM2                               |
| Web Server| Nginx (reverse proxy)             |
| Tunnel    | Cloudflare Tunnel (cloudflared)   |

---

## Server Details

- **Host:** Raspberry Pi
- **Domain:** `expenses.money-matriz.co.in`
- **Backend port:** `3002`
- **Frontend dev port:** `5174`
- **Frontend dist:** `frontend/dist/`
- **Database:** `backend/data/expenses.db`
- **Node version:** 24 (managed via nvm)

---

## First-Time Setup

### 1. Clone the repository

```bash
git clone git@github.com:dayananda143/expenses.git
cd expenses
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Create backend environment file

```bash
cp backend/.env.example backend/.env   # or create manually
```

Contents of `backend/.env`:

```
PORT=3002
JWT_SECRET=change_this_to_a_long_random_secret_string
```

> **Important:** Change `JWT_SECRET` to a long random string in production.

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Build the frontend

```bash
cd frontend
bash -c 'unset npm_config_prefix && export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24 && npm run build'
```

Built files are output to `frontend/dist/`.

---

## PM2 — Backend Process Manager

### Start for the first time

```bash
cd backend
pm2 start src/index.js --name expenses-backend
pm2 save
pm2 startup   # enable autostart on reboot
```

### Common PM2 commands

```bash
pm2 status                      # view all processes
pm2 logs expenses-backend       # tail logs
pm2 restart expenses-backend    # restart backend
pm2 stop expenses-backend       # stop backend
```

---

## Nginx Configuration

File: `/etc/nginx/sites-available/expenses`

```nginx
server {
    listen 80;
    server_name expenses.money-matriz.co.in;

    root /home/raspbi/Documents/projects/expenses/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/expenses /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Cloudflare Tunnel

Tunnel routes `expenses.money-matriz.co.in` → `http://localhost:80`.

Config file: `~/.cloudflared/config.yml`

```yaml
tunnel: <tunnel-id>
credentials-file: /home/raspbi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: expenses.money-matriz.co.in
    service: http://localhost:80
  - service: http_status:404
```

Run the tunnel (background):

```bash
cloudflared tunnel run &
```

---

## Deploy Updates (Ongoing)

### Pull latest code

```bash
cd /home/raspbi/Documents/projects/expenses
git pull origin main
```

### Rebuild frontend

```bash
cd frontend
bash -c 'unset npm_config_prefix && export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24 && npm run build'
```

### Restart backend (if backend changed)

```bash
pm2 restart expenses-backend
```

---

## Default Credentials

| Username | Password    | Role  |
|----------|-------------|-------|
| admin    | changeme    | Admin |

> Change the admin password immediately after first login via the Users page.

---

## Local Development

### Backend

```bash
cd backend
npm start
# Runs on http://localhost:3002
```

### Frontend

```bash
cd frontend
bash -c 'unset npm_config_prefix && export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24 && npm run dev'
# Runs on http://localhost:5174
# API proxied to http://localhost:3002
```

---

## Database

SQLite database is stored at `backend/data/expenses.db`.

- **Not tracked in git** (excluded via `.gitignore`)
- Migrations run automatically on backend startup
- Back up by copying the `.db` file

```bash
cp backend/data/expenses.db backend/data/expenses.db.backup
```
