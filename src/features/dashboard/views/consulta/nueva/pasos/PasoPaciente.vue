<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { Plus, User, ArrowRight, PawPrint, TriangleAlert } from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import OwnerSearchInput from '../components/OwnerSearchInput.vue'
import OwnerResultRow from '../components/OwnerResultRow.vue'
import OwnerSummaryCard from '../components/OwnerSummaryCard.vue'
import OwnerForm from '../components/OwnerForm.vue'
import PetCard from '../components/PetCard.vue'
import PetForm from '../components/PetForm.vue'
import DeceasedConfirmDialog from '../components/DeceasedConfirmDialog.vue'
import { useOwnerSearch } from '../composables/useOwnerSearch'
import { useAnimalsByOwner } from '../composables/useAnimalsByOwner'
import { ownerApi } from '../api/owner.api'
import { mapOwnerResponse } from '../api/owner.mapper'
import { animalApi } from '../api/animal.api'
import { buildCreateAnimalRequest, mapAnimalResponse } from '../api/animal.mapper'
import { useNuevaConsultaDraft } from '../composables/useNuevaConsultaDraft'
import { useAuth } from '@/features/auth/composables/useAuth'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { scrollToFirstError } from '@/composables/scrollToError'
import type { OwnerDocumentType } from '@/features/facturacion/composables/feFiscalChecklist'
import type { PersonType } from '@/features/facturacion/types/facturacion'
import type { Animal, Owner } from '@/types/domain'

const draft = useNuevaConsultaDraft()
const { companyId } = useAuth()

// ── Propietario ──────────────────────────────────────────────────────────────
const query = ref('')
const { results, loading, error: searchError } = useOwnerSearch(query)

type OwnerMode = 'search' | 'selected' | 'creating'
const ownerMode = computed<OwnerMode>(() => {
  if (draft.state.ownerCreating) return 'creating'
  if (draft.state.owner) return 'selected'
  return 'search'
})

const ownerSubmitError = ref<string | null>(null)
const ownerFormRef = ref<{ validate: () => boolean } | null>(null)
const selectedOwner = computed<Owner | null>(() => draft.state.owner)

function handleEnter() {
  const onlyMatch = results.value.length === 1 ? results.value[0] : null
  if (onlyMatch) selectOwner(onlyMatch)
}
function selectOwner(owner: Owner) {
  draft.setOwner(owner)
}
function startCreateOwner() {
  draft.startCreatingOwner({ name: query.value.trim() })
  ownerSubmitError.value = null
}
function changeOwner() {
  draft.setOwner(null)
  query.value = ''
}

async function submitOwner(): Promise<boolean> {
  const o = draft.state.ownerCreating
  if (!o) return true
  if (ownerFormRef.value && !ownerFormRef.value.validate()) {
    ownerSubmitError.value = 'Revisa los campos marcados antes de continuar.'
    scrollToFirstError()
    return false
  }
  if (companyId.value == null) {
    ownerSubmitError.value = 'No se pudo identificar la empresa actual. Vuelve a iniciar sesión.'
    return false
  }
  const cityIdNum = Number(o.cityId)
  if (!Number.isFinite(cityIdNum)) {
    ownerSubmitError.value = 'Selecciona una ciudad válida.'
    return false
  }
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
    draft.setOwner(mapOwnerResponse(created))
    return true
  } catch (e: unknown) {
    ownerSubmitError.value = getProblemDetailMessage(
      e,
      'No se pudo crear el propietario. Intenta nuevamente.',
    )
    return false
  }
}

watch(
  () => draft.state.owner,
  () => {
    if (draft.state.owner) query.value = ''
  },
)

// ── Mascota ──────────────────────────────────────────────────────────────────
const ownerIdRef = toRef(() => draft.state.owner?.id ?? '')
const { list: ownerAnimals, error: petsError, addPet } = useAnimalsByOwner(ownerIdRef)

const pets = computed<Animal[]>(() =>
  [...ownerAnimals.value].sort((a, b) => Number(a.deceased) - Number(b.deceased)),
)

type PetMode = 'list' | 'empty' | 'creating'
const petMode = computed<PetMode>(() => {
  if (draft.state.petCreating) return 'creating'
  if (pets.value.length === 0) return 'empty'
  return 'list'
})

