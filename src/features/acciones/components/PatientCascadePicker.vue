<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { Search, User, PawPrint, X, Plus } from 'lucide-vue-next'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useOwnerSearch } from '@/features/dashboard/views/consulta/nueva/composables/useOwnerSearch'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import InlineOwnerCreate from './InlineOwnerCreate.vue'
import InlinePetCreate from './InlinePetCreate.vue'
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
const { results: ownerResults, loading: searching, error: ownerError } = useOwnerSearch(ownerQuery)

const ownerInputId = useId()
const petGroupId = useId()

const selectedOwner = ref<Owner | null>(null)
const animals = ref<AnimalResponse[]>([])
const loadingAnimals = ref(false)
const animalsError = ref<string | null>(null)
const selectedAnimal = ref<AnimalResponse | null>(null)

// ── Selección de propietario ──────────────────────────────────────────────────
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
  petCreating.value = false
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

// ── Creación inline (propietario / mascota) ──────────────────────────────────
// El borrador, la validación y el POST viven en `InlineOwnerCreate` /
// `InlinePetCreate`; aquí solo queda qué panel está abierto y qué hacer con lo
// que devuelven.
const ownerCreating = ref(false)
const petCreating = ref(false)

function startCreateOwner() {
  ownerCreating.value = true
}
function startCreatePet() {
  petCreating.value = true
}

function onOwnerCreated(owner: Owner) {
  ownerCreating.value = false
  pickOwner(owner)
}

function onPetCreated(created: AnimalResponse) {
  animals.value = [...animals.value, created]
  petCreating.value = false
  pickAnimal(created)
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
  <div
    class="picker ds-stack ds-stack--10"
    :class="{ invalid, creating: ownerCreating || petCreating }"
  >
    <!-- ══ Paso PROPIETARIO ══ -->
    <div v-if="!selectedOwner" class="step ds-stack ds-stack--10">
      <!-- Crear propietario nuevo -->
      <InlineOwnerCreate
        v-if="ownerCreating"
        :initial-name="ownerQuery"
        @created="onOwnerCreated"
        @cancel="ownerCreating = false"
      />

      <!-- Búsqueda de propietario -->
      <template v-else>
        <label class="hint" :for="ownerInputId">Propietario</label>
        <div class="search">
          <Search :size="14" :stroke-width="1.7" class="search-icon" />
          <input
            :id="ownerInputId"
            v-model="ownerQuery"
            type="text"
            class="input ds-focus-ring"
            placeholder="Buscar por nombre, documento o email…"
          />
        </div>
        <div v-if="searching" class="results ds-empty ds-empty--tight">
          <PawLoader :size="22" :glow="false" :speed="900" label="Buscando propietarios" />
        </div>
        <!-- EST-01: la rama de error va ANTES que la de vacío. Invertidas, una búsqueda
             caída ofrece «Crear propietario nuevo» y el duplicado parte el historial. -->
        <div v-else-if="ownerError" class="ds-banner ds-banner--error" role="alert">
          {{ ownerError }}
        </div>
        <div v-else-if="ownerQuery && ownerResults.length === 0" class="empty ds-stack">
          <span
            >Sin resultados para "<strong>{{ ownerQuery }}</strong
            >"</span
          >
          <button type="button" class="ds-btn ds-btn--solid ds-btn--snug" @click="startCreateOwner">
            <Plus :size="15" :stroke-width="2.2" /> Crear propietario nuevo
          </button>
        </div>
        <div v-else-if="ownerResults.length > 0" class="results ds-stack">
          <button
            v-for="o in ownerResults"
            :key="o.id"
            type="button"
            class="result"
            @click="pickOwner(o)"
          >
            <div class="avatar ds-tone--accent"><User :size="14" :stroke-width="1.7" /></div>
            <div class="ds-flex-fill">
              <div class="name ds-item-label">{{ o.name }}</div>
              <div class="ds-hint ds-hint--spaced">{{ o.document }} · {{ o.phone }}</div>
            </div>
          </button>
        </div>
        <button type="button" class="create-link ds-tone--accent-outline" @click="startCreateOwner">
          <Plus :size="15" :stroke-width="2.2" /> Crear propietario nuevo
        </button>
      </template>
    </div>

    <!-- ══ Paso MASCOTA (propietario seleccionado) ══ -->
    <div v-else class="step ds-stack ds-stack--10">
      <div class="picked">
        <div class="picked-line">
          <div class="badge ds-tone--accent"><User :size="13" :stroke-width="1.7" /></div>
          <div>
            <div class="picked-name ds-item-label">{{ selectedOwner.name }}</div>
            <div class="picked-meta">{{ selectedOwner.document }}</div>
          </div>
        </div>
        <button type="button" class="link" @click="clearOwner">
          <X :size="12" :stroke-width="1.8" /> Cambiar
        </button>
      </div>

      <div :id="petGroupId" class="hint">Mascota</div>

      <!-- Crear mascota nueva -->
      <InlinePetCreate
        v-if="petCreating"
        :owner-id="selectedOwner.id"
        @created="onPetCreated"
        @cancel="petCreating = false"
      />

      <!-- Selección de mascota -->
      <template v-else>
        <div v-if="loadingAnimals" class="results ds-empty ds-empty--tight">
          <PawLoader :size="22" :glow="false" :speed="900" label="Cargando mascotas" />
        </div>
        <div v-else-if="animalsError" class="ds-banner ds-banner--error" role="alert">
          {{ animalsError }}
        </div>
        <div v-else-if="animals.length === 0" class="empty ds-stack">
          <span>Este propietario no tiene mascotas registradas</span>
          <button type="button" class="ds-btn ds-btn--solid ds-btn--snug" @click="startCreatePet">
            <Plus :size="15" :stroke-width="2.2" /> Registrar mascota nueva
          </button>
        </div>
        <template v-else>
          <div class="animals-grid" role="group" :aria-labelledby="petGroupId">
            <button
              v-for="a in animals"
              :key="a.id"
              type="button"
              class="animal-card"
              :class="{ selected: selectedAnimal?.id === a.id }"
              @click="pickAnimal(a)"
            >
              <div class="paw ds-tone--accent"><PawPrint :size="14" :stroke-width="1.7" /></div>
              <div class="ds-flex-fill">
                <div class="name ds-item-label">{{ a.name }}</div>
                <div class="ds-hint ds-hint--spaced">{{ a.specie.name }} · {{ a.breed.name }}</div>
              </div>
            </button>
          </div>
          <button type="button" class="create-link ds-tone--accent-outline" @click="startCreatePet">
            <Plus :size="15" :stroke-width="2.2" /> Registrar mascota nueva
          </button>
        </template>
      </template>
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
}

