VERDICT: CHANGES_REQUESTED

Prüfung des vollständig gemergten Produkts „Glamouröser Kleiderschrank-Manager“ auf GDPR-, CRA-, KI-VO-, Pflichttext-/UI- und Barrierefreiheits-Konformität. Bewertet wurde ausschließlich der sichtbare Code-/Spec-Stand.

Zusammenfassung: Die Kernfunktionen und wesentlichen Sicherheitsanforderungen der Acceptance Criteria sind umgesetzt: Passwörter werden mit bcrypt gehasht, Ressourcen werden eigentümerbezogen geprüft, Uploads werden per Magic Bytes und Größenlimit validiert, CORS ist restriktiv, Login/Registrierung sind ratenbegrenzt. Es bestehen jedoch behebbare Rechts- und Sicherheitslücken, die vor einer Auslieferung geschlossen werden müssen.

---

## 1. Datenschutz-Grundverordnung (DSGVO)

### 1.1 Fehlende Selbstbedienung für Betroffenenrechte (Auskunft, Berichtigung, Datenübertragbarkeit)
- **Schweregrad:** hoch
- **Befund:** Die Datenschutzerklärung nennt die Rechte aus Art. 15, 16 und 20 DSGVO, die Anwendung selbst bietet aber nur die Konto-Löschung an. Es fehlen mindestens:
  - ein Endpunkt zum **Auslesen/Exportieren** der eigenen Daten (Art. 15, Art. 20 DSGVO),
  - eine Funktion zum **Ändern der E-Mail-Adresse** (Art. 16 DSGVO),
  - eine Funktion zum **Ändern des Passworts** (Art. 16 DSGVO, Sicherheit).
- **Konkrete Abhilfe:**
  - `backend/app/routers/account.py`: Endpunkte ergänzen, z. B. `GET /api/account/export` (JSON mit Nutzerstammdaten, Kleidungsstücken, Outfits; Bilddaten optional als separater Download) und `PATCH /api/account` für E-Mail-/Passwortänderung.
  - `frontend/src/pages/Account.jsx`: UI-Abschnitte „Daten exportieren“, „E-Mail ändern“, „Passwort ändern“ ergänzen und an die Backend-Endpunkte anbinden.
  - `frontend/src/pages/Privacy.jsx`: Abschnitt 9 um den Hinweis ergänzen, dass diese Rechte auch direkt im Konto ausgeübt werden können.

### 1.2 Passwort-Policy zu schwach
- **Schweregrad:** hoch
- **Befund:** In `backend/app/schemas.py` ist `UserCreate.password` nur `str`, ohne Mindestlängen- oder Komplexitätsvorgabe. Das Backend akzeptiert damit beliebig kurze oder leere Passwörter. Das erhöht das Risiko unbefugter Zugriffe und verletzt den Grundsatz der Integrität und Vertraulichkeit nach Art. 5 Abs. 1 lit. f, Art. 32 DSGVO.
- **Konkrete Abhilfe:**
  - `backend/app/schemas.py`: `password: str = Field(..., min_length=10)` (oder stärker, z. B. 12) ergänzen.
  - `frontend/src/pages/Register.jsx`: korrespondierende Client-Validierung mit verständlicher Fehlermeldung.

### 1.3 Fehlende E-Mail-Validierung
- **Schweregrad:** mittel
- **Befund:** `UserCreate.email` und `UserLogin.email` sind pydantic `str` statt `EmailStr`. Dadurch werden auch syntaktisch ungültige oder unsinnige E-Mail-Adressen als Stammdaten gespeichert; bei Tippfehlern kann der Nutzer sein Konto nicht erreichen. Das betrifft den Grundsatz der Datenrichtigkeit (Art. 5 Abs. 1 lit. d DSGVO).
- **Konkrete Abhilfe:**
  - `backend/app/schemas.py`: `EmailStr` aus `pydantic` verwenden: `email: EmailStr`.
  - `backend/requirements.txt`: `email-validator` ergänzen, da pydantic `EmailStr` diese Bibliothek benötigt.

### 1.4 User-Enumeration bei der Registrierung
- **Schweregrad:** niedrig
- **Befund:** `backend/app/routers/auth.py` liefert bei bereits registrierter E-Mail einen `409 Conflict` mit der Meldung `Email already registered`. Dadurch lässt sich feststellen, ob eine bestimmte E-Mail-Adresse ein Konto hat. Das ist eine vermeidbare Offenlegung personenbezogener Daten gegenüber Dritten.
- **Konkrete Abhilfe:**
  - `backend/app/routers/auth.py`: Antwort für Duplikat und für Erfolg vereinheitlichen, z. B. generische Meldung „Falls diese E-Mail-Adresse bereits registriert ist, melde dich bitte an.“ oder Nutzer per E-Mail informieren. So bleibt die UX erhalten, ohne die Existenz eines Kontos preiszugeben.
  - Alternativ bewusst dokumentieren, dass es sich um eine reine Binnenanwendung handelt, und das Risiko akzeptieren; für ein öffentliches Produkt ist die Vereinheitlichung die konforme Lösung.

