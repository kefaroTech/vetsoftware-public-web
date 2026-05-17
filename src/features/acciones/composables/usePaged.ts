import { computed, ref, watch, type Ref } from 'vue'

export function usePaged<T>(items: Ref<T[]>, pageSize = 8) {
  const page = ref(1)

  watch(
    () => items.value.length,
    () => {
      page.value = 1
    },
  )

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(items.value.length / pageSize)),
  )

  const slice = computed(() => {
    const start = (page.value - 1) * pageSize
    return items.value.slice(start, start + pageSize)
  })

  const total = computed(() => items.value.length)

  return { page, pageCount, slice, total, pageSize }
}
