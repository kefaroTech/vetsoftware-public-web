<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  pageCount: number
  total: number
  pageSize: number
}>()

const emit = defineEmits<{ 'update:page': [value: number] }>()

const pages = computed<(number | '...')[]>(() => {
  const total = props.pageCount
  const current = props.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const result: (number | '...')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) result.push('...')
  for (let i = left; i <= right; i++) result.push(i)
  if (right < total - 1) result.push('...')
  result.push(total)
  return result
})

const range = computed(() => {
  const from = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
  const to = Math.min(props.page * props.pageSize, props.total)
  return { from, to }
})

function go(p: number) {
  if (p < 1 || p > props.pageCount || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <div v-if="pageCount > 1 || total > 0" class="pagination">
    <div class="summary">Mostrando {{ range.from }}–{{ range.to }} de {{ total }}</div>
    <nav class="nav" aria-label="Paginación">
      <button type="button" class="ctrl" :disabled="page === 1" aria-label="Primera" @click="go(1)">
        <ChevronsLeft :size="14" :stroke-width="1.7" />
      </button>
      <button
        type="button"
        class="ctrl"
        :disabled="page === 1"
        aria-label="Anterior"
        @click="go(page - 1)"
      >
        <ChevronLeft :size="14" :stroke-width="1.7" />
      </button>
      <template v-for="(p, i) in pages" :key="`${p}-${i}`">
        <span v-if="p === '...'" class="dots">…</span>
        <button v-else type="button" class="num" :class="{ active: p === page }" @click="go(p)">
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="ctrl"
        :disabled="page === pageCount"
        aria-label="Siguiente"
        @click="go(page + 1)"
      >
        <ChevronRight :size="14" :stroke-width="1.7" />
      </button>
      <button
        type="button"
        class="ctrl"
        :disabled="page === pageCount"
        aria-label="Última"
        @click="go(pageCount)"
      >
        <ChevronsRight :size="14" :stroke-width="1.7" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 4px 4px;
  font-family: var(--font-sans);
  font-size: 12.5px;
}

.summary {
  color: var(--warm-500);
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ctrl,
.num {
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
  border-radius: 7px;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.ctrl:hover:not(:disabled),
.num:hover:not(.active) {
  background: var(--warm-100);
  border-color: var(--warm-300);
}

.ctrl:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.num.active {
  background: var(--amatista-700);
  color: white;
  border-color: var(--amatista-700);
  font-weight: 500;
}

.dots {
  color: var(--warm-500);
  padding: 0 4px;
}
</style>
