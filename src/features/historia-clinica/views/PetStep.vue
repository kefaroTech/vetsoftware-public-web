<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import PetCard from '../components/PetCard.vue'
import PawLoader from '@/components/ui/PawLoader.vue'
import { useHistoriaSelection } from '../composables/useHistoriaSelection'
import { useAnimalsByOwner } from '@/features/dashboard/views/consulta/nueva/composables/useAnimalsByOwner'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { mapOwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.mapper'
import type { Animal } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const { state, setOwner, setPet } = useHistoriaSelection()

const ownerIdParam = computed(() => String(route.params.ownerId ?? ''))
const { list: pets, loading, error } = useAnimalsByOwner(ownerIdParam)

const ownerLoading = ref(false)
const ownerError = ref<string | null>(null)

async function ensureOwner(id: string) {
  if (!id) return
  if (state.owner && state.owner.id === id) return
  ownerLoading.value = true
  ownerError.value = null
  try {
    const data = await ownerApi.findById(Number(id))
    setOwner(mapOwnerResponse(data))
  } catch {
    ownerError.value = 'No se pudo cargar al propietario.'
  } finally {
    ownerLoading.value = false
  }
}

onMounted(() => ensureOwner(ownerIdParam.value))
watch(ownerIdParam, (id) => ensureOwner(id))

const firstName = computed(() => state.owner?.name.split(' ')[0] ?? '')
const countLabel = computed(() => {
  const n = pets.value.length
  if (n === 0) return 'Sin mascotas registradas'
  return `${n} ${n === 1 ? 'mascota registrada' : 'mascotas registradas'}`
})

function pick(pet: Animal) {
  setPet(pet)
  router.push({
    name: 'consulta-historial-detail',
    params: { ownerId: ownerIdParam.value, petId: pet.id },
  })
}

function back() {
  router.push({ name: 'consulta-historial' })
}
</script>

<template>
  <div class="step">
    <button type="button" class="back-btn" @click="back">
      <ArrowLeft :size="14" :stroke-width="1.7" />
      Cambiar propietario
    </button>

    <div class="step-label">
      Paso 2 de 3
      <template v-if="state.owner">· {{ state.owner.name }}</template>
    </div>
    <h1 class="ds-display ds-display--sm">¿Qué mascota quieres consultar?</h1>
    <p v-if="state.owner" class="sub">
      {{ countLabel }}<template v-if="firstName"> a nombre de {{ firstName }}</template
      >.
    </p>

    <div v-if="ownerError" class="banner error">{{ ownerError }}</div>
    <div v-if="error" class="banner error">{{ error }}</div>

    <div v-if="loading || ownerLoading" class="loading-row">
      <PawLoader :size="42" :glow="false" :speed="900" />
    </div>

    <div v-else-if="pets.length === 0 && !error && !ownerError" class="empty-card">
      Este propietario aún no tiene mascotas registradas.
    </div>

    <div v-else class="grid">
      <PetCard v-for="p in pets" :key="p.id" :pet="p" @select="pick" />
    </div>
  </div>
</template>

<style scoped>
.step {
  flex: 1;
  overflow: auto;
  padding: 32px 40px;
  max-width: 1040px;
  width: 100%;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--warm-600);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  margin-bottom: 14px;
}

.back-btn:hover {
  color: var(--amatista-700);
}

.step-label {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 6px;
}

.sub {
  font-size: 13.5px;
  color: var(--warm-600);
  margin: 6px 0 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.banner.error {
  margin: 12px 0;
  padding: 12px 14px;
  font-size: 13px;
  border-radius: 10px;
  background: oklch(97% 0.02 25deg);
  color: var(--danger-700);
  border: 1px solid oklch(85% 0.06 25deg);
}

.empty-card {
  padding: 40px 20px;
  text-align: center;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px dashed var(--warm-200);
  border-radius: 12px;
  font-size: 14px;
}

.loading-row {
  display: grid;
  place-items: center;
  padding: 60px 0;
}
</style>
