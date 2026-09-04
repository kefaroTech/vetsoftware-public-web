import { describe, expect, it } from 'vitest'
import { detectarModulos } from '@/features/landing/composables/deteccionModulos'

/**
 * LA DETECCIÓN POR PALABRAS CLAVE DE LA PORTADA.
 *
 * <p>Lo que se protege es el ancla a principio de palabra. Con subcadena suelta
 * —que es como estaba escrito en el prototipo— «ahora» marcaba la agenda y
 * «radiografías» marcaba la cartera, y el prospecto llegaba al paso siguiente
 * con módulos que nunca mencionó y que sí cuestan dinero.
 */
const TODOS = [
  'SCHEDULING',
  'CLINICAL_HISTORY',
  'VACCINATION_DEWORMING',
  'HOSPITALIZATION',
  'SURGERY',
  'LAB_IMAGING',
  'GROOMING',
  'SERVICES',
  'CASH_REGISTER',
  'INVENTORY',
  'PURCHASES',
  'OPEN_ACCOUNTS',
  'ELECTRONIC_INVOICING',
]

describe('detectarModulos — la clave empieza donde empieza una palabra', () => {
  it('reconoce el servicio aunque la palabra venga flexionada', () => {
    expect(detectarModulos('Hacemos baño y estética los sábados.', TODOS)).toEqual(['GROOMING'])
  })

  it('«ahora» no menciona la agenda: la clave no empieza donde empieza la palabra', () => {
    expect(detectarModulos('Ahora mismo somos dos personas.', TODOS)).toEqual([])
  })

  it('«radiografías» es laboratorio, y no cartera por llevar «fía» dentro', () => {
    const encontrados = detectarModulos('Tomamos radiografías en el sitio.', TODOS)

    expect(encontrados).toContain('LAB_IMAGING')
    expect(encontrados).not.toContain('OPEN_ACCOUNTS')
  })

  it('devuelve los códigos en el orden del catálogo, no en el del texto', () => {
    expect(detectarModulos('Cobramos en caja lo que se agenda.', TODOS)).toEqual([
      'SCHEDULING',
      'CASH_REGISTER',
    ])
  })

  it('solo propone lo que el catálogo vigente vende', () => {
    expect(detectarModulos('Agendamos citas y hacemos cirugía.', ['SURGERY'])).toEqual(['SURGERY'])
  })

  it('sin texto no propone nada, y el espacio en blanco es no tener texto', () => {
    expect(detectarModulos('', TODOS)).toEqual([])
    expect(detectarModulos('   \n  ', TODOS)).toEqual([])
  })
})
