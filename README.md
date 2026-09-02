# Glamouröser Kleiderschrank-Manager

Ein eleganter Kleiderschrank-Manager im Hollywood-Stil. Benutzer registrieren sich,
verwalten Kleidungsstücke mit Bildern und Kategorien, durchstöbern ihre Garderobe
und kombinieren Einzelteile im Outfit-Creator zu gespeicherten Outfits.

## Tech-Stack

- **Backend**: Python (FastAPI)
- **Frontend**: React + Vite
- **Datenbank**: SQLite
- **Auth**: JWT
- **Bildspeicherung**: lokales Upload-Verzeichnis

## Installation

```bash
cd backend
python -m pip install -r requirements.txt
```

## Ausführen (Entwicklung)

```bash
cd backend
# Optional: Konfiguration aus der Vorlage übernehmen (sonst gelten die Defaults)
# Windows:  copy .env.example .env
# Linux/macOS: cp .env.example .env
python -m uvicorn app.main:app --port 8000
```

Der Server startet unter `http://localhost:8000` und legt die SQLite-Datenbank
(`wardrobe.db`) sowie das Upload-Verzeichnis (`uploads/`) automatisch an. Die
Tabellen werden beim Start automatisch erstellt.

## Konfiguration

Die Konfiguration erfolgt über Umgebungsvariablen (optional über eine `.env`-Datei
im `backend/`-Verzeichnis; eine Vorlage liegt als `backend/.env.example` bei).

| Variable        | Standard                 | Beschreibung                          |
| --------------- | ------------------------ | ------------------------------------- |
| `DATABASE_URL`  | `sqlite:///./wardrobe.db` | Datenbank-URL                        |
| `JWT_SECRET`    | (zufällig erzeugt)       | Signaturschlüssel für JWTs; erzeugen mit `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | `HS256`                  | Signatur-Algorithmus                  |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Erlaubte CORS-Origin des Frontends   |
| `UPLOAD_DIR`    | `./uploads`              | Verzeichnis für hochgeladene Bilder   |
| `MAX_UPLOAD_MB` | `5`                      | Maximale Upload-Größe in MB          |

`JWT_SECRET` wird beim Start zufällig erzeugt, wenn er nicht gesetzt ist.

## API

Alle Endpunkte liegen unter `/api`. Fehlerantworten haben die Form `{"detail": str}`.
Authentifizierung erfolgt über `Authorization: Bearer <JWT>`.

### Auth

- `POST /api/auth/register` — `{email, password}` → `201 {access_token, token_type, user}` | `409`
- `POST /api/auth/login` — `{email, password}` → `200 {access_token, token_type, user}` | `401`
- `POST /api/auth/logout` → `204`
- `GET /api/auth/me` → `200 {id, email}` | `401`
- `DELETE /api/account` → `204` | `401`

### Kleidungsstücke (Items)

- `GET /api/items?category=&color=` → `200 [ItemOut]` | `401`
- `POST /api/items` (multipart: `name`, `category`, `color`, `image`) → `201 ItemOut` | `401|422`
- `GET /api/items/{item_id}` → `200 ItemOut` | `401|404`
- `PATCH /api/items/{item_id}` (multipart, optional) → `200 ItemOut` | `401|404`
- `DELETE /api/items/{item_id}` → `204` | `401|404`
- `GET /api/items/{item_id}/image` → Bild-Bytes (jpeg/png/webp) | `401|404`

### Outfits

- `GET /api/outfits` → `200 [OutfitOut]` | `401`
- `POST /api/outfits` — `{name, item_ids}` → `201 OutfitOut` | `401|422`
- `GET /api/outfits/{outfit_id}` → `200 OutfitOut` | `401|404`
- `PATCH /api/outfits/{outfit_id}` — `{name?, item_ids?}` → `200 OutfitOut` | `401|404`
- `DELETE /api/outfits/{outfit_id}` → `204` | `401|404`

### Datenformen

- `ItemOut` = `{id, name, category, color, image_url}` (Kategorien: `oberteil|hose|kleid|schuhe|accessoire`)
- `OutfitOut` = `{id, name, items: [ItemOut]}`
- `user` = `{id, email}`

## Features

- Registrierung und Anmeldung (JWT)
- Garderobe mit Bildern, Kategorien und Farben, filterbar
- Kleidungsstücke anlegen, bearbeiten und löschen
- Outfit-Creator zum Zusammenstellen gespeicherter Outfits
- Kontolöschung inkl. aller zugehörigen Daten
