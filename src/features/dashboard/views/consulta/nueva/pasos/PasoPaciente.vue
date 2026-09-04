<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { Plus, PawPrint, TriangleAlert } from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import EmptyStateBlock from '../components/EmptyStateBlock.vue'
import OwnerSearchPanel from '../components/OwnerSearchPanel.vue'
import OwnerSummaryCard from '../components/OwnerSummaryCard.vue'
import OwnerForm from '../components/OwnerForm.vue'
import PetCard from '../components/PetCard.vue'
import PetForm from '../components/PetForm.vue'
import { useAnimalsByOwner } from '../composables/useAnimalsByOwner'
import { ownerApi } from '../api/owner.api'
import { mapOwnerResponse } from '../api/owner.mapper'
import { animalApi } from '../api/animal.api'
import { buildCreateAnimalRequest, mapAnimalResponse } from '../api/animal.mapper'
import { useNuevaConsultaDraft } from '../composables/useNuevaConsultaDraft'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { scrollToFirstError } from '@/composables/scrollToError'
import type { OwnerDocumentType } from '@/features/facturacion/composables/feFiscalChecklist'
import type { PersonType } from '@/features/facturacion/types/facturacion'
import type { Animal, Owner } from '@/types/domain'

const draft = useNuevaConsultaDraft()
const { confirm } = useConfirmDialog()

// ── Propietario ──────────────────────────────────────────────────────────────
type OwnerMode = 'search' | 'selected' | 'creating'
const ownerMode = computed<OwnerMode>(() => {
  if (draft.state.ownerCreating) return 'creating'
  if (draft.state.owner) return 'selected'
  return 'search'
})

const ownerSubmitError = ref<string | null>(null)
const ownerFormRef = ref<{ validate: () => boolean } | null>(null)
const selectedOwner = computed<Owner | null>(() => draft.state.owner)

function selectOwner(owner: Owner) {
  draft.setOwner(owner)
}
function startCreateOwner(name = '') {
  draft.startCreatingOwner({ name: name.trim() })
  ownerSubmitError.value = null
}
function changeOwner() {
  draft.setOwner(null)
}

// Ni `POST /owners` ni `POST /animals` llevan la empresa en el cuerpo: el backend la deriva del
// JWT. Una guarda previa sobre ella no evitaba ningún 400 — solo cortaba el paso pidiendo «vuelve
// a iniciar sesión» mientras la sesión aún resolvía, y con ello se perdía el borrador escrito.
async function submitOwner(): Promise<boolean> {
  const o = draft.state.ownerCreating
  if (!o) return true
  if (ownerFormRef.value && !ownerFormRef.value.validate()) {
    ownerSubmitError.value = 'Revisa los campos marcados antes de continuar.'
    scrollToFirstError()
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

function selectedPetId(p: Animal): boolean {
  return draft.state.pet?.id === p.id
}
/**
 * Elegir una mascota fallecida pide confirmación.
 *
 * El acento es `warn` (ámbar) y NO `danger`: registrar el fallecimiento de un
 * paciente no es un gesto peligroso ni destruye nada; teñirlo de rojo lo
 * convertiría en una amenaza. Era el tono que ya tenía este diálogo cuando era
 * un componente propio y se conserva tal cual en el canónico.
 */
async function handleSelectPet(p: Animal) {
  if (!p.deceased) {
    draft.setPet(p)
    return
  }
  const ok = await confirm({
    title: '¿Crear consulta para una mascota fallecida?',
    message: `${p.name} aparece marcada como fallecida. Esta consulta quedará registrada como necropsia o registro post-mortem.`,
    accent: 'warn',
    confirmLabel: 'Continuar',
  })
  if (!ok) return
  draft.setPet(p)
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
      <OwnerSearchPanel
        v-if="ownerMode === 'search'"
        @select="selectOwner"
        @create="startCreateOwner"
      />

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
              <EmptyStateBlock
                :icon="PawPrint"
                :icon-size="30"
                :icon-stroke="1.5"
                title="Sin mascotas registradas"
              >
                <template #description>
                  Registra la primera mascota de
                  {{ selectedOwner.name?.split(' ')[0] }} para poder iniciar la consulta.
                </template>
                <template #action>
                  <button
                    type="button"
                    class="ds-btn ds-btn--solid ds-btn--lg"
                    @click="startCreatePet"
                  >
                    <Plus :size="14" :stroke-width="1.6" />
                    <span>Registrar primera mascota</span>
                  </button>
                </template>
              </EmptyStateBlock>
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
              <button type="button" class="add-pet ds-stack ds-stack--8" @click="startCreatePet">
                <div class="add-ic ds-tone--accent"><Plus :size="18" :stroke-width="1.6" /></div>
                <div class="ds-item-label">Nueva mascota</div>
                <div class="add-sub">
                  Registrar mascota a nombre de {{ selectedOwner.name?.split(' ')[0] }}
                </div>
              </button>
            </div>
          </template>
        </div>
      </template>
    </template>
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
  border: 1px solid var(--danger-border);
  color: var(--danger-950);
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
   área seleccionable (grid de tarjetas o estado vacío), no el encabezado.
   `.empty` es la raíz de `EmptyStateBlock`: el selector la alcanza porque Vue
   estampa el atributo de scope de este paso en la raíz del hijo. */
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
  align-items: center;
  justify-content: center;
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

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.add-ic {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
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
