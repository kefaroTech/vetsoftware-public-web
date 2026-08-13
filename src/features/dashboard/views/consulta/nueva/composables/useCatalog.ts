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
 * Factory que produce un composable para un catálogo creable.
 *
 * `inFlight` NO es una caché, aunque este comentario lo dijera antes: se anula
 * en cuanto la petición resuelve, así que cada `refresh()` vuelve a preguntar al
 * servidor. Lo que hace es **deduplicar las llamadas concurrentes** — si tres
 * componentes que usan el mismo catálogo se montan a la vez, sale una sola
 * petición y las tres comparten su promesa.
 *
 * Que no cachee es deliberado: la convención del proyecto es recargar al abrir
 * cada pantalla, así que un catálogo servido de memoria mostraría el tipo de
 * examen que se acaba de crear en otra pestaña como si no existiera.
 *
 * Tampoco es el «estado module-scoped» que prohíbe el CLAUDE.md: esa regla
 * habla de `ref()`/`reactive()` singleton, es decir, de ESTADO reactivo
 * compartido que debería vivir en Pinia. Esto es un cerrojo de concurrencia
 * sobre una promesa, sin reactividad y sin nada que la interfaz pueda leer.
 */
export function createCatalog<T extends CatalogItem>(config: CatalogConfig<T>) {
  let inFlight: Promise<T[]> | null = null

  async function load(): Promise<T[]> {
    if (inFlight) return inFlight
    inFlight = config
      .fetcher()
      .then((list) => {
        inFlight = null
        return list
      })
      .catch((e) => {
        inFlight = null
        throw e
      })
    return inFlight
  }

  return function useCatalog() {
    const list = ref<T[]>([]) as Ref<T[]>
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

    async function create(data: { name: string; description?: string }): Promise<T> {
      const created = await config.creator({
        name: data.name,
        description: data.description ?? '',
      })
      list.value = [...list.value, created]
      return created
    }

    function findById(id: string): T | undefined {
      return list.value.find((t) => String(t.id) === id)
    }

    onMounted(() => {
      refresh()
    })

    return { list, options, loading, error, findById, refresh, create }
  }
}
