import { computed, ref, watch, type Ref } from 'vue'

/**
 * Paginación en cliente sobre una lista ya cargada.
 *
 * `term` es el término de búsqueda que filtra `items`, y se vigila **el término,
 * no la longitud**. Vigilar `items.value.length` era un defecto latente: un
 * filtro que devuelve el mismo NÚMERO de elementos con otro contenido —buscar
 * «ana» y luego «juan» sobre listas de ocho— no cambia la longitud, el `watch`
 * no dispara y el usuario se queda en la página 3 de un resultado que ya solo
 * tiene una: tabla vacía con datos detrás.
 */
export function usePaged<T>(items: Ref<T[]>, pageSize = 8, term?: Ref<string>) {
  const page = ref(1)

  watch(
    () => term?.value.trim() ?? '',
    () => {
      page.value = 1
    },
  )

  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)))

  /**
   * Red de seguridad para lo que el término no cubre: si la lista encoge por su
   * cuenta (un borrado, una recarga con menos filas) la página vigente puede
   * quedar fuera de rango. Se recorta a la última disponible en vez de volver a
   * la primera, que es donde el usuario NO estaba.
   */
  watch(pageCount, (count) => {
    if (page.value > count) page.value = count
  })

  const slice = computed(() => {
    const start = (page.value - 1) * pageSize
    return items.value.slice(start, start + pageSize)
  })

  const total = computed(() => items.value.length)

  return { page, pageCount, slice, total, pageSize }
}
