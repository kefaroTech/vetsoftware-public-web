import { onBeforeUnmount, ref, watch, type Ref, type ShallowRef } from 'vue'

/**
 * Una región que se desplaza en horizontal tiene que poder recibir el foco para
 * ser alcanzable por teclado (WCAG 2.2 §2.1.1), pero solo cuando de verdad
 * desborda: un `tabindex` fijo deja una parada de tabulador vacía en cada tabla
 * que cabe entera, y en estas pantallas hay hasta cuatro tablas por vista.
 *
 * El `ResizeObserver` vigila la caja Y su primer hijo: una columna que crece
 * cambia el `scrollWidth` sin que el contenedor cambie de tamaño, así que
 * observar solo el contenedor dejaría ese caso sin detectar.
 */
export function useScrollableRegion(
  target: Readonly<ShallowRef<HTMLElement | null>>,
): Ref<boolean> {
  const desborda = ref(false)
  let observer: ResizeObserver | undefined

  function medir() {
    const el = target.value
    desborda.value = el != null && el.scrollWidth > el.clientWidth
  }

  watch(
    target,
    (el) => {
      observer?.disconnect()
      observer = undefined
      if (el == null) {
        desborda.value = false
        return
      }
      medir()
      // jsdom no implementa `ResizeObserver`: sin la guarda, montar cualquiera
      // de estas tablas en un test unitario lanzaría.
      if (typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver(medir)
      observer.observe(el)
      if (el.firstElementChild != null) observer.observe(el.firstElementChild)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => observer?.disconnect())

  return desborda
}
