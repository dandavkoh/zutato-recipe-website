'use client'

import React, { useEffect } from 'react'

// Minimal Klaro loader. We load the script and initialize with a config that is
// partly driven by environment variables, so you can adjust in prod vs test.
// Docs: https://heyklaro.com/docs

declare global {
  interface Window {
    klaro?: any
  }
}

const regionConfig = {
  // Basic regional presets – DACH focus
  // You can refine per-country texts if desired
  language: 'de',
  styling: {
    theme: ['light'],
  },
}

export default function KlaroConsent() {
  useEffect(() => {
    // Avoid multiple loads
    if (typeof window === 'undefined') return

    const scriptId = 'klaro-script'
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.id = scriptId
      s.async = true
      // Self-hosted Klaro binary
      s.src = '/klaro/klaro.js'
      s.onload = () => initKlaro()
      document.body.appendChild(s)
    } else {
      initKlaro()
    }
  }, [])

  const initKlaro = () => {
    if (!window.klaro) return

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ZUTATO'
    const env = process.env.NEXT_PUBLIC_RUNTIME_ENV || 'production'
    const ezoicEnabled = (process.env.NEXT_PUBLIC_EZOIC_ENABLED || 'false') === 'true'
    const ezoicTagId = process.env.NEXT_PUBLIC_EZOIC_TAG_ID || ''

    // Klaro config – adjust texts and services as needed
    const config = {
      ...regionConfig,
      version: 1,
      testing: env !== 'production',
      elementID: 'klaro',
      storageMethod: 'cookie',
      cookieName: 'klaro',
      cookieExpiresAfterDays: 180,
      mustConsent: false,
      acceptAll: true,
      hideDeclineAll: false,
      hideLearnMore: false,
      translations: {
        de: {
          consentModal: {
            title: `${appName} – Datenschutz-Einstellungen`,
            description:
              'Hier können Sie Dienste aktivieren/deaktivieren. Ihre Auswahl können Sie jederzeit ändern.',
          },
          consentNotice: {
            description:
              'Wir verwenden Cookies, um unsere Website zu verbessern und Werbung zu finanzieren. Sie können Ihre Auswahl jederzeit ändern.',
          },
          ok: 'Akzeptieren',
          acceptAll: 'Alle akzeptieren',
          decline: 'Ablehnen',
          poweredBy: 'Realisiert mit Klaro!',
          purposes: {
            ads: 'Werbung',
            essential: 'Notwendig',
            analytics: 'Analyse',
          },
        },
      },
      // Define the list of apps (services) controlled by Klaro
      apps: [
        {
          name: 'essential',
          title: 'Notwendige Cookies',
          purposes: ['essential'],
          required: true,
          default: true,
          callback: () => {},
        },
        ezoicEnabled
          ? {
              name: 'ezoic-ads',
              title: 'Ezoic Werbung',
              purposes: ['ads'],
              cookies: [
                // Add known Ezoic cookies if needed for auto-cleanup
                // '__ez', 'ezCMPCCS', 'ezosuibasgeneris-1', etc.
              ],
              default: false,
              callback: (consent: boolean) => {
                if (consent) {
                  enableEzoicPersonalized(ezoicTagId)
                } else {
                  enableEzoicNonPersonalized(ezoicTagId)
                }
              },
            }
          : undefined,
      ].filter(Boolean),
    }

    try {
      window.klaro.setup(config)
    } catch {
      // ignore setup errors
    }
  }

  return (
    <>
      {/* Optional Klaro CSS if you want the default styling */}
      <link rel="stylesheet" href="/klaro/klaro.css" />
      <div id="klaro" />
    </>
  )
}

function loadEzoic(tagId: string, afterLoad: () => void) {
  if (!tagId) return
  const existing = document.getElementById('ezoic-tag') as HTMLScriptElement | null
  if (existing) {
    afterLoad()
    return
  }
  const s = document.createElement('script')
  s.id = 'ezoic-tag'
  s.src = `https://g.ezoic.net/ezoic/ezoic.js?${encodeURIComponent(tagId)}`
  s.async = true
  s.onload = () => afterLoad()
  document.head.appendChild(s)
}

function enableEzoicPersonalized(tagId: string) {
  loadEzoic(tagId, () => {
    // Personalized ads (default). Ensure library is ready and enable.
    // @ts-ignore
    window.ezstandalone = window.ezstandalone || {}
    // @ts-ignore
    ezstandalone.cmd = ezstandalone.cmd || []
    // @ts-ignore
    ezstandalone.cmd.push(function () {
      try {
        // @ts-ignore
        ezstandalone.enable && ezstandalone.enable()
      } catch {}
    })
  })
}

function enableEzoicNonPersonalized(tagId: string) {
  loadEzoic(tagId, () => {
    // Non-personalized: limitCookies instructs Ezoic to reduce cookie usage
    // @ts-ignore
    window.ezstandalone = window.ezstandalone || {}
    // @ts-ignore
    ezstandalone.cmd = ezstandalone.cmd || []
    // @ts-ignore
    ezstandalone.cmd.push(function () {
      try {
        // @ts-ignore
        ezstandalone.config && ezstandalone.config({ limitCookies: true })
        // @ts-ignore
        ezstandalone.enable && ezstandalone.enable()
      } catch {}
    })
  })
}

