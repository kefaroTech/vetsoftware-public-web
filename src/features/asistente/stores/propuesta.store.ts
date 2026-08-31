import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import type { Ciclo } from '../../landing/types/plans.types'
import { actualizarLineas, generarPropuesta, refinarPropuesta } from '../api/asistente.source'
import type {
  AceptacionLegal,
  EstadoAsistente,
  Propuesta,
  PropuestaLinea,
  ResultadoAsistente,
} from '../types/asistente.types'

/** Lo que se muestra en «No volvimos a añadir lo que quitaste». */
export interface LineaRetirada {
  code: string
  nombre: string
}

/** El delta de un recálculo, para anunciarlo. */
export interface DeltaPropuesta {
  anadidos: number
  quitados: number
}

/**
 * EL ESTADO DE LA PROPUESTA A MEDIDA.
 *
 * <p>Está en Pinia porque lo comparten pantallas que no se conocen: el panel de
 * `/planes`, y —cuando la integración con el embudo esté hecha— el carril «Tu
 * selección» del registro y el paso vinculante. Ningún `ref()` a nivel de
 * módulo: la regla es dura y aquí además el estado sobrevive a una navegación.
 *
 * ── Las tres invariantes que este store existe para sostener ────────────────
 *
 * **1. Nunca calcula un precio.** No hay una sola suma de importes en este
 * fichero. Cada cambio del carrito llama al seam y adopta los totales que
 * devuelve. Si algún día alguien escribe aquí un `reduce` sobre `importe`, ha
 * reintroducido el defecto que este repositorio ya publicó dos veces.
 *
 * **2. Las ediciones manuales son soberanas.** {@link retirados} sobrevive a los
 * refinamientos y el servidor recibe la lista para no reproponer. Sin esto: el
 * usuario quita «Facturación electrónica» porque no factura, escribe «también
 * hacemos peluquería», y vuelve la propuesta con facturación otra vez — con ocho
 * líneas en un móvil no se fija, y contrata algo que rechazó. Eso es §3.3.4
 * *Error Prevention (Legal, Financial, Data)*, AA.
 *
 * **3. El texto del usuario no se pierde nunca.** {@link texto} no se toca en
 * ningún camino de error. Escribir un párrafo sobre tu propio negocio es la
 * interacción más cara de toda la landing; si un fallo lo borra, la sesión se
 * acabó.
 */
