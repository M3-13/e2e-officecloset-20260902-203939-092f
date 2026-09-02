VERDICT: CHANGES_REQUESTED

## Sicherheitsanalyse (manuell)

Die Scanner `bandit` und `semgrep` sind nicht gelaufen (`[skipped]`). Daher liegen keine automatisierten Befunde zu Abhängigkeiten oder SAST vor. Die Beurteilung basiert ausschließlich auf dem sichtbaren Code.

### Zusammenfassung der geprüften Bereiche

- **Secrets:** Keine hartkodierten Passwörter, Token oder Schlüssel gefunden. `jwt_secret` wird aus der Umgebung gelesen und falls leer automatisch mit `secrets.token_hex(32)` erzeugt. `.env` ist in `.gitignore`.
- **Injection & Inputs:** Keine SQL- oder Command-Injection sichtbar – SQLAlchemy ORM mit Parametern. React rendert ohne `dangerouslySetInnerHTML`; kein offensichtliches XSS.
- **AuthN/AuthZ:** Passwörter werden mit bcrypt gehasht. JWT enthält `exp` und wird von `decode_token` geprüft. Garderobe, Bilder und Outfits prüfen konsequent `owner_id` des angemeldeten Benutzers.
- **Dependencies:** Aufgrund fehlender Scanner-Ausgabe nicht abschließend bewertbar. Sichtbare Bibliotheken: `bcrypt`, `PyJWT`, `SQLAlchemy`, `FastAPI`.
- **Configuration/Transport:** CORS ist auf die konfigurierte `frontend_origin` beschränkt, mit `allow_credentials=True` und ohne Wildcard. Kein CSP-Header vorhanden.

---

## Befunde

### 1. Medium — Upload-Größen-/Formatprüfung greift erst nach vollständigem Request-Buffering
- **Betroffene Stelle:** `backend/app/routers/wardrobe.py` (`create_item`, `update_item`), `backend/app/services/images.py` (`validate_image`)
- **Problem:** FastAPI/Starlette parst den Multipart-Body und puffert die hochgeladene Datei in eine `SpooledTemporaryFile`, **bevor** der Endpoint `validate_image` aufruft. Die Größenprüfung in `validate_image` stoppt zwar das endgültige Speichern, aber zu diesem Zeitpunkt wurde der Upload bereits komplett im Speicher bzw. auf der Festplatte zwischengespeichert. Ein Angreifer kann wiederholt sehr große Uploads senden und dadurch Speicher-/Plattenplatz erschöpfen (DoS). Das verletzt AC-11, das eine serverseitige Prüfung **vor** dem vollständigen Puffern fordert.
- **Konkreter Fix:**
  - In `backend/app/main.py` eine ASGI-Middleware ergänzen, die bei vorhandenem `Content-Length`-Header Requests größer als ein konfigurierter Grenzwert (z. B. `settings.max_upload_mb` plus Formular-Overhead) sofort mit `413` ablehnt.
  - Für chunked Transfer-Encoding den Body-Stream beim Lesen begrenzen und bei Überschreitung abbrechen.
  - Alternativ vorgeschalteten Reverse Proxy (z. B. Nginx) mit `client_max_body_size` verwenden; das ist aber keine code-seitige Lösung.

### 2. Low — Bilddateien werden nur anhand von Magic Bytes, nicht vollständig dekodiert
- **Betroffene Stelle:** `backend/app/services/images.py`, Funktion `validate_image`
- **Problem:** Es werden nur die ersten Bytes (`_sniff_mime`) und die Größe geprüft. Eine Datei mit gültigem JPEG/PNG/WebP-Header und beliebigem Binärinhalt wird akzeptiert. Der gesetzte `Content-Type` verhindert die unmittelbare Skriptausführung im Browser, aber fehlerhafte Dateien können Frontend-Fehler verursachen und die Fläche für Weiterverarbeitung vergrößern.
- **Konkreter Fix:** Nach dem Streaming-Speichern oder tempär die Datei mit einer Bildbibliothek (z. B. `Pillow`) öffnen und `Image.verify()` aufrufen. Wichtig: dabei auf Ressourcenverbrauch achten und bereits gestreamte Daten nicht doppelt laden. Alternativ eine Validierungsbibliothek verwenden, die das Bild während des Streamens dekodiert.

