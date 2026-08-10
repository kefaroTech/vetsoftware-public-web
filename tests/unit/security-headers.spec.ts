import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * Las cabeceras de seguridad se declaran DOS veces —`public/_headers` para
 * Cloudflare Pages y `docker/nginx.conf` para el contenedor— y hasta ahora nada
 * garantizaba que dijeran lo mismo. Un despliegue quedaba protegido y el otro no,
 * sin ninguna señal.
 *
 * En esta aplicación la CSP es especialmente fácil de romper de forma silenciosa,
 * porque tres funciones críticas dependen de excepciones concretas: el captcha del
 * registro (script de Google), la impresión de recibos y recetas (iframes con
 * `blob:`) y el sello QR de la DIAN (imagen remota del proveedor). Las pruebas de
 * abajo fijan cada una de esas excepciones para que "apretar" la política no deje
 * a la clínica sin poder imprimir ni facturar.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')

/** Cabeceras del bloque `/*` de `public/_headers`. */
function parseCloudflareHeaders(): Map<string, string> {
  const raw = readFileSync(path.join(ROOT, 'public/_headers'), 'utf8')
  const headers = new Map<string, string>()
  let inGlobalRule = false

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#')) continue
    if (!line.startsWith(' ')) {
      inGlobalRule = line.trim() === '/*'
      continue
    }
    if (!inGlobalRule) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue
    headers.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }
  return headers
}

/** Cabeceras `add_header` del `server` de `docker/nginx.conf`. */
function parseNginxHeaders(): Map<string, string> {
  const raw = readFileSync(path.join(ROOT, 'docker/nginx.conf'), 'utf8')
  const headers = new Map<string, string>()
  const pattern = /^\s*add_header\s+(\S+)\s+"([^"]*)"\s*always\s*;/gm

  for (const [, name, value] of raw.matchAll(pattern)) {
    headers.set(name, value)
  }
  return headers
}

/** Divide una CSP en `{ directiva: [valores] }`. */
function parseCsp(policy: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {}
  for (const chunk of policy.split(';')) {
    const [name, ...values] = chunk.trim().split(/\s+/)
    if (name) directives[name] = values
  }
  return directives
}

/** Origen (`https://host`) del `VITE_API_URL` de un archivo de entorno. */
function apiOriginOf(envFile: string): string {
  const raw = readFileSync(path.join(ROOT, envFile), 'utf8')
  const match = raw.match(/^VITE_API_URL=(.+)$/m)
  if (!match) throw new Error(`${envFile} no define VITE_API_URL`)
  return new URL(match[1].trim()).origin
}

/** Todos los archivos bajo un directorio, recursivamente. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(full) : [full]
  })
}

const cloudflare = parseCloudflareHeaders()
const nginx = parseNginxHeaders()
const policy = cloudflare.get('Content-Security-Policy') ?? ''
const csp = parseCsp(policy)

describe('cabeceras de seguridad', () => {
  it('declara las mismas cabeceras en Cloudflare Pages y en el contenedor', () => {
    // Cache-Control lo gestiona cada plataforma a su manera (nginx usa `expires`),
    // así que es la única que legítimamente puede diferir.
    const comparable = new Map(cloudflare)
    comparable.delete('Cache-Control')

    expect(Object.fromEntries(nginx)).toEqual(Object.fromEntries(comparable))
  })

  it('incluye Content-Security-Policy', () => {
    expect(policy).toBeTruthy()
  })
})

describe('Content-Security-Policy', () => {
  it('no permite scripts en línea ni eval', () => {
    // Es la directiva que convierte un XSS reflejado en nada. El build de Vite no
    // necesita ninguna de las dos y el proyecto no tiene eval, v-html ni innerHTML.
    expect(csp['script-src']).not.toContain("'unsafe-inline'")
    expect(csp['script-src']).not.toContain("'unsafe-eval'")
  })

  it('cierra los vectores que no dependen de ejecutar script', () => {
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['form-action']).toEqual(["'self'"])
  })

  it.each([
    ['dev', '.env.dev'],
    ['prod', '.env.prod'],
  ])('permite hablar con la API de %s', (_entorno, envFile) => {
    expect(csp['connect-src']).toContain(apiOriginOf(envFile))
  })

  it('permite cargar el script de reCAPTCHA y su widget', () => {
    // Sin esto el formulario de registro no puede enviarse: useRecaptcha.ts espera
    // a que api.js cargue y el envío exige el token.
    expect(csp['script-src']).toContain('https://www.google.com')
    expect(csp['script-src']).toContain('https://www.gstatic.com')
    expect(csp['frame-src']).toContain('https://www.google.com')
  })

  it('permite imprimir: iframes propios y de blob:', () => {
    // useReceiptPrint.ts escribe el ticket en un iframe about:blank y
    // usePrescriptionExport.ts carga el PDF con `iframe.src = blob:`. Quitar blob:
    // deja sin impresión recetas, historias clínicas e informes.
    expect(csp['frame-src']).toContain("'self'")
    expect(csp['frame-src']).toContain('blob:')
  })

  it('permite el QR remoto de la DIAN', () => {
    // La URL del QR la fija el proveedor de facturación por empresa, en base de
    // datos. Una lista fija de hosts dejaría el sello en blanco sobre un
    // comprobante impreso, sin error visible.
    expect(csp['img-src']).toContain('https:')
  })

  it('permite todos los orígenes externos que el código carga de verdad', () => {
    const sources = [
      readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
      ...filesUnder(path.join(ROOT, 'src')).map((file) => readFileSync(file, 'utf8')),
    ].join('\n')

    const hosts = new Set(
      Array.from(sources.matchAll(/https:\/\/([a-z0-9.-]+)/g), (m) => `https://${m[1]}`),
    )
    // Namespaces XML: se escriben en el SVG pero no se descargan nunca.
    hosts.delete('https://www.w3.org')

    expect(hosts.size).toBeGreaterThan(0)
    for (const host of hosts) {
      expect(policy, `${host} se carga en el código pero la CSP lo bloquea`).toContain(host)
    }
  })
})
