import { reactive } from 'vue'

export type ToastKind = 'success' | 'info' | 'warn' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

const DEFAULT_DURATION = 3000

const toasts = reactive<Toast[]>([])
let nextId = 1

function push(
  kind: ToastKind,
  title: string,
  message?: string,
  duration: number = DEFAULT_DURATION,
): number {
  const id = nextId++
  toasts.push({ id, kind, title, message })
  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration)
  }
  return id
}

function dismiss(id: number): void {
  const idx = toasts.findIndex((t) => t.id === id)
  if (idx >= 0) toasts.splice(idx, 1)
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success(title: string, message?: string, duration?: number) {
      return push('success', title, message, duration)
    },
    info(title: string, message?: string, duration?: number) {
      return push('info', title, message, duration)
    },
    warn(title: string, message?: string, duration?: number) {
      return push('warn', title, message, duration)
    },
    error(title: string, message?: string, duration?: number) {
      return push('error', title, message, duration)
    },
  }
}
