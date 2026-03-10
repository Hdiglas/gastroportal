# Deployment – Gastroportal

## Automatisches Image-Build (Docker Hub)

Bei jedem Push auf `main` oder `master` wird das Docker-Image automatisch gebaut und nach **Docker Hub** gepusht.

- **Image:** `hdiglas/gastroportal:latest`
- GitHub Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

## Git einrichten (falls noch nicht geschehen)

```bash
git init
git remote add origin https://github.com/Hdiglas/gastroportal.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

## Voraussetzungen

- Server: **192.168.1.153** (gleicher Host wie PostgreSQL)
- GitHub Repo: https://github.com/Hdiglas/gastroportal.git
- Docker + Docker Compose auf dem Server

---

## Ugreen NAS – Nur YAML + Image (empfohlen)

1. **docker-compose.ghcr.yml** auf die NAS kopieren (Pfad: `/volume1/docker/gastroportal/docker-compose.yaml`)
2. In der YAML: `image: hdiglas/gastroportal:latest` (Docker Hub)
3. Projekt erstellen → **Importieren** oder Inhalt einfügen → **Bereitstellen**

Das Image wird von Docker Hub gezogen. Bei Updates: **Projekt stoppen → `sudo docker pull hdiglas/gastroportal:latest` → Starten**.

---

## 1. Server vorbereiten (SSH-Deploy, optional)

### Auf 192.168.1.153 ausführen:

```bash
# Projekt klonen
cd /opt   # oder ~
git clone https://github.com/Hdiglas/gastroportal.git
cd gastroportal

# .env erstellen (DATABASE_URL etc.)
cat > .env << 'EOF'
DATABASE_URL=postgresql://hdiglas:sadkjsd7826387%21%21%21%40askgdlj%2F%2F%26%25@192.168.1.153:44391/Master?schema=public
ENCRYPTION_SECRET=gastromail-change-this-secret-in-production
EOF

# Optional: Erstes Build manuell testen
docker compose up -d --build
```

**Pfad notieren** (z.B. `/opt/gastroportal` oder `/home/user/gastroportal`) – wird als `DEPLOY_PATH` in GitHub benötigt.

---

## 2. SSH-Key für GitHub Actions

### Neuen Key erzeugen (lokal oder auf einem beliebigen Rechner):

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key -N ""
```

### Public Key auf den Server legen:

```bash
# deploy_key.pub Inhalt auf Server schreiben
ssh dein-user@192.168.1.153 "mkdir -p ~/.ssh && echo 'INHALT_VON_deploy_key.pub' >> ~/.ssh/authorized_keys"
```

### Private Key als GitHub Secret speichern:

1. GitHub → Repo **gastroportal** → Settings → Secrets and variables → Actions
2. **New repository secret**
3. Name: `SSH_PRIVATE_KEY`
4. Wert: kompletter Inhalt von `deploy_key` (inkl. `-----BEGIN...` und `-----END...`)

---

## 3. GitHub Secrets setzen

Unter **Settings → Secrets and variables → Actions** diese Secrets anlegen:

| Secret          | Wert                         | Beispiel                    |
|-----------------|------------------------------|-----------------------------|
| `DEPLOY_HOST`   | IP oder Hostname des Servers | `192.168.1.153`            |
| `DEPLOY_USER`   | SSH-Benutzername             | `admin` oder dein User      |
| `DEPLOY_PATH`   | Pfad zum Projekt auf dem Server | `/opt/gastroportal`      |
| `SSH_PRIVATE_KEY` | Private Key (siehe oben)   | `-----BEGIN OPENSSH...`     |

---

## 4. Ablauf bei jedem Push

1. Du pusht auf `main` oder `master`
2. GitHub Actions startet den Deploy-Job
3. Per SSH wird auf dem Server ausgeführt:
   - `cd DEPLOY_PATH`
   - `git pull`
   - `docker compose up -d --build`
4. App läuft unter **http://192.168.1.153:3000**

---

## 5. Manuelles Deploy

Falls du ohne Push deployen willst:

```bash
ssh user@192.168.1.153
cd /opt/gastroportal
git pull
docker compose up -d --build
```

---

## Troubleshooting

- **"Permission denied"** → `authorized_keys` und Berechtigungen von `~/.ssh` prüfen
- **"cd: no such directory"** → `DEPLOY_PATH` stimmt nicht mit dem tatsächlichen Pfad überein
- **"docker: command not found"** → Docker für den Deploy-User zugänglich machen (z.B. in docker-Gruppe)
