#!/usr/bin/env node
/**
 * Presupuesto de bundle verificado sobre `dist/`.
 *
 * Mide la RUTA CRÍTICA, no "el archivo index". Esa distinción es el motivo de
 * que este script exista: Vite emite el entry junto con una lista de
 * `<link rel="modulepreload">`, y el navegador descarga todo eso antes de
 * pintar. Un presupuesto que solo mirara `index-*.js` daría por bueno un
 * bundle que creció en los chunks precargados — que es exactamente donde vive
 * la mayor parte del peso (Vuetify, los iconos).
 *
 * Se mide en gzip porque es lo que viaja por el cable: nginx y Cloudflare
 * comprimen, así que los bytes sin comprimir no son lo que espera el usuario.
 *
 * Uso:
 *   node scripts/check-bundle-budget.mjs            # falla si se excede
 *   node scripts/check-bundle-budget.mjs --report   # solo informa
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

const DIST = path.resolve(import.meta.dirname, '../dist')

/**
 * Presupuestos en bytes gzip. Se fijan con holgura sobre la medida real del
 * momento en que se establecieron, no en un número redondo aspiracional: la
 * gracia es que salte cuando algo crece de verdad, no que quepa cualquier cosa.
 *
 * Medida al establecerlos (8 de agosto de 2026, build de producción):
 *   ruta crítica JS   102,9 KB gzip   → presupuesto 130 KB   (+26 %)
 *   CSS crítico        84,6 KB gzip   → presupuesto  95 KB   (+12 %)
 *   JS total          431,4 KB gzip   → presupuesto 520 KB   (+21 %)
 *
 * Subir un presupuesto es una decisión consciente que queda en el historial.
 * Eso es justo lo que faltaba: nada impedía que el peso creciera sin que nadie
 * se enterara hasta que un usuario se quejara de la carga.
 *
 * ── Dos cosas que estos números NO deben leerse como aprobadas ──────────────
 *
 * 1. Los 84,6 KB de CSS crítico son casi enteramente `@mdi/font`. La hoja son
 *    197 KB sin comprimir con 7.479 apariciones de `mdi-` frente a 130 clases
 *    de Vuetify, y el proyecto usa exactamente 24 iconos distintos. Además
 *    arrastra la fuente: 403 KB de .woff2 que el navegador descarga para
 *    dibujar esos 24. Es el mismo problema que el panel admin resolvió con un
 *    subset de iconos. El presupuesto se fija aquí para que no empeore, no
 *    porque esté bien.
 *
 * 2. La caché se invalida casi entera en cada despliegue. Medido: un cambio de
 *    una línea en UNA vista hoja cambia el hash de 118 de los 168 chunks,
 *    367,7 KB gzip de 431,4 (85 %). En el panel admin, el mismo experimento
 *    invalida 1 chunk de 72 (19,7 KB, 10 %). No lo causa el vendor —agrupar por
 *    familias solo lo baja al 71 % y encarece la ruta crítica un 25 %—, así que
 *    es una investigación aparte, no un `manualChunks`.
 */
const BUDGET_GZIP = {
  criticalJs: 130 * 1024,
  criticalCss: 95 * 1024,
  totalJs: 520 * 1024,
}

const KB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

function gzipSize(assetPath) {
  return gzipSync(readFileSync(path.join(DIST, assetPath))).length
}

/** Assets que el navegador pide antes de poder pintar: el entry y sus precargas. */
function readCriticalPath() {
  const html = readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const hrefs = (pattern) =>
    Array.from(html.matchAll(pattern), (m) => m[1].replace(/^\//, '')).filter((f) =>
      existsSync(path.join(DIST, f)),
    )

  return {
    js: [
      ...hrefs(/<script[^>]+type="module"[^>]+src="([^"]+)"/g),
      ...hrefs(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
    ],
    css: hrefs(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  }
}

function allJs() {
  return readdirSync(path.join(DIST, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `assets/${f}`)
}

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('No hay dist/index.html. Ejecuta el build antes de medir el presupuesto.')
  process.exit(1)
}

const critical = readCriticalPath()
const sum = (files) => files.reduce((acc, f) => acc + gzipSize(f), 0)

const measured = {
  criticalJs: sum(critical.js),
  criticalCss: sum(critical.css),
  totalJs: sum(allJs()),
}

const rows = [
  ['Ruta crítica JS', measured.criticalJs, BUDGET_GZIP.criticalJs, `${critical.js.length} chunks`],
  [
    'Ruta crítica CSS',
    measured.criticalCss,
    BUDGET_GZIP.criticalCss,
    `${critical.css.length} hojas`,
  ],
  ['JS total', measured.totalJs, BUDGET_GZIP.totalJs, `${allJs().length} chunks`],
]

console.log('\nPresupuesto de bundle (gzip)\n')
for (const [label, value, budget, detail] of rows) {
  const margen = (((budget - value) / budget) * 100).toFixed(0)
  const estado = value > budget ? 'EXCEDIDO' : `${margen} % de margen`
  console.log(
    `  ${label.padEnd(18)} ${KB(value).padStart(9)} / ${KB(budget).padStart(9)}   ${estado}   (${detail})`,
  )
}

if (process.argv.includes('--report')) {
  console.log('\nModo informe: no se aplica el presupuesto.\n')
  process.exit(0)
}

const excedidos = rows.filter(([, value, budget]) => value > budget)
if (excedidos.length > 0) {
  console.error(
    `\nPresupuesto excedido en: ${excedidos.map(([label]) => label).join(', ')}.` +
      '\nO se reduce el peso, o se sube el presupuesto en scripts/check-bundle-budget.mjs' +
      ' explicando por qué en el commit.\n',
  )
  process.exit(1)
}

console.log('\nDentro de presupuesto.\n')
