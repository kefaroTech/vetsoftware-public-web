import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve, join, sep } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * GUARDA DE REPOSITORIO — toda animación en bucle se puede parar.
 *
 * ── Qué medía esto antes, y por qué se cambió ─────────────────────────────
 * Hasta #232 la regla decía «solo `PawLoader.vue` puede declarar una animación
 * infinita». Eso es una regla sobre el AUTOR, no sobre el riesgo. El riesgo lo
 * escribía la propia regla en su motivo: «una animación suelta no trae guarda
 * de `prefers-reduced-motion`». Mientras `PawLoader` fue la única animación
 * sancionada del proyecto, autor y riesgo coincidieron y la regla funcionó.
 *
 * Dejaron de coincidir en cuanto hubo un segundo caso legítimo (el esqueleto de
 * carga, #212), y ahí se vio que el proxy fallaba en las DOS direcciones:
 *
 *   - Falso positivo: `.ds-skeleton` cumplía la condición que importa —apaga su
 *     destello con movimiento reducido— y aun así ponía el trinquete en rojo.
 *     Un trinquete rojo por algo correcto se muere sin que nadie lo desactive.
 *   - Falso negativo, que es el grave: `animation: latir 1.2s ease-in-out 3`
 *     escrito en un `<style scoped>` no contiene `infinite` ni `rotate(360deg)`,
 *     así que la regla vieja no decía nada — y es exactamente el defecto que
 *     decía perseguir.
 *
 * Una comprobación que da falsos positivos sobre lo correcto Y deja pasar lo
 * peligroso no está midiendo lo que cree. Así que ahora mide la condición:
 *
 *   TODA declaración que haga repetirse a un elemento tiene, EN SU MISMO
 *   FICHERO, un bloque `@media (prefers-reduced-motion: reduce)` que apaga
 *   ese mismo selector Y QUE PUEDE GANARLE EN LA CASCADA.
 *
 * ── La segunda mitad de esa frase es #236 ─────────────────────────────────
 * La primera versión de esta regla se conformaba con que la guarda estuviera
 * escrita, y eso es el mismo error un escalón más abajo: dar por buena una
 * guarda ESCRITA sin saber si GANA. Hay cuatro maneras de tenerla puesta y que
 * no sirva de nada, y las cuatro se comprueban sin navegador:
 *
 *   1. `!important` en la animación y no en la guarda. `!important` es una capa,
 *      no un rango infinito: dentro de ella vuelve a mandar la especificidad.
 *      Una animación `!important` en un `<style scoped>` le gana a la guarda
 *      local sin `!important` Y a la global de `base.css`, que declara sobre `*`
 *      y por tanto tiene la especificidad más baja que existe.
 *   2. La guarda es menos específica: `.tarjeta .aro` le gana a `.aro`.
 *   3. La guarda va ANTES en el fichero, a igual especificidad. `public-auth.css`
 *      ya lo decía de su propio bloque en un comentario; ahora es una condición.
 *   4. El bloque nombra el selector pero no toca la animación — solo le repinta
 *      el fondo, por ejemplo. Nombrar no es apagar.
 *
 * Y hay dos en las que el analizador NO decide y lo dice en voz alta, porque
 * inventarse el número sería exactamente la clase de respuesta que esta sesión
 * lleva desmontando: `:is()`/`:where()`/`:not()`, cuya especificidad depende de
 * lo que llevan dentro, y `@layer`, donde el orden de capas manda por encima de
 * todo lo anterior.
 *
 * Lo que sigue sin cubrirse, dicho aquí para que nadie lo dé por cubierto: una
 * animación escrita en un atributo `style=` de la plantilla. El analizador solo
 * mira dentro de `<style>`. La guarda global de `base.css` sí la alcanza —es
 * `!important` y los estilos en línea no lo son—, así que se para; lo que no
 * tiene es un reposo elegido. Hoy los únicos `style=` con animación del proyecto
 * declaran `animation-delay`, que no crea movimiento.
 *
 * ── Consecuencia deliberada: no hay lista de excepciones ───────────────────
 * Una regla que mide la condición correcta no necesita eximir a nadie. Lo que
 * antes eran excepciones sancionadas (`PawLoader`, `.ds-skeleton`) hoy pasan
 * por derecho propio, porque cumplen la condición. Lo único que queda enumerado
 * es DEUDA: ficheros que hoy la incumplen de verdad, cada uno con su issue.
 * Una lista de excepciones es siempre superficie que mantener y que envejece;
 * esta regla no tiene ninguna.
 *
 * ── Por qué se exige guarda LOCAL si ya hay una global ─────────────────────
 * `base.css` trae desde #111 una guarda global que apaga el movimiento de todo
 * el proyecto, y es el suelo — hay una prueba dedicada a que siga intacta. Pero
 * la global solo sabe ACORTAR: pone la duración en `0.01ms` y las iteraciones
 * en `1`. Eso detiene el movimiento, no elige el estado en reposo. Un destello
 * de esqueleto congelado a mitad de su degradado se ve roto; `.ds-skeleton`
 * declara `background: var(--warm-150)` en su bloque local precisamente para
 * que el reposo tenga un aspecto deliberado. La global garantiza que se para;
 * la local, que al pararse la interfaz siga teniendo sentido.
 *
 * Y se exige en el MISMO fichero a propósito: una guarda escrita en otra hoja
 * se puede borrar sin que nada la eche de menos. La guarda viaja con lo que
 * protege, o no protege nada.
 *
 * ── Lo que esta prueba NO mide, y conviene no confundir ────────────────────
 * Razona sobre la cascada, pero no la ejecuta: trabaja con el texto de UN
 * fichero. No sabe qué le llega de otras hojas, ni qué gana de verdad en el
 * navegador. Eso lo mide `e2e/movimiento-reducido.spec.ts`, que sí tiene motor
 * de estilos. Aquí se comprueba que la decisión está escrita y que PUEDE
 * ganar; allí, que el navegador le hace caso. Ninguna sustituye a la otra.
 *
 * Tampoco juzga si el estado en reposo es correcto o bonito. Solo que existe.
 *
 * ── El nombre del fichero ──────────────────────────────────────────────────
 * Se llama `loader-guard.spec.ts` por herencia: nació vigilando loaders. Hoy
 * vigila movimiento en bucle, que es más ancho. No se renombró porque hay
 * issues abiertos (#112, #212, #232) que lo citan por su ruta; se renombra
 * cuando se cierren.
 */

const SRC = resolve(import.meta.dirname, '../../src')

/** El loader del proyecto, y el único lenguaje de espera sancionado. */
const EL_LOADER = 'components/feedback/PawLoader.vue'

/** La hoja del design system. Gemelo TR-02: lo que se decida aquí vale allí. */
const LAS_PRIMITIVAS = 'assets/styles/primitives.css'

/** La capa 0: ahí vive la guarda global de movimiento, que es el suelo de todo. */
const LA_BASE = 'assets/styles/base.css'

/**
 * DEUDA — animaciones en bucle que hoy NO tienen guarda. Ver
 * https://github.com/kefaroTech/vetsoftware-public-web/issues/112
 *
 * Ojo a la diferencia con la lista que había antes de #232: esto ya no son
 * «ficheros que animan sin ser PawLoader», son ficheros que incumplen la
 * CONDICIÓN REAL. Son los `.pub-spin` copiados en `<style scoped>` sin ninguna
 * guarda, más la hoja pública, donde el bloque de movimiento reducido existe y
 * enumera `.pub-reveal` y `.pub-drift` pero se deja fuera `.pub-spin` — que es
 * literalmente lo que denuncia #112.
 *
 * Van dos menos: las dos pantallas que llegan por enlace de correo
 * —`RestablecerContrasenaView` y `VerifyEmailView`— cambiaron su aro copiado por
 * `PawLoader`, que es el único lenguaje de espera del producto y trae su propia
 * guarda de movimiento reducido. No es que se les añadiera una guarda: es que ya
 * no animan nada propio. Quedan los dos aros de `components/public/` y la hoja.
 *
 * `.pub-drift` ya NO figura en ninguna lista: cumple la condición y pasa sola.
 * Por eso, cuando se cierre #112 y mueran los `pub-spin` que quedan, la entrada
 * de `public-auth.css` se podrá borrar de aquí sin discutir nada — hay un bloque
 * de pruebas abajo que lo comprueba contra una réplica de cómo quedará.
 */
const SIN_GUARDA_TODAVIA: readonly string[] = [
  'components/public/AuthSelect.vue',
  'components/public/PrimaryButton.vue',
  'assets/styles/public-auth.css',
]

/**
 * DEUDA de la segunda regla de este fichero, la de consistencia. Mismo issue,
 * defecto distinto: aquí no se juzga accesibilidad sino que el producto hable
 * un solo lenguaje de espera.
 */
const SPINNERS_CLASICOS_VIVOS: readonly string[] = ['assets/styles/public-auth.css']

/** Todos los `.vue` y `.css` bajo `raiz`, con ruta relativa y separador POSIX. */
function ficherosDeEstilo(raiz: string = SRC): string[] {
  return readdirSync(raiz, { recursive: true, encoding: 'utf8' })
    .map((p) => p.split(sep).join('/'))
    .filter((p) => p.endsWith('.vue') || p.endsWith('.css'))
    .sort()
}

/**
 * En un `.vue`, borra todo lo que no esté dentro de un `<style>`.
 *
 * No es cosmético: el analizador de abajo lleva una pila de llaves, y el
 * `<script setup>` de cualquier SFC está lleno de llaves que no son CSS. Sin
 * este filtro la pila se descuadra y el selector que se le atribuye a una
 * declaración es basura — la guarda diría cosas falsas, que es peor que callar.
 *
 * Se sustituye por espacios en vez de recortar, igual que en `sinComentarios`:
 * el informe señala `fichero:línea` y recortar desplazaría la numeración.
 */
function soloEstilos(fuente: string, ruta: string): string {
  if (ruta.endsWith('.css')) return fuente

  let salida = fuente.replace(/[^\n]/g, ' ')
  const bloques = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null

  while ((m = bloques.exec(fuente)) !== null) {
    const cuerpo = m[1] ?? ''
    const inicio = m.index + m[0].indexOf('>') + 1
    salida = salida.slice(0, inicio) + cuerpo + salida.slice(inicio + cuerpo.length)
  }
  return salida
}

/**
 * Vacía los comentarios CONSERVANDO el número de líneas.
 *
 * La guarda casa contra texto, así que casaría también dentro de un comentario.
 * Se denunció a sí misma en su día: el bloque global de `prefers-reduced-motion`
 * (`base.css`, antes `main.css`) documenta su propio funcionamiento diciendo
 * «`animation-iteration-count: 1` es lo que corta los giros `infinite`», y esa
 * frase satisfacía el patrón entera. Es la misma trampa que ya resolvió
 * `tokens-contrast.spec.ts` al leer `primitives.css` sin comentarios.
 *
 * Una guarda que se dispara contra la documentación del arreglo que la respeta
 * enseña justo lo contrario de lo que quiere enseñar: que documentar sale caro.
 *
 * Se filtran SOLO los comentarios de bloque y los de HTML. Los de línea (doble
 * barra) se dejan a propósito: esa misma secuencia aparece dentro de cualquier
 * URL, y filtrarla bien exige un tokenizador. Un filtro demasiado listo se
 * traga código y deja la guarda muda, que es peor fallo que un falso positivo
 * — este al menos se ve.
 */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (bloque) =>
    bloque.replace(/[^\n]/g, ' '),
  )
}