/* En modo creación el picker cede el fondo/borde a los forms (SectionCard) para que respiren */
.picker.creating {
  background: transparent;
  border-color: transparent;
  padding: 0;
}

.picker.invalid {
  border-color: var(--danger-border);
  background: var(--danger-50);
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

/* Añadidos sobre `.ds-stack`: gap mínimo entre resultados y la caja con scroll. */
.results {
  gap: 2px;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  background: var(--warm-50);
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

/* El par fondo+texto lo pone `.ds-tone--accent` (en los dos elementos). */
.avatar,
.badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.badge {
  width: 24px;
  height: 24px;
}

/* Único añadido sobre `.ds-item-label`: estas dos fichas aprietan la línea. */
.name,
.picked-name {
  line-height: 1.2;
}

/* Estado vacío con CTA de creación. Añadidos sobre `.ds-stack`: centrado y gap. */
.empty {
  align-items: center;
  gap: 12px;
  padding: 20px 14px;
  text-align: center;
  font-size: 12.5px;
  color: var(--warm-600);
  border: 1px dashed var(--warm-300);
  border-radius: 9px;
  background: var(--warm-50);
}

/* Enlace "crear" secundario (ghost, siempre visible bajo resultados) */
.create-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px dashed var(--warm-300);
  background: transparent;
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.12s;
}

/* El estado `:hover` lo pinta `.ds-tone--accent-outline:hover:not(:disabled)`
   (primitives.css) — aplicada desde el marcado, ver arriba. */

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

/* 11px, no los 11.5px de `.ds-hint`: es el dato más pequeño de la pantalla. */
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
  border: 1px solid var(--warm-450);
  border-radius: 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.12s;
}

/* A11Y-09: `--amatista-300` daba 1,87:1 sobre el `--amatista-50` que el propio
   hover pinta, por debajo del reposo `--warm-450` (3,54:1). `--amatista-450` da
   3,47:1 y deja `.selected` (`--amatista-500`, 3,80:1) como estado más fuerte. */

/* No adopta `.ds-tone--accent-selected` desde el marcado, como sí hace
   `.clinical-btn` (`AgendaDayView.vue`): aquí reposo (warm-50/warm-450) y
   selección (`.animal-card.selected`, amatista-100/amatista-500) son pares
   distintos, y allí no hay `.selected`. Ya no lo impide la falta de forma
   `:hover` (A11Y-09 la añadió) ni la preselección ((0,1,0) < scoped (0,2,0)):
   ese `:hover` empata a (0,3,0) con `.selected` y desempata el orden del bundle. */
/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- duplica el cuerpo de `.ds-tone--accent-selected` a propósito: adoptar la clase empataría en (0,3,0) con `.animal-card.selected` y dejaría el estado «seleccionado» a merced del orden de las hojas del bundle (ver arriba). */
.animal-card:hover {
  border-color: var(--amatista-450);
  background: var(--amatista-50);
}

.animal-card.selected {
  border-color: var(--amatista-500);
  background: var(--amatista-100);
}

/* El par fondo+texto en reposo lo pone `.ds-tone--accent`;
   `.animal-card.selected .paw` (0,3,0) le sigue ganando al seleccionar. */
.paw {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}

.animal-card.selected .paw {
  background: var(--amatista-200);
}
</style>
