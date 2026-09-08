import { formatDateLong, formatDateShort, todayISO } from '@/composables/format'
import type { ModuleShowcaseState } from '@/features/entitlements/types/modulos.types'
import type { PurchasedModuleLineResponse } from '../types/compraModulos.types'
import { diasEntre, dias } from './estadoSuscripcion'

/**
 * El vocabulario de «Tus módulos». **Puro**: funciones y datos, sin estado ni peticiones — mismo
 * principio que `estadoSuscripcion.ts` y `cuposText.ts`, y por el mismo motivo: estos textos son
 * la única explicación que la clínica recibe de por qué un módulo cobra o deja de crear.
 */

/** Variantes que `BaseChip` declara hoy: ni una más. */
export type ChipVariant = 'neutral' | 'accent' | 'success' | 'warn'

export interface EstadoPill {
  variant: ChipVariant
  texto: string
}

const PILLS: Record<ModuleShowcaseState, EstadoPill> = {
  TRIAL: { variant: 'accent', texto: 'En prueba' },
  FREE_LIMITED: { variant: 'success', texto: 'Gratis con techo' },
  EXPIRED_READ_ONLY: { variant: 'warn', texto: 'Solo lectura' },
  PAID: { variant: 'neutral', texto: 'Activo' },
  NEVER_FREE: { variant: 'warn', texto: 'Nunca gratis' },
  NOT_INCLUDED: { variant: 'neutral', texto: 'No incluido' },
}

/**
 * La píldora de un estado. Ante un valor que este front no conoce se dice «feo a propósito»
 * —el código en mayúsculas— en vez de romper: es un dato del catálogo, no un enum cerrado.
 */
export function estadoPill(state: string | undefined): EstadoPill {
  if (state && state in PILLS) return PILLS[state as ModuleShowcaseState]
  return { variant: 'neutral', texto: state ? state.toUpperCase() : '—' }
}

/** `TRIAL`: fecha de fin + días restantes, con el mismo giro de urgencia que el aviso global. */
export function cuerpoTrial(trialEndDate: string | undefined, today: string = todayISO()): string {
  const fin = formatDateShort(trialEndDate)
  const restantes = trialEndDate ? diasEntre(today, trialEndDate) : null
  if (restantes == null) return `Gratis hasta el ${fin}.`
  const acotados = Math.max(0, restantes)
  const cola = `Gratis hasta el ${fin}. Quedan ${dias(acotados)}.`
  return acotados <= 7 ? `${cola} No se corta nada por sí solo.` : cola
}

/** El eje mensual (`FLOW`) dice «este mes», el acumulado dice «en total». */
export function sufijoEje(measureKind: string | undefined): string {
  return measureKind === 'FLOW' ? 'este mes' : 'en total'
}

export const CUERPO_SOLO_LECTURA =
  'Puedes consultar e imprimir lo que ya tienes. Para volver a crear, cómpralo.'

export const CUERPO_DE_PAGO = 'Incluido en tu plan.'

export const CUERPO_NUNCA_GRATIS =
  'Facturación electrónica no tiene prueba. Se cobra desde el día en que la actives.'

export const CUERPO_NO_INCLUIDO = 'Este módulo no está disponible para tu plan.'

/** El hueco honesto de la tarjeta cuando el rol no puede comprar: es regla de negocio, no un 403. */
export const SIN_PERMISO_COMPRA =
  'Solo quien administra tu cuenta puede comprar módulos. Pídeselo a tu administrador.'

/** El rótulo del CTA de compra, por estado. Cadena vacía cuando ese estado no lleva botón. */
export function ctaCompra(state: string | undefined): string {
  switch (state) {
    case 'TRIAL':
    case 'EXPIRED_READ_ONLY':
    case 'NEVER_FREE':
      return 'Comprar'
    default:
      return ''
  }
}

/**
 * `true` cuando la tarjeta lleva casilla de selección y CTA de compra.
 *
 * <p>`FREE_LIMITED` queda fuera a propósito: el catálogo no define hoy un artículo de «techo más
 * alto», así que no se prediseña un control para un artículo que no existe.
 */
export function esComprable(state: string | undefined, purchasable: boolean | undefined): boolean {
  return (
    purchasable === true &&
    (state === 'TRIAL' || state === 'EXPIRED_READ_ONLY' || state === 'NEVER_FREE')
  )
}

/** El resumen de compra, antes de confirmar: sin fecha exacta, porque todavía no la conocemos. */
export function notaCobroPrevio(incluyeNuncaGratis: boolean): string {
  if (incluyeNuncaGratis) {
    return 'Facturación electrónica se cobra desde hoy. Los demás módulos se cobran cuando termine tu prueba, o en tu próximo corte si ya estaban en solo lectura — nunca antes.'
  }
  return 'El cobro se hace efectivo cuando termine tu prueba, por el periodo completo, o en tu próximo corte si el módulo ya estaba en solo lectura.'
}

/**
 * La confirmación tras comprar, línea a línea. Usa `firstChargeDate`/`chargedNow` de la
 * respuesta tal cual: nunca promete «se cobra hoy» salvo que el servidor lo confirme.
 */
export function textoConfirmacion(linea: PurchasedModuleLineResponse, nombre: string): string {
  if (linea.chargedNow) return `${nombre}: se cobró hoy.`
  if (linea.firstChargeDate) {
    return `${nombre}: el primer cobro es el ${formatDateLong(linea.firstChargeDate)}.`
  }
  return `${nombre}: ya está activo.`
}