/**
 * Caché del análisis por fichero, y criba barata antes de analizar.
 *
 * El analizador recorre el CSS carácter a carácter, y `src/` son ~350 ficheros:
 * una pasada completa cuesta unos segundos y aquí se barre desde varias
 * pruebas. Sin esto, la de obsolescencia —que barre una vez por entrada de
 * deuda— se comía el `testTimeout` de 5 s y la guarda fallaba por lenta, que es
 * la manera más tonta de que alguien acabe borrándola.
 *
 * La criba es segura: un fichero sin `animation` ni `rotate(` no puede producir
 * hallazgo de ninguna de las dos reglas, así que no hace falta ni mirarlo.
 * Se busca sobre el texto CRUDO a propósito — si la palabra solo aparece en un
 * comentario, el análisis se hace igual y es el filtro de comentarios el que
 * decide, que es donde esa decisión está probada.
 */
const CACHE_ANALISIS = new Map<string, Analisis>()
const SIN_NADA_QUE_MIRAR: Analisis = { declaraciones: [], guardas: [], usaCapas: false }

function analisisDe(raiz: string, fichero: string): Analisis {
  const clave = join(raiz, fichero)
  const cacheado = CACHE_ANALISIS.get(clave)
  if (cacheado) return cacheado

  const crudo = readFileSync(clave, 'utf8')
  const analisis = /animation|rotate\(/i.test(crudo)
    ? analizar(sinComentarios(soloEstilos(crudo, fichero)))
    : SIN_NADA_QUE_MIRAR

  CACHE_ANALISIS.set(clave, analisis)
  return analisis
}

interface Declaracion {
  propiedad: string
  valor: string
  linea: number
  /** El selector del bloque que la contiene, tal cual está escrito. */
  selector: string
  /** Las ramas de ese selector, ya con su peso de especificidad. */
  ramas: Rama[]
  importante: boolean
  enGuarda: boolean
  enKeyframes: boolean
}

interface Analisis {
  declaraciones: Declaracion[]
  /**
   * Las declaraciones `animation*` que viven DENTRO de un bloque de movimiento
   * reducido. No son «los selectores que la guarda nombra»: son las que de
   * verdad apagan algo. La diferencia importa — un bloque que nombra `.aro`
   * pero solo le cambia el `background` no para ninguna animación, y la versión
   * anterior de esta regla lo daba por guardado.
   */
  guardas: Declaracion[]
  /**
   * El fichero usa `@layer`. Entonces el orden de capas manda por encima de la
   * especificidad y de todo lo que este analizador sabe calcular, así que sus
   * veredictos dejan de valer. Hoy no lo usa nadie en `src/`; se detecta para
   * que el día que alguien lo introduzca la regla lo diga en vez de mentir.
   */
  usaCapas: boolean
}

const ES_GUARDA = /@media[^{]*prefers-reduced-motion/i

/** Una rama de una lista de selectores (`.a, .b` son dos ramas). */
interface Rama {
  /** Clases (o `*`, o el elemento) por las que se empareja con otra rama. */
  tokens: string[]
  /**
   * Peso de especificidad. `null` = no se puede calcular con honestidad, que es
   * distinto de cero: ver `pesoDe`.
   */
  peso: number | null
  texto: string
}

/**
 * Especificidad aproximada de una rama, para poder comparar dos.
 *
 * Es una aproximación deliberada, no la especificación de CSS: cuenta ids,
 * clases/atributos/pseudoclases y elementos con los pesos habituales. Sirve
 * para lo único que aquí se pregunta —si la guarda puede ganarle a lo que
 * intenta apagar—, y todo el CSS de este proyecto son selectores de clase.
 *
 * `:is()`, `:where()` y `:not()` devuelven `null`: su especificidad depende de
 * lo que llevan dentro (`:where()` vale 0, `:is()` el máximo de sus ramas) y
 * calcularla bien exige un parser de selectores. Ante la duda NO se inventa un
 * número: la regla lo dice en voz alta y que lo mire una persona. Una guarda
 * que adivina mal en silencio es peor que una que pregunta.
 */
function pesoDe(rama: string): number | null {
  if (/:is\(|:where\(|:not\(/i.test(rama)) return null

  const ids = (rama.match(/#[\w-]+/g) ?? []).length
  const clases = (rama.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?![\w-]*\()/g) ?? []).length
  const elementos = (rama.match(/(?:^|[\s>+~])[a-z][\w-]*/gi) ?? []).length

  return ids * 10000 + clases * 100 + elementos
}

/**
 * Parte una lista de selectores en ramas comparables.
 *
 * Se emparejan por clase porque así está escrito el CSS del proyecto entero. Un
 * selector sin clase (`div`, `svg`) cae al texto del selector sin pseudos, que
 * es tosco pero honesto: prefiere no reconocer una guarda que sí existe
 * —falso positivo, ruidoso y visible— a dar por guardado algo que no lo está.
 */
function ramasDe(selector: string): Rama[] {
  return selector
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((texto) => {
      const tokens = texto.startsWith('*')
        ? ['*']
        : (texto.match(/\.[\w-]+/g) ??
          [texto.replace(/::?[\w-]+(\([^)]*\))?/g, '').trim()].filter(Boolean))
      return { tokens, peso: pesoDe(texto), texto }
    })
}

/**
 * Analiza CSS con una pila de llaves. No es un parser de CSS y no pretende
 * serlo: reconoce bloques, selectores y declaraciones, que es todo lo que esta
 * política necesita saber. Lo que hay que saber de verdad —quién gana en la
 * cascada— no se puede saber sin navegador, y por eso vive en el e2e.
 */
function analizar(css: string): Analisis {
  const declaraciones: Declaracion[] = []
  const guardas: Declaracion[] = []
  const pila: string[] = []

  let buffer = ''
  let linea = 1
  let lineaDecl = 1

  for (const c of css) {
    if (c === '\n') linea++

    if (c === '{') {
      pila.push(buffer.trim().replace(/\s+/g, ' '))
      buffer = ''
    } else if (c === '}') {
      pila.pop()
      buffer = ''
    } else if (c === ';') {
      const m = /^([-\w]+)\s*:\s*([\s\S]*)$/.exec(buffer.trim())
      if (m && pila.length > 0) {
        const selector = pila[pila.length - 1] ?? ''
        const valor = m[2] ?? ''
        const d: Declaracion = {
          propiedad: (m[1] ?? '').toLowerCase(),
          valor,
          linea: lineaDecl,
          selector,
          ramas: ramasDe(selector),
          importante: /!\s*important\b/i.test(valor),
          enGuarda: pila.some((p) => ES_GUARDA.test(p)),
          enKeyframes: pila.some((p) => /^@keyframes\b/i.test(p)),
        }
        declaraciones.push(d)
        if (d.enGuarda && !d.enKeyframes && d.propiedad.startsWith('animation')) guardas.push(d)
      }
      buffer = ''
    } else {
      if (buffer.trim() === '' && c.trim() !== '') lineaDecl = linea
      buffer += c
    }
  }

  return { declaraciones, guardas, usaCapas: /@layer\b/i.test(css) }
}

/** Quita `var(…)`, `cubic-bezier(…)`, `steps(…)`: dentro hay números que no cuentan. */
function sinFunciones(valor: string): string {
  return valor.replace(/[\w-]+\([^()]*\)/g, ' ')
}

/** ¿Hay en el valor una cuenta de iteraciones mayor que uno? */
function repiteMasDeUnaVez(valor: string): boolean {
  return sinFunciones(valor)
    .split(/[\s,]+/)
    .some((t) => /^\d+(?:\.\d+)?$/.test(t) && Number(t) > 1)
}

/**
 * ¿Esta declaración hace que algo se repita?
 *
 * `infinite` es el caso obvio. La cuenta numérica es el que la regla vieja
 * dejaba pasar: en el atajo `animation`, un número SIN unidad es la cuenta de
 * iteraciones (`animation: latir 1.2s ease-in-out 3`), y los tiempos siempre
 * llevan `s` o `ms`. Una animación de una sola pasada no entra: es movimiento
 * que termina solo, no algo que haya que poder parar.
 */
function esEnBucle(d: Declaracion): boolean {
  if (d.enGuarda || d.enKeyframes) return false
  if (d.propiedad === 'animation-iteration-count') {
    return /\binfinite\b/i.test(d.valor) || repiteMasDeUnaVez(d.valor)
  }
  if (d.propiedad !== 'animation') return false
  return /\binfinite\b/i.test(d.valor) || repiteMasDeUnaVez(d.valor)
}

type Motivo =
  | 'sin guarda'
  | 'la guarda no lleva !important y la animación sí'
  | 'la guarda es menos específica que la animación'
  | 'la guarda va antes en el fichero y no le gana por especificidad'
  | 'no se puede decidir la especificidad'

interface Hallazgo {
  fichero: string
  linea: number
  selector: string
  texto: string
  /** Solo la regla de movimiento reducido lo usa; la de consistencia no juzga guardas. */
  motivo?: Motivo
}

/** ¿Esta guarda apunta a lo mismo que esta rama animada? */
function apuntaA(guarda: Declaracion, animada: Rama): boolean {
  return guarda.ramas.some(
    (g) => g.tokens.includes('*') || g.tokens.some((t) => animada.tokens.includes(t)),
  )
}

/**
 * ¿Puede esta guarda ganarle a esta declaración? `null` = no se puede decidir.
 *
 * Es el corazón de #236. Que la guarda esté escrita no significa que se aplique:
 * la cascada la decide, y hay tres maneras de perderla, todas comprobables aquí
 * sin navegador:
 *
 *   1. `!important`. Es una capa, no un rango infinito: dentro de la capa de
 *      autor-importante vuelve a mandar la especificidad. Una animación
 *      `!important` en un `<style scoped>` le gana tanto a una guarda local sin
 *      `!important` como a la guarda global de `base.css`, que declara sobre `*`
 *      y por tanto tiene la especificidad más baja posible.
 *   2. Especificidad. `.card .aro` le gana a `.aro`, así que una guarda escrita
 *      sobre la clase suelta no apaga la animación del descendiente.
 *   3. Orden. A igual especificidad gana la última, así que una guarda escrita
 *      ANTES de lo que quiere apagar no apaga nada. `public-auth.css:134-138` ya
 *      lo dice de su propio bloque: «van después en el mismo fichero, así que la
 *      cascada ya gana». Eso es una condición, y aquí se comprueba.
 */
function guardaGana(
  guarda: Declaracion,
  animada: Declaracion,
  ramaAnimada: Rama,
): { gana: boolean; motivo: Motivo } | null {
  if (animada.importante && !guarda.importante) {
    return { gana: false, motivo: 'la guarda no lleva !important y la animación sí' }
  }
  if (!animada.importante && guarda.importante) return { gana: true, motivo: 'sin guarda' }

  const pesoGuarda = guarda.ramas
    .filter((g) => g.tokens.includes('*') || g.tokens.some((t) => ramaAnimada.tokens.includes(t)))
    .map((g) => g.peso)

  if (ramaAnimada.peso === null || pesoGuarda.some((p) => p === null)) return null

  const mejor = Math.max(...pesoGuarda.filter((p): p is number => p !== null))
  if (mejor > ramaAnimada.peso) return { gana: true, motivo: 'sin guarda' }
  if (mejor < ramaAnimada.peso) {
    return { gana: false, motivo: 'la guarda es menos específica que la animación' }
  }
  return guarda.linea > animada.linea
    ? { gana: true, motivo: 'sin guarda' }
    : { gana: false, motivo: 'la guarda va antes en el fichero y no le gana por especificidad' }
}

/**
 * Barre `raiz` y devuelve las animaciones en bucle que no tienen, en su mismo
 * fichero, una guarda de movimiento reducido QUE PUEDA GANARLES.
 */
function sinGuarda(
  raiz: string = SRC,
  exentos: readonly string[] = SIN_GUARDA_TODAVIA,
): Hallazgo[] {
  const hallazgos: Hallazgo[] = []

  for (const fichero of ficherosDeEstilo(raiz)) {
    if (exentos.includes(fichero)) continue
    const { declaraciones, guardas, usaCapas } = analisisDe(raiz, fichero)

    for (const d of declaraciones) {
      if (!esEnBucle(d)) continue

      for (const rama of d.ramas) {
        const candidatas = guardas.filter((g) => apuntaA(g, rama))
        let motivo: Motivo = 'sin guarda'

        if (candidatas.length > 0) {
          // Con `@layer` en el fichero, el orden de capas manda por encima de
          // la especificidad y todo lo que se calcula aquí deja de valer. No se
          // aprueba ni se rechaza a ciegas: se pide que lo mire una persona.
          const veredictos = usaCapas ? [null] : candidatas.map((g) => guardaGana(g, d, rama))
          if (veredictos.some((v) => v?.gana)) continue
          motivo = veredictos.some((v) => v === null)
            ? 'no se puede decidir la especificidad'
            : (veredictos.find((v) => v && !v.gana)?.motivo ?? 'sin guarda')
        }

        hallazgos.push({
          fichero,
          linea: d.linea,
          selector: rama.texto,
          texto: `${d.propiedad}: ${d.valor.trim()}`,
          motivo,
        })
      }
    }
  }
  return hallazgos
}

/** Los `@keyframes` que dan una vuelta completa: la firma del spinner clásico. */
function girosCompletos(
  raiz: string = SRC,
  exentos: readonly string[] = SPINNERS_CLASICOS_VIVOS,
): Hallazgo[] {
  const hallazgos: Hallazgo[] = []

  for (const fichero of ficherosDeEstilo(raiz)) {
    if (exentos.includes(fichero) || fichero === EL_LOADER) continue
    for (const d of analisisDe(raiz, fichero).declaraciones) {
      if (d.enKeyframes && /\brotate\(\s*360deg\s*\)/i.test(d.valor)) {
        hallazgos.push({
          fichero,
          linea: d.linea,
          selector: d.selector,
          texto: `${d.propiedad}: ${d.valor.trim()}`,
        })
      }
    }
  }
  return hallazgos
}

function informe(hallazgos: readonly Hallazgo[]): string {
  return hallazgos
    .map(
      (h) =>
        `\n  src/${h.fichero}:${h.linea}  (${h.selector})\n      ${h.texto}` +
        (h.motivo ? `\n      → ${h.motivo}` : ''),
    )
    .join('')
}

describe('toda animación en bucle se puede parar', () => {
  it('cada animación que se repite trae su prefers-reduced-motion en el mismo fichero', () => {
    const hallazgos = sinGuarda()

    expect(
      hallazgos.map((h) => `src/${h.fichero}:${h.linea}`),
      hallazgos.length === 0
        ? ''
        : `Animaciones en bucle sin guarda de movimiento reducido:${informe(hallazgos)}\n\n` +
            `      REGLA: lo que se repite tiene que poder pararse, y el estado en reposo lo\n` +
            `      elige quien escribe la animación — la guarda global de base.css solo sabe\n` +
            `      acortar a 0.01ms, y puede dejar el elemento congelado a media animación.\n` +
            `      SALIDA: añade en ESTE fichero un @media (prefers-reduced-motion: reduce)\n` +
            `      que nombre el mismo selector y declare cómo se ve parado. Si lo que\n` +
            `      querías era un indicador de espera, usa <PawLoader> y te lo ahorras.\n` +
            `      Si es deuda que alguien va a migrar, va a SIN_GUARDA_TODAVIA con su issue.\n`,
    ).toEqual([])
  })

  it('el barrido llega a los ficheros que dice barrer', () => {
    // Sin esto, un cambio de estructura de carpetas dejaría la guarda en verde
    // por no encontrar nada, que es el modo silencioso de romper un trinquete.
    const ficheros = ficherosDeEstilo()

    expect(ficheros.length).toBeGreaterThan(200)
    expect(ficheros).toContain(EL_LOADER)
    expect(ficheros).toContain(LAS_PRIMITIVAS)
    expect(ficheros).toContain('features/tienda/components/PosCashGate.vue')
  })

  it('los casos legítimos pasan sin figurar en ninguna lista de excepciones', () => {
    // Este es el resultado de #232 y conviene fijarlo: `PawLoader` y el esqueleto
    // de carga NO están exentos de nada. Pasan porque cumplen la condición. Si
    // alguna vez hiciera falta volver a eximirlos, la regla habría dejado de
    // medir lo que dice medir y habría que revisarla, no ampliar una lista.
    const sospechosos = sinGuarda(SRC, []).map((h) => h.fichero)

    expect(sospechosos).not.toContain(EL_LOADER)
    expect(sospechosos).not.toContain(LAS_PRIMITIVAS)
  })

  it('la guarda global de base.css sigue siendo el suelo', () => {
    // La regla de arriba exige guarda LOCAL, pero el suelo del proyecto entero
    // —incluidas las animaciones y transiciones de una sola pasada, que esta
    // regla no mira— es el bloque global de #111. Si desapareciera, lo que aquí
    // se comprueba dejaría de ser un refuerzo y pasaría a ser lo único.
    const base = sinComentarios(readFileSync(join(SRC, LA_BASE), 'utf8'))

    expect(
      ES_GUARDA.test(base) && /animation-iteration-count:\s*1\s*!important/i.test(base),
      `src/${LA_BASE} ya no corta los bucles con \`animation-iteration-count: 1 !important\`. ` +
        `Es la red que cubre a TODA animación del proyecto; sin ella cada una depende solo ` +
        `de su guarda local.`,
    ).toBe(true)
  })

  it('ninguna entrada de deuda se ha quedado obsoleta', () => {
    // Una entrada que ya no existe, o que ya cumple la condición, es un agujero
    // abierto: exime a un nombre que cualquiera puede volver a usar sin que la
    // prueba diga nada.
    const conHallazgo = new Set(sinGuarda(SRC, []).map((h) => h.fichero))
    const obsoletas = SIN_GUARDA_TODAVIA.filter(
      (fichero) => !existsSync(join(SRC, fichero)) || !conHallazgo.has(fichero),
    )

    expect(
      obsoletas,
      `Estas entradas ya cumplen la condición: bórralas de SIN_GUARDA_TODAVIA en ` +
        `tests/unit/loader-guard.spec.ts y, si la lista queda vacía, cierra ` +
        `https://github.com/kefaroTech/vetsoftware-public-web/issues/112`,
    ).toEqual([])
  })
})

/**
 * SEGUNDA REGLA, Y ES OTRO OBJETIVO — consistencia, no accesibilidad.
 *
 * Va aparte y con su propio nombre a propósito. Mezclarla con la de arriba es
 * exactamente cómo nació el proxy que #232 tuvo que deshacer: una comprobación
 * que perseguía la consistencia del lenguaje de espera se justificaba con un
 * argumento de accesibilidad, y acabó midiendo mal las dos cosas.
 *
 * Esta regla NO hace ninguna afirmación sobre accesibilidad. Un spinner clásico
 * con su guarda de movimiento reducido es accesible y aun así sobra: el
 * producto tiene un solo lenguaje de espera y es `PawLoader`. Es lo que limpió
 * EST-11 en el punto de venta, y su valor es hacia adelante — que el siguiente
 * aro giratorio no llegue a producción como llegó aquel.
 *
 * Su apuesta es baja a propósito: solo mira la firma del giro completo dentro
 * de unos `@keyframes`. No intenta adivinar intenciones.
 */
describe('el lenguaje de espera sigue siendo uno solo', () => {
  it('ningún fichero declara los @keyframes de un spinner clásico', () => {
    const hallazgos = girosCompletos()

    expect(
      hallazgos.map((h) => `src/${h.fichero}:${h.linea}`),
      hallazgos.length === 0
        ? ''
        : `Giros completos declarados fuera del loader:${informe(hallazgos)}\n\n` +
            `      REGLA: esto es CONSISTENCIA, no accesibilidad — añadirle una guarda de\n` +
            `      movimiento reducido no lo arregla. El producto tiene un lenguaje de\n` +
            `      espera y es <PawLoader :size="…" :glow="false" label="…" />, como en\n` +
            `      PosCashGate. Si el giro es decorativo y no comunica espera, no debería\n` +
            `      dar la vuelta entera.\n`,
    ).toEqual([])
  })
})

/**
 * CONTRAPRUEBAS.
 *
 * Una guarda que no se ejercita en las dos direcciones no se sabe si mide. Y
 * esta reescritura tiene dos maneras de morir en silencio: que el filtro de
 * comentarios se pase de listo y se trague el código, o que el analizador dé
 * por guardada una animación que no lo está. Las dos se prueban aquí, con
 * ficheros de verdad en un directorio temporal y con las MISMAS funciones que
 * barren `src/` — no con una copia del regex.
 *
 * El directorio va fuera del repo a propósito: sembrar un spinner de mentira
 * dentro de `src/` dejaría la prueba a merced de que alguien olvide revertirlo,
 * y un fallo a mitad de camino lo dejaría commiteado.
 */
describe('la guarda muerde en las dos direcciones', () => {
  let raiz: string

  beforeAll(() => {
    raiz = mkdtempSync(join(tmpdir(), 'loader-guard-'))
    mkdirSync(join(raiz, 'sub'), { recursive: true })

    // EL CASO QUE LA REGLA VIEJA DEJABA PASAR: repetición por cuenta numérica,
    // en un `<style scoped>`, sin `infinite` y sin `rotate(360deg)` por ninguna
    // parte. El `<script setup>` de arriba está lleno de llaves a propósito: si
    // el analizador las contara, el selector atribuido sería basura.
    writeFileSync(
      join(raiz, 'sub', 'PulsoLocal.vue'),
      [
        '<script setup lang="ts">',
        'const cosas = { a: 1, b: { c: 2 } }',
        'function f() { if (cosas.a) { return { x: 1 } } }',
        '</script>',
        '',
        '<template>',
        '  <div class="pulso" />',
        '</template>',
        '',
        '<style scoped>',
        '.pulso {',
        '  animation: latir 1.2s ease-in-out 3;',
        '}',
        '</style>',
        '',
      ].join('\n'),
      'utf8',
    )

    // LEGÍTIMO: se repite para siempre, pero dice cómo se ve parado. Réplica de
    // la forma exacta de `.ds-skeleton`.
    writeFileSync(
      join(raiz, 'legitimo.css'),
      [
        '.destello {',
        '  background: linear-gradient(90deg, #eee 25%, #fff 37%, #eee 63%);',
        '  animation: brillo 1.4s ease-in-out infinite;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .destello {',
        '    animation: none;',
        '    background: #eee;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // GUARDA QUE NO CUBRE: el bloque existe, pero nombra otra clase. Es el
    // defecto real de `public-auth.css` con `.pub-spin`, y el que una regla
    // «¿tiene el fichero algún prefers-reduced-motion?» daría por bueno.
    writeFileSync(
      join(raiz, 'guarda-que-no-cubre.css'),
      [
        '.aro {',
        '  animation: girar 0.7s linear infinite;',
        '}',
        '',
        '.entrada {',
        '  animation: aparecer 0.3s ease-out;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .entrada {',
        '    animation: none;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // Réplica fiel del falso positivo que motivó el filtro de comentarios:
    // `base.css` documentando su propio bloque. Aquí no hay ninguna animación.
    writeFileSync(
      join(raiz, 'solo-comentarios.css'),
      [
        '/* Guarda global de movimiento reducido:',
        '   `animation-iteration-count: 1` es lo que corta los giros `infinite`,',
        '   así que ya no hace falta ningún animation: girar 1s infinite propio. */',
        '.algo {',
        '  color: red;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )
  })

  afterAll(() => rmSync(raiz, { recursive: true, force: true }))

  it('CAZA una repetición numérica en un <style scoped>, que el patrón viejo no veía', () => {
    const hallazgos = sinGuarda(raiz, []).filter((h) => h.fichero === 'sub/PulsoLocal.vue')

    // La línea exacta importa: el filtro de `<style>` vacía el resto del fichero
    // en vez de recortarlo justamente para que el informe no mienta.
    expect(hallazgos.map((h) => `${h.linea}:${h.selector}:${h.texto}`)).toEqual([
      '12:.pulso:animation: latir 1.2s ease-in-out 3',
    ])
  })

  it('CAZA una guarda que existe pero nombra otro selector', () => {
    const hallazgos = sinGuarda(raiz, []).filter((h) => h.fichero === 'guarda-que-no-cubre.css')

    expect(
      hallazgos.map((h) => `${h.linea}:${h.selector}`),
      'basta con que el fichero tenga un bloque de movimiento reducido para dar por ' +
        'guardada una animación que ese bloque no nombra: la regla volvió a ser un proxy',
    ).toEqual(['2:.aro'])
  })

  it('DEJA PASAR una animación en bucle que declara cómo se ve parada', () => {
    const hallazgos = sinGuarda(raiz, []).filter((h) => h.fichero === 'legitimo.css')

    expect(
      hallazgos,
      'un caso legítimo vuelve a salir en rojo: es lo que mató a la regla anterior',
    ).toEqual([])
  })

  it('DEJA PASAR una animación de una sola pasada', () => {
    // Lo que termina solo no es lo que esta regla persigue. Ampliarla a todo lo
    // que se mueve la haría fallar en cientos de sitios el primer día, y una
    // guarda que nace en rojo se desactiva.
    expect(sinGuarda(raiz, []).map((h) => h.selector)).not.toContain('.entrada')
  })

  it('NO se dispara contra un comentario que describe la propia regla', () => {
    const hallazgos = sinGuarda(raiz, []).filter((h) => h.fichero === 'solo-comentarios.css')

    expect(
      hallazgos.map((h) => `${h.linea}: ${h.texto}`),
      'la guarda vuelve a denunciar a la documentación del arreglo que la respeta',
    ).toEqual([])
  })
})

/**
 * QUE LA GUARDA EXISTA NO BASTA: TIENE QUE PODER GANAR (#236).
 *
 * La primera versión de esta regla comprobaba que la guarda estuviera escrita.
 * Eso es el mismo error que #232 deshizo, un escalón más abajo: dar por buena
 * una guarda **escrita** sin saber si **gana**. Aquí se ejercitan las cuatro
 * maneras de perder la cascada teniendo el bloque puesto, y la contraria de
 * cada una, porque una regla que solo se prueba cuando falla no se sabe si
 * distingue o si simplemente denuncia a todo el mundo.
 */
describe('la guarda tiene que poder ganarle a lo que apaga', () => {
  let raiz: string

  beforeAll(() => {
    raiz = mkdtempSync(join(tmpdir(), 'loader-guard-cascada-'))

    // 1. `!important` en la animación, guarda sin él. El caso de #236: es lo que
    //    alguien añade cuando su animación «no se aplica», o sea peleando con la
    //    cascada que la detiene. El arreglo intuitivo del síntoma es justo lo
    //    que rompe la accesibilidad.
    writeFileSync(
      join(raiz, 'importante-suelto.css'),
      [
        '.aro {',
        '  animation: girar 0.7s linear infinite !important;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .aro {',
        '    animation: none;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // 1-bis. El par correcto: si la animación insiste, la guarda insiste igual.
    writeFileSync(
      join(raiz, 'importante-emparejado.css'),
      [
        '.aro {',
        '  animation: girar 0.7s linear infinite !important;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .aro {',
        '    animation: none !important;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // 2. Especificidad: `.tarjeta .aro` (0,2,0) le gana a `.aro` (0,1,0).
    writeFileSync(
      join(raiz, 'guarda-menos-especifica.css'),
      [
        '.tarjeta .aro {',
        '  animation: girar 0.7s linear infinite;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .aro {',
        '    animation: none;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // 3. Orden: a igual especificidad gana la última, así que una guarda escrita
    //    ANTES no apaga nada. `public-auth.css:134-138` ya lo sabía de su propio
    //    bloque; aquí deja de ser un comentario y pasa a ser una condición.
    writeFileSync(
      join(raiz, 'guarda-primero.css'),
      [
        '@media (prefers-reduced-motion: reduce) {',
        '  .aro {',
        '    animation: none;',
        '  }',
        '}',
        '',
        '.aro {',
        '  animation: girar 0.7s linear infinite;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // 4. El bloque nombra el selector pero NO toca la animación. Salió al
    //    implementar #236: la versión anterior daba por guardado cualquier
    //    selector mencionado dentro de un @media de movimiento reducido, y esto
    //    no para nada — solo repinta el fondo de algo que sigue girando.
    writeFileSync(
      join(raiz, 'guarda-que-no-apaga.css'),
      [
        '.aro {',
        '  animation: girar 0.7s linear infinite;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .aro {',
        '    background: #eee;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // 5-bis. Capas en cascada. Con `@layer`, el orden de las capas decide antes
    //    que la especificidad, así que aquí la guarda pierde pese a ir después y
    //    tener la misma especificidad — y el analizador no tiene forma de saberlo.
    writeFileSync(
      join(raiz, 'con-capas.css'),
      [
        '@layer base, componentes;',
        '',
        '@layer componentes {',
        '  .aro {',
        '    animation: girar 0.7s linear infinite;',
        '  }',
        '}',
        '',
        '@layer base {',
        '  @media (prefers-reduced-motion: reduce) {',
        '    .aro {',
        '      animation: none;',
        '    }',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    // 6. Especificidad indecidible. `:is()` vale el máximo de sus ramas y
    //    `:where()` vale cero; calcularlo bien exige un parser de selectores.
    //    La regla NO adivina: lo dice en voz alta para que lo mire una persona.
    writeFileSync(
      join(raiz, 'indecidible.css'),
      [
        '.zona :is(.a, .b) {',
        '  animation: girar 0.7s linear infinite;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .zona :is(.a, .b) {',
        '    animation: none;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )
  })

  afterAll(() => rmSync(raiz, { recursive: true, force: true }))

  const motivosDe = (fichero: string) =>
    sinGuarda(raiz, [])
      .filter((h) => h.fichero === fichero)
      .map((h) => h.motivo)

  it('CAZA una animación !important cuya guarda no lo lleva', () => {
    expect(motivosDe('importante-suelto.css')).toEqual([
      'la guarda no lleva !important y la animación sí',
    ])
  })

  it('DEJA PASAR el par correcto: animación !important y guarda !important', () => {
    expect(
      motivosDe('importante-emparejado.css'),
      'la regla exige !important a la guarda y luego no acepta que se lo pongan: es la mitad ' +
        'que convierte una comprobación en un obstáculo sin salida',
    ).toEqual([])
  })

  it('CAZA una guarda menos específica que la animación', () => {
    expect(motivosDe('guarda-menos-especifica.css')).toEqual([
      'la guarda es menos específica que la animación',
    ])
  })

  it('CAZA una guarda escrita antes de lo que quiere apagar', () => {
    expect(motivosDe('guarda-primero.css')).toEqual([
      'la guarda va antes en el fichero y no le gana por especificidad',
    ])
  })

  it('CAZA un bloque de movimiento reducido que nombra el selector pero no apaga nada', () => {
    expect(
      motivosDe('guarda-que-no-apaga.css'),
      'un @media de movimiento reducido que solo repinta el fondo no para la animación, y ' +
        'contarlo como guarda es dar por resuelto lo que sigue girando',
    ).toEqual(['sin guarda'])
  })

  it('DICE EN VOZ ALTA cuando el fichero usa @layer', () => {
    // Nadie usa capas en `src/` hoy. Se detecta para que el día que alguien las
    // introduzca la regla no siga dando veredictos calculados con reglas que ya
    // no aplican: con `@layer`, el orden de capas gana a la especificidad.
    expect(motivosDe('con-capas.css')).toEqual(['no se puede decidir la especificidad'])
  })

  it('DICE EN VOZ ALTA cuando no puede decidir la especificidad', () => {
    expect(
      motivosDe('indecidible.css'),
      'la regla se inventó un número para :is()/:where() en vez de pedir que lo mire alguien',
    ).toEqual(['no se puede decidir la especificidad'])
  })
})

/**
 * EL DESBLOQUEO DE #112, FIJADO ANTES DE QUE OCURRA.
 *
 * La regla anterior eximía `public-auth.css` entera, y ahí dentro conviven dos
 * animaciones con destinos opuestos: `.pub-spin`, que es deuda y muere, y
 * `.pub-drift`, la deriva del fondo de la landing, que es legítima y se queda.
 * Con la regla vieja eso obligaba a decidir algo raro al cerrar #112: la
 * entrada no se podía borrar porque `.pub-drift` seguía «violando» la regla.
 *
 * Con la condición real ese problema no existe, y esto lo demuestra contra una
 * réplica de la hoja tal como quedará: `.pub-drift` pasa sola, no queda ningún
 * hallazgo, y la entrada sale de la lista sin discutir nada.
 */
describe('cerrar #112 no dejará residuo en la lista de deuda', () => {
  let raiz: string

  beforeAll(() => {
    raiz = mkdtempSync(join(tmpdir(), 'loader-guard-112-'))

    // `public-auth.css` sin `.pub-spin` ni sus @keyframes: lo que queda tras #112.
    writeFileSync(
      join(raiz, 'public-auth.css'),
      [
        '@keyframes pub-drift {',
        '  0%,',
        '  100% {',
        '    transform: translate(0, 0) scale(1);',
        '  }',
        '',
        '  50% {',
        '    transform: translate(24px, -18px) scale(1.06);',
        '  }',
        '}',
        '',
        '.pub-reveal {',
        '  animation: pub-reveal 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;',
        '}',
        '',
        '.pub-drift {',
        '  animation: pub-drift 18s ease-in-out infinite;',
        '}',
        '',
        '@media (prefers-reduced-motion: reduce) {',
        '  .pub-reveal,',
        '  .pub-drift {',
        '    animation: none;',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )
  })

  afterAll(() => rmSync(raiz, { recursive: true, force: true }))

  it('.pub-drift cumple la condición y no necesita figurar en ninguna lista', () => {
    expect(
      sinGuarda(raiz, []),
      '`.pub-drift` vuelve a dar hallazgo: entonces cerrar #112 obligaría otra vez a ' +
        'mantener viva la entrada de public-auth.css sin ningún motivo',
    ).toEqual([])
  })

  it('y tampoco quedan giros completos que impidan borrar la entrada', () => {
    expect(girosCompletos(raiz, [])).toEqual([])
  })
})
