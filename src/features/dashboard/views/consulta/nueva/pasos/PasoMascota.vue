<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, PawPrint } from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import OwnerHeader from '../components/OwnerHeader.vue'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import PetCard from '../components/PetCard.vue'
import PetForm from '../components/PetForm.vue'
import DeceasedConfirmDialog from '../components/DeceasedConfirmDialog.vue'
import { mockAnimals, petsForOwner } from '../data/owners'
import { species, breeds } from '../data/species'
import { useNuevaConsultaDraft } from '../composables/useNuevaConsultaDraft'
import type { Animal, ReproductiveState, Gender, AnimalType } from '@/types/domain'

const draft = useNuevaConsultaDraft()

const owner = computed(() => draft.state.owner)

const pets = computed<Animal[]>(() => {
  if (!owner.value) return []
  const all = petsForOwner(owner.value.id)
  return [...all].sort((a, b) => Number(a.deceased) - Number(b.deceased))
})

type Mode = 'list' | 'empty' | 'creating'
const mode = computed<Mode>(() => {
  if (draft.state.petCreating) return 'creating'
  if (pets.value.length === 0) return 'empty'
  return 'list'
})

const deceasedPending = ref<Animal | null>(null)

function handleSelect(p: Animal) {
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

function startCreate() {
  draft.startCreatingPet()
}

function backToList() {
  draft.cancelCreatingPet()
}

function submit(): boolean {
  const p = draft.state.petCreating
  const o = owner.value
  if (!p || !o) return false
  if (
    !p.name.trim() ||
    !p.specieId ||
    !p.breedId ||
    !p.gender ||
    !p.bod ||
    !p.weight.trim() ||
    !p.reproductiveState
  ) {
    return false
  }

  const sp = species.find((s) => s.id === p.specieId)!
  const br = breeds.find((b) => b.id === p.breedId)!
  const id = `ani_new_${Date.now()}`
  const code = p.code.trim() || `VTR-${String(Date.now()).slice(-4)}`
  const newPet: Animal = {
    id,
    code,
    name: p.name.trim(),
    specie: sp,
    breed: br,
    gender: p.gender as Gender,
    bod: p.bod,
    color: p.color.trim() || undefined,
    weight: Number(p.weight),
    weightType: p.weightType,
    size: p.size ? Number(p.size) : undefined,
    animalType: (p.animalType || 'pet') as AnimalType,
    reproductiveState: p.reproductiveState as ReproductiveState,
    deceased: false,
    ownerId: o.id,
  }
  mockAnimals.unshift(newPet)
  o.pets = [...o.pets, id]
  draft.setPet(newPet)
  return true
}

defineExpose({ submit })

function selectedId(p: Animal): boolean {
  return draft.state.pet?.id === p.id
}

function editOwner() {
  draft.setStep(1)
}
</script>

<template>
  <ContentWrap>
    <OwnerHeader
      v-if="owner"
      :owner="owner"
      :pet-count="pets.length"
      @edit="editOwner"
    />

    <template v-if="mode === 'list'">
      <PageHeading
        title="Selecciona la mascota"
        subtitle="Elige la mascota que será atendida en esta consulta, o registra una nueva."
      />
      <div class="grid">
        <PetCard
          v-for="p in pets"
          :key="p.id"
          :pet="p"
          :selected="selectedId(p)"
          @select="handleSelect(p)"
        />
        <button
          type="button"
          class="add-pet"
          @click="startCreate"
        >
          <div class="add-ic">
            <Plus :size="18" :stroke-width="1.6" />
          </div>
          <div class="add-title">Nueva mascota</div>
          <div class="add-sub">
            Registrar mascota a nombre de {{ owner?.name?.split(' ')[0] }}
          </div>
        </button>
      </div>
    </template>

    <template v-else-if="mode === 'empty'">
      <PageHeading
        title="Selecciona la mascota"
        subtitle="Este propietario aún no tiene mascotas registradas."
      />
      <SectionCard :padded="false">
        <div class="empty">
          <div class="empty-ic">
            <PawPrint :size="30" :stroke-width="1.5" />
          </div>
          <div class="empty-title">Sin mascotas registradas</div>
          <p class="empty-desc">
            Registra la primera mascota de
            {{ owner?.name?.split(' ')[0] }} para poder iniciar la consulta.
          </p>
          <button type="button" class="btn primary" @click="startCreate">
            <Plus :size="14" :stroke-width="1.6" />
            <span>Registrar primera mascota</span>
          </button>
        </div>
      </SectionCard>
    </template>

    <template v-else-if="mode === 'creating' && draft.state.petCreating">
      <div class="create-head">
        <PageHeading
          title="Registrar nueva mascota"
          subtitle="Datos básicos para crear el expediente. Los detalles clínicos se agregan en cada consulta."
        />
        <button
          v-if="pets.length > 0"
          type="button"
          class="back-list"
          @click="backToList"
        >
          ← Ver mascotas existentes
        </button>
      </div>
      <PetForm v-model="draft.state.petCreating" />
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
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 1080px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 720px) {
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
  transition: border-color 0.15s, background 0.15s;
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
.empty {
  padding: 48px 20px;
  text-align: center;
}
.empty-ic {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}
.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--warm-900);
}
.empty-desc {
  margin: 0 auto 22px;
  max-width: 380px;
  font-size: 13px;
  color: var(--warm-600);
  line-height: 1.55;
}
.btn {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.btn.primary {
  background: var(--amatista-700);
  color: white;
}
.btn.primary:hover {
  filter: brightness(1.05);
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
