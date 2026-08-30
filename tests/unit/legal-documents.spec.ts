import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { desdeRespuesta } from '@/features/legal/api/legal.source'
import LegalConsentCheckbox from '@/features/legal/components/LegalConsentCheckbox.vue'
import LegalDocumentBody from '@/features/legal/components/LegalDocumentBody.vue'
import {
  LEGAL_DOCUMENTS,
  esBorrador,
  referenciaDe,
  textoPlano,
} from '@/features/legal/content/legal.content'
import { MARCA_PENDIENTE, RESPONSABLE } from '@/features/legal/content/responsable'
import { REGIONES_BEDROCK, regionesEnFrase } from '@/features/legal/content/transferencia'
import type { PublicLegalDocumentResponse } from '@/features/legal/types/legal.types'
import { exigir } from '../helpers/exigir'

/**
 * LOS TEXTOS LEGALES, Y LAS TRES COSAS QUE NO PUEDEN ROMPERSE EN SILENCIO.
 *
 * Un documento legal no tiene comportamiento que probar: no hay estados, ni
 * transiciones, ni cálculo. Lo que sí tiene son tres invariantes que se rompen
 * calladas y cuya rotura no la ve nadie hasta que hay que defender un
 * consentimiento:
 *
 *  1. **El responsable sigue sin definir.** Mientras quede un marcador, el
 *     documento tiene que declararse borrador. La prueba fija la EQUIVALENCIA,
 *     no el estado de hoy: así sigue siendo cierta después de rellenar los
 *     datos, y se pone roja si alguien rellena la mitad y apaga el aviso a mano.
 *  2. **La lista de regiones dice la verdad.** Es el segundo lector de
 *     `bedrock_routing_regions`, y el comentario del Terraform promete que
 *     ampliarla obliga a cambiar el texto legal ANTES. Aquí esa promesa se
 *     comprueba contra el propio `.tf` cuando el repositorio de infraestructura
 *     está al lado, que es el caso normal del monorepo de trabajo.
 *  3. **La casilla enlaza y fecha lo que acepta.** Una casilla que nombra la
 *     política sin llevar a ella, o que no dice qué versión acepta, recoge un
 *     clic y no el consentimiento informado del artículo 9 de la Ley 1581.
 */

const PRIVACIDAD = LEGAL_DOCUMENTS.PRIVACY_POLICY
const TERMINOS = LEGAL_DOCUMENTS.TERMS_OF_SERVICE
const TODOS = [PRIVACIDAD, TERMINOS]

/** `RouterLink` no existe fuera del router: se sustituye por un `<a>` que conserva el destino. */
const ROUTER_LINK = {
  props: ['to'],
  template: '<a class="rl" :data-to="to?.name ?? to"><slot /></a>',
}

describe('El responsable sin definir hace del documento un borrador', () => {
  it('los marcadores son imposibles de leer como un dato real', () => {
    // No es una comprobación de estilo: lo que hace inútil a un marcador es que
    // se parezca a un valor. `Mi Empresa SAS` o un NIT de relleno se publican
    // sin que nadie los mire dos veces.
    expect(RESPONSABLE.razonSocial).toContain(MARCA_PENDIENTE)
    expect(RESPONSABLE.nit).toContain(MARCA_PENDIENTE)
    expect(RESPONSABLE.domicilio).toContain(MARCA_PENDIENTE)
    expect(RESPONSABLE.telefono).toContain(MARCA_PENDIENTE)
  })

  it.each(TODOS)('«$code» es borrador exactamente si arrastra marcadores', (doc) => {
    expect(esBorrador(doc)).toBe(textoPlano(doc).includes(MARCA_PENDIENTE))
  })

  it.each(TODOS)('«$code» nombra al responsable en su propio texto', (doc) => {
    // El artículo 2.2.2.25.3.1 del Decreto 1074 de 2015 abre la lista de
    // contenidos mínimos con la identificación del responsable. Si el dato no
    // está EN el documento, no basta con tenerlo en una constante.
    expect(textoPlano(doc)).toContain(RESPONSABLE.razonSocial)
    expect(textoPlano(doc)).toContain(RESPONSABLE.nit)
  })

  it('el aviso de borrador se pinta mientras haya marcadores', () => {
    const wrapper = mount(LegalDocumentBody, { props: { doc: PRIVACIDAD } })
    expect(wrapper.find('.pub-doc-draft').exists()).toBe(esBorrador(PRIVACIDAD))
    expect(wrapper.text()).toContain('Borrador sin valor legal')
  })
})