### 1.5 Logging / Klartextprüfung / Datenminimierung
- **Schweregrad:** niedrig / Hinweis
- **Befund:** `backend/app/main.py` loggt im Exception-Handler nur Methode und Pfad, keine Request-Bodies, keine Passwörter, keine Token. Die Passwort-Prüfung erfolgt ausschließlich gegen bcrypt-Hash; Klartextpasswörter erscheinen weder in der API-Antwort noch erkennbar in Logs. Das ist DSGVO-konform.
- **Konkrete Abhilfe:** Keine. Schulung/Review sicherstellen, dass auch künftige Log-Statements keine personenbezogenen Daten erfassen.

### 1.6 Inkonsistenz bei Löschung von Bilddateien
- **Schweregrad:** niedrig
- **Befund:** `backend/app/routers/account.py` löscht zuerst den Nutzerdatensatz per `db.delete(user)` + `db.commit()` und erst danach die Bilddateien. Schlägt die Dateilöschung fehl, bleiben verwaiste Bilder zurück, obwohl das Konto bereits gelöscht ist. Das ist vor allem ein Datensparsamkeits-/Löschrestproblem (Art. 17 DSGVO).
- **Konkrete Abhilfe:**
  - `backend/app/routers/account.py` und `backend/app/services/images.py`: Löschung als transaktionsnahen, robusten Ablauf gestalten; z. B. zuerst Dateien löschen, dann DB-Commit; Fehler dabei sammeln und protokollieren. Alternativ einen regelmäßigen Cleanup-Job für verwaiste Dateien vorsehen.

### 1.7 Datenschutzerklärung / tatsächliches Server-Logging
- **Schweregrad:** niedrig
- **Befund:** `frontend/src/pages/Privacy.jsx` beschreibt Zugriffsdaten und Server-Logfiles inklusive IP-Adresse. Im sichtbaren Backend-Code ist jedoch keine eigene Access-Log-Konfiguration enthalten. Wird das Standard-Logging von Uvicorn/Reverse-Proxy verwendet, muss die Datenschutzerklärung mit der tatsächlichen Logging-Konfiguration übereinstimmen.
- **Konkrete Abhilfe:**
  - Deployment-/Serverkonfiguration prüfen; entweder Access-Logging deaktivieren oder die Speicherdauer/Löschfristen in `frontend/src/pages/Privacy.jsx` konkret benennen (z. B. „7 Tage“) und die Log-Rotation entsprechend einrichten.

---

## 2. EU Cyber Resilience Act (CRA)

### 2.1 Unsicherer JWT-Secret-Fallback
- **Schweregrad:** hoch
- **Befund:** `backend/app/config.py` erzeugt bei leerem `jwt_secret` automatisch ein zufälliges Secret (`secrets.token_hex(32)`). In Produktion führt das dazu, dass Token nach jedem Neustart ungültig werden und mehrere Instanzen unterschiedliche Secrets verwenden. Ein solcher stiller Fallback ist nicht „security by default“ und gefährdet die Integrität und Vertraulichkeit der Authentifizierung.
- **Konkrete Abhilfe:**
  - `backend/app/config.py`: `_ensure_jwt_secret` umbauen. Für Produktion (`ENV=prod`) darf kein Zufalls-Fallback erfolgen; stattdessen hart validieren, dass `jwt_secret` gesetzt und ausreichend lang ist (z. B. mindestens 32 Bytes). Den Entwicklungs-Fallback nur für explizite Dev-Modi beibehalten.
  - `backend/.env.example`: `JWT_SECRET` als Pflichtvariable mit Beispiel dokumentieren.

### 2.2 Fehlende Security-Header / Content Security Policy
- **Schweregrad:** hoch
- **Befund:** Das Backend (`backend/app/main.py`) setzt keine sicherheitsrelevanten HTTP-Header. Es fehlen mindestens `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` und `Permissions-Policy`. Dadurch wird z. B. XSS durch gespeicherte Nutzdaten begünstigt; der JWT liegt im `localStorage` und ist ohne CSP leichter durch eingeschleusten Code auslesbar.
- **Konkrete Abhilfe:**
  - `backend/app/main.py`: eine einfache Middleware ergänzen, z. B.:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: same-origin`
    - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
    - `Strict-Transport-Security` (sobald TLS aktiv ist)
  - Zusätzlich CSP konfigurieren, kompatibel mit der Eigenfunktion:
    - `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
  - Wichtig: Die `img-src 'self' blob: data:`-Regel ist erforderlich, weil `AuthImage.jsx` und `Wardrobe.jsx` Bilder per `fetch` laden und als `blob:`-URLs anzeigen. Die `style-src 'unsafe-inline'` ist erforderlich, weil die Anwendung inline Styles verwendet. Die CSP darf die eigene API und die Blob-Bilder nicht blockieren.