export const usePropuestaStore = defineStore('asistentePropuesta', () => {
  const toast = useToast()

  const estado = ref<EstadoAsistente>('INICIAL')
  const propuesta = ref<Propuesta | null>(null)

  /**
   * Si la propuesta que hay en {@link propuesta} salió de **leer el texto**.
   *
   * <p>Arranca en `false` a propósito, y no es pesimismo: el valor por defecto de
   * un discriminante de honestidad tiene que ser el que no promete nada. Un
   * camino que adoptara una propuesta sin pasar por aquí pintaría «Tu propuesta»
   * sobre un carrito que nadie leyó —que es exactamente el defecto que este campo
   * existe para cerrar—, mientras que el fallo en la dirección contraria solo
   * pide revisar algo que ya está bien.
   *
   * <p>`NOT_UNDERSTOOD` lo pone en `true`: el modelo **sí** leyó el texto, no lo
   * entendió. Su aviso es otro, y así los dos nunca coinciden en pantalla.
   */
  const leyoElTexto = ref(false)

  /** El texto libre del prospecto. **Intocable en todo camino de error.** */
  const texto = ref('')
  const email = ref('')
  const ciclo = ref<Ciclo>('MENSUAL')
  const sedes = ref(1)
  const usuarios = ref(1)

  /** Lo que quitó a mano. Persiste mientras dure la sesión de la propuesta. */
  const retirados = ref<LineaRetirada[]>([])
  /** Sugerencias `RECOMMENDS` que dijo «No, gracias». Se ocultan el resto de la sesión. */
  const sugerenciasDescartadas = ref<string[]>([])

  /** El delta del último refinamiento, para la región viva. `null` fuera de ese caso. */
  const delta = ref<DeltaPropuesta | null>(null)
  /** Códigos que entraron en el último recálculo, para el chip «Nuevo». */
  const nuevos = ref<string[]>([])

  const guardando = ref(false)
  const traceId = ref<string | null>(null)

  /**
   * Dos fallos seguidos en la misma sesión degradan la pantalla.
   *
   * <p>No es un reintento automático disfrazado: un tercer intento manual sobre
   * un asistente que ya falló dos veces gasta seis segundos más del prospecto
   * para llegar al mismo sitio. La degradación le da el catálogo, que sí
   * funciona. La ausencia del asistente nunca puede impedir comprar.
   */
  const fallos = ref(0)

  /**
   * La llave de idempotencia. Se genera al **entrar** en la pantalla, no al
   * pulsar: es lo que hace que un doble clic —o el reintento tras cancelar— no
   * pague dos invocaciones ni cree dos propuestas huérfanas que consumen cupo.
   */
  const clientRequestId = ref('')

  const lineas = computed<PropuestaLinea[]>(() => propuesta.value?.lineas ?? [])
  const codigosEnCarrito = computed(() => lineas.value.map((l) => l.code))

  /**
   * El `AbortController` de la llamada en vuelo.
   *
   * <p>Fuera del estado reactivo a propósito: nada de la interfaz depende del
   * controlador en sí, solo de {@link estado}. Meterlo en un `ref` obligaría a
   * Pinia a envolver un objeto del navegador en un proxy sin ninguna ganancia.
   */
  let abortoActual: AbortController | null = null

  /**
   * Genera la llave de idempotencia.
   *
   * <p>`randomUUID` no está en todos los contextos donde este código corre —un
   * origen sin TLS y algunos entornos de prueba no lo exponen—, así que hay
   * respaldo. Un `undefined` aquí llegaría al servidor como cabecera vacía y la
   * idempotencia dejaría de existir en silencio, que es la peor forma de
   * perderla.
   */
  function nuevaLlave(): string {
    clientRequestId.value =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return clientRequestId.value
  }

  function reiniciar(): void {
    estado.value = 'INICIAL'
    propuesta.value = null
    leyoElTexto.value = false
    retirados.value = []
    sugerenciasDescartadas.value = []
    delta.value = null
    nuevos.value = []
    traceId.value = null
  }

  /**
   * Adopta una propuesta del servidor y calcula qué cambió respecto a la
   * anterior, para poder anunciarlo.
   *
   * <p>El delta se mide sobre los CÓDIGOS, no sobre los totales: «2 módulos
   * añadidos, 1 quitado» es lo que un lector de pantalla necesita oír, y una
   * diferencia de importe no lo dice.
   */
  function adoptar(nueva: Propuesta, conDelta: boolean): void {
    const antes = new Set(propuesta.value?.lineas.map((l) => l.code) ?? [])
    const ahora = new Set(nueva.lineas.map((l) => l.code))
    nuevos.value = [...ahora].filter((c) => !antes.has(c))
    delta.value = conDelta
      ? { anadidos: nuevos.value.length, quitados: [...antes].filter((c) => !ahora.has(c)).length }
      : null
    propuesta.value = nueva
  }

  /** Dos carritos son el mismo si llevan los mismos códigos, en cualquier orden. */
  function mismoCarrito(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    const enB = new Set(b)
    return a.every((c) => enB.has(c))
  }

  /**
   * Manda al servidor el carrito ENTERO y adopta lo que devuelva.
   *
   * <p>Todo cambio manual pasa por aquí, y por eso no hay ninguna mutación local
   * de `propuesta.lineas` en este fichero: una lista editada en memoria junto a
   * unos totales que no se movieron es una pantalla que miente durante el rato
   * que dura la petición.
   */
  async function empujarCarrito(codigos: string[]): Promise<void> {
    const actual = propuesta.value
    if (!actual || guardando.value) return
    // Un carrito idéntico no se empuja. El endpoint tiene un límite de 30/h por
    // IP y una petición que no cambia nada gasta cupo del usuario para devolver
    // exactamente lo que ya está en pantalla.
    if (mismoCarrito(codigos, codigosEnCarrito.value)) return
    guardando.value = true
    try {
      const nueva = await actualizarLineas({
        propuestaId: actual.id,
        version: actual.version,
        codigos,
      })
      adoptar(nueva, false)
    } catch (e) {
      // Nunca se escribe el texto del error a mano: `errorFrom` extrae el
      // mensaje del ProblemDetail y el X-Trace-Id, y escribirlo a mano tira la
      // traza que soporte necesita para correlacionar.
      toast.errorFrom('No pudimos actualizar tu propuesta', e)
    } finally {
      guardando.value = false
    }
  }

  /**
   * Las aceptaciones con las que se generó, para poder reintentar.
   *
   * <p>Un reintento tiene que mandar **las mismas** que el usuario marcó: pedirle
   * que vuelva a marcar dos casillas porque el servidor falló es castigarle por
   * un error nuestro, y mandarlas vacías guardaría una propuesta sin la prueba de
   * consentimiento que la ley exige.
   */
  const aceptacionesUsadas = ref<AceptacionLegal[]>([])

  async function generar(aceptaciones: AceptacionLegal[]): Promise<void> {
    aceptacionesUsadas.value = aceptaciones
    estado.value = 'CARGANDO'
    traceId.value = null
    const controlador = new AbortController()
    abortoActual = controlador
    try {
      const resultado = await generarPropuesta(
        {
          email: email.value,
          texto: texto.value,
          aceptaciones: aceptacionesUsadas.value,
          clientRequestId: clientRequestId.value || nuevaLlave(),
        },
        controlador.signal,
      )
      fallos.value = 0
      if (resultado.clase === 'PROPUESTA') {
        adoptar(resultado.propuesta, false)
        leyoElTexto.value = resultado.leyoElTexto
        estado.value = 'PROPUESTA_LISTA'
      } else if (resultado.clase === 'NO_ENTENDIDO') {
        adoptar(resultado.propuestaBase, false)
        leyoElTexto.value = true
        estado.value = 'NO_ENTENDIDO'
      } else if (resultado.clase === 'FUERA_DE_DOMINIO') {
        // Ni una línea de catálogo. El error caro aquí no es perder el lead —no
        // era un lead—, es venderle software veterinario a quien no tiene
        // animales y que lo descubra después de pagar.
        propuesta.value = null
        estado.value = 'FUERA_DE_DOMINIO'
      } else {
        estado.value = 'ASISTENTE_CAIDO'
      }
    } catch (e) {
      fallos.value += 1
      // El texto del usuario NO se toca. Sigue ahí abajo, tal como lo dejó.
      estado.value = fallos.value >= 2 ? 'ASISTENTE_CAIDO' : 'ERROR_MODELO'
      registrarFallo(e)
    } finally {
      abortoActual = null
    }
  }

  /**
   * Empieza a recuperar una propuesta ya existente: la del enlace del correo, o
   * la que la intención guardada referencia.
   *
   * <p>Se separa de {@link adoptarRecuperada} porque el viaje lo hace el
   * composable —es quien sostiene el token, que **no entra aquí**— y entre las
   * dos llamadas hay una navegación: quien pulsa el enlace aterriza en `/` y
   * acaba en `/planes`, y el panel tiene que encontrar la pantalla ya en
   * `RECUPERANDO` al montar, o enseñaría el cuadro de texto vacío durante el
   * viaje y el prospecto empezaría a escribir encima de lo que está llegando.
   */
  function comenzarRecuperacion(): void {
    estado.value = 'RECUPERANDO'
    traceId.value = null
    delta.value = null
    nuevos.value = []
  }

  /**
   * Adopta lo que devolvió una relectura.
   *
   * <p>⚠️ **Ramifica por `clase` exactamente igual que {@link generar}**, y esa
   * es toda la decisión: `clase` sale del `presentation` del servidor en el
   * seam, y es lo que distingue una propuesta de un punto de partida
   * determinista. Aplanar la relectura a «hay líneas → propuesta lista» pintaría
   * un carrito `NOT_UNDERSTOOD` bajo el encabezado «Tu propuesta», sin el aviso
   * de «punto de partida, no una recomendación» — que es la pantalla equivocada
   * en el sitio donde más caro sale.
   *
   * <p>{@link nuevos} se vacía: una relectura no es un recálculo y nada de lo
   * que llega es nuevo. Con el conjunto anterior vacío, `adoptar` marcaría como
   * «Nuevo» **todas** las líneas de la propuesta recuperada.
   */
  function adoptarRecuperada(resultado: ResultadoAsistente): void {
    if (resultado.clase === 'PROPUESTA') {
      adoptar(resultado.propuesta, false)
      leyoElTexto.value = resultado.leyoElTexto
      estado.value = 'PROPUESTA_LISTA'
    } else if (resultado.clase === 'NO_ENTENDIDO') {
      adoptar(resultado.propuestaBase, false)
      leyoElTexto.value = true
      estado.value = 'NO_ENTENDIDO'
    } else if (resultado.clase === 'FUERA_DE_DOMINIO') {
      propuesta.value = null
      estado.value = 'FUERA_DE_DOMINIO'
    } else {
      // `NO_DISPONIBLE` en una relectura es un 200 sin token ni tarifa. No hay
      // carrito que enseñar y tampoco ha caducado nada: la salida honesta es la
      // degradación, que deja el catálogo delante.
      propuesta.value = null
      estado.value = 'ASISTENTE_CAIDO'
    }
    nuevos.value = []
  }

  /**
   * El 404 del servidor, traducido a lo que significa para quien pulsó el
   * enlace.
   *
   * <p>No incrementa {@link fallos} y no toca {@link texto}: no ha fallado el
   * asistente, ha caducado un enlace. Sumarlo a los fallos degradaría la
   * pantalla a `ASISTENTE_CAIDO` al segundo enlace viejo que alguien abriera.
   */
  function marcarEnlaceCaducado(): void {
    propuesta.value = null
    retirados.value = []
    delta.value = null
    nuevos.value = []
    estado.value = 'ENLACE_CADUCADO'
  }

  /**
   * La recuperación falló por algo que **no** es un enlace caducado: red caída,
   * 500, un 429 del límite por IP.
   *
   * <p>Degrada en vez de decir «caducó», porque decirlo sería mentir sobre una
   * propuesta que probablemente sigue viva: la salida honesta es la misma que la
   * del asistente caído —el catálogo delante— y el prospecto puede recargar. El
   * aviso con la traza lo pone el composable con `errorFrom`.
   */
  function marcarRecuperacionFallida(): void {
    propuesta.value = null
    estado.value = 'ASISTENTE_CAIDO'
  }

  async function refinar(anadido: string): Promise<void> {
    const actual = propuesta.value
    if (!actual || actual.ajustesRestantes <= 0) return
    estado.value = 'REFINANDO'
    const controlador = new AbortController()
    abortoActual = controlador
    try {
      const resultado = await refinarPropuesta(
        {
          propuestaId: actual.id,
          version: actual.version,
          texto: anadido,
        },
        controlador.signal,
      )
      // `recalculado === false` es el servidor diciendo «te devuelvo la
      // propuesta intacta»: es lo que responde el cuarto refinamiento, con un
      // 200 y no un error. Sin mirarlo, la pantalla anunciaría un ajuste
      // aplicado que no se aplicó — y con el delta a cero el aviso ni siquiera
      // se leería como un cambio nulo, se leería como un éxito.
      if (resultado.clase === 'PROPUESTA' && resultado.propuesta.recalculado) {
        adoptar(resultado.propuesta, true)
        leyoElTexto.value = resultado.leyoElTexto
        estado.value = 'PROPUESTA_LISTA'
      } else {
        // Un ajuste que el modelo no entendió NO invalida la propuesta anterior:
        // se conserva intacta y se avisa de que ese añadido no se pudo aplicar.
        estado.value = 'PROPUESTA_LISTA'
        toast.warn(
          'No pudimos aplicar ese ajuste',
          'Tu propuesta sigue como estaba. Prueba a contárnoslo de otra forma.',
        )
      }
    } catch (e) {
      estado.value = 'PROPUESTA_LISTA'
      toast.errorFrom('No pudimos ajustar tu propuesta', e)
    } finally {
      abortoActual = null
    }
  }

  /**
   * Quitar una línea a mano.
   *
   * <p>Va a {@link retirados} **antes** de empujar el carrito, para que el
   * bloque de restauración exista aunque la petición falle: si el usuario quitó
   * algo, esa afirmación suya sobre su propio negocio no depende de que la red
   * funcione.
   */
  async function quitar(code: string): Promise<void> {
    const linea = lineas.value.find((l) => l.code === code)
    if (!linea) return
    if (!retirados.value.some((r) => r.code === code)) {
      retirados.value = [...retirados.value, { code, nombre: linea.nombre }]
    }
    await empujarCarrito(codigosEnCarrito.value.filter((c) => c !== code))
  }

  /** Añadir a mano, desde el catálogo o desde una sugerencia aceptada. */
  async function anadir(code: string): Promise<void> {
    // Añadir algo que se había quitado lo saca del bloque de restauración: si
    // no, la pantalla diría a la vez «lo tienes» y «no volvimos a añadirlo».
    retirados.value = retirados.value.filter((r) => r.code !== code)
    if (codigosEnCarrito.value.includes(code)) return
    await empujarCarrito([...codigosEnCarrito.value, code])
  }

  /**
   * Aceptar la oferta de paquete: **sustituye el carrito entero por el paquete**.
   *
   * <p>No es «añadir». Paquete y componente del paquete no se compran juntos y
   * el servidor lo rechaza; `componentCodes` se publica precisamente para que el
   * front evite el conflicto antes de pedirlo, en vez de descubrirlo con un 400
   * en el paso vinculante. Por eso el verbo de la interfaz es «Cambiar al» — el
   * verbo tiene que hacer imposible el error, no advertir de él.
   *
   * <p>Y lo que se pierde al cambiar **no se esconde**: al llegar la propuesta
   * repreciada, `primerMes` sube al precio completo porque los tres paquetes son
   * `NEVER_FREE`. La consecuencia que anunció el comparador se ve en la cifra,
   * no solo en el texto que la anunciaba.
   */
  async function cambiarAPaquete(code: string): Promise<void> {
    await empujarCarrito([code])
  }

  /** «No, gracias» sobre un `RECOMMENDS`. Se oculta el resto de la sesión. */
  function descartarSugerencia(code: string): void {
    if (!sugerenciasDescartadas.value.includes(code)) {
      sugerenciasDescartadas.value = [...sugerenciasDescartadas.value, code]
    }
  }

  /**
   * Cambiar de ciclo. **Mueve el catálogo, no la propuesta.**
   *
   * <p>⚠️ Y no porque se haya decidido así aquí: **el contrato del asistente no
   * tiene ciclo**. Ninguna de sus tres peticiones lleva el campo y la respuesta
   * cotiza en mensual (`firstPeriodTotal`, `monthlySaving`). Este `ref` sigue
   * gobernando el catálogo comercial —`GET /catalog` sí trae los dos precios y
   * `fetchCatalogo` elige uno—, así que el conmutador no es inerte; lo que no
   * puede hacer es repreciar la propuesta.
   *
   * <p>Lo que NO se hace, y es lo importante: **no se empuja el carrito**. Sería
   * un viaje que devuelve los mismos importes mensuales, gastando cupo del
   * límite de 30/h para no cambiar nada. Y sobre todo, no se toca
   * `totales.ciclo`: rotular como anuales unos importes mensuales es la mentira
   * concreta que este store existe para no contar.
   */
  function cambiarCiclo(nuevo: Ciclo): void {
    if (nuevo === ciclo.value) return
    ciclo.value = nuevo
  }

  /**
   * Sedes y personas.
   *
   * <p>⚠️ **Se quedan en el cliente, y hay que saber hasta dónde llegan.** No hay
   * campo de capacidad en ninguna de las tres peticiones del contrato ni bloque
   * de capacidades en la respuesta, así que no hay nada que empujar: un `PUT` con
   * el mismo carrito devolvería los mismos importes y gastaría cupo para fingir
   * que el número se tuvo en cuenta.
   *
   * <p>El único consumidor real de estos dos números es **la banda de
   * continuación de la landing** (`ResumeIntentBanner`: «para 2 sedes y 5
   * personas»), que describe lo que el prospecto dijo. Nada más los lee. En
   * concreto **no son el paso vinculante**, y este docblock afirmaba que sí:
   * la oferta de una propuesta son `lineasDePropuesta(resumen)` —las líneas que
   * devolvió el servidor, con SUS cantidades— y `SelfServeQuoteRequest` no tiene
   * dónde poner una capacidad que no sea una línea con `code` y `quantity`.
   * Enviar `EXTRA_USER`/`EXTRA_BRANCH` por nuestra cuenta tampoco es la salida:
   * los dos son `selfServiceEligible = false` y hunden la oferta entera con un
   * error que no dice qué línea sobró.
   *
   * <p>Por eso `PropuestaCapacidades` lo dice en pantalla en vez de dejar que el
   * control se lea como una recotización. Lo que sí mueve la cantidad cobrada es
   * refinar la propuesta con palabras, que va al servidor.
   */
  function fijarCapacidades(nuevasSedes: number, nuevosUsuarios: number): void {
    sedes.value = nuevasSedes
    usuarios.value = nuevosUsuarios
  }

  /**
   * Reintentar tras un fallo, con **una llave de idempotencia nueva**.
   *
   * <p>La llave anterior queda quemada: si el fallo fue de red y el servidor sí
   * llegó a crear la propuesta, reusarla devolvería aquella —que es lo correcto—
   * pero si el fallo fue anterior a crearla, reusarla no aporta nada. Se renueva
   * porque el usuario está pidiendo explícitamente otro intento, y el texto y las
   * aceptaciones siguen siendo los mismos.
   */
  async function reintentar(): Promise<void> {
    nuevaLlave()
    await generar(aceptacionesUsadas.value)
  }

  /** Cancelar. Devuelve el control al usuario; **no cancela el gasto**. */
  function cancelar(): void {
    abortoActual?.abort()
    abortoActual = null
    estado.value = propuesta.value ? 'PROPUESTA_LISTA' : 'INICIAL'
  }

  function registrarFallo(e: unknown): void {
    const conTraza = e as { response?: { headers?: Record<string, string> } }
    traceId.value = conTraza?.response?.headers?.['x-trace-id'] ?? null
  }

  return {
    estado,
    propuesta,
    leyoElTexto,
    texto,
    email,
    ciclo,
    sedes,
    usuarios,
    retirados,
    sugerenciasDescartadas,
    delta,
    nuevos,
    guardando,
    traceId,
    fallos,
    clientRequestId,
    lineas,
    codigosEnCarrito,
    nuevaLlave,
    reiniciar,
    comenzarRecuperacion,
    adoptarRecuperada,
    marcarEnlaceCaducado,
    marcarRecuperacionFallida,
    generar,
    reintentar,
    refinar,
    quitar,
    anadir,
    cambiarAPaquete,
    descartarSugerencia,
    cambiarCiclo,
    fijarCapacidades,
    cancelar,
  }
})
