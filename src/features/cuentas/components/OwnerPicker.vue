<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, User } from 'lucide-vue-next'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import PawLoader from '@/components/feedback/PawLoader.vue'

const emit = defineEmits<{ select: [owner: OwnerResponse] }>()

const query = ref('')
const results = ref<OwnerResponse[]>([])
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (timer) clearTimeout(timer)
  const term = q.trim()
  if (term.length < 2) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    try {
      // BE-06: la busqueda llega paginada; este picker muestra solo la primera pagina.
      results.value = (await ownerApi.search(term)).content
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)
})
</script>

<template>
  <div class="owner-picker">
    <div class="search">
      <Search :size="15" :stroke-width="1.7" class="icon" />
      <input
        v-model="query"
        type="text"
        class="input ds-focus-ring"
        placeholder="Buscar propietario por nombre o documento…"
      />
      <PawLoader v-if="loading" :size="20" :glow="false" :speed="900" class="loader" />
    </div>

    <ul v-if="results.length" class="results ds-stack">
      <li v-for="o in results" :key="o.id">
        <button type="button" class="result ds-hover-accent" @click="emit('select', o)">
          <span class="avatar ds-tone--accent"><User :size="15" :stroke-width="1.7" /></span>
          <span class="info">
            <span class="name ds-text-strong ds-text-strong--md">{{ o.name }}</span>
            <span class="ds-meta">{{ o.document }} · {{ o.phone }}</span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="query.trim().length >= 2 && !loading" class="empty">
      Sin resultados para “{{ query }}”.
    </p>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-stack, .ds-focus-ring, .ds-meta,
   .ds-text-strong(--md) y .ds-tone--accent.

   El hover de la fila es `.ds-hover-accent` (primitives.css). Pesa (0,3,0) —
   `.ds-hover-accent:hover:not(:disabled)`— así que gana al `.result[data-v-…]`
   de (0,2,0) sin tocar la regla base, y por eso el `:hover` local se borra en
   vez de dejarlo compitiendo. Su tercera declaración (`color: amatista-700`) no
   se ve: cada hijo de la fila fija su propio color (`.ds-tone--accent`,
   `.ds-text-strong`, `.ds-meta`) y la fila no tiene texto directo. */
.owner-picker {
  font-family: var(--font-sans);
}
.search {
  position: relative;
  display: flex;
  align-items: center;
}
.icon {
  position: absolute;
  left: 13px;
  color: var(--warm-500);
}
.loader {
  position: absolute;
  right: 10px;
}

.input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px 10px 38px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}
.results {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.name {
  display: block;
}
.empty {
  font-size: 13px;
  color: var(--warm-500);
  padding: 12px 4px;
}
</style>