describe('Las tres regiones de Bedrock, que el texto legal tiene que nombrar', () => {
  it('son exactamente las tres, escritas', () => {
    // Escritas y no derivadas: si alguien amplía la lista, esto se pone rojo y
    // le obliga a pasar por la política antes que por IAM.
    expect([...REGIONES_BEDROCK]).toEqual(['us-east-1', 'us-east-2', 'us-west-2'])
  })

  it('la política nombra las tres, una por una', () => {
    const texto = textoPlano(PRIVACIDAD)
    for (const region of REGIONES_BEDROCK) expect(texto).toContain(region)
    expect(texto).toContain(regionesEnFrase())
  })

  it('la política nombra el destino, no solo «el extranjero»', () => {
    const texto = textoPlano(PRIVACIDAD)
    expect(texto).toContain('Estados Unidos de América')
    expect(texto).toContain('Amazon Bedrock')
    expect(texto).toContain('artículo 26 de la Ley 1581 de 2012')
  })

  it('coincide con `bedrock_routing_regions` del Terraform, si el repo está al lado', () => {
    // Mismo patrón que `plans-content-catalogo.spec.ts` con los changesets del
    // backend: la comprobación cruzada solo es posible en el monorepo de
    // trabajo, y ahí es donde de verdad se edita el `.tf`. En CI cada repo se
    // clona solo, así que la prueba se salta sin fingir que comprobó algo.
    // Se resuelve desde `process.cwd()` —la raíz del repositorio cuando vitest
    // arranca— y NO desde `import.meta.url`: bajo el entorno `jsdom` de este
    // proyecto, `import.meta.url` es una URL `http://` y `fileURLToPath` la
    // rechaza. Es la misma trampa que documenta `plans-content-catalogo.spec.ts`.
    const locals = resolve(process.cwd(), '../VetSoftwareIaC/environments/dev/locals.tf')
    if (!existsSync(locals)) return

    const match = /bedrock_routing_regions\s*=\s*\[([^\]]*)\]/.exec(readFileSync(locals, 'utf8'))
    if (match === null) throw new Error('no encuentro `bedrock_routing_regions` en locals.tf')

    const lista = exigir(match[1], 'el cuerpo de la lista `bedrock_routing_regions`')
    const enTerraform = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1])
    expect(enTerraform).toEqual([...REGIONES_BEDROCK])
  })
})

describe('Lo que la Ley 1581 de 2012 exige que diga la política', () => {
  const texto = textoPlano(PRIVACIDAD)

  it('enumera los cinco derechos con su vocabulario, no con el del RGPD', () => {
    for (const verbo of ['Conocer', 'Actualizar', 'Rectificar', 'Revocar', 'supresión']) {
      expect(texto).toContain(verbo)
    }
  })

  it('dice por qué canal se ejercen y con qué plazos', () => {
    expect(texto).toContain(RESPONSABLE.canalCorreo)
    expect(texto).toContain(RESPONSABLE.areaResponsable)
    expect(texto).toContain('diez (10) días hábiles')
    expect(texto).toContain('quince (15) días hábiles')
    expect(texto).toContain('Superintendencia de Industria y Comercio')
  })

  it('advierte que los datos sensibles y el texto libre son facultativos', () => {
    expect(texto).toContain('facultativo')
    expect(texto).toContain('datos sensibles')
  })

  it('marca los plazos de conservación como propuesta sin validar', () => {
    // Escribir 90 días y 24 meses como si estuvieran decididos los convierte en
    // decididos a la siguiente lectura. Nadie con criterio jurídico los ha visto.
    expect(texto).toContain('PENDIENTES DE VALIDACIÓN JURÍDICA')
    expect(texto).toContain('90')
    expect(texto).toContain('24 meses')
  })
})

describe('La referencia de versión que viaja con una aceptación', () => {
  it('`referenciaDe` lleva el par que identifica el texto y nada más', () => {
    expect(referenciaDe(PRIVACIDAD)).toEqual({
      code: 'PRIVACY_POLICY',
      kind: 'PRIVACY_POLICY',
      documentVersion: PRIVACIDAD.documentVersion,
      effectiveFrom: PRIVACIDAD.effectiveFrom,
    })
  })

  it('`desdeRespuesta` toma `documentVersion` y NUNCA el `version` de bloqueo', () => {
    // Son dos columnas distintas que en el documento original compartían nombre:
    // `document_version` es la versión de negocio y `version` el bloqueo
    // optimista. Guardar la segunda en una aceptación deja una referencia que no
    // identifica ningún texto.
    const respuesta: PublicLegalDocumentResponse = {
      id: 7,
      code: 'PRIVACY_POLICY',
      documentVersion: 3,
      kind: 'PRIVACY_POLICY',
      title: 'Política de Tratamiento de Datos Personales',
      content: 'texto',
      contentHash: 'a'.repeat(64),
      publishedAt: '2026-09-01T10:00:00',
      effectiveFrom: '2026-09-01',
      supersededAt: null,
      current: true,
      createdDate: '2026-09-01T10:00:00',
    }

    expect(desdeRespuesta(respuesta)).toEqual({
      code: 'PRIVACY_POLICY',
      kind: 'PRIVACY_POLICY',
      documentVersion: 3,
      effectiveFrom: '2026-09-01',
    })
  })
})

