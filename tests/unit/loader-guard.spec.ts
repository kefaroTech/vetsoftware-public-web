import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * GUARDA DE REPOSITORIO — `PawLoader` es el único loader.
 *
 * La regla existía como acuerdo y no la vigilaba nadie, y por eso el aro
 * giratorio del punto de venta (`.spin` + `@keyframes cash-spin`) sobrevivió
 * pantallas y auditorías enteras hasta EST-11. Un acuerdo que no falla en CI se
 * erosiona: cada spinner nuevo cuesta cinco líneas de CSS y no rompe nada.
 *
 * Lo que se vigila no es el nombre del componente sino su firma en CSS: una
 * animación `infinite` o un `rotate(360deg)`. Las dos cosas juntas describen
 * «algo gira para siempre», que es exactamente lo que `PawLoader` sustituye.
 *
 * `PawLoader.vue` es la única excepción por construcción — es el loader. El
 * resto de excepciones son deuda conocida, van enumeradas una a una con su
 * issue, y la guarda falla si aparece cualquier fichero que no esté en la
 * lista. Es un trinquete: el problema no puede crecer mientras se cierra.
 */

const SRC = resolve(import.meta.dirname, '../../src')

/** El loader del proyecto. Su animación es el motivo de que exista esta regla. */
const EL_LOADER = 'components/feedback/PawLoader.vue'

/**
 * Deuda conocida — capa pública/auth. Ver
 * https://github.com/kefaroTech/vetsoftware-public-web/issues/112
 *
 * No son falsos positivos: son cinco giros de verdad que EST-11 no tocó porque
 * vivían fuera del POS. Cada uno sale de aquí cuando se migre a `PawLoader`.
 */
const DEUDA_CONOCIDA: readonly string[] = [
  'components/public/AuthSelect.vue',
  'components/public/PrimaryButton.vue',
  'features/auth/views/RestablecerContrasenaView.vue',
  'features/registration/views/VerifyEmailView.vue',
  'assets/styles/public-auth.css',
]

const EXENTOS = new Set([EL_LOADER, ...DEUDA_CONOCIDA])

interface Regla {
  nombre: string
  patron: RegExp
  porque: string
}

const REGLAS: readonly Regla[] = [
  {
    nombre: 'animación infinita',
    // `animation: X 0.7s linear infinite` y `animation-iteration-count: infinite`.
    patron: /(?:animation(?:-iteration-count)?\s*:[^;{}]*\binfinite\b)/i,
    porque:
      'un elemento que gira o late para siempre es un loader, y el loader del proyecto es ' +
      '<PawLoader> (trae su guarda de prefers-reduced-motion; una animación suelta no)',
  },
  {
    nombre: 'rotate(360deg)',
    patron: /\brotate\(\s*360deg\s*\)/i,
    porque:
      'los @keyframes de un spinner clásico. Si hace falta esperar, se usa <PawLoader>; ' +
      'si es decoración, no debería dar una vuelta completa',
  },
]

/** Todos los `.vue` y `.css` bajo `src/`, con ruta relativa y separador POSIX. */
function ficherosDeEstilo(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((p) => p.split(sep).join('/'))
    .filter((p) => p.endsWith('.vue') || p.endsWith('.css'))
    .sort()
}

interface Hallazgo {
  fichero: string
  linea: number
  regla: Regla
  texto: string
}

function barrer(): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  for (const fichero of ficherosDeEstilo()) {
    if (EXENTOS.has(fichero)) continue
    const lineas = readFileSync(join(SRC, fichero), 'utf8').split(/\r?\n/)
    lineas.forEach((texto, i) => {
      for (const regla of REGLAS) {
        if (regla.patron.test(texto)) {
          hallazgos.push({ fichero, linea: i + 1, regla, texto: texto.trim() })
        }
      }
    })
  }
  return hallazgos
}

describe('PawLoader es el único loader', () => {
  it('ningún componente de src/ tiene su propia animación infinita ni un rotate(360deg)', () => {
    const hallazgos = barrer()

    const informe = hallazgos
      .map(
        (h) =>
          `\n  src/${h.fichero}:${h.linea}\n` +
          `      ${h.texto}\n` +
          `      REGLA: prohibida la ${h.regla.nombre} fuera de src/${EL_LOADER}.\n` +
          `      MOTIVO: ${h.regla.porque}.\n` +
          `      SALIDA: usa <PawLoader :size="…" :glow="false" label="…" />, como PosCashGate. ` +
          `Si de verdad es una excepción, añádela a DEUDA_CONOCIDA con su issue.`,
      )
      .join('')

    expect(
      hallazgos.map((h) => `src/${h.fichero}:${h.linea}`),
      hallazgos.length === 0 ? '' : `Loaders propios encontrados fuera de PawLoader:${informe}\n`,
    ).toEqual([])
  })

  it('el barrido llega a los ficheros que dice barrer', () => {
    // Sin esto, un cambio de estructura de carpetas dejaría la guarda en verde
    // por no encontrar nada, que es el modo silencioso de romper un trinquete.
    const ficheros = ficherosDeEstilo()

    expect(ficheros.length).toBeGreaterThan(200)
    expect(ficheros).toContain(EL_LOADER)
    expect(ficheros).toContain('features/tienda/components/PosCashGate.vue')
  })

  it('el loader del proyecto sigue siendo el que la regla exime', () => {
    // Si PawLoader se renombrara o se moviera, la exención quedaría apuntando a
    // un fichero fantasma y la guarda empezaría a rechazar al propio loader.
    const fuente = readFileSync(join(SRC, EL_LOADER), 'utf8')

    expect(fuente).toContain('infinite')
    expect(fuente).toContain('prefers-reduced-motion')
  })

  it('ninguna excepción de la lista de deuda se ha quedado obsoleta', () => {
    // Una entrada que ya no existe (fichero borrado) o que ya no viola nada es
    // un agujero abierto en la guarda: exime a un nombre que cualquiera puede
    // volver a crear sin que la prueba diga nada.
    const obsoletas = DEUDA_CONOCIDA.filter((fichero) => {
      const ruta = join(SRC, fichero)
      if (!existsSync(ruta)) return true
      const lineas = readFileSync(ruta, 'utf8').split(/\r?\n/)
      return !lineas.some((l) => REGLAS.some((r) => r.patron.test(l)))
    })

    expect(
      obsoletas,
      `Estas excepciones ya no hacen falta: bórralas de DEUDA_CONOCIDA en ` +
        `tests/unit/loader-guard.spec.ts y, si la lista queda vacía, cierra ` +
        `https://github.com/kefaroTech/vetsoftware-public-web/issues/112`,
    ).toEqual([])
  })
})
