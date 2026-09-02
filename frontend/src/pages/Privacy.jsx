function Privacy() {
  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">Datenschutzerklärung</h1>
        <p className="page__subtitle">
          Informationen zur Verarbeitung personenbezogener Daten
        </p>
      </header>

      <div className="legal">
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlicher für die Datenverarbeitung im Sinne der
          Datenschutz-Grundverordnung (DSGVO) ist:
        </p>
        <p>
          Kleiderschrank App
          <br />
          Musterstraße 1
          <br />
          12345 Musterstadt
          <br />
          Deutschland
          <br />
          E-Mail: kontakt@kleiderschrank.example
        </p>

        <h2>2. Überblick über die Verarbeitungen</h2>
        <p>
          Diese Anwendung ist eine lokale Garderoben-Verwaltung. Wir
          verarbeiten personenbezogene Daten ausschließlich, um Ihnen das
          Anlegen eines Kontos, die Verwaltung Ihrer Kleidungsstücke und
          Outfits sowie die Löschung Ihres Kontos zu ermöglichen.
        </p>

        <h2>3. Zugriffsdaten und Hosting</h2>
        <p>
          Bei jedem Zugriff auf die Anwendung werden automatisch
          Zugriffsdaten (Server-Logfiles) wie IP-Adresse, Datum und Uhrzeit des
          Zugriffs sowie die angefragte Ressource verarbeitet. Diese
          Verarbeitung erfolgt zur Sicherstellung eines störungsfreien
          Betriebs und der Sicherheit der Anwendung auf Grundlage von Art. 6
          Abs. 1 lit. f DSGVO. Die Anwendung lädt keine Inhalte von
          Drittressourcen nach; sämtliche Schriftarten, Skripte und sonstigen
          Ressourcen werden selbst gehostet.
        </p>

        <h2>4. Registrierung und Konto</h2>
        <p>
          Bei der Registrierung verarbeiten wir Ihre E-Mail-Adresse sowie ein
          daraus abgeleitetes Passwort. Das Passwort wird nicht im Klartext
          gespeichert, sondern ausschließlich als kryptografischer Hash. Die
          Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags auf
          Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Die E-Mail-Adresse wird
          zudem zur eindeutigen Identifikation Ihres Kontos verwendet.
        </p>

        <h2>5. Garderobe und Outfits</h2>
        <p>
          Im Rahmen der Nutzung können Sie Kleidungsstücke mit Name, Kategorie
          und Farbe anlegen und Fotos hochladen sowie diese zu Outfits
          zusammenstellen. Diese Daten verarbeiten wir zur Bereitstellung der
          Kernfunktionen der Anwendung auf Grundlage von Art. 6 Abs. 1 lit. b
          DSGVO. Die Daten sind Ihrem Konto zugeordnet und nur für Sie
          zugänglich.
        </p>

        <h2>6. Anmeldetoken</h2>
        <p>
          Zur Aufrechterhaltung Ihrer Anmeldung wird ein technisches
          Anmeldetoken (JWT) lokal im Speicher Ihres Browsers abgelegt. Dieses
          Token enthält keine Klartext-Passwörter und dient ausschließlich der
          Authentifizierung Ihrer Anfragen.
        </p>

        <h2>7. Speicherdauer und Löschung</h2>
        <p>
          Ihre personenbezogenen Daten werden gespeichert, solange Sie ein
          Konto bei uns führen. Sie können Ihr Konto und sämtliche damit
          verbundenen Daten (einschließlich Kleidungsstücke, Fotos und Outfits)
          jederzeit in den Kontoeinstellungen löschen. Nach der Löschung werden
          die Daten unverzüglich entfernt, sofern keine gesetzlichen
          Aufbewahrungspflichten entgegenstehen.
        </p>

        <h2>8. Weitergabe von Daten</h2>
        <p>
          Eine Übermittlung Ihrer personenbezogenen Daten an Dritte findet
          nicht statt, es sei denn, Sie haben ausdrücklich eingewilligt oder es
          besteht eine gesetzliche Verpflichtung hierzu.
        </p>

        <h2>9. Ihre Rechte</h2>
        <p>Sie haben nach der DSGVO das Recht auf:</p>
        <ul>
          <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO),</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
          <li>Löschung Ihrer Daten (Art. 17 DSGVO),</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).</li>
        </ul>
        <p>
          Zur Ausübung dieser Rechte können Sie sich jederzeit an die oben
          genannten Kontaktdaten wenden.
        </p>

        <h2>10. Beschwerderecht</h2>
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über
          die Verarbeitung Ihrer personenbezogenen Daten durch uns zu
          beschweren.
        </p>

        <h2>11. Sicherheit</h2>
        <p>
          Wir setzen technische und organisatorische Maßnahmen ein, um Ihre
          Daten gegen Verlust, Missbrauch und unbefugten Zugriff zu schützen.
          Dazu gehören insbesondere die passwortbasierte Authentifizierung mit
          gehashten Passwörtern sowie der ausschließlich verschlüsselte
          Zugriff auf Ihre Daten über HTTPS.
        </p>
      </div>
    </section>
  )
}

export default Privacy
