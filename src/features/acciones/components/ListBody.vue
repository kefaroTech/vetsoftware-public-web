<script setup lang="ts" generic="T">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { AlertTriangle, Check, Copy, RefreshCw, Search } from 'lucide-vue-next'
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

/** Ata la etiqueta invisible al campo (§3.3.2, nivel A): el placeholder no es etiqueta. */
const searchId = useId()

/**
 * Vacío de búsqueda ≠ vacío de verdad (`docs/ux/patron-de-busqueda-en-listado.md` §4).
 *
 * Hermano exacto del defecto que cerró EST-01, en el mismo `v-if`: la rama de cero
 * filas decía «No hay registros aún» hubiera o no término escrito. En las siete
 * pantallas clínicas que montan este componente eso le dice al veterinario que el
 * paciente no tiene vacunas, cuando lo cierto es que ninguna coincide con lo que
 * buscó.
 */
const searchTerm = computed(() => query.value.trim())

/**
 * Última página PEDIDA al servidor (1-based), que no es lo mismo que la última
 * página SERVIDA: `server.page` solo avanza en el camino de éxito, así que tras un
 * fallo al saltar a la 3 seguiría diciendo 2. Es lo que necesita «Reintentar» para
 * volver a pedir lo que de verdad falló. Se reinicia al buscar porque el debounce
 * de `useServerPaged` también vuelve a la primera página al cambiar el término.
 */
const lastRequestedPage = ref(1)
watch(query, () => (lastRequestedPage.value = 1))

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
const client = usePaged(filtered, props.pageSize, query)

const slice = computed(() => (isServer.value ? server.items.value : client.slice.value))
const page = computed({
  get: () => (isServer.value ? server.page.value : client.page.value),
  set: (v: number) => {
    if (isServer.value) {
      lastRequestedPage.value = v
      void server.goTo(v)
    } else client.page.value = v
  },
})
const pageCount = computed(() => (isServer.value ? server.pageCount.value : client.pageCount.value))
const total = computed(() => (isServer.value ? server.total.value : client.total.value))
const currentPageSize = computed(() => (isServer.value ? server.pageSize : client.pageSize))
const busy = computed(() => (isServer.value ? server.loading.value : props.loading))

/**
 * EST-01: un fallo del servidor NO es una lista vacía.
 *
 * Cuando `fetchPage` revienta, `useServerPaged` deja `total` en 0 y hasta ahora la
 * tabla caía en la rama de vacío y anunciaba «No hay registros aún». En las siete
 * pantallas clínicas que montan este componente eso se lee como «este paciente no
 * tiene vacunas / no tiene cirugías», cuando lo cierto es que no se pudo preguntar.
 * El modo cliente no tiene este estado (los datos se los pasa el padre ya cargados),
 * así que aquí solo aplica al servido.
 */
const listError = computed(() => (isServer.value ? server.error.value : null))
const listTraceId = computed(() => (isServer.value ? server.errorTraceId.value : null))

/** Reintenta la MISMA página que falló, no la primera: el usuario no pierde su sitio. */
function retry() {
  if (isServer.value) void server.goTo(lastRequestedPage.value)
}

/** Confirmación del copiado sin sacar un aviso, igual que en `ToastStack`. */
const traceCopied = ref(false)
async function copyTrace() {
  const id = listTraceId.value
  if (!id) return
  try {
    await navigator.clipboard.writeText(id)
    traceCopied.value = true
    window.setTimeout(() => (traceCopied.value = false), 2000)
  } catch {
    // Sin portapapeles (contexto no seguro) el identificador sigue visible y
    // seleccionable a mano, que es lo que de verdad hace falta para reportarlo.
  }
}

onMounted(() => {
  if (isServer.value) void server.reload()
})

/** Recarga desde fuera (p. ej. al cambiar de paciente o tras guardar). */
defineExpose({
  reload: () => {
    if (!isServer.value) return Promise.resolve()
    lastRequestedPage.value = 1
    return server.reload()
  },
})
</script>