### 3. Low — JWT-Token im `localStorage`
- **Betroffene Stelle:** `frontend/src/api/client.js`, `frontend/src/context/AuthContext.jsx`
- **Problem:** Das Bearer-Token wird im `localStorage` gespeichert. Falls es zu einem XSS-Angriff käme, könnte der Token ausgelesen werden. Aktuell ist kein XSS sichtbar, aber `localStorage` ist grundsätzlich anfälliger als `httpOnly`-Cookies.
- **Konkreter Fix:** Langfristig auf `httpOnly`-Cookies mit CSRF-Schutz umstellen. Kurzfristig eine strikte CSP setzen (siehe Finding 4), um das XSS-Risiko zu minimieren. Die API muss bei dieser Umstellung die Tokens über Cookie statt Authorization-Header akzeptieren; CORS-Allow-Origin bleibt auf die feste Frontend-Origin beschränkt.

### 4. Low — Fehlende Content-Security-Policy (CSP)
- **Betroffene Stelle:** `frontend/index.html`, Webserver-Konfiguration
- **Problem:** Es ist keine CSP gesetzt. Der Frontend-Build lädt zwar keine Drittressourcen, aber eine CSP würde das Risiko von XSS-Auswirkungen deutlich reduzieren.
- **Konkreter Fix:** Folgende CSP setzen (angepasst an die tatsächlich genutzten Ressourcen):
  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self';
  ```
  `style-src 'unsafe-inline'` ist nötig, da im Code Inline-Styles verwendet werden. `img-src blob:` ist nötig, weil Bilder als `blob:`-Objekt-URLs angezeigt werden. Die CSP sollte die Funktion des Produkts nicht einschränken.

### 5. Low — E-Mail-Format wird nicht validiert
- **Betroffene Stelle:** `backend/app/schemas.py` (`UserCreate`, `UserLogin`)
- **Problem:** Das Feld `email` ist ein einfacher `str`; es wird keine E-Mail-Validierung oder Längenbegrenzung auf Pydantic-Ebene durchgeführt. Das ist kein direkt ausnutzbares Sicherheitsrisiko, kann aber zu fehlerhaften Daten und späteren Problemen führen.
- **Konkreter Fix:** Pydantic `EmailStr` verwenden (benötigt Paket `email-validator`) und `max_length` passend zum DB-Schema (`String(255)`) setzen.

### 6. Low — Ratenlimit ist in-memory und ignoriert Proxy-IPs
- **Betroffene Stelle:** `backend/app/routers/auth.py`
- **Problem:** Die Rate-Limit-Buckets sind prozessgebunden. Bei mehreren Worker-Prozessen oder Neustarts ist das Limit nicht konsistent. Zudem wird `request.client.host` direkt verwendet; hinter einem Reverse-Proxy sehen alle Clients wie dieselbe IP aus und teilen sich das Limit (oder ein Angreifer kann über wechselnde IPs das Limit teilweise umgehen).
- **Konkreter Fix:** Für Produktion ein externes Limit (z. B. Redis) verwenden oder den Rate-Limit-Mechanismus in den vorgeschalteten Proxy (Nginx/Istio) verlagern. Falls ein Reverse-Proxy genutzt wird, die tatsächliche Client-IP aus vertrauenswürdigen Headern (`X-Forwarded-For`/`X-Real-IP`) auswerten.

---

## Ergebnis

Die Kernanforderungen AC-09 bis AC-17 sind überwiegend erfüllt: Passwort-Hashing, JWT, Zugriffskontrolle, CORS-Beschränkung, Ratenlimit und Rechtshinweise sind vorhanden. Das einzige mittelschwere Problem ist die zu späte Prüfung von Bild-Uploads (Finding 1). Alle übrigen Punkte sind Härtungsempfehlungen mit niedriger Schwere.

Aufgrund des mittleren Befunds wird keine Freigabe ohne Änderungen erteilt.