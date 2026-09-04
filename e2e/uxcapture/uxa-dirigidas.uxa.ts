import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { instalarSesion, perfilSimulado, responderJson } from '../helpers/sesion'
import {
  congelarAnimaciones,
  enrutarApiPublica,
  escribirFragmento,
  esperarPantallaQuieta,
  prepararFuentes,
  RAIZ_CAPTURAS,
  TODOS_LOS_PERMISOS,
} from './uxa-arnes'
import { escalaDeEspaciado, medirPantalla } from './uxa-metricas'

/**
 * Dos comprobaciones que el censo general no puede hacer.
 *
 * <p>El censo sirve 200 sanos a todo, así que **ningún banner llega a pintarse**:
 * los del tenant son todos condicionales (`v-if="cupo.aviso"`, estados de error).
 * Y una barra `position: fixed` no se juzga en una captura `fullPage`, donde el
 * navegador la coloca respecto de la página entera y no de la ventana.
 */

const ESCALA = escalaDeEspaciado(process.cwd())
const API = '**/api/v1'

/** El ancho donde se detectó la regresión del tope de medida de línea. */
const ANCHO_BANNER = { width: 1440, height: 900 }

test.describe('banners con el listado caído', () => {
  test.use({ viewport: ANCHO_BANNER })

  test('el banner de error ocupa el ancho y el botón no flota', async ({ page }) => {
    await prepararFuentes(page)
    // 500 en todo salvo la sesión y las sedes: es lo que hace que las vistas de
    // dinero pinten su banner de error en vez de su estado vacío.
    await page.route(`${API}/**`, (route) =>
      responderJson(route, { status: 500, title: 'Error del servidor' }, 500),
    )
    await page.route(`${API}/auth/me`, (route) =>
      responderJson(route, perfilSimulado({ permisos: TODOS_LOS_PERMISOS })),
    )
    await page.route(`${API}/branches`, (route) =>
      responderJson(route, [
        {
          id: 1,
          name: 'Sede E2E de prueba',
          code: 'E2E-1',
          address: null,
          phone: null,
          city: { id: 1, name: 'Bogotá D.C.' },
          active: true,
        },
      ]),
    )
    await instalarSesion(page)

    const anotaciones: Record<string, unknown>[] = []
    for (const ruta of [
      '/dashboard/tienda/servicios',
      '/dashboard/compras/proveedores',
      '/dashboard/suscripcion/cupos',
    ]) {
      await page.goto(ruta, { waitUntil: 'commit' })
      await esperarPantallaQuieta(page)
      const destino = join(
        RAIZ_CAPTURAS,
        'banners-1440',
        `${ruta.replace(/\//g, '-').replace(/^-/, '')}__error.png`,
      )
      await page.screenshot({ path: destino, fullPage: true, animations: 'disabled', scale: 'css' })

      // La medida que decide si el arreglo funcionó: el ancho del banner contra
      // el de su contenedor. Con el tope en la raíz se quedaba en el 48 %.
      const geometria = await page.evaluate(() => {
        const banner = document.querySelector('.ds-banner')
        if (!banner) return null
        const padre = banner.parentElement
        const r = banner.getBoundingClientRect()
        const rp = padre?.getBoundingClientRect()
        const texto = banner.querySelector('span, .ds-flex-fill')
        const boton = banner.querySelector('button, a')
        return {
          bannerWidth: Math.round(r.width),
          padreWidth: rp ? Math.round(rp.width) : null,
          porcentaje: rp ? Math.round((r.width / rp.width) * 100) : null,
          maxWidthRaiz: getComputedStyle(banner).maxWidth,
          textoWidth: texto ? Math.round(texto.getBoundingClientRect().width) : null,
          maxWidthTexto: texto ? getComputedStyle(texto).maxWidth : null,
          botonRight: boton ? Math.round(boton.getBoundingClientRect().right) : null,
          bannerRight: Math.round(r.right),
        }
      })
      anotaciones.push({ ruta, captura: destino, geometria })
    }
    escribirFragmento('dirigida-banners', anotaciones)
    expect(anotaciones.length).toBe(3)
  })
})

/** Por debajo de 900 px la barra de acción pasa de `display: contents` a `fixed`. */
for (const vp of [
  { nombre: 'movil-ancho', width: 760, height: 1024 },
  { nombre: 'movil', width: 390, height: 844 },
]) {
  test.describe(`/planes con barra fija · ${vp.nombre}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('la barra fija no tapa contenido ni descoloca el botón', async ({ page }) => {
      await prepararFuentes(page)
      await enrutarApiPublica(page, 'lleno')
      await page.goto('/planes', { waitUntil: 'commit' })
      await esperarPantallaQuieta(page)
      await congelarAnimaciones(page)

      // Al final de la página, que es donde el despeje del pie tiene que bastar.
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }))
      const geometria = await page.evaluate(() => {
        const fija = [...document.querySelectorAll<HTMLElement>('body *')].find(
          (el) =>
            getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().height > 0,
        )
        if (!fija) return null
        const r = fija.getBoundingClientRect()
        const boton = fija.querySelector('button, a')
        const rb = boton?.getBoundingClientRect()
        // Qué queda DEBAJO de la barra: si algo interactivo cae ahí, tapa.
        const tapados = [...document.querySelectorAll<HTMLElement>('a[href],button,input,select')]
          .filter((el) => {
            if (fija.contains(el)) return false
            const re = el.getBoundingClientRect()
            return re.height > 0 && re.bottom > r.top && re.top < r.bottom
          })
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/)[0]}`)
        return {
          selector: `${fija.tagName.toLowerCase()}.${String(fija.className).split(/\s+/)[0]}`,
          barra: {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
          },
          ventana: { w: window.innerWidth, h: window.innerHeight },
          pegadaAbajo: Math.abs(r.bottom - window.innerHeight) <= 1,
          anchoCompleto: Math.abs(r.width - window.innerWidth) <= 1,
          boton: rb
            ? {
                left: Math.round(rb.left),
                right: Math.round(rb.right),
                height: Math.round(rb.height),
                dentro: rb.left >= r.left - 1 && rb.right <= r.right + 1,
              }
            : null,
          tapados,
        }
      })

      const destino = join(RAIZ_CAPTURAS, 'planes-barra-fija', `planes-${vp.nombre}__fondo.png`)
      // Sin `fullPage`: una barra fija en captura de página completa se coloca
      // respecto del documento y no de la ventana, así que la imagen mentiría.
      await page.screenshot({
        path: destino,
        fullPage: false,
        animations: 'disabled',
        scale: 'css',
      })
      escribirFragmento(`dirigida-planes-${vp.nombre}`, [
        {
          viewport: vp.nombre,
          captura: destino,
          geometria,
          metricas: await medirPantalla(page, ESCALA),
        },
      ])
    })
  })
}
