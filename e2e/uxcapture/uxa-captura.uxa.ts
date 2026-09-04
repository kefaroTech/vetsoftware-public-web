import { test, type Page } from '@playwright/test'
import { join } from 'node:path'
import { instalarSesion } from '../helpers/sesion'
import {
  concretar,
  engancharDiagnostico,
  enrutarApiPrivada,
  enrutarApiPublica,
  escribirFragmento,
  escribirJson,
  esperarPantallaQuieta,
  inventarioDeRutas,
  PARAMETROS,
  prepararFuentes,
  RAIZ_CAPTURAS,
  RAIZ_SCRATCH,
  slugDe,
  VIEWPORTS,
  type Estado,
  type Viewport,
  type RutaDescubierta,
} from './uxa-arnes'
import { escalaDeEspaciado, medirPantalla } from './uxa-metricas'

/**
 * Arnés de captura y medida de TODAS las pantallas del tenant y de la zona
 * pública. No compara contra líneas base: produce PNG + JSON para auditar.
 *
 * <p>Una prueba por viewport × estado × zona, y dentro un bucle sobre las rutas:
 * 400 pruebas de una ruta cada una pagarían 400 arranques de contexto para lo
 * mismo. Si una ruta revienta se anota y el bucle sigue — el objetivo es el
 * censo completo, no el primer fallo.
 */

/** Playwright arranca con el cwd en la raiz del proyecto, junto a la configuracion. */
const RAIZ_REPO = process.cwd()
const ESCALA = escalaDeEspaciado(RAIZ_REPO)

/** La forma real de `ResultadoContratacion`, con importe grande y texto largo. */
const RESULTADO_CONTRATACION = {
  origen: 'PLAN',
  titulo: 'Pack Clínica completa',
  empresaNombre: 'Clínica E2E de prueba',
  modulosActivados: ['Núcleo', 'Agenda', 'Historia clínica', 'Hospitalización', 'Inventario'],
  lineasPrueba: [
    { code: 'CORE', name: 'Núcleo', trialEndDate: '2026-09-19', trialDays: 15 },
    { code: 'AGENDA', name: 'Agenda', trialEndDate: '2026-09-19', trialDays: 15 },
    { code: 'HISTORIA', name: 'Historia clínica', trialEndDate: '2026-09-26', trialDays: 22 },
  ],
  subtotal: 128_450_900,
  impuesto: 24_405_671,
  total: 152_856_571,
  ciclo: 'MENSUAL',
  cotizacionId: 1,
  cotizacionNumero: 'COT-E2E-0001',
  validaHasta: '2026-09-19',
}

/** Lo que el guardado real deja en `history.state`, con el id que da el servidor. */
const COMPROBANTE_ESTADO = {
  consultationId: 4821,
  ownerId: 1,
  petId: 1,
  ownerName: 'Propietario E2E de prueba',
  petName: 'Mascota E2E de prueba',
  consultationType: 'Control posquirúrgico',
  date: '2026-09-04',
  prescriptions: [
    { id: 1, label: 'Amoxicilina 250 mg — 1 cada 12 h, 7 días' },
    { id: 2, label: 'Meloxicam 1,5 mg/ml — 0,4 ml cada 24 h, 3 días' },
  ],
}

test.describe.configure({ mode: 'parallel' })

interface ResultadoRuta {
  ruta: string
  rutaConcreta: string
  nombre: string | null
  urlFinal: string
  redirigida: boolean
  estado: Estado
  viewport: string
  notaViewport: string | null
  captura: string | null
  fallo: string | null
  fuentes: { declaradas: number; sinCargar: string[] }
  consola: unknown[]
  red: unknown[]
  metricas: unknown
}

/** Descarta lo que no es una pantalla: el comodín y los armazones sin vista propia. */
function pantallas(rutas: RutaDescubierta[]): RutaDescubierta[] {
  const porPath = new Map<string, RutaDescubierta>()
  for (const r of rutas) {
    if (!r.hasComponent) continue
    if (r.path.includes('pathMatch')) continue
    const previa = porPath.get(r.path)
    // Con dos registros en el mismo path —el armazón y su hijo vacío— gana el
    // que tiene nombre: es el que de verdad se monta al navegar ahí.
    if (!previa || (previa.name === null && r.name !== null)) porPath.set(r.path, r)
  }
  return [...porPath.values()]
}

