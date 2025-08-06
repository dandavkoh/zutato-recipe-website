export const metadata = {
  title: 'Datenschutz - KochMeister',
  description: 'Datenschutzerklärung und Informationen zum Umgang mit personenbezogenen Daten auf KochMeister.',
};

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Datenschutz auf einen Blick</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Allgemeine Hinweise</h3>
                  <p>
                    Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen 
                    Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, 
                    mit denen Sie persönlich identifiziert werden können.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Datenerfassung auf dieser Website</h3>
                  <p>
                    Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Die Kontaktdaten 
                    können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Hosting</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Externes Hosting</h3>
                  <p>
                    Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen 
                    Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster 
                    gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und 
                    Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, 
                    die über eine Website generiert werden, handeln.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Datenschutz</h3>
                  <p>
                    Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. 
                    Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen 
                    Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Hinweis zur verantwortlichen Stelle</h3>
                  <p>
                    Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
                  </p>
                  <div className="mt-2 pl-4">
                    <p>KochMeister GmbH</p>
                    <p>Musterstraße 123</p>
                    <p>12345 Musterstadt</p>
                    <p>Deutschland</p>
                    <p>Telefon: +49 (0) 123 456789</p>
                    <p>E-Mail: datenschutz@kochmeister.de</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Datenerfassung auf dieser Website</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cookies</h3>
                  <p>
                    Die Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf Ihrem 
                    Rechner keinen Schaden an und enthalten keine Viren. Cookies dienen dazu, unser Angebot 
                    nutzerfreundlicher, effektiver und sicherer zu machen. Cookies sind kleine Textdateien, 
                    die auf Ihrem Rechner abgelegt werden und die Ihr Browser speichert.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Server-Log-Dateien</h3>
                  <p>
                    Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten 
                    Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
                  </p>
                  <ul className="list-disc pl-6 mt-2">
                    <li>Browsertyp und Browserversion</li>
                    <li>verwendetes Betriebssystem</li>
                    <li>Referrer URL</li>
                    <li>Hostname des zugreifenden Rechners</li>
                    <li>Uhrzeit der Serveranfrage</li>
                    <li>IP-Adresse</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Ihre Rechte</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recht auf Auskunft</h3>
                  <p>
                    Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob betreffende Daten verarbeitet 
                    werden und auf Auskunft über diese Daten sowie auf weitere Informationen und Kopie der Daten 
                    entsprechend den gesetzlichen Vorgaben.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recht auf Berichtigung</h3>
                  <p>
                    Sie haben entsprechend den gesetzlichen Vorgaben das Recht, die Vervollständigung der Sie 
                    betreffenden Daten oder die Berichtigung der Sie betreffenden unrichtigen Daten zu verlangen.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recht auf Löschung</h3>
                  <p>
                    Sie haben entsprechend den gesetzlichen Vorgaben das Recht zu verlangen, dass Sie betreffende 
                    Daten unverzüglich gelöscht werden, bzw. alternativ nach Maßgabe der gesetzlichen Vorgaben 
                    eine Einschränkung der Verarbeitung der Daten zu verlangen.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recht auf Datenübertragbarkeit</h3>
                  <p>
                    Sie haben das Recht, Sie betreffende Daten, die Sie uns bereitgestellt haben, nach Maßgabe 
                    der gesetzlichen Vorgaben in einem strukturierten, gängigen und maschinenlesbaren Format 
                    zu erhalten oder deren Übermittlung an einen anderen Verantwortlichen zu fordern.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Kontakt</h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  Bei Fragen zur Erhebung, Verarbeitung oder Nutzung Ihrer personenbezogenen Daten wenden 
                  Sie sich bitte an:
                </p>
                <div className="mt-2 pl-4">
                  <p>Datenschutzbeauftragter</p>
                  <p>KochMeister GmbH</p>
                  <p>Musterstraße 123</p>
                  <p>12345 Musterstadt</p>
                  <p>E-Mail: datenschutz@kochmeister.de</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Änderungen</h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen 
                  rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der 
                  Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer Services.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Stand: Dezember 2024
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 