<template>
  <div class="list-body">
    <div class="search-row ds-flex-row ds-flex-row--12">
      <div class="search">
        <label :for="searchId" class="ds-sr-only">{{ placeholder }}</label>
        <Search :size="14" :stroke-width="1.7" class="icon" aria-hidden="true" />
        <input
          :id="searchId"
          v-model="query"
          type="text"
          :placeholder="placeholder"
          class="input ds-focus-ring"
        />
      </div>
      <slot name="actions" />
    </div>

    <div v-if="busy" class="state">Cargando…</div>
    <!-- EST-01: la rama de error va ANTES que la de vacío. Si se invierten, un 500
         vuelve a disfrazarse de «no hay registros». -->
    <div v-else-if="listError" class="state-error ds-banner ds-banner--error" role="alert">
      <AlertTriangle :size="16" :stroke-width="2" class="ds-banner-icon" />
      <div class="err-body ds-flex-fill">
        <p class="err-msg">{{ listError }}</p>
        <button
          v-if="listTraceId"
          type="button"
          class="err-trace"
          :title="traceCopied ? 'Copiado' : 'Copiar identificador de la traza'"
          @click="copyTrace"
        >
          <component :is="traceCopied ? Check : Copy" :size="12" :stroke-width="2" />
          <span class="err-trace-id ds-truncate">{{ listTraceId }}</span>
        </button>
      </div>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug err-retry" @click="retry">
        <RefreshCw :size="14" :stroke-width="1.8" />
        Reintentar
      </button>
    </div>
    <!-- Vacío de BÚSQUEDA: se cita el término tal cual para que el usuario vea qué
         buscó de verdad (ahí se descubren el espacio de más y el pegado con salto). -->
    <div v-else-if="total === 0 && searchTerm" class="state empty ds-stack ds-stack--8">
      <p class="ds-strong">Sin resultados para “{{ searchTerm }}”</p>
      <p>Revisa la escritura o prueba con menos palabras.</p>
      <button
        type="button"
        class="ds-btn ds-btn--neutral ds-btn--snug empty-clear"
        @click="query = ''"
      >
        Limpiar búsqueda
      </button>
    </div>
    <!-- Vacío de VERDAD: no hay término, la lista está vacía de por sí. -->
    <div v-else-if="total === 0" class="state empty">{{ emptyText }}</div>
    <div v-else class="ds-table-scroll">
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

/* Añadidos sobre `.ds-flex-row--12`: que la fila envuelva y su hueco inferior. */
.search-row {
  flex-wrap: wrap;
  margin-bottom: 14px;
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
  border: 1px solid var(--warm-450);
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

.state {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
}

/* Vacío de búsqueda: título y descripción son párrafos sin margen propio (el
   hueco lo pone `.ds-stack--8`) y el botón no se estira al ancho de la caja. */
.state p {
  margin: 0;
}

.empty-clear {
  align-self: center;
}

/* Banner de fallo (EST-01). El aspecto lo pone `.ds-banner--error`; aquí solo va
   la alineación de las tres piezas —icono, texto y botón— que la primitiva no
   fija. `align-items: flex-start` porque el mensaje del `ProblemDetail` puede
   ocupar dos líneas y el botón debe quedar arriba. */
.state-error {
  align-items: flex-start;
}

.err-body {
  min-width: 0;
}

.err-msg {
  margin: 0;
}

/* Identificador de la traza: mismo gesto que en `ToastStack` (clic para copiar). */
.err-trace {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  padding: 3px 7px;
  border: 1px solid var(--danger-border);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  max-width: 100%;
}

/* El recorte lo pone `.ds-truncate` desde el marcado; aquí solo queda lo que no
   existe como primitiva: la monoespaciada del identificador. */
.err-trace-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: -0.02em;
}

.err-retry {
  flex-shrink: 0;
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