const petSubmitError = ref<string | null>(null)
const petFormRef = ref<{ validate: () => boolean } | null>(null)
const deceasedPending = ref<Animal | null>(null)

function selectedPetId(p: Animal): boolean {
  return draft.state.pet?.id === p.id
}
function handleSelectPet(p: Animal) {
  if (p.deceased) {
    deceasedPending.value = p
    return
  }
  draft.setPet(p)
}
function confirmDeceased() {
  if (deceasedPending.value) draft.setPet(deceasedPending.value)
  deceasedPending.value = null
}
function startCreatePet() {
  draft.startCreatingPet()
  petSubmitError.value = null
}
function backToPetList() {
  draft.cancelCreatingPet()
  petSubmitError.value = null
}

async function submitPet(): Promise<boolean> {
  const p = draft.state.petCreating
  const o = draft.state.owner
  if (!p || !o) return false
  if (petFormRef.value && !petFormRef.value.validate()) {
    petSubmitError.value = 'Revisa los campos marcados antes de continuar.'
    scrollToFirstError()
    return false
  }
  if (companyId.value == null) {
    petSubmitError.value = 'No se pudo identificar la empresa actual. Vuelve a iniciar sesión.'
    return false
  }
  petSubmitError.value = null
  try {
    const payload = buildCreateAnimalRequest(p, o.id)
    const created = await animalApi.create(payload)
    const newPet = mapAnimalResponse(created)
    addPet(newPet)
    if (!o.pets.includes(newPet.id)) o.pets = [...o.pets, newPet.id]
    draft.setPet(newPet)
    return true
  } catch (e: unknown) {
    petSubmitError.value = getProblemDetailMessage(
      e,
      'No se pudo registrar la mascota. Intenta nuevamente.',
    )
    return false
  }
}

