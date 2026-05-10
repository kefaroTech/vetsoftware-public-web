import { computed, onMounted, ref, type Ref } from 'vue'

export interface CatalogItem {
  id: number
  name: string
  description: string | null
}

export interface CatalogOption {
  value: string
  label: string
  hint?: string
}

interface CatalogConfig<T extends CatalogItem> {
  fetcher: () => Promise<T[]>
  creator: (data: { name: string; description: string }) => Promise<T>
  errorMessage: string
}

/**
 * Factory que produce un composable cacheado para un catálogo creable.
 * Cada catálogo tiene su propia cache module-scoped (no compartida entre instancias).
 */
export function createCatalog<T extends CatalogItem>(config: CatalogConfig<T>) {
  const cache = ref<T[] | null>(null) as Ref<T[] | null>
  let inFlight: Promise<T[]> | null = null

  async function load(): Promise<T[]> {
    if (cache.value) return cache.value
    if (!inFlight) {
      inFlight = config
        .fetcher()
        .then((list) => {
          cache.value = list
          return list
        })
        .catch((e) => {
          inFlight = null
          throw e
        })
    }
    return inFlight
  }

  return function useCatalog() {
    const list = ref<T[]>(cache.value ?? []) as Ref<T[]>
    const loading = ref(false)
    const error = ref<string | null>(null)

    const options = computed<CatalogOption[]>(() =>
      list.value.map((t) => ({
        value: String(t.id),
        label: t.name,
        hint: t.description ?? undefined,
      })),
    )

    async function refresh() {
      loading.value = true
      error.value = null
      try {
        list.value = await load()
      } catch {
        error.value = config.errorMessage
      } finally {
        loading.value = false
      }
    }

    async function create(data: {
      name: string
      description?: string
    }): Promise<T> {
      const created = await config.creator({
        name: data.name,
        description: data.description ?? '',
      })
      cache.value = [...(cache.value ?? []), created]
      list.value = cache.value
      return created
    }

    function findById(id: string): T | undefined {
      return list.value.find((t) => String(t.id) === id)
    }

    onMounted(() => {
      if (list.value.length === 0) refresh()
    })

    return { list, options, loading, error, findById, refresh, create }
  }
}
