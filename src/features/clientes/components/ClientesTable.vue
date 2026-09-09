<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import type { Owner } from '@/types/domain'
import Pagination from '@/components/ui/Pagination.vue'

defineProps<{
  owners: Owner[]
  error?: string | null
  selectedId: string | null
  query: string
  loading?: boolean
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:page': [value: number]
  select: [id: string]
}>()
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="search ds-flex-row ds-focus-ring">
        <Search :size="15" :stroke-width="1.7" class="ic" />
        <input
          class="ds-flex-fill"
          :value="query"
          type="search"
          placeholder="Buscar por nombre o documento…"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="table ds-stack ds-frame">
      <div class="head">
        <div class="cell name-cell">Cliente</div>
        <div class="cell doc-cell">Documento</div>
        <div class="cell contact-cell">Contacto</div>
        <div class="cell city-cell">Ciudad</div>
      </div>

      <div v-if="loading && owners.length === 0" class="empty ds-empty">Cargando clientes…</div>
      <!-- EST-01: la rama de error va ANTES que la de vacío. Si se invierten, un
           500 vuelve a disfrazarse de «no hay registros». -->
      <div v-else-if="error" class="ds-banner ds-banner--error ds-banner--flush" role="alert">
        {{ error }}
      </div>
      <div v-else-if="owners.length === 0" class="empty ds-empty">
        {{
          query.trim()
            ? 'Sin resultados que coincidan con la búsqueda.'
            : 'Aún no hay clientes registrados en esta empresa.'
        }}
      </div>

      <button
        v-for="(owner, i) in owners"
        :key="owner.id"
        type="button"
        class="row"
        :class="{ selected: owner.id === selectedId, zebra: i % 2 !== 0 }"
        @click="emit('select', owner.id)"
      >
        <div class="cell name-cell ds-item-label">{{ owner.name }}</div>
        <div class="cell doc-cell mono">{{ owner.document }}</div>
        <div class="cell contact-cell">
          <span v-if="owner.phone">{{ owner.phone }}</span>
          <span v-if="owner.email" class="secondary">{{ owner.email }}</span>
          <span v-if="!owner.phone && !owner.email" class="secondary">—</span>
        </div>
        <div class="cell city-cell">{{ owner.city?.name ?? '—' }}</div>
      </button>
    </div>

    <Pagination
      :page="page"
      :page-count="totalPages"
      :total="totalElements"
      :page-size="pageSize"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}

.search {
  flex: 1;
  padding: 6px 12px;
  background: var(--warm-100);
  border: 1px solid var(--warm-450);
  border-radius: 7px;
}

.search .ic {
  color: var(--warm-500);
}

.search input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13.5px;
  color: var(--warm-900);
  font-family: inherit;
}

.search input:focus-visible {
  box-shadow: none;
}

.search input::placeholder {
  color: var(--warm-500);
}

.head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--warm-500);
  font-weight: 500;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 12px 18px;
  border: none;
  border-top: 1px solid var(--warm-200);
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.row:first-of-type {
  border-top: none;
}

.row.zebra {
  background: var(--warm-100);
}

.row:hover {
  background: var(--amatista-50);
}

.row.selected {
  background: var(--amatista-100);
}

.cell {
  min-width: 0;
}

.name-cell {
  flex: 1.8;
}

.doc-cell {
  flex: 1;
}

.doc-cell.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.contact-cell {
  flex: 1.6;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
}

.contact-cell .secondary {
  color: var(--warm-500);
}

.city-cell {
  flex: 1;
  font-size: 13px;
  color: var(--warm-700);
}

.empty {
  padding: 60px 20px;
  font-size: 14px;
}
</style>
