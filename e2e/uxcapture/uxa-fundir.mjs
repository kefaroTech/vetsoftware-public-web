import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

/**
 * Funde los fragmentos que escribe cada worker en el JSON único de métricas y
 * saca el resumen ordenado por severidad.
 *
 * Los fragmentos existen porque cuatro workers escribiendo el mismo fichero se
 * pisan: cada prueba deja el suyo y esto los junta al final.
 */

const SCRATCH =
  'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad'
const DIR = process.env.UXA_FRAGMENTOS ?? join(SCRATCH, 'uxa-fragmentos-public')
const SUFIJO = process.env.UXA_SUFIJO ?? ''

if (!existsSync(DIR)) {
  process.stderr.write(`no hay fragmentos en ${DIR}: la tanda no llegó a escribir nada
`)
  process.exit(1)
}

// Los fragmentos de recaptura van los ULTIMOS: para una misma
// ruta+viewport+estado gana el mas reciente, que es el bueno.
const ficheros = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort((a, b) => Number(a.includes('-recup')) - Number(b.includes('-recup')))

const porClave = new Map()
const dialogos = []
const seccionesLanding = []

for (const f of ficheros) {
  const datos = JSON.parse(readFileSync(join(DIR, f), 'utf8'))
  if (f.startsWith('dialogos-')) dialogos.push(...datos)
  else if (f.startsWith('landing-secciones-')) seccionesLanding.push(...datos)
  else for (const d of datos) porClave.set(`${d.ruta}|${d.viewport}|${d.estado}`, d)
}
const pantallas = [...porClave.values()]

const conMetricas = pantallas.filter((p) => p.metricas)
const suma = (fn) => conMetricas.reduce((acc, p) => acc + fn(p), 0)

const porRuta = new Map()
for (const p of conMetricas) {
  const clave = p.ruta
  const actual = porRuta.get(clave) ?? { ruta: clave, desborde: [], pequenos: 0, truncado: 0 }
  if (p.metricas.documento.desbordaHorizontal) actual.desborde.push(`${p.viewport}/${p.estado}`)
  actual.pequenos += p.metricas.objetivosPequenos.filter((o) => !o.enLinea).length
  actual.truncado += p.metricas.textoTruncado.filter((t) => !t.conElipsis).length
  porRuta.set(clave, actual)
}

// Un ancho que cae entre dos puntos de ruptura produce un estado que ningún
// dispositivo real reproduce. Sin esto, quien audite lee «tablet» y juzga una
// maquetación que no existe.
const notasDeViewport = {}
for (const p of [...pantallas, ...dialogos, ...seccionesLanding]) {
  if (p.notaViewport) notasDeViewport[p.viewport] = p.notaViewport
}

const porViewport = {}
for (const p of pantallas) {
  const v = (porViewport[p.viewport] ??= { capturas: 0, desborde: 0, fallidas: 0 })
  if (p.captura) v.capturas++
  if (p.fallo) v.fallidas++
  if (p.metricas?.documento.desbordaHorizontal) v.desborde++
}

const resumen = {
  generado: new Date().toISOString(),
  notasDeViewport,
  porViewport,
  totales: {
    capturasIntentadas: pantallas.length,
    capturasOk: pantallas.filter((p) => p.captura).length,
    fallidas: pantallas.filter((p) => p.fallo).length,
    redirigidas: pantallas.filter((p) => p.redirigida).length,
    dialogosAbiertos: dialogos.filter((d) => d.abierto).length,
    dialogosIntentados: dialogos.length,
    seccionesLanding: seccionesLanding.filter((s) => s.captura).length,
  },
  severidad: {
    desbordeHorizontal: suma((p) => (p.metricas.documento.desbordaHorizontal ? 1 : 0)),
    objetivosBajoWcag258: suma(
      (p) => p.metricas.objetivosPequenos.filter((o) => !o.enLinea).length,
    ),
    textoCortadoSinElipsis: suma(
      (p) => p.metricas.textoTruncado.filter((t) => !t.conElipsis).length,
    ),
    solapamientos: suma((p) => p.metricas.solapamientos.length),
    imagenesRotas: suma((p) => p.metricas.imagenes.filter((i) => i.rota).length),
    imagenesDeformadas: suma((p) => p.metricas.imagenes.filter((i) => i.deformada).length),
    imagenesSinAlt: suma((p) => p.metricas.imagenes.filter((i) => i.sinAlt).length),
    centradosRotos: suma((p) => p.metricas.centradosRotos.length),
    desalineaciones1a6px: suma((p) => p.metricas.desalineaciones.length),
    scrollersFueraDePantalla: suma((p) => p.metricas.scrollers.fueraDePantalla.length),
    espaciadoFueraDeEscala: suma((p) => p.metricas.espaciadoFueraDeEscala.total),
    erroresDeConsola: pantallas.reduce(
      (a, p) => a + (p.consola ?? []).filter((c) => c.tipo !== 'warning').length,
      0,
    ),
    peticionesFallidas: pantallas.reduce((a, p) => a + (p.red ?? []).length, 0),
    // `declaradas: 0` es una captura hecha con la tipografia de respaldo del
    // sistema: mide otro texto y no sirve para juzgar truncados ni ritmo.
    capturasSinTipografiaDelProducto: pantallas.filter(
      (p) => p.captura && p.fuentes && p.fuentes.declaradas === 0,
    ).length,
    // Sin el campo no se puede afirmar nada: no es lo mismo que afirmar que falta.
    capturasSinDatoDeTipografia: pantallas.filter((p) => p.captura && !p.fuentes).length,
    carasSinCargar: pantallas.reduce((a, p) => a + (p.fuentes?.sinCargar ?? []).length, 0),
  },
  rutasFallidas: pantallas
    .filter((p) => p.fallo)
    .map((p) => ({ ruta: p.ruta, viewport: p.viewport, estado: p.estado, fallo: p.fallo })),
  rutasRedirigidas: [
    ...new Set(pantallas.filter((p) => p.redirigida).map((p) => `${p.ruta} -> ${p.urlFinal}`)),
  ],
  peoresPorDesborde: [...porRuta.values()]
    .filter((r) => r.desborde.length > 0)
    .sort((a, b) => b.desborde.length - a.desborde.length)
    .slice(0, 25),
  peoresPorObjetivoPequeno: [...porRuta.values()]
    .sort((a, b) => b.pequenos - a.pequenos)
    .slice(0, 15),
  peoresPorTextoCortado: [...porRuta.values()].sort((a, b) => b.truncado - a.truncado).slice(0, 15),
}

writeFileSync(
  join(SCRATCH, `uxa-metricas-public${SUFIJO}.json`),
  JSON.stringify({ resumen, pantallas, dialogos, seccionesLanding }, null, 2),
  'utf8',
)
writeFileSync(join(SCRATCH, 'uxa-resumen-public.json'), JSON.stringify(resumen, null, 2), 'utf8')
process.stdout.write(`${JSON.stringify(resumen.totales, null, 2)}
`)
process.stdout.write(`${JSON.stringify(resumen.severidad, null, 2)}
`)
