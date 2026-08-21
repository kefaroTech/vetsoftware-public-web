import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'
import { tmpdir } from 'node:os'

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

/** Todos los `.vue` y `.css` bajo `raiz`, con ruta relativa y separador POSIX. */
function ficherosDeEstilo(raiz: string = SRC): string[] {
  return readdirSync(raiz, { recursive: true, encoding: 'utf8' })
    .map((p) => p.split(sep).join('/'))
    .filter((p) => p.endsWith('.vue') || p.endsWith('.css'))
    .sort()
}

/**
 * Vacía los comentarios antes de barrer, CONSERVANDO el número de líneas.
 *
 * La guarda casa contra texto crudo, así que casaba también dentro de un
 * comentario. Se denunció a sí misma: el bloque global de `prefers-reduced-motion`
 * (`main.css`) documenta su propio funcionamiento diciendo «`animation-iteration-count: 1`
 * es lo que corta los giros `infinite`», y esa frase satisface el patrón entera.
 * Es la misma trampa que ya resolvió `tokens-contrast.spec.ts` al leer
 * `primitives.css` sin comentarios: allí el aserto «no vuelve a `--danger-200`»
 * fallaba contra la lápida que explica que se retiró.
 *
 * Una guarda que se dispara contra la documentación del arreglo que la respeta
 * enseña justo lo contrario de lo que quiere enseñar: que documentar sale caro.
 *
 * Cada carácter del comentario se sustituye por un espacio en vez de borrarlo,
 * porque el informe señala `fichero:línea` y borrar desplazaría todas las líneas
 * siguientes — la guarda apuntaría a un sitio equivocado.
 *
 * Se filtran SOLO los comentarios de bloque (los de barra-asterisco, CSS y JS) y
 * los de HTML (`<!-- … -->`, plantillas Vue). Los de línea (doble barra) se
 * dejan a propósito: esa misma secuencia aparece dentro de cualquier URL, y
 * filtrarla bien exige distinguir comentario de cadena, es decir, un
 * tokenizador. Un filtro demasiado listo se traga código y deja la guarda muda,
 * que es peor fallo que un falso positivo — este al menos se ve.
 */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (bloque) =>
    bloque.replace(/[^\n]/g, ' '),
  )
}

/** Las líneas de un fichero listas para barrer: sin comentarios y con su numeración intacta. */
function lineasBarribles(ruta: string): string[] {
  return sinComentarios(readFileSync(ruta, 'utf8')).split(/\r?\n/)
}

interface Hallazgo {
  fichero: string
  linea: number
  regla: Regla
  texto: string
}

function barrer(raiz: string = SRC, exentos: ReadonlySet<string> = EXENTOS): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  for (const fichero of ficherosDeEstilo(raiz)) {
    if (exentos.has(fichero)) continue
    const lineas = lineasBarribles(join(raiz, fichero))
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
      // Mismo filtro de comentarios que el barrido: si aquí se leyera el texto
      // crudo, una excepción cuya única coincidencia estuviera en un comentario
      // se daría por vigente y seguiría eximiendo al fichero para siempre.
      return !lineasBarribles(ruta).some((l) => REGLAS.some((r) => r.patron.test(l)))
    })

    expect(
      obsoletas,
      `Estas excepciones ya no hacen falta: bórralas de DEUDA_CONOCIDA en ` +
        `tests/unit/loader-guard.spec.ts y, si la lista queda vacía, cierra ` +
        `https://github.com/kefaroTech/vetsoftware-public-web/issues/112`,
    ).toEqual([])
  })

  /**
   * CONTRAPRUEBA DEL FILTRO DE COMENTARIOS.
   *
   * Ignorar los comentarios es exactamente el movimiento que puede dejar la
   * guarda muda: un filtro que se pase de listo se traga también el código y
   * entonces todo pasa, siempre, y nadie se entera. Así que el filtro se ejercita
   * en los dos sentidos, contra ficheros de verdad en un directorio temporal y
   * con el MISMO `barrer()` que barre `src/` — no con una copia del regex.
   *
   * El directorio va fuera del repo a propósito: probar esto metiendo un spinner
   * de mentira dentro de `src/` dejaría la prueba a merced de que alguien olvide
   * revertirlo, y un fallo en mitad del camino lo dejaría commiteado.
   */
  describe('el filtro de comentarios no ciega la guarda', () => {
    let raiz: string

    beforeAll(() => {
      raiz = mkdtempSync(join(tmpdir(), 'loader-guard-'))

      // Un spinner REAL, con comentarios alrededor que dicen lo mismo que el código.
      // Las coincidencias válidas están en las líneas 9 (infinite) y 14 (rotate).
      writeFileSync(
        join(raiz, 'spinner-real.vue'),
        [
          '<template>',
          '  <!-- Menciona animation: x 1s infinite y rotate(360deg): es un comentario. -->',
          '  <div class="aro" />',
          '</template>',
          '',
          '<style scoped>',
          '/* Otro comentario: animation-iteration-count: infinite, rotate(360deg). */',
          '.aro {',
          '  animation: girar 0.8s linear infinite;',
          '}',
          '',
          '@keyframes girar {',
          '  to {',
          '    transform: rotate(360deg);',
          '  }',
          '}',
          '</style>',
          '',
        ].join('\n'),
        'utf8',
      )

      // Réplica fiel del falso positivo que motivó el arreglo: `main.css` documentando
      // su propio bloque de `prefers-reduced-motion`. Aquí no hay ninguna animación.
      writeFileSync(
        join(raiz, 'solo-comentarios.css'),
        [
          '/* Guarda global de movimiento reducido:',
          '   `animation-iteration-count: 1` es lo que corta los giros `infinite`,',
          '   así que ya no hace falta ningún rotate(360deg) propio. */',
          '.algo {',
          '  color: red;',
          '}',
          '',
        ].join('\n'),
        'utf8',
      )
    })

    afterAll(() => rmSync(raiz, { recursive: true, force: true }))

    it('SIGUE cazando una animación infinita real y su rotate(360deg)', () => {
      const hallazgos = barrer(raiz, new Set<string>())
        .filter((h) => h.fichero === 'spinner-real.vue')
        .map((h) => `${h.linea}:${h.regla.nombre}`)

      // Las líneas exactas importan: si el filtro borrara los comentarios en vez de
      // vaciarlos, todo lo de abajo se desplazaría y el informe apuntaría a otro sitio.
      expect(hallazgos).toEqual(['9:animación infinita', '14:rotate(360deg)'])
    })

    it('NO se dispara contra un comentario que describe la propia regla', () => {
      const hallazgos = barrer(raiz, new Set<string>()).filter(
        (h) => h.fichero === 'solo-comentarios.css',
      )

      expect(
        hallazgos.map((h) => `${h.linea}: ${h.texto}`),
        'la guarda vuelve a denunciar a la documentación del arreglo que la respeta',
      ).toEqual([])
    })
  })
})
