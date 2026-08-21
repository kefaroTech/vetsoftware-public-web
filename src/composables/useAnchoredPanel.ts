import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

/** Refs a los tres nodos que intervienen en un panel anclado. */
export interface AnchoredPanelRefs {
  /** Contenedor del disparador: lo que queda «dentro» aunque no sea el panel. */
  root: Ref<HTMLElement | null>
  /** El control que abre el panel y al que vuelve el foco al cerrarse. */
  trigger: Ref<HTMLElement | null>
  /** El panel ya teletransportado a `<body>`. */
  panel: Ref<HTMLElement | null>
}

/**
 * Panel flotante teletransportado a `<body>` y anclado a su disparador.
 *
 * Reúne las tres piezas que un panel así necesita y que el DOM no le da
 * gratis, precisamente porque al viajar a `<body>` deja de ser descendiente
 * del disparador:
 *
 *  1. **Posición.** Coordenadas fijas respecto al disparador: abre hacia
 *     abajo, o hacia arriba si no cabe, y acota su alto al espacio
 *     disponible. Se recalcula en scroll/resize mientras está abierto.
 *  2. **Clic fuera.** El panel teletransportado NO es descendiente de `root`,
 *     así que hay que contarlo aparte como «dentro» o el primer clic dentro
 *     del propio panel lo cerraría.
 *  3. **Retorno del foco** al disparador (A11Y-03). El panel se desmonta al
 *     cerrarse; sin esto el foco cae a `<body>` y quien navega con teclado
 *     vuelve al principio del documento.
 *
 * El estado es por-instancia (`ref` dentro de la función, no a nivel de
 * módulo): no es estado compartido y por tanto no va a un store de Pinia.
 *
 * @param open   ref del componente que manda: abrir/cerrar sigue siendo suyo.
 * @param refs   los tres nodos, tal cual los declara el componente.
 * @param onClickOutside qué hacer al pulsar fuera (normalmente cerrar y
 *   emitir `blur`). Se invoca sólo si el panel está abierto.
 */
export function useAnchoredPanel(
  open: Ref<boolean>,
  refs: AnchoredPanelRefs,
  onClickOutside: () => void,
) {
  /** Estilo inline (`position: fixed`) que el componente aplica al panel. */
  const style = ref<Record<string, string>>({})

  /** Recalcula la posición. Llámalo cuando cambie el alto del contenido. */
  function reposition() {
    const t = refs.trigger.value
    if (!t) return
    const r = t.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const openUp = spaceBelow < 300 && spaceAbove > spaceBelow
    style.value = {
      position: 'fixed',
      left: `${Math.round(r.left)}px`,
      width: `${Math.round(r.width)}px`,
      maxHeight: `${Math.max(200, Math.round((openUp ? spaceAbove : spaceBelow) - 12))}px`,
      ...(openUp
        ? { bottom: `${Math.round(window.innerHeight - r.top + 4)}px` }
        : { top: `${Math.round(r.bottom + 4)}px` }),
    }
  }

  /** Devuelve el foco al disparador tras cerrar (A11Y-03). */
  function focusTrigger() {
    nextTick(() => refs.trigger.value?.focus())
  }

  function onScrollResize() {
    if (open.value) reposition()
  }

  function trackViewport(on: boolean) {
    if (on) {
      window.addEventListener('scroll', onScrollResize, true)
      window.addEventListener('resize', onScrollResize)
    } else {
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
  }

  function onDocMouseDown(e: MouseEvent) {
    if (!open.value) return
    const target = e.target as Node
    if (refs.root.value?.contains(target) || refs.panel.value?.contains(target)) return
    onClickOutside()
  }

  // `flush: 'sync'` a propósito: la posición tiene que estar calculada ANTES
  // del primer render del panel, igual que cuando la llamada colgaba de la
  // línea siguiente a `open.value = true`. Con el flush por defecto el panel
  // aparecería un frame en la esquina superior izquierda.
  watch(
    open,
    (isOpen) => {
      if (isOpen) reposition()
      trackViewport(isOpen)
    },
    { flush: 'sync' },
  )

  onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onDocMouseDown)
    trackViewport(false)
  })

  return { style, reposition, focusTrigger }
}
