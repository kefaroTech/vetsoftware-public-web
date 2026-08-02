<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, User } from 'lucide-vue-next'
import {
  ownerApi,
  type OwnerResponse,
} from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import PawLoader from '@/components/ui/PawLoader.vue'

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
      results.value = await ownerApi.search(term)
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
        class="input"
        placeholder="Buscar propietario por nombre o documento…"
      />
      <PawLoader v-if="loading" :size="20" :glow="false" :speed="900" class="loader" />
    </div>

    <ul v-if="results.length" class="results">
      <li v-for="o in results" :key="o.id">
        <button type="button" class="result" @click="emit('select', o)">
          <span class="avatar"><User :size="15" :stroke-width="1.7" /></span>
          <span class="info">
            <span class="name">{{ o.name }}</span>
            <span class="meta">{{ o.document }} · {{ o.phone }}</span>
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
.input:focus {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.results {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
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
.result:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  display: block;
}
.meta {
  font-size: 12px;
  color: var(--warm-500);
}
.empty {
  font-size: 13px;
  color: var(--warm-500);
  padding: 12px 4px;
}
</style>
