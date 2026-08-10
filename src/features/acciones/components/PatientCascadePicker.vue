<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, User, PawPrint, X, Plus, ArrowLeft, TriangleAlert } from 'lucide-vue-next'
import { useOwnerSearch } from '@/features/dashboard/views/consulta/nueva/composables/useOwnerSearch'
import {
  animalApi,
  type AnimalResponse,
} from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { mapOwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.mapper'
import { buildCreateAnimalRequest } from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import OwnerForm from '@/features/dashboard/views/consulta/nueva/components/OwnerForm.vue'
import PetForm from '@/features/dashboard/views/consulta/nueva/components/PetForm.vue'
import type {
  OwnerDraft,
  PetDraft,
} from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { useAuth } from '@/features/auth/composables/useAuth'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { OwnerDocumentType } from '@/features/facturacion/composables/feFiscalChecklist'
import type { PersonType } from '@/features/facturacion/types/facturacion'
import type { Owner } from '@/types/domain'

const props = defineProps<{
  modelValue: number | null
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'update:selection': [info: { owner: Owner; animal: AnimalResponse } | null]
}>()

const { companyId } = useAuth()

const ownerQuery = ref('')
const { results: ownerResults, loading: searching } = useOwnerSearch(ownerQuery)

const selectedOwner = ref<Owner | null>(null)
const animals = ref<AnimalResponse[]>([])
const loadingAnimals = ref(false)
const animalsError = ref<string | null>(null)
const selectedAnimal = ref<AnimalResponse | null>(null)

// ── Factories de borrador (espejo de nuevaConsultaDraft.store) ────────────────
function emptyOwnerDraft(prefill?: Partial<OwnerDraft>): OwnerDraft {
  return {
    name: '',
    document: '',
    phone: '',
    email: '',
    documentType: '',
    personType: '',
    countryId: '',
    stateId: '',
    cityId: '',
    address: '',
    ...(prefill ?? {}),
  }
}
function emptyPetDraft(): PetDraft {
  return {
    name: '',
    chipNumber: '',
    specieId: '',
    breedId: '',
    gender: '',
    colorId: '',
    bod: '',
    animalType: 'NONE',
    weight: '',
    weightType: 'KILOGRAMS',
    size: '',
    reproductiveState: '',
  }
}

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

// ── Creación de propietario (inline) ─────────────────────────────────────────
const ownerCreating = ref(false)
const ownerDraft = ref<OwnerDraft>(emptyOwnerDraft())
const ownerFormRef = ref<{ validate: () => boolean } | null>(null)
const ownerSubmitError = ref<string | null>(null)
const savingOwner = ref(false)

function startCreateOwner() {
  ownerDraft.value = emptyOwnerDraft({ name: ownerQuery.value.trim() })
  ownerSubmitError.value = null
  ownerCreating.value = true
}
function cancelCreateOwner() {
  ownerCreating.value = false
  ownerSubmitError.value = null
}
async function saveOwner() {
  if (ownerFormRef.value && !ownerFormRef.value.validate()) {
    ownerSubmitError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  if (companyId.value == null) {
    ownerSubmitError.value = 'No se pudo identificar la empresa actual. Vuelve a iniciar sesión.'
    return
  }
  const o = ownerDraft.value
  const cityIdNum = Number(o.cityId)
  if (!Number.isFinite(cityIdNum)) {
    ownerSubmitError.value = 'Selecciona una ciudad válida.'
    return
  }
  savingOwner.value = true
  ownerSubmitError.value = null
  try {
    const created = await ownerApi.create({
      name: o.name.trim(),
      document: o.document.trim(),
      phone: o.phone.trim(),
      email: o.email.trim(),
      documentType: o.documentType as OwnerDocumentType,
      personType: o.personType as PersonType,
      address: o.address.trim(),
      cityId: cityIdNum,
    })
    ownerCreating.value = false
    pickOwner(mapOwnerResponse(created))
  } catch (e: unknown) {
    ownerSubmitError.value = getProblemDetailMessage(
      e,
      'No se pudo crear el propietario. Intenta nuevamente.',
    )
  } finally {
    savingOwner.value = false
  }
}

// ── Creación de mascota (inline) ──────────────────────────────────────────────
const petCreating = ref(false)
const petDraft = ref<PetDraft>(emptyPetDraft())
const petFormRef = ref<{ validate: () => boolean } | null>(null)
const petSubmitError = ref<string | null>(null)
const savingPet = ref(false)

function startCreatePet() {
  petDraft.value = emptyPetDraft()
  petSubmitError.value = null
  petCreating.value = true
}
function cancelCreatePet() {
  petCreating.value = false
  petSubmitError.value = null
}
async function savePet() {
  const owner = selectedOwner.value
  if (!owner) return
  if (petFormRef.value && !petFormRef.value.validate()) {
    petSubmitError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  if (companyId.value == null) {
    petSubmitError.value = 'No se pudo identificar la empresa actual. Vuelve a iniciar sesión.'
    return
  }
  savingPet.value = true
  petSubmitError.value = null
  try {
    const payload = buildCreateAnimalRequest(petDraft.value, owner.id)
    const created = await animalApi.create(payload)
    animals.value = [...animals.value, created]
    petCreating.value = false
    pickAnimal(created)
  } catch (e: unknown) {
    petSubmitError.value = getProblemDetailMessage(
      e,
      'No se pudo registrar la mascota. Intenta nuevamente.',
    )
  } finally {
    savingPet.value = false
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
  <div class="picker" :class="{ invalid, creating: ownerCreating || petCreating }">
    <!-- ══ Paso PROPIETARIO ══ -->
    <div v-if="!selectedOwner" class="step">
      <!-- Crear propietario nuevo -->
      <template v-if="ownerCreating">
        <div class="form-head">
          <button type="button" class="back" @click="cancelCreateOwner">
            <ArrowLeft :size="14" :stroke-width="1.9" /> Volver a la búsqueda
          </button>
        </div>
        <div v-if="ownerSubmitError" class="form-banner" role="alert">
          <TriangleAlert :size="14" :stroke-width="1.7" />
          <span>{{ ownerSubmitError }}</span>
        </div>
        <OwnerForm ref="ownerFormRef" v-model="ownerDraft" />
        <div class="form-actions">
          <button type="button" class="ds-btn ds-btn--ghost" @click="cancelCreateOwner">
            Cancelar
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--solid"
            :disabled="savingOwner"
            @click="saveOwner"
          >
            {{ savingOwner ? 'Creando…' : 'Crear y seleccionar' }}
          </button>
        </div>
      </template>

      <!-- Búsqueda de propietario -->
      <template v-else>
        <label class="hint">Propietario</label>
        <div class="search">
          <Search :size="14" :stroke-width="1.7" class="search-icon" />
          <input
            v-model="ownerQuery"
            type="text"
            class="input"
            placeholder="Buscar por nombre, documento o email…"
          />
        </div>
        <div v-if="searching" class="results state">Buscando…</div>
        <div v-else-if="ownerQuery && ownerResults.length === 0" class="empty">
          <span
            >Sin resultados para "<strong>{{ ownerQuery }}</strong
            >"</span
          >
          <button type="button" class="create-btn" @click="startCreateOwner">
            <Plus :size="15" :stroke-width="2.2" /> Crear propietario nuevo
          </button>
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
        <button type="button" class="create-link" @click="startCreateOwner">
          <Plus :size="15" :stroke-width="2.2" /> Crear propietario nuevo
        </button>
      </template>
    </div>

    <!-- ══ Paso MASCOTA (propietario seleccionado) ══ -->
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

      <!-- Crear mascota nueva -->
      <template v-if="petCreating">
        <div v-if="petSubmitError" class="form-banner" role="alert">
          <TriangleAlert :size="14" :stroke-width="1.7" />
          <span>{{ petSubmitError }}</span>
        </div>
        <PetForm ref="petFormRef" v-model="petDraft" />
        <div class="form-actions">
          <button type="button" class="ds-btn ds-btn--ghost" @click="cancelCreatePet">
            Cancelar
          </button>
          <button type="button" class="ds-btn ds-btn--solid" :disabled="savingPet" @click="savePet">
            {{ savingPet ? 'Guardando…' : 'Crear y seleccionar' }}
          </button>
        </div>
      </template>

      <!-- Selección de mascota -->
      <template v-else>
        <div v-if="loadingAnimals" class="results state">Cargando mascotas…</div>
        <div v-else-if="animalsError" class="results state error">{{ animalsError }}</div>
        <div v-else-if="animals.length === 0" class="empty">
          <span>Este propietario no tiene mascotas registradas</span>
          <button type="button" class="create-btn" @click="startCreatePet">
            <Plus :size="15" :stroke-width="2.2" /> Registrar mascota nueva
          </button>
        </div>
        <template v-else>
          <div class="animals-grid">
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
          <button type="button" class="create-link" @click="startCreatePet">
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* En modo creación el picker cede el fondo/borde a los forms (SectionCard) para que respiren */
.picker.creating {
  background: transparent;
  border-color: transparent;
  padding: 0;
}

.picker.invalid {
  border-color: oklch(60% 0.2 25deg);
  background: oklch(98.5% 0.02 25deg);
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
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
  color: oklch(45% 0.18 25deg);
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

/* Estado vacío con CTA de creación */
.empty {
  display: flex;
  flex-direction: column;
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

/* Botón "crear" primario (dentro de estado vacío) */
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--amatista-700);
  color: #fff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.create-btn:hover {
  filter: brightness(1.05);
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

.create-link:hover {
  border-color: var(--amatista-500);
  background: var(--amatista-50);
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
  transition:
    border-color 0.15s,
    background 0.12s;
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

/* Formularios de creación inline */
.form-head {
  display: flex;
  align-items: center;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.back:hover {
  background: var(--amatista-50);
}

.form-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-150);
  border: 1px solid var(--danger-300);
  color: oklch(35% 0.15 25deg);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
