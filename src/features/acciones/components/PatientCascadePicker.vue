<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, User, PawPrint, X } from 'lucide-vue-next'
import { useOwnerSearch } from '@/features/dashboard/views/consulta/nueva/composables/useOwnerSearch'
import { animalApi, type AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { Owner } from '@/types/domain'

const props = defineProps<{
  modelValue: number | null
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'update:selection': [info: { owner: Owner; animal: AnimalResponse } | null]
}>()

const ownerQuery = ref('')
const { results: ownerResults, loading: searching } = useOwnerSearch(ownerQuery)

const selectedOwner = ref<Owner | null>(null)
const animals = ref<AnimalResponse[]>([])
const loadingAnimals = ref(false)
const animalsError = ref<string | null>(null)
const selectedAnimal = ref<AnimalResponse | null>(null)

function pickOwner(owner: Owner) {
  selectedOwner.value = owner
  ownerQuery.value = ''
  selectedAnimal.value = null
  emit('update:modelValue', null)
  emit('update:selection', null)
  loadAnimals(Number(owner.id))
}

function clearOwner() {
  selectedOwner.value = null
  selectedAnimal.value = null
  animals.value = []
  animalsError.value = null
  emit('update:modelValue', null)
  emit('update:selection', null)
}

async function loadAnimals(ownerId: number) {
  loadingAnimals.value = true
  animalsError.value = null
  animals.value = []
  try {
    animals.value = await animalApi.listByOwner(ownerId)
  } catch {
    animalsError.value = 'No se pudieron cargar las mascotas del propietario'
  } finally {
    loadingAnimals.value = false
  }
}

function pickAnimal(animal: AnimalResponse) {
  selectedAnimal.value = animal
  emit('update:modelValue', animal.id)
  if (selectedOwner.value) {
    emit('update:selection', { owner: selectedOwner.value, animal })
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v == null && selectedAnimal.value) {
      selectedAnimal.value = null
    }
  },
)
</script>

<template>
  <div class="picker" :class="{ invalid }">
    <!-- Owner step -->
    <div v-if="!selectedOwner" class="step">
      <label class="hint">Propietario</label>
      <div class="search">
        <Search :size="14" :stroke-width="1.7" class="search-icon" />
        <input
          v-model="ownerQuery"
          type="text"
          class="input"
          placeholder="Buscar por nombre o documento…"
        />
      </div>
      <div v-if="searching" class="results state">Buscando…</div>
      <div v-else-if="ownerQuery && ownerResults.length === 0" class="results state">
        Sin resultados
      </div>
      <div v-else-if="ownerResults.length > 0" class="results">
        <button
          v-for="o in ownerResults"
          :key="o.id"
          type="button"
          class="result"
          @click="pickOwner(o)"
        >
          <div class="avatar"><User :size="14" :stroke-width="1.7" /></div>
          <div class="info">
            <div class="name">{{ o.name }}</div>
            <div class="meta">{{ o.document }} · {{ o.phone }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Owner picked, animal step -->
    <div v-else class="step">
      <div class="picked">
        <div class="picked-line">
          <div class="badge"><User :size="13" :stroke-width="1.7" /></div>
          <div>
            <div class="picked-name">{{ selectedOwner.name }}</div>
            <div class="picked-meta">{{ selectedOwner.document }}</div>
          </div>
        </div>
        <button type="button" class="link" @click="clearOwner">
          <X :size="12" :stroke-width="1.8" /> Cambiar
        </button>
      </div>

      <label class="hint">Mascota</label>
      <div v-if="loadingAnimals" class="results state">Cargando mascotas…</div>
      <div v-else-if="animalsError" class="results state error">{{ animalsError }}</div>
      <div v-else-if="animals.length === 0" class="results state">
        Este propietario no tiene mascotas registradas
      </div>
      <div v-else class="animals-grid">
        <button
          v-for="a in animals"
          :key="a.id"
          type="button"
          class="animal-card"
          :class="{ selected: selectedAnimal?.id === a.id }"
          @click="pickAnimal(a)"
        >
          <div class="paw"><PawPrint :size="14" :stroke-width="1.7" /></div>
          <div class="info">
            <div class="name">{{ a.name }}</div>
            <div class="meta">{{ a.specie.name }} · {{ a.breed.name }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker {
  font-family: var(--font-sans);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.picker.invalid {
  border-color: oklch(60% 0.20 25);
  background: oklch(98.5% 0.02 25);
}
.step {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hint {
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warm-600);
}
.search {
  position: relative;
}
.search-icon {
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
.results {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  background: var(--warm-50);
}
.state {
  padding: 14px;
  text-align: center;
  font-size: 12.5px;
  color: var(--warm-500);
}
.state.error {
  color: oklch(45% 0.18 25);
}
.result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}
.result:hover {
  background: var(--warm-100);
}
.avatar,
.badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.badge {
  width: 24px;
  height: 24px;
}
.info {
  min-width: 0;
  flex: 1;
}
.name {
  font-size: 13px;
  color: var(--warm-900);
  font-weight: 500;
  line-height: 1.2;
}
.meta {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 2px;
}
.picked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--warm-100);
  border-radius: 9px;
  padding: 8px 12px;
}
.picked-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.picked-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.2;
}
.picked-meta {
  font-size: 11px;
  color: var(--warm-500);
}
.link {
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 12px;
  color: var(--amatista-700);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 6px;
}
.link:hover {
  background: var(--amatista-50);
}
.animals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.animal-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.12s;
}
.animal-card:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.animal-card.selected {
  border-color: var(--amatista-500);
  background: var(--amatista-100);
}
.paw {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}
.animal-card.selected .paw {
  background: var(--amatista-200);
}
</style>