describe('La casilla de consentimiento', () => {
  async function montar(props: Record<string, unknown> = {}) {
    const wrapper = mount(LegalConsentCheckbox, {
      props: { modelValue: false, documentos: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'], ...props },
      global: { stubs: { RouterLink: ROUTER_LINK } },
    })
    await flushPromises()
    return wrapper
  }

  it('arranca desmarcada: el silencio no autoriza', async () => {
    const wrapper = await montar()
    expect(wrapper.get('input[type="checkbox"]').attributes('checked')).toBeUndefined()
  })

  it('enlaza a las DOS páginas legales, no las nombra en negrita', async () => {
    const wrapper = await montar()
    const destinos = wrapper.findAll('a.rl').map((a) => a.attributes('data-to'))
    expect(destinos).toEqual(['legal-terminos', 'legal-privacidad'])
  })

  it('dice QUÉ versión se está aceptando', async () => {
    const wrapper = await montar()
    const texto = wrapper.get('.pub-consent-version').text()
    expect(texto).toContain(`versión ${TERMINOS.documentVersion}`)
    expect(texto).toContain(`versión ${PRIVACIDAD.documentVersion}`)
    expect(texto).toContain('vigente desde')
  })

  it('la variante de transferencia nombra el país y las tres regiones', async () => {
    const wrapper = await montar({ documentos: ['PRIVACY_POLICY'], transferencia: true })
    const texto = wrapper.text()
    expect(texto).toContain('Estados Unidos de América')
    expect(texto).toContain('Amazon Bedrock')
    for (const region of REGIONES_BEDROCK) expect(texto).toContain(region)
  })

  it('expone las referencias para que el padre las guarde al confirmar', async () => {
    const wrapper = await montar()
    expect(wrapper.vm.referencias).toEqual([referenciaDe(TERMINOS), referenciaDe(PRIVACIDAD)])
  })

  it('marca el control como inválido sin duplicar el mensaje del resumen', async () => {
    const wrapper = await montar({ invalid: true })
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('.pub-consent-error').exists()).toBe(false)
  })
})

describe('La estructura del documento, que es lo que lo hace legible', () => {
  it('un solo `h1`, y un `h2` por sección más el del índice', () => {
    const wrapper = mount(LegalDocumentBody, { props: { doc: PRIVACIDAD } })

    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.findAll('h2')).toHaveLength(PRIVACIDAD.sections.length + 1)
  })

  it('cada sección se anuncia con su propio nombre', () => {
    const wrapper = mount(LegalDocumentBody, { props: { doc: PRIVACIDAD } })

    for (const section of PRIVACIDAD.sections) {
      const el = wrapper.get(`#${section.id}`)
      expect(el.attributes('aria-labelledby')).toBe(`${section.id}-h`)
      expect(wrapper.get(`#${section.id}-h`).text()).toBe(section.heading)
    }
  })

  it('el índice lleva a todas las secciones', () => {
    const wrapper = mount(LegalDocumentBody, { props: { doc: TERMINOS } })
    const anclas = wrapper.findAll('.pub-doc-toc a').map((a) => a.attributes('href'))

    expect(anclas).toEqual(TERMINOS.sections.map((s) => `#${s.id}`))
  })

  it('las definiciones van en `dl`, para que la relación llegue al lector', () => {
    // El caso concreto: los datos del responsable y el destino de la
    // transferencia. En párrafos con negrita, un lector de pantalla anuncia seis
    // frases sueltas y no seis pares término-valor.
    const wrapper = mount(LegalDocumentBody, { props: { doc: PRIVACIDAD } })
    const transferencia = wrapper.get('#transferencia')

    expect(transferencia.findAll('dt').map((dt) => dt.text())).toContain('Regiones concretas')
    expect(transferencia.text()).toContain(regionesEnFrase())
  })
})
