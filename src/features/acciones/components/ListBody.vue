<script setup lang="ts" generic="T">
import { computed, onMounted, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { usePaged } from '../composables/usePaged'
import { useServerPaged, type ServerPageLoader } from '@/composables/useServerPaged'
import { emptyPage } from '@/types/pagination'
import Pagination from '@/components/ui/Pagination.vue'

const props = withDefaults(
  defineProps<{
    /** Modo cliente: el array completo ya cargado. Ignorado si se pasa `fetchPage`. */
    items?: T[]
    /**
     * Modo servido (BE-06): la tabla pide cada página al backend en vez de recibir el listado
     * entero. Es el modo por defecto para todo listado que crece; el modo cliente queda solo
     * para catálogos acotados, que caben de una vez.
     */
    fetchPage?: ServerPageLoader<T>
    searchFn?: (item: T, q: string) => boolean
    placeholder?: string
    pageSize?: number
    emptyText?: string
    loading?: boolean
  }>(),
  {
    items: () => [],
    placeholder: 'Buscar…',
    pageSize: 8,
    emptyText: 'No hay registros aún',
  },
)

const query = ref('')
const isServer = computed(() => typeof props.fetchPage === 'function')

// Modo servido. El loader se resuelve en cada llamada para no capturar una prop obsoleta;
// si no hay fetchPage devuelve una pagina vacia y manda el modo cliente.
const server = useServerPaged<T>(
  (page, size, q, signal) =>
    props.fetchPage
      ? props.fetchPage(page, size, q, signal)
      : Promise.resolve(emptyPage<T>(props.pageSize)),
  { pageSize: props.pageSize, query },
)

// Modo cliente (el de siempre): filtra y pagina sobre lo ya cargado.
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const searchFn = props.searchFn
  if (!q || !searchFn) return props.items
  return props.items.filter((it) => searchFn(it, q))
})
const client = usePaged(filtered, props.pageSize)

const slice = computed(() => (isServer.value ? server.items.value : client.slice.value))
const page = computed({
  get: () => (isServer.value ? server.page.value : client.page.value),
  set: (v: number) => {
    if (isServer.value) void server.goTo(v)
    else client.page.value = v
  },
})
const pageCount = computed(() => (isServer.value ? server.pageCount.value : client.pageCount.value))
const total = computed(() => (isServer.value ? server.total.value : client.total.value))
const currentPageSize = computed(() => (isServer.value ? server.pageSize : client.pageSize))
const busy = computed(() => (isServer.value ? server.loading.value : props.loading))

onMounted(() => {
  if (isServer.value) void server.reload()
})

/** Recarga desde fuera (p. ej. al cambiar de paciente o tras guardar). */
defineExpose({ reload: () => (isServer.value ? server.reload() : Promise.resolve()) })
</script>

<template>
  <div class="list-body">
    <div class="search-row">
      <div class="search">
        <Search :size="14" :stroke-width="1.7" class="icon" />
        <input v-model="query" type="text" :placeholder="placeholder" class="input" />
      </div>
      <slot name="actions" />
    </div>

    <div v-if="busy" class="state">Cargando…</div>
    <div v-else-if="total === 0" class="state empty">{{ emptyText }}</div>
    <div v-else class="tbl-scroll">
      <table class="table">
        <thead>
          <slot name="header" />
        </thead>
        <tbody>
          <slot v-for="item in slice" :key="(item as { id: number }).id" name="row" :item="item" />
        </tbody>
      </table>
    </div>

    <Pagination
      :page="page"
      :page-count="pageCount"
      :total="total"
      :page-size="currentPageSize"
      @update:page="page = $event"
    />
  </div>
</template>

<style scoped>
.list-body {
  font-family: var(--font-sans);
  color: var(--warm-900);
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.tbl-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.search {
  flex: 1;
  position: relative;
  max-width: 360px;
}

.icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--warm-500);
}

.input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 9px 12px 9px 34px;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.input:focus {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--amatista-500) 16%, transparent);
}

.state {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
  font-size: 13px;
}

.table :deep(thead tr) {
  background: var(--warm-100);
}

.table :deep(th) {
  text-align: left;
  font-size: 11.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-600);
  padding: 10px 14px;
  border-bottom: 1px solid var(--warm-200);
}

.table :deep(td) {
  padding: 12px 14px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
  vertical-align: middle;
}

.table :deep(tbody tr:last-child td) {
  border-bottom: none;
}

.table :deep(tbody tr:hover) {
  background: var(--warm-100);
}
</style>