// ── Validación de la SELECCIÓN (paso 1, modo elegir owner+pet) ───────────────
// El botón "Continuar a la consulta" siempre está activo; si falta propietario o
// mascota, al hacer click mostramos un banner guía (mismo patrón `submitted` de
// los modales de acciones) y no avanzamos.
const selectionSubmitted = ref(false)
const selectionError = computed<string | null>(() => {
  if (!draft.state.owner) return 'Selecciona un propietario para continuar.'
  if (!draft.state.pet) return 'Selecciona una mascota para continuar.'
  return null
})
// Referencia a la sección de mascota + flag de animación "requerido" (shake).
const petSectionRef = ref<HTMLElement | null>(null)
const petSelectShake = ref(false)
async function shakePetSelection() {
  // Re-dispara la animación aunque ya estuviera activa (quita y vuelve a poner la clase).
  petSelectShake.value = false
  await nextTick()
  petSelectShake.value = true
  petSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function validateSelection(): boolean {
  selectionSubmitted.value = true
  const err = selectionError.value
  if (err) {
    // Falta propietario → sube al buscador; falta mascota → centra y agita la selección.
    if (!draft.state.owner) window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (!draft.state.pet && !draft.state.petCreating) shakePetSelection()
  }
  return !err
}
// Al elegir/crear propietario o mascota, limpiamos el intento previo: el banner
// de selección solo reaparece si el usuario vuelve a pulsar "Continuar" sin completar.
watch([() => draft.state.owner, () => draft.state.pet], () => {
  selectionSubmitted.value = false
})

// ── Submit unificado (lo invoca el footer del wizard) ────────────────────────
async function submit(): Promise<boolean> {
  if (draft.state.ownerCreating) return submitOwner()
  if (draft.state.petCreating) return submitPet()
  return true
}

defineExpose({ submit, validateSelection })

const banner = computed(
  () =>
    ownerSubmitError.value ??
    petSubmitError.value ??
    // El error de selección solo aplica en modo elegir (no creando) y tras intentar avanzar.
    (selectionSubmitted.value && !draft.state.ownerCreating && !draft.state.petCreating
      ? selectionError.value
      : null) ??
    petsError.value,
)
function clearBanner() {
  ownerSubmitError.value = null
  petSubmitError.value = null
  selectionSubmitted.value = false
}
</script>

<template>
  <ContentWrap>
    <div v-if="banner" class="banner danger" role="alert">
      <TriangleAlert :size="16" :stroke-width="1.7" />
      <span>{{ banner }}</span>
      <button
        v-if="ownerSubmitError || petSubmitError"
        type="button"
        class="banner-x"
        @click="clearBanner"
      >
        ×
      </button>
    </div>

    <!-- ══ PROPIETARIO ══ -->
    <template v-if="ownerMode === 'creating' && draft.state.ownerCreating">
      <PageHeading
        title="Registrar nuevo propietario"
        subtitle="Completa los datos. Podrás editarlos después desde su ficha."
      />
      <OwnerForm ref="ownerFormRef" v-model="draft.state.ownerCreating" />
    </template>

    <template v-else>
      <template v-if="ownerMode === 'search'">
        <PageHeading
          title="¿Quién es el propietario?"
          subtitle="Busca por nombre, documento o email. Si es nuevo, regístralo."
        />
        <SectionCard :padded="false">
          <div class="search-wrap">
            <OwnerSearchInput
              v-model="query"
              :results-count="results.length"
              autofocus
              @enter="handleEnter"
            />
          </div>

          <div v-if="!query" class="empty">
            <div class="empty-ic"><User :size="26" :stroke-width="1.6" /></div>
            <div class="empty-title">Empieza buscando un propietario</div>
            <p class="empty-desc">
              Escribe el nombre, documento o email. Si no existe, podrás crearlo desde aquí mismo.
            </p>
            <button type="button" class="btn-create" @click="startCreateOwner">
              <Plus :size="14" :stroke-width="1.6" />
              <span>Registrar nuevo propietario</span>
            </button>
          </div>

          <div v-else-if="loading" class="loading">
            <PawLoader :size="22" :glow="false" :speed="900" />
            <span>Buscando…</span>
          </div>

          <div v-else-if="searchError" class="search-error">
            <TriangleAlert :size="14" :stroke-width="1.7" />
            <span>{{ searchError }}</span>
          </div>

          <div v-else-if="results.length > 0" class="results">
            <OwnerResultRow
              v-for="o in results"
              :key="o.id"
              :owner="o"
              :pet-count="o.pets.length"
              @select="selectOwner(o)"
            />
            <button type="button" class="not-found" @click="startCreateOwner">
              <div class="nf-ic"><Plus :size="15" :stroke-width="1.6" /></div>
              <div class="nf-meta">
                <div class="nf-title">¿No encuentras a "{{ query }}"?</div>
                <div class="nf-sub">Registra un propietario nuevo</div>
              </div>
              <ArrowRight :size="14" :stroke-width="1.6" class="nf-arrow" />
            </button>
          </div>

          <div v-else class="no-results">
            <div class="nr-msg">
              Sin resultados para "<strong>{{ query }}</strong
              >"
            </div>
            <button type="button" class="btn-create" @click="startCreateOwner">
              <Plus :size="14" :stroke-width="1.6" />
              <span>Registrar a "{{ query }}"</span>
            </button>
          </div>
        </SectionCard>
      </template>

      <template v-else-if="ownerMode === 'selected' && selectedOwner">
        <PageHeading
          title="Propietario y paciente"
          subtitle="Confirma el propietario y elige (o registra) la mascota que será atendida."
        />
        <OwnerSummaryCard
          :owner="selectedOwner"
          :pet-count="selectedOwner.pets.length"
          @change="changeOwner"
        />
      </template>

      <!-- ══ MASCOTA (solo con propietario seleccionado) ══ -->
      <template v-if="ownerMode === 'selected' && selectedOwner">
        <div ref="petSectionRef" class="pet-section" :class="{ 'pet-shake': petSelectShake }">
          <template v-if="petMode === 'creating' && draft.state.petCreating">
            <div class="create-head">
              <PageHeading
                title="Registrar nueva mascota"
                subtitle="Datos básicos para crear el expediente. Los detalles clínicos se agregan en cada consulta."
              />
              <button v-if="pets.length > 0" type="button" class="back-list" @click="backToPetList">
                ← Ver mascotas existentes
              </button>
            </div>
            <PetForm ref="petFormRef" v-model="draft.state.petCreating" />
          </template>

          <template v-else-if="petMode === 'empty'">
            <PageHeading
              title="Selecciona la mascota"
              subtitle="Este propietario aún no tiene mascotas registradas."
            />
            <SectionCard :padded="false">
              <div class="empty">
                <div class="empty-ic"><PawPrint :size="30" :stroke-width="1.5" /></div>
                <div class="empty-title">Sin mascotas registradas</div>
                <p class="empty-desc">
                  Registra la primera mascota de
                  {{ selectedOwner.name?.split(' ')[0] }} para poder iniciar la consulta.
                </p>
                <button
                  type="button"
                  class="ds-btn ds-btn--solid ds-btn--lg"
                  @click="startCreatePet"
                >
                  <Plus :size="14" :stroke-width="1.6" />
                  <span>Registrar primera mascota</span>
                </button>
              </div>
            </SectionCard>
          </template>

          <template v-else>
            <PageHeading
              title="Selecciona la mascota"
              subtitle="Elige la mascota que será atendida en esta consulta, o registra una nueva."
            />
            <div class="grid">
              <PetCard
                v-for="p in pets"
                :key="p.id"
                :pet="p"
                :selected="selectedPetId(p)"
                @select="handleSelectPet(p)"
              />
              <button type="button" class="add-pet" @click="startCreatePet">
                <div class="add-ic"><Plus :size="18" :stroke-width="1.6" /></div>
                <div class="add-title">Nueva mascota</div>
                <div class="add-sub">
                  Registrar mascota a nombre de {{ selectedOwner.name?.split(' ')[0] }}
                </div>
              </button>
            </div>
          </template>
        </div>
      </template>
    </template>

    <DeceasedConfirmDialog
      :open="!!deceasedPending"
      :pet-name="deceasedPending?.name ?? ''"
      @cancel="deceasedPending = null"
      @confirm="confirmDeceased"
    />
  </ContentWrap>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  position: relative;
}

