import { defineStore } from 'pinia'
import { reactive } from 'vue'

export interface BillingPromptOptions {
  ownerId: number | null
  ownerName: string
  animalId: number | null
  animalName: string
  heading?: string
  subtitle?: string
  /** `false` → modal no descartable (sin X, sin Cancelar, sin Escape): el usuario debe elegir una acción. */
  dismissible?: boolean
  onFinish?: () => void
  /** Se invoca al cerrar el modal (por finish o por cierre directo). */
  onClose?: () => void
}

interface BillingPromptState extends Required<Omit<BillingPromptOptions, 'onFinish' | 'onClose'>> {
  open: boolean
  onFinish: (() => void) | null
  onClose: (() => void) | null
}

export const useBillingPromptStore = defineStore('billingPrompt', () => {
  const state = reactive<BillingPromptState>({
    open: false,
    ownerId: null,
    ownerName: '',
    animalId: null,
    animalName: '',
    heading: 'Facturación',
    subtitle: '',
    dismissible: true,
    onFinish: null,
    onClose: null,
  })

  function open(opts: BillingPromptOptions): void {
    state.ownerId = opts.ownerId
    state.ownerName = opts.ownerName
    state.animalId = opts.animalId
    state.animalName = opts.animalName
    state.heading = opts.heading ?? 'Facturación'
    state.subtitle = opts.subtitle ?? ''
    state.dismissible = opts.dismissible ?? true
    state.onFinish = opts.onFinish ?? null
    state.onClose = opts.onClose ?? null
    state.open = true
  }

  function close(): void {
    state.open = false
    state.onClose?.()
  }

  function finish(): void {
    state.onFinish?.()
  }

  return { state, open, close, finish }
})