/**
 * Recaptura acotada. Con `UXA_RUTAS` puesta se vuelven a fotografiar SOLO esas
 * rutas, sobre los mismos ficheros, y los fragmentos salen con sufijo `recup`
 * para que la fusión sepa cuál es el bueno.
 */
const SOLO = (process.env.UXA_RUTAS ?? '')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean)
const RECUPERANDO = SOLO.length > 0
const sufijo = RECUPERANDO ? '-recup' : ''
const acotar = (rutas: RutaDescubierta[]) =>
  RECUPERANDO ? rutas.filter((r) => SOLO.includes(r.path)) : rutas

/**
 * El paso 7 del embudo se fotografía en su propia prueba, con el store sembrado.
 * Queda fuera del bucle porque las dos escribirían el MISMO fichero, y aquí la
 * navegación directa rebota al tablero: ganaría el worker que terminara último y
 * la captura del embudo saldría siendo el tablero, sin que nada fallara.
 */
const PASO_7 = '/dashboard/contratar/exito'

/**
 * El comprobante de consulta, por el mismo motivo que el paso 7: sin el id que
 * devolvió el servidor en `history.state` no se llegó aquí guardando, así que la
 * vista rebota al historial. Se fotografía en su propia prueba, con el estado
 * sembrado, y fuera del bucle para que las dos no escriban el mismo fichero.
 */
const COMPROBANTE = '/dashboard/consulta/nueva/exito'

const esPrivada = (r: RutaDescubierta) =>
  r.path.startsWith('/dashboard') && r.path !== PASO_7 && r.path !== COMPROBANTE
const esPublica = (r: RutaDescubierta) =>
  !r.path.startsWith('/dashboard') && r.path !== '/cambiar-contrasena'