### 2.3 Fehlende dokumentierte Sicherheitseigenschaften, SBOM und Update-Prozess
- **Schweregrad:** mittel
- **Befund:** Im sichtbaren Stand sind `SECURITY.md`, ein SBOM-Prozess und eine dokumentierte Schwachstellen-/Patch-Strategie nicht erkennbar. `requirements.txt` und `package-lock.json` sind zwar vorhanden, aber ein reiner Lockfile reicht für die CRA-Anforderungen an ein Produkt mit digitalen Elementen regelmäßig nicht aus.
- **Konkrete Abhilfe:**
  - `README.md` oder neu anzulegende `SECURITY.md`: Support-Zeitraum, Meldeweg für Schwachstellen, Update-/Patch-Zyklus und Sicherheitsannahmen dokumentieren.
  - CI-Pipeline ergänzen: `pip-audit`, `pip freeze --format=cyclonedx > sbom.cdx.json`, `npm audit` / `npm audit signatures`.
  - `backend/requirements.txt` und `frontend/package.json` mit festen, geprüften Versionsständen pflegen und bei Release dokumentieren.

### 2.4 Upload-Validierung
- **Schweregrad:** Hinweis / erfüllt
- **Befund:** `backend/app/services/images.py` prüft Magic Bytes, begrenzt die Größe beim Streaming und speichert Dateien unter kryptografisch zufälligen Namen. Das erfüllt die Anforderungen an „security by design“ für Uploads in diesem Umfang gut.
- **Konkrete Abhilfe:** Keine. Optional zusätzlich eine Bilddekodierung nach dem Speichern, um beschädigte oder manipulierte Bilddateien zu erkennen.

---

## 3. EU KI-Verordnung (AI Act)

- **Befund:** Im sichtbaren Produkt ist keine KI-Funktion enthalten. Der Outfit-Creator ist eine manuelle Auswahl vorhandener Kleidungsstücke. Es gibt keine automatisierte Entscheidungsfindung, kein maschinelles Lernen und keine generative KI.
- **Bewertung:** Der AI Act ist für dieses Produkt derzeit nicht einschlägig.
- **Konkrete Abhilfe:** Keine. Falls später z. B. eine Bildklassifizierung oder Outfit-Empfehlung ergänzt wird, muss vorab eine KI-Risikoklassifizierung erfolgen.

---

## 4. Pflichttexte und UI

### 4.1 Impressum mit Platzhalterdaten
- **Schweregrad:** kritisch für eine Auslieferung
- **Befund:** `frontend/src/pages/Impressum.jsx` enthält offensichtliche Platzhalterdaten: „Musterstraße 1“, „Max Mustermann“, „kontakt@kleiderschrank.example“, „DE 123 456 789“. Ein Impressum mit falschen Angaben verstößt gegen § 5 DDG und ist wettbewerbsrechtlich angreifbar. Die Seite ist zwar verlinkt, aber inhaltlich nicht marktreif.
- **Konkrete Abhilfe:**
  - `frontend/src/pages/Impressum.jsx`: Echte Anbieterdaten eintragen (Name, Anschrift, Vertretungsberechtigter, Kontakt, ggf. USt-IdNr. nur falls vorhanden).
  - Prüfen, ob „Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV“ für das Produkt relevant ist; sonst diesen Abschnitt entfernen, um unzutreffende Pflichtangaben zu vermeiden.

### 4.2 Datenschutzerklärung mit Platzhalterdaten
- **Schweregrad:** kritisch für eine Auslieferung
- **Befund:** Auch `frontend/src/pages/Privacy.jsx` nennt als Verantwortlichen die Platzhalteradresse. Die Einwilligungs-, Rechtsgrundlagen- und Rechte-Passagen sind inhaltlich brauchbar, aber der Verantwortliche muss real und erreichbar sein.
- **Konkrete Abhilfe:**
  - `frontend/src/pages/Privacy.jsx`: Verantwortlichen-Abschnitt durch echte Anbieterdaten ersetzen.
  - Abschnitt 3 („Zugriffsdaten und Hosting“) mit der tatsächlichen Logging-/Hosting-Konfiguration abgleichen und Speicherdauer konkretisieren.

