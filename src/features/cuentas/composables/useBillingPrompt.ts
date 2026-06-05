import { reactive } from 'vue'

/**
 * Estado global del modal de facturación (ConsultaBillingModal), montado una
 * sola vez vía BillingPromptHost en App.vue. Se dispara tras guardar una
 * consulta o crear un procedimiento clínico.
 */
export interface BillingPromptOptions {
  ownerId: number | null
  ownerName: string
  animalId: number | null
  animalName: string
  heading?: string
  subtitle?: string
  autoConsulta?: boolean
  onFinish?: () => void
  /** Se invoca al cerrar el modal (por finish o por cierre directo). */
  onClose?: () => void
}

interface BillingPromptState extends Required<Omit<BillingPromptOptions, 'onFinish' | 'onClose'>> {
  open: boolean
  onFinish: (() => void) | null
  onClose: (() => void) | null
}

const state = reactive<BillingPromptState>({
  open: false,
  ownerId: null,
  ownerName: '',
  animalId: null,
  animalName: '',
  heading: 'Facturación',
  subtitle: '',
  autoConsulta: false,
  onFinish: null,
  onClose: null,
})

export function openBilling(opts: BillingPromptOptions): void {
  state.ownerId = opts.ownerId
  state.ownerName = opts.ownerName
  state.animalId = opts.animalId
  state.animalName = opts.animalName
  state.heading = opts.heading ?? 'Facturación'
  state.subtitle = opts.subtitle ?? ''
  state.autoConsulta = opts.autoConsulta ?? false
  state.onFinish = opts.onFinish ?? null
  state.onClose = opts.onClose ?? null
  state.open = true
}

export function closeBilling(): void {
  state.open = false
  state.onClose?.()
}

export function finishBilling(): void {
  state.onFinish?.()
}

export function useBillingPrompt() {
  return { state, openBilling, closeBilling, finishBilling }
}
