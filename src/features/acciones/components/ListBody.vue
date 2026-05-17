<script setup lang="ts" generic="T">
import { computed, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { usePaged } from '../composables/usePaged'
import Pagination from './Pagination.vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    searchFn?: (item: T, q: string) => boolean
    placeholder?: string
    pageSize?: number
    emptyText?: string
    loading?: boolean
  }>(),
  {
    placeholder: 'Buscar…',
    pageSize: 8,
    emptyText: 'No hay registros aún',
  },
)

const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q || !props.searchFn) return props.items
  return props.items.filter((it) => props.searchFn!(it, q))
})

const { slice, page, pageCount, total, pageSize } = usePaged(filtered, props.pageSize)
</script>

<template>
  <div class="list-body">
    <div class="search-row">
      <div class="search">
        <Search :size="14" :stroke-width="1.7" class="icon" />
        <input
          v-model="query"
          type="text"
          :placeholder="placeholder"
          class="input"
        />
      </div>
      <slot name="actions" />
    </div>

    <div v-if="loading" class="state">Cargando…</div>
    <div v-else-if="total === 0" class="state empty">{{ emptyText }}</div>
    <table v-else class="table">
      <thead>
        <slot name="header" />
      </thead>
      <tbody>
        <slot name="row" v-for="item in slice" :item="item" :key="(item as { id: number }).id" />
      </tbody>
    </table>

    <Pagination
      :page="page"
      :page-count="pageCount"
      :total="total"
      :page-size="pageSize"
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
  align-items: center;
  gap: 12px;
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
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 9px 12px 9px 34px;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
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