### 4.3 Kein Cookie-/Consent-Banner erforderlich
- **Befund:** Die Anwendung setzt keine Cookies, der JWT wird im `localStorage` abgelegt. Es werden keine Drittressourcen geladen; die im Impressum enthaltene ODR-Verlinkung ist ein normaler externer Link und kein automatisch geladener Drittanbieter-Inhalt. Ein Consent-Banner ist für diese Konstellation derzeit nicht erforderlich.
- **Konkrete Abhilfe:** Keine. Sollte später Tracking, externe Fonts oder eingebettete Drittinhalte ergänzt werden, ist der Consent-Prozess vorab einzuführen.

### 4.4 Verlinkung von Impressum und Datenschutz
- **Befund:** `frontend/src/components/Layout.jsx` verlinkt Impressum und Datenschutz im Footer auf allen Seiten. Erfüllt AC-14.
- **Konkrete Abhilfe:** Keine.

### 4.5 Widerrufs-/Rücktrittsbelehrung
- **Befund:** Kein entgeltlicher Verbrauchervertrag erkennbar. Daher keine verpflichtende Widerrufsbelehrung erforderlich.
- **Konkrete Abhilfe:** Keine. Falls später Bezahlfunktionen ergänzt werden, ist das erneut zu prüfen.

---

## 5. Barrierefreiheit (WCAG / BITV / EAA)

### 5.1 Gute Basis-Semantik und Labels
- **Befund:** Die sichtbaren Komponenten verwenden überwiegend semantisches HTML (`header`, `nav`, `main`, `footer`, `section`, `article`), Formular-Labels, `role="alert"`, `role="status"`, `aria-pressed`, `aria-label` und sichtbare Fokus-Styles. Das ist positiv.
- **Konkrete Abhilfe:** Keine.

### 5.2 Fehlender Skip-Link
- **Schweregrad:** niedrig
- **Befund:** Es gibt keinen Mechanismus, um direkt zum Hauptinhalt zu springen. Für Tastaturnutzer ist die Navigation über alle Navigationslinks mühsam.
- **Konkrete Abhilfe:**
  - `frontend/src/components/Layout.jsx`: Vor der Navigation einen visuell versteckten, bei Fokus sichtbaren Link ergänzen: `Zum Inhalt springen`, der auf `#main-content` verweist. In `Layout` dem `<main>` die ID `main-content` und `tabIndex={-1}` geben.

### 5.3 Modal-Dialog
- **Schweregrad:** Prüfhinweis
- **Befund:** Die CSS-Klassen für ein Modal sind vorhanden (`Wardrobe.css`). Die vollständige JSX-Modal-Implementierung ist im übermittelten Ausschnitt nicht vollständig sichtbar. Für Barrierefreiheit und Tastaturbedienung müssen Modal-Dialoge mindestens `role="dialog"`, `aria-modal="true"`, einen verständlichen Titel, Fokusfalle und Schließen per Escape besitzen.
- **Konkrete Abhilfe:**
  - `frontend/src/pages/Wardrobe.jsx`: Modal-Container prüfen und die genannten Attribute ergänzen bzw. sicherstellen, dass der Fokus beim Öffnen in das Modal wandert und beim Schließen zur auslösenden Schaltfläche zurückkehrt.

### 5.4 Farbkontraste und Schriftgrößen
- **Schweregrad:** niedrig / Hinweis
- **Befund:** Die Farbpalette in `frontend/src/styles/global.css` ist dunkel mit heller Schrift und Akzentfarben. Die tatsächlichen Kontrastverhältnisse wurden nicht maschinell geprüft.
- **Konkrete Abhilfe:**
  - Vor Release einen automatisierten WCAG-AA-Kontrastcheck (z. B. Axe, Pa11y) in die Frontend-Tests aufnehmen und auffällige Kombinationen korrigieren.

---

## Fazit

Das Produkt ist funktional weitgehend auf einem guten Stand: Die kritischen Security-Anforderungen der Acceptance Criteria sind umgesetzt, personenbezogene Daten werden nicht offensichtlich ohne Rechtsgrundlage verarbeitet, und die Pflichtseiten sind vorhanden. Für eine Marktfreigabe bestehen jedoch behebbare, aber wesentliche Lücken:

- Echte Impressums-/Anbieterdaten müssen eingetragen werden.
- Betroffenenrechte müssen in der Anwendung selbst ausübbar sein (Export, Berichtigung).
- Sicherheits-Header und CSP fehlen.
- Der JWT-Secret-Fallback muss für Produktion gehärtet werden.
- Passwort- und E-Mail-Validierung müssen nachgezogen werden.
- CRA-Dokumentation (SBOM, Security-Policy, Update-Prozess) muss nachgewiesen werden.

Keiner der Befunde stellt einen derart fundamentalen Verstoß dar, dass die Verarbeitung insgesamt unzulässig wäre (BLOCKED), aber die genannten Punkte müssen vor Auslieferung geschlossen werden.