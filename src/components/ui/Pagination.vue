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

// El apagado del control deshabilitado son `.ds-is-disabled` + `.ds-is-disabled--40`
// (primitives.css). Se aplican desde el marcado porque las primitivas son clases
// planas, no reglas `:disabled`.
const DISABLED_CLASS = 'ds-is-disabled ds-is-disabled--40'
const atFirst = computed(() => (props.page === 1 ? DISABLED_CLASS : null))
const atLast = computed(() => (props.page === props.pageCount ? DISABLED_CLASS : null))

function go(p: number) {
  if (p < 1 || p > props.pageCount || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <div v-if="pageCount > 1 || total > 0" class="pagination">
    <div class="summary">Mostrando {{ range.from }}–{{ range.to }} de {{ total }}</div>
    <nav class="nav" aria-label="Paginación">
      <button
        type="button"
        class="ctrl ds-tone--neutral-soft"
        :class="atFirst"
        :disabled="page === 1"
        aria-label="Primera"
        @click="go(1)"
      >
        <ChevronsLeft :size="14" :stroke-width="1.7" />
      </button>
      <button
        type="button"
        class="ctrl ds-tone--neutral-soft"
        :class="atFirst"
        :disabled="page === 1"
        aria-label="Anterior"
        @click="go(page - 1)"
      >
        <ChevronLeft :size="14" :stroke-width="1.7" />
      </button>
      <template v-for="(p, i) in pages" :key="`${p}-${i}`">
        <span v-if="p === '...'" class="dots">…</span>
        <button
          v-else
          type="button"
          class="num"
          :class="p === page ? 'active' : 'ds-tone--neutral-soft'"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="ctrl ds-tone--neutral-soft"
        :class="atLast"
        :disabled="page === pageCount"
        aria-label="Siguiente"
        @click="go(page + 1)"
      >
        <ChevronRight :size="14" :stroke-width="1.7" />
      </button>
      <button
        type="button"
        class="ctrl ds-tone--neutral-soft"
        :class="atLast"
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

  /* A11Y-09 · WCAG 2.2 §1.4.11 (AA): son botones, no separadores. --warm-200
     medía 1,23:1 sobre --warm-50; --warm-450 da 3,54:1. El hover sigue viniendo
     de `.ds-tone--neutral-soft`, que cambia el fondo y no el borde. */
  border: 1px solid var(--warm-450);
  color: var(--warm-700);
  border-radius: 7px;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 12.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

/* El cursor por defecto excluye el estado deshabilitado en vez de competir con
   él: `.ds-is-disabled` pesa (0,1,0) y perdería contra un `.ctrl { cursor:
   pointer }` scoped, que pesa (0,2,0). Mutuamente excluyentes, sin cascada. */
.num,
.ctrl:not(:disabled) {
  cursor: pointer;
}

/* El hover neutro es `.ds-tone--neutral-soft:hover:not(:disabled)`, aplicado
   desde el marcado. El `.ctrl` lleva el atributo `disabled` nativo, así que el
   guardián de la primitiva es literalmente el que tenía. El `.num` nunca se
   deshabilita y su guardián era `:not(.active)`: se traslada al marcado —la
   página actual no recibe la clase— igual que se hace con el apagado. La
   forma plana `.ds-tone--neutral-soft` (0,1,0) no tiñe el reposo porque la
   base `.ctrl, .num` scoped pesa (0,2,0) y le gana. */
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
