import { defineStore } from 'pinia'
import { ref, shallowRef, type Component } from 'vue'

/**
 * El ÚNICO diálogo de confirmación del front operativo.
 *
 * Antes había ocho componentes a medida —`ConfirmDeleteDialog`,
 * `DeceasedConfirmDialog`, `ConfirmDeactivateDialog`, `LabCollectConfirmDialog`,
 * `ConfirmDeactivateRoleDialog`, `DiscardConsultaDialog`,
 * `SaveConsultaConfirmDialog`— más siete `window.confirm()` nativos en compras.
 * Cada uno resolvía a su manera el foco, el Escape, el z-index y la guarda de
 * doble clic, y los nativos no resolvían ninguna de las cuatro: botones en el
 * idioma del navegador, sin estilo y sin guarda.
 *
 * El patrón viene de la consola de plataforma (`vetsoftware-admin-web`), donde ya
 * estaba resuelto y probado. Aquí llega ampliado con lo que el front del tenant
 * necesitaba para no perder nada por el camino: título y subtítulo, rótulos de
 * los dos botones, acento, icono y -sobre todo- el énfasis estructurado del
 * cuerpo y la acción en vuelo.
 */

/**
 * Un trozo del cuerpo del diálogo. `string` es texto normal; `{ strong }` sale
 * en negrita.
 *
 * Existe porque tres diálogos ponían el NOMBRE DEL PACIENTE en `<strong>` y ese
 * texto viene de datos del usuario. `v-html` habria sido la forma corta y la
 * forma equivocada: inyectaría cualquier cosa que alguien haya escrito en el
 * nombre de una mascota. Pasando segmentos, Vue interpola cada uno y el marcado
 * lo pone la plantilla, no el dato.
 */
export type ConfirmSegment = string | { strong: string }

export interface ConfirmOptions {
  /** La pregunta. Único campo obligatorio. Con segmentos si lleva énfasis. */
  message: string | ConfirmSegment[]
  /** Encabezado del diálogo. Por defecto «Confirmar acción». */
  title?: string
  /** Línea bajo el título: el registro concreto sobre el que se actúa. */
  subtitle?: string
  /**
   * Qué se lleva por delante la acción y si es reversible. Sale en un banner de
   * aviso bajo la pregunta.
   */
  consequence?: string
  /** Rótulo del botón que confirma, con la acción NOMBRADA («Eliminar orden»). */
  confirmLabel?: string
  /** Rótulo mientras la acción está en vuelo («Guardando…»). */
  busyLabel?: string
  /** Rótulo del botón que cancela. Por defecto «Cancelar». */
  cancelLabel?: string
  /**
   * El tono NO es decorativo. `danger` es para lo que destruye o revierte;
   * `warn` para lo que solo avisa —registrar una mascota fallecida es un aviso,
   * no un peligro, y teñirlo de rojo convertiría el gesto en una amenaza—; y
   * `amatista` para lo que simplemente confirma.
   */
  accent?: 'amatista' | 'danger' | 'warn'
  /** Icono del encabezado (Lucide). */
  icon?: Component
  /** Ancho de la tarjeta. Por defecto 440. */
  width?: number
  /**
   * La acción confirmada. Es el equivalente del `:busy` que tenia
   * `ConfirmDeleteDialog` y del que dependían sus doce consumidores, y es más
   * seguro que él: mientras `action` está en vuelo el diálogo SIGUE ABIERTO con
   * los dos botones inertes, así que ni se puede confirmar dos veces ni se
   * puede volver a la fila de la tabla y disparar la misma acción otra vez —que
   * es justo el hueco que dejaría cerrar el diálogo al aceptar.
   *
   * El `finally` lo tiene el store, no el llamador: no hay forma de olvidarse
   * de bajar la bandera y dejar la aplicación con un diálogo inerte para
   * siempre. Si `action` lanza, la promesa de `confirm()` RECHAZA con el mismo
   * error, así que el `catch` que ya tiene la vista —y su `toast.errorFrom`,
   * que es quien conserva el `X-Trace-Id`— sigue funcionando igual.
   */
  action?: () => unknown
}

const DEFAULT_TITLE = 'Confirmar acción'

export const useConfirmDialogStore = defineStore('confirmDialog', () => {
  const isOpen = ref(false)
  const segments = ref<ConfirmSegment[]>([])
  const title = ref(DEFAULT_TITLE)
  const subtitle = ref('')
  const consequence = ref<string | null>(null)
  const confirmLabel = ref('Confirmar')
  const busyLabel = ref('Confirmar')
  const cancelLabel = ref('Cancelar')
  const accent = ref<'amatista' | 'danger' | 'warn'>('danger')
  /** `shallowRef`: un componente no debe volverse reactivo en profundidad. */
  const icon = shallowRef<Component | null>(null)
  const width = ref(440)
  const busy = ref(false)

  let settle: { resolve: (v: boolean) => void; reject: (e: unknown) => void } | null = null
  let action: (() => unknown) | null = null

  /**
   * `confirm('texto')` sigue funcionando: es la forma que usan las
   * confirmaciones sin adornos y no hay motivo para obligarlas a un objeto.
   */
  function confirm(input: string | ConfirmOptions): Promise<boolean> {
    // Si ya hay una pregunta abierta sin responder se cancela antes de
    // sustituirla: su promesa resuelve `false`, que es la respuesta segura
    // cuando el usuario nunca llegó a decidir. Sin esto, reasignar el resolutor
    // perdería el anterior y quien esperaba esa primera respuesta se quedaría
    // colgado para siempre, sin un solo error que lo delate.
    settle?.resolve(false)
    settle = null

    const o: ConfirmOptions = typeof input === 'string' ? { message: input } : input
    segments.value = typeof o.message === 'string' ? [o.message] : o.message
    title.value = o.title ?? DEFAULT_TITLE
    subtitle.value = o.subtitle ?? ''
    consequence.value = o.consequence ?? null
    confirmLabel.value = o.confirmLabel ?? 'Confirmar'
    busyLabel.value = o.busyLabel ?? o.confirmLabel ?? 'Confirmar'
    cancelLabel.value = o.cancelLabel ?? 'Cancelar'
    accent.value = o.accent ?? 'danger'
    icon.value = o.icon ?? null
    width.value = o.width ?? 440
    action = o.action ?? null
    busy.value = false
    isOpen.value = true

    return new Promise<boolean>((resolve, reject) => {
      settle = { resolve, reject }
    })
  }

  function close(): { resolve: (v: boolean) => void; reject: (e: unknown) => void } | null {
    isOpen.value = false
    busy.value = false
    action = null
    const s = settle
    settle = null
    return s
  }

  async function accept() {
    // Guarda de doble envío: mientras la acción vuela, aceptar no hace nada.
    if (busy.value || !settle) return
    if (!action) {
      close()?.resolve(true)
      return
    }
    const run = action
    busy.value = true
    try {
      await run()
    } catch (e) {
      close()?.reject(e)
      return
    }
    close()?.resolve(true)
  }

  function cancel() {
    // Cancelar durante la acción NO la interrumpe: no hay nada que deshacer y
    // dejar cerrar aquí devolvería `false` a quien ya está escribiendo.
    if (busy.value) return
    close()?.resolve(false)
  }

  return {
    isOpen,
    segments,
    title,
    subtitle,
    consequence,
    confirmLabel,
    busyLabel,
    cancelLabel,
    accent,
    icon,
    width,
    busy,
    confirm,
    accept,
    cancel,
  }
})