.banner.danger {
  background: var(--danger-150);
  border: 1px solid var(--danger-300);
  color: oklch(35% 0.15 25deg);
}

.banner-x {
  margin-left: auto;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  font-family: inherit;
}

.pet-section {
  margin-top: 28px;
  padding-top: 4px;
}

/* Animación "requerido" cuando se intenta continuar sin elegir mascota. Se agita el
   área seleccionable (grid de tarjetas o estado vacío), no el encabezado. */
.pet-section.pet-shake :is(.grid, .empty, .add-pet) {
  animation: pet-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes pet-shake {
  10%,
  90% {
    transform: translateX(-1px);
  }
  20%,
  80% {
    transform: translateX(2px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-4px);
  }
  40%,
  60% {
    transform: translateX(4px);
  }
}

.search-wrap {
  padding: 16px;
  border-bottom: 1px solid var(--warm-200);
}

.empty,
.no-results {
  padding: 40px 20px;
  text-align: center;
}

.empty-ic {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--warm-900);
}

.empty-desc {
  margin: 0 auto 18px;
  max-width: 380px;
  font-size: 13px;
  color: var(--warm-600);
  line-height: 1.55;
}

.btn-create {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  padding: 9px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.btn-create:hover {
  background: var(--warm-100);
}

.results {
  display: flex;
  flex-direction: column;
}

.not-found {
  border: none;
  border-top: 1px solid var(--warm-200);
  padding: 14px 18px;
  background: var(--warm-150);
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.not-found:hover {
  background: var(--warm-200);
}

.nf-ic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}

.nf-meta {
  flex: 1;
}

.nf-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.nf-sub {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 1px;
}

.nf-arrow {
  color: var(--warm-500);
}

.nr-msg {
  font-size: 13.5px;
  color: var(--warm-600);
  margin-bottom: 14px;
}

.loading,
.search-error {
  padding: 28px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--warm-600);
}

.search-error {
  color: oklch(45% 0.15 25deg);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (width <= 1080px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.add-pet {
  background: transparent;
  border: 1.5px dashed var(--warm-300);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 175px;
  color: var(--warm-600);
  transition:
    border-color 0.15s,
    background 0.15s;
}

.add-pet:hover {
  border-color: var(--amatista-700);
  background: var(--amatista-50);
}

.add-ic {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}

.add-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.add-sub {
  font-size: 11.5px;
  text-align: center;
  max-width: 160px;
  line-height: 1.4;
}

.create-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.back-list {
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: 6px;
  margin-top: 6px;
}

.back-list:hover {
  background: var(--amatista-50);
}
</style>
