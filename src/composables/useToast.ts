import { useToastStore, type Toast, type ToastKind } from '@/stores/toast.store'

export type { Toast, ToastKind }

/**
 * Wrapper sobre el store de Pinia `toast`. Mantiene la API previa
 * (success/info/warn/error/dismiss + lista `toasts`) para no tocar call sites.
 */
export function useToast() {
  const store = useToastStore()
  return {
    toasts: store.toasts,
    dismiss: store.dismiss,
    success(title: string, message?: string, duration?: number) {
      return store.push('success', title, message, duration)
    },
    info(title: string, message?: string, duration?: number) {
      return store.push('info', title, message, duration)
    },
    warn(title: string, message?: string, duration?: number) {
      return store.push('warn', title, message, duration)
    },
    error(title: string, message?: string, duration?: number) {
      return store.push('error', title, message, duration)
    },
  }
}
