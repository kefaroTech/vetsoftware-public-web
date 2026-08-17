<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ChevronRight, Search } from 'lucide-vue-next'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useOwnerSearch } from '@/features/dashboard/views/consulta/nueva/composables/useOwnerSearch'
import { initials } from '@/composables/format'
import type { Owner } from '@/types/domain'

const emit = defineEmits<(e: 'select', owner: Owner) => void>()

const query = ref('')
const { results, loading, error, hasMore, totalElements, loadMore, reset } = useOwnerSearch(query)

const hasQuery = computed(() => query.value.trim().length > 0)

watch(query, (q) => {
  if (!q.trim()) reset()
})

/*
 * BE-06: la búsqueda llega paginada y esta lista es scrolleable, así que al llegar al final se
 * pide la página siguiente y se concatena. Se usa IntersectionObserver sobre un centinela al pie
 * en lugar de escuchar `scroll`: no dispara en cada píxel ni fuerza lecturas de layout, que es lo
 * que mantiene el scroll fluido cuando ya hay cientos de filas cargadas.
 */
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

watch(sentinel, (el) => {
  observer?.disconnect()
  observer = null
  if (!el) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore()
    },
    { rootMargin: '200px' },
  )
  observer.observe(el)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="owner-search">
    <div class="search-box">
      <Search :size="16" :stroke-width="1.7" class="search-icon" />
      <input
        v-model="query"
        type="text"
        autofocus
        placeholder="Buscar por nombre, documento o email…"
        class="search-input"
      />
      <span v-if="loading" class="loader-inline">
        <PawLoader :size="22" :glow="false" :speed="900" />
      </span>
    </div>

    <div v-if="error" class="status error">{{ error }}</div>

    <div v-if="hasQuery" class="results">
      <div v-if="!loading && results.length === 0 && !error" class="status empty">
        Sin coincidencias para "<strong>{{ query }}</strong
        >"
      </div>

      <button
        v-for="(o, i) in results"
        :key="o.id"
        type="button"
        class="result-row"
        :class="{ striped: i % 2 === 1 }"
        @click="emit('select', o)"
      >
        <div class="avatar">{{ initials(o.name) }}</div>
        <div class="info">
          <div class="name">{{ o.name }}</div>
          <div class="meta">
            <span>{{ o.document }}</span>
            <template v-if="o.phone">
              <span class="dot">·</span>
              <span>{{ o.phone }}</span>
            </template>
            <template v-if="o.email">
              <span class="dot">·</span>
              <span>{{ o.email }}</span>
            </template>
          </div>
        </div>
        <ChevronRight :size="16" :stroke-width="1.6" class="chev" />
      </button>

      <!-- Centinela: al entrar en viewport dispara la página siguiente. -->
      <div v-if="hasMore" ref="sentinel" class="sentinel">
        <PawLoader :size="22" :glow="false" :speed="900" />
      </div>
      <div v-else-if="results.length > 0" class="results-end">
        {{ totalElements }} resultado{{ totalElements === 1 ? '' : 's' }}
      </div>
    </div>

    <div v-else class="hint">Empieza a escribir para buscar al propietario.</div>
  </div>
</template>

<style scoped>
.owner-search {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 12px 14px;
}

.search-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  font-family: inherit;
  color: var(--warm-900);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--warm-400);
}

.loader-inline {
  display: inline-flex;
}

.results {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--warm-150);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease;
}

.result-row:last-child {
  border-bottom: none;
}

.result-row.striped {
  background: oklch(98% 0.005 60deg);
}

.result-row:hover {
  background: var(--amatista-50);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--warm-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.meta .dot {
  color: var(--warm-300);
}

.chev {
  color: var(--warm-400);
  flex-shrink: 0;
}

/* Alto fijo: el centinela debe ocupar sitio para poder entrar en viewport, y no
   debe cambiar de tamaño al cargar o el scroll daría un salto. */
.sentinel {
  display: grid;
  place-items: center;
  height: 56px;
}

.results-end {
  text-align: center;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--warm-500);
  border-top: 1px solid var(--warm-150);
}

.status {
  text-align: center;
  padding: 40px 20px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  font-size: 13.5px;
}

.status.error {
  color: var(--danger-700);
  background: oklch(97% 0.02 25deg);
  border-color: oklch(85% 0.06 25deg);
}

.hint {
  font-size: 13.5px;
  color: var(--warm-500);
  text-align: center;
  padding: 28px 20px;
  background: var(--warm-50);
  border: 1px dashed var(--warm-200);
  border-radius: 12px;
}
</style>
