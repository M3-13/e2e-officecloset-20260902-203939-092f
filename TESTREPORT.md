VERDICT: BUGS_FOUND

Hinweis: Die beigefügten Screenshots kann ich nicht sehen; ich beurteile ausschließlich anhand des Textberichts.

**Bug 1: Outfit-Bilder werden ohne Authentifizierung geladen und erscheinen nicht**

- **Titel**  
  Outfit-Liste und Outfit-Creator laden geschützte Bilder ohne Bearer-Token, daher bleiben die Bilder leer

- **Symptom**  
  Nach dem Speichern eines Outfits zeigt die Outfit-Liste die Einzelteil-Bilder nicht an. Die API verlangt für `/api/items/{id}/image` einen gültigen Bearer-Token; die betroffenen Seiten binden die Bilder aber als normales `<img src="...">` ohne Authorization-Header ein. Dadurch antwortet der Server mit `401 Unauthorized`, das Bild kann nicht laden und AC-06 („gespeichertes Outfit zeigt seine Einzelteile mit Bildern“) ist verletzt.

- **Repro**  
  E2E-Journey: Benutzer registrieren, zwei Kleidungsstücke anlegen, Outfit speichern, zur Outfit-Liste navigieren. Der Test prüft, ob das erste `img.outfit-card__thumb` tatsächlich geladen wurde, und schlägt fehl.

- **Evidence**  
  ```
  Error: outfit thumbnail should actually load its image

  expect(received).toBe(expected) // Object.is equality

  Expected: true
  Received: false

    128 |     await imageLoaded(card.locator('img.outfit-card__thumb').first()),
    129 |     'outfit thumbnail should actually load its image',
  > 130 |   ).toBe(true)
  ```
  Zugehörige Backend-Logs:
  ```
  INFO:     127.0.0.1:61498 - "POST /api/outfits HTTP/1.1" 201 Created
  INFO:     127.0.0.1:61498 - "GET /api/outfits HTTP/1.1" 200 OK
  INFO:     127.0.0.1:61498 - "GET /api/items/5/image HTTP/1.1" 401 Unauthorized
  INFO:     127.0.0.1:55369 - "GET /api/items/6/image HTTP/1.1" 401 Unauthorized
  ```

- **Suspected file(s)**  
  `frontend/src/pages/Outfits.jsx` und `frontend/src/pages/OutfitCreator.jsx`  
  Beide binden `item.image_url` direkt über `<img src="...">` ein, ohne den in `Wardrobe.jsx` üblichen `fetch` mit `Authorization`-Header. Der Image-Endpunkt im Backend (`backend/app/routers/wardrobe.py`) erfordert aber `get_current_user`.

- **Severity**  
  high