async function capturarYMedir(
  page: Page,
  ruta: RutaDescubierta,
  estado: Estado,
  viewport: Viewport,
  diagnostico: ReturnType<typeof engancharDiagnostico>,
): Promise<ResultadoRuta> {
  const rutaConcreta = concretar(ruta.path)
  const base: ResultadoRuta = {
    ruta: ruta.path,
    rutaConcreta,
    nombre: ruta.name,
    urlFinal: '',
    redirigida: false,
    estado,
    viewport: viewport.nombre,
    notaViewport: viewport.nota ?? null,
    captura: null,
    fallo: null,
    fuentes: { declaradas: 0, sinCargar: [] },
    consola: [],
    red: [],
    metricas: null,
  }

  diagnostico.reiniciar()
  try {
    await page.goto(rutaConcreta, { waitUntil: 'commit' })
    const { fuentes } = await esperarPantallaQuieta(page)
    base.fuentes = fuentes

    const urlFinal = new URL(page.url()).pathname
    base.urlFinal = urlFinal
    base.redirigida = urlFinal !== rutaConcreta

    const destino = join(RAIZ_CAPTURAS, viewport.nombre, `${slugDe(ruta.path)}__${estado}.png`)
    await page.screenshot({ path: destino, fullPage: true, animations: 'disabled', scale: 'css' })
    base.captura = destino

    base.metricas = await medirPantalla(page, ESCALA)
  } catch (error) {
    base.fallo = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  }
  const { consola, red } = diagnostico.volcar()
  base.consola = consola
  base.red = red
  return base
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.nombre} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const estado of ['vacio', 'lleno'] as const) {
      test(`zona publica · ${estado}`, async ({ page }) => {
        test.setTimeout(15 * 60_000)
        const diagnostico = engancharDiagnostico(page)
        await prepararFuentes(page)
        await enrutarApiPublica(page, estado)

        await page.goto('/login', { waitUntil: 'commit' })
        await esperarPantallaQuieta(page)
        const inventario = pantallas(await inventarioDeRutas(page))

        // El inventario completo se vuelca una sola vez, desde el viewport de
        // escritorio: es el mismo router en los cuatro.
        if (vp.nombre === 'escritorio' && estado === 'lleno' && !RECUPERANDO) {
          escribirJson(join(RAIZ_SCRATCH, 'uxa-rutas-public.json'), {
            generado: 'arnés uxa-captura (public-web)',
            parametros: PARAMETROS,
            totalRegistrosDelRouter: (await inventarioDeRutas(page)).length,
            totalPantallas: inventario.length,
            privadas: inventario.filter(esPrivada).length,
            publicas: inventario.filter(esPublica).length,
            rutas: inventario,
          })
        }

        const resultados: ResultadoRuta[] = []
        for (const ruta of acotar(inventario.filter(esPublica))) {
          resultados.push(await capturarYMedir(page, ruta, estado, vp, diagnostico))
        }
        escribirFragmento(`publica${sufijo}-${vp.nombre}-${estado}`, resultados)
      })

      test(`zona privada · ${estado}`, async ({ page }) => {
        test.setTimeout(25 * 60_000)
        const diagnostico = engancharDiagnostico(page)
        await prepararFuentes(page)
        await enrutarApiPrivada(page, estado)
        await instalarSesion(page)

        await page.goto('/dashboard', { waitUntil: 'commit' })
        await esperarPantallaQuieta(page)
        const inventario = pantallas(await inventarioDeRutas(page))

        const resultados: ResultadoRuta[] = []
        for (const ruta of acotar(inventario.filter(esPrivada))) {
          resultados.push(await capturarYMedir(page, ruta, estado, vp, diagnostico))
        }
        escribirFragmento(`privada${sufijo}-${vp.nombre}-${estado}`, resultados)
      })
    }

    /**
     * `/cambiar-contrasena` es su propio contexto: con `mustChangePassword` el
     * guard manda ahí desde cualquier ruta, y sin ella devuelve al tablero. No
     * se puede fotografiar dentro de ninguno de los dos bloques anteriores.
     */
    test('cambiar-contrasena · contraseña temporal', async ({ page }) => {
      test.skip(RECUPERANDO, 'la recaptura acotada solo rehace las rutas de UXA_RUTAS')
      const diagnostico = engancharDiagnostico(page)
      await prepararFuentes(page)
      await enrutarApiPrivada(page, 'vacio', { mustChangePassword: true })
      await instalarSesion(page)

      const ruta: RutaDescubierta = {
        path: '/cambiar-contrasena',
        name: 'cambiar-contrasena',
        permission: null,
        permissionsAny: null,
        requiresAuth: true,
        guestOnly: false,
        allowClientWithoutPlan: false,
        hasComponent: true,
      }
      const resultado = await capturarYMedir(page, ruta, 'vacio', vp, diagnostico)
      escribirFragmento(`cambio-clave-${vp.nombre}`, [resultado])
    })

    /**
     * Los diálogos. `ModalShell` teletransporta el card a `<body>`, así que un
     * modal abierto no sale en la captura de la ruta: hay que abrirlo y volver a
     * disparar. Se prueba el primer control de creación de cada pantalla y se
     * anota el que no se deja: un modal que no abre de forma fiable se declara,
     * no se fuerza.
     */
    test('diálogos · pantallas con creación', async ({ page }) => {
      test.skip(RECUPERANDO, 'la recaptura acotada solo rehace las rutas de UXA_RUTAS')
      test.setTimeout(20 * 60_000)
      const diagnostico = engancharDiagnostico(page)
      await prepararFuentes(page)
      await enrutarApiPrivada(page, 'lleno')
      await instalarSesion(page)

      await page.goto('/dashboard', { waitUntil: 'commit' })
      await esperarPantallaQuieta(page)
      const inventario = pantallas(await inventarioDeRutas(page)).filter(esPrivada)

      const resultados: Record<string, unknown>[] = []
      for (const ruta of inventario) {
        const rutaConcreta = concretar(ruta.path)
        const anotacion: Record<string, unknown> = {
          ruta: ruta.path,
          viewport: vp.nombre,
          notaViewport: vp.nota ?? null,
          abierto: false,
          disparador: null,
          captura: null,
          motivo: null,
        }
        try {
          diagnostico.reiniciar()
          await page.goto(rutaConcreta, { waitUntil: 'commit' })
          await esperarPantallaQuieta(page)
          if (new URL(page.url()).pathname !== rutaConcreta) {
            anotacion.motivo = 'la ruta redirigió; no se intentó abrir ningún diálogo'
            resultados.push(anotacion)
            continue
          }

          const disparador = page
            .getByRole('button', { name: /^(Nuevo|Nueva|Crear|Agregar|Añadir|Registrar)\b/ })
            .first()
          if ((await disparador.count()) === 0) {
            anotacion.motivo = 'la pantalla no ofrece ningún control de creación'
            resultados.push(anotacion)
            continue
          }
          anotacion.disparador = (await disparador.textContent())?.trim() ?? null
          await disparador.click({ timeout: 5_000 })

          const dialogo = page.getByRole('dialog').last()
          await dialogo.waitFor({ state: 'visible', timeout: 5_000 })
          await esperarPantallaQuieta(page)

          const destino = join(RAIZ_CAPTURAS, vp.nombre, `${slugDe(ruta.path)}__dialogo.png`)
          await page.screenshot({
            path: destino,
            fullPage: false,
            animations: 'disabled',
            scale: 'css',
          })
          anotacion.abierto = true
          anotacion.captura = destino
          anotacion.metricas = await medirPantalla(page, ESCALA)
        } catch (error) {
          anotacion.motivo =
            error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        }
        anotacion.consola = diagnostico.volcar().consola
        resultados.push(anotacion)
      }
      escribirFragmento(`dialogos-${vp.nombre}`, resultados)
    })

    /**
     * Paso 7 del embudo. `resultadoContratacion.store` NO se persiste —está
     * escrito así a propósito— así que ni `sessionStorage` ni una URL directa
     * pueden traerlo: una navegación completa lo encontraría vacío y el guard de
     * la vista manda al tablero. Se siembra el store y se navega del lado del
     * cliente, que es exactamente el estado en el que un cliente real ve esta
     * pantalla: el instante siguiente a confirmar.
     */
    test('contratar/exito · con resultado en el store', async ({ page }) => {
      test.skip(RECUPERANDO && !SOLO.includes(PASO_7), 'fuera del acotado')
      const diagnostico = engancharDiagnostico(page)
      await prepararFuentes(page)
      await enrutarApiPrivada(page, 'lleno')
      await instalarSesion(page)

      // Primero la ruta de verdad, aunque rebote al tablero: Pinia solo registra
      // un store cuando algo lo usa, y sin montar la vista no hay nada que sembrar.
      await page.goto(PASO_7, { waitUntil: 'commit' })
      const { fuentes } = await esperarPantallaQuieta(page)

      const sembrado = await page.evaluate((resultado) => {
        const cont = document.querySelector('#app') as unknown as {
          __vue_app__?: { config: { globalProperties: Record<string, unknown> } }
        }
        const props = cont.__vue_app__?.config.globalProperties
        const pinia = props?.$pinia as { _s?: Map<string, Record<string, unknown>> } | undefined
        const store = pinia?._s?.get('contratacionResultado')
        if (!store || typeof store.guardar !== 'function') {
          return `sin store: pinia=${Boolean(pinia)} claves=${[...(pinia?._s?.keys() ?? [])].join(',')}`
        }
        ;(store.guardar as (r: unknown) => void)(resultado)
        return true
      }, RESULTADO_CONTRATACION)

      const anotacion: Record<string, unknown> = {
        ruta: PASO_7,
        viewport: vp.nombre,
        notaViewport: vp.nota ?? null,
        estado: 'lleno',
        fuentes,
        sembrado: sembrado === true,
        detalleSiembra: sembrado,
      }
      if (sembrado !== true) {
        anotacion.fallo = `no se pudo sembrar el store: ${String(sembrado)}`
        escribirFragmento(`contratar-exito-${vp.nombre}`, [anotacion])
        return
      }

      await page.evaluate(() => {
        const cont = document.querySelector('#app') as unknown as {
          __vue_app__?: { config: { globalProperties: Record<string, unknown> } }
        }
        const router = cont.__vue_app__?.config.globalProperties.$router as {
          push: (l: { name: string }) => Promise<unknown>
        }
        return router.push({ name: 'contratar-exito' })
      })
      await esperarPantallaQuieta(page)

      anotacion.urlFinal = new URL(page.url()).pathname
      anotacion.redirigida = anotacion.urlFinal !== PASO_7
      const destino = join(RAIZ_CAPTURAS, vp.nombre, 'dashboard-contratar-exito__lleno.png')
      await page.screenshot({ path: destino, fullPage: true, animations: 'disabled', scale: 'css' })
      anotacion.captura = destino
      anotacion.metricas = await medirPantalla(page, ESCALA)
      anotacion.consola = diagnostico.volcar().consola
      escribirFragmento(`contratar-exito-${vp.nombre}`, [anotacion])
    })

    test('consulta/nueva/exito · con el comprobante del servidor', async ({ page }) => {
      test.skip(RECUPERANDO && !SOLO.includes(COMPROBANTE), 'fuera del acotado')
      const diagnostico = engancharDiagnostico(page)
      await prepararFuentes(page)
      await enrutarApiPrivada(page, 'lleno')
      await instalarSesion(page)

      await page.goto('/dashboard', { waitUntil: 'commit' })
      await esperarPantallaQuieta(page)

      // `history.state` es lo que la vista lee, y solo el router lo escribe: una
      // navegación del lado del cliente con `state` reproduce exactamente lo que
      // deja el guardado real.
      await page.evaluate((estado) => {
        const cont = document.querySelector('#app') as unknown as {
          __vue_app__?: { config: { globalProperties: Record<string, unknown> } }
        }
        const router = cont.__vue_app__?.config.globalProperties.$router as {
          push: (l: Record<string, unknown>) => Promise<unknown>
        }
        return router.push({ name: 'consulta-nueva-exito', state: estado })
      }, COMPROBANTE_ESTADO)
      const { fuentes } = await esperarPantallaQuieta(page)

      const urlFinal = new URL(page.url()).pathname
      const destino = join(RAIZ_CAPTURAS, vp.nombre, 'dashboard-consulta-nueva-exito__lleno.png')
      await page.screenshot({ path: destino, fullPage: true, animations: 'disabled', scale: 'css' })
      escribirFragmento(`comprobante-${vp.nombre}`, [
        {
          ruta: COMPROBANTE,
          viewport: vp.nombre,
          notaViewport: vp.nota ?? null,
          estado: 'lleno',
          fuentes,
          urlFinal,
          redirigida: urlFinal !== COMPROBANTE,
          captura: destino,
          metricas: await medirPantalla(page, ESCALA),
          consola: diagnostico.volcar().consola,
        },
      ])
    })

    /**
     * La landing por secciones, además de entera.
     *
     * <p>Es el escaparate: larga, y lo primero que ve un desconocido. Una captura
     * de 6.000 px de alto no permite juzgar el ritmo de una sección, y `movil` es
     * donde llega la mayor parte del tráfico comercial.
     */
    test('landing por secciones', async ({ page }) => {
      test.skip(RECUPERANDO, 'la recaptura acotada solo rehace las rutas de UXA_RUTAS')
      const diagnostico = engancharDiagnostico(page)
      await prepararFuentes(page)
      await enrutarApiPublica(page, 'lleno')
      diagnostico.reiniciar()

      await page.goto('/', { waitUntil: 'commit' })
      await esperarPantallaQuieta(page)

      const secciones: { id: string; selector: string }[] = [
        { id: 'heroe', selector: 'main > section:first-of-type' },
        { id: 'valor', selector: 'section[aria-labelledby="valor-titulo"]' },
        { id: 'dia', selector: 'section[aria-labelledby="dia-titulo"]' },
        { id: 'cotizador', selector: '#cotizador' },
        { id: 'planes', selector: '#planes' },
        { id: 'preguntas', selector: '#preguntas' },
        { id: 'cierre', selector: 'section[aria-labelledby="cierre-titulo"]' },
        { id: 'pie', selector: 'footer' },
      ]

      const resultados: Record<string, unknown>[] = []
      for (const seccion of secciones) {
        const anotacion: Record<string, unknown> = {
          seccion: seccion.id,
          viewport: vp.nombre,
          notaViewport: vp.nota ?? null,
          captura: null,
          fallo: null,
        }
        try {
          const loc = page.locator(seccion.selector).first()
          await loc.waitFor({ state: 'visible', timeout: 8_000 })
          const caja = await loc.boundingBox()
          anotacion.caja = caja
          const destino = join(RAIZ_CAPTURAS, vp.nombre, `landing-seccion-${seccion.id}__lleno.png`)
          await loc.screenshot({ path: destino, animations: 'disabled', scale: 'css' })
          anotacion.captura = destino
        } catch (error) {
          anotacion.fallo =
            error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        }
        resultados.push(anotacion)
      }
      escribirFragmento(`landing-secciones-${vp.nombre}`, resultados)
    })
  })
}
