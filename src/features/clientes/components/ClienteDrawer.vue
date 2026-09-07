<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue'
import { X, Pencil, Trash2, Plus, PawPrint, Phone, Mail, MapPin, IdCard } from 'lucide-vue-next'
import type { Owner, Animal } from '@/types/domain'
import { useAnimalsByOwner } from '@/features/dashboard/views/consulta/nueva/composables/useAnimalsByOwner'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { genderLabel, reproductiveLabel } from '@/composables/domainLabels'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getProblemDetailMessage } from '@/services/http/http.client'
import PetFormModal from './PetFormModal.vue'

const props = defineProps<{
  owner: Owner | null
  busy?: boolean
  canUpdate?: boolean
  canDelete?: boolean
  canCreatePet?: boolean
  canUpdatePet?: boolean
  canDeletePet?: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: [owner: Owner]
  delete: [owner: Owner]
}>()

const open = computed(() => props.owner !== null)

const ownerIdRef = toRef(() => props.owner?.id ?? '')
const {
  list: pets,
  loading: petsLoading,
  error: petsError,
  addPet,
  updatePet,
  removePet,
} = useAnimalsByOwner(ownerIdRef)

const toast = useToast()
const { confirm } = useConfirmDialog()
const petActionError = ref<string | null>(null)

const petModalOpen = ref(false)
const editingPetId = ref<number | null>(null)

function openCreatePet() {
  editingPetId.value = null
  petModalOpen.value = true
}

function openEditPet(pet: Animal) {
  editingPetId.value = Number(pet.id)
  petModalOpen.value = true
}

function closePetModal() {
  petModalOpen.value = false
  editingPetId.value = null
}

function onPetSaved(pet: Animal) {
  if (editingPetId.value != null) {
    updatePet(pet)
  } else {
    addPet(pet)
  }
  closePetModal()
}

async function requestDeletePet(pet: Animal) {
  petActionError.value = null
  try {
    const ok = await confirm({
      title: `¿Eliminar a ${pet.name}?`,
      message: 'Se eliminará el registro de la mascota.',
      consequence:
        'La mascota deja de verse en listados e historia clínica. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      busyLabel: 'Eliminando…',
      accent: 'danger',
      action: () => animalApi.remove(Number(pet.id)),
    })
    if (!ok) return
    removePet(pet)
    toast.info('Mascota eliminada', `${pet.name} se eliminó correctamente.`)
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo eliminar la mascota')
    petActionError.value = msg
    toast.error('Ocurrió un error', msg)
  }
}

function onKey(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open && owner" class="drawer-root" role="dialog" aria-modal="true">
        <aside class="drawer ds-stack">
          <header class="head">
            <button
              type="button"
              class="close ds-hover-neutral"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X :size="15" :stroke-width="1.8" />
            </button>

            <h2 class="name">{{ owner.name }}</h2>
            <div class="meta-rows ds-stack ds-stack--6">
              <div class="meta-row">
                <IdCard :size="13" :stroke-width="1.7" /> <span>{{ owner.document }}</span>
              </div>
              <div v-if="owner.phone" class="meta-row">
                <Phone :size="13" :stroke-width="1.7" /> <span>{{ owner.phone }}</span>
              </div>
              <div v-if="owner.email" class="meta-row">
                <Mail :size="13" :stroke-width="1.7" /> <span>{{ owner.email }}</span>
              </div>
              <div v-if="owner.city" class="meta-row">
                <MapPin :size="13" :stroke-width="1.7" /> <span>{{ owner.city.name }}</span>
              </div>
            </div>
          </header>

          <div class="body">
            <div class="pets-head">
              <h3>Mascotas</h3>
              <button
                v-if="canCreatePet"
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--snug"
                @click="openCreatePet"
              >
                <Plus :size="14" :stroke-width="1.8" /> Agregar
              </button>
            </div>

            <div v-if="petActionError" class="ds-banner ds-banner--error" role="alert">
              {{ petActionError }}
            </div>

            <div v-if="petsLoading" class="pets-empty">Cargando mascotas…</div>
            <div v-else-if="petsError" class="ds-banner ds-banner--error" role="alert">
              {{ petsError }}
            </div>
            <div v-else-if="pets.length === 0" class="pets-empty">
              <PawPrint :size="18" :stroke-width="1.5" />
              <p>Este cliente aún no tiene mascotas registradas.</p>
            </div>
            <ul v-else class="pets-list">
              <li v-for="pet in pets" :key="pet.id" class="pet-row">
                <div class="pet-info">
                  <span class="pet-name">{{ pet.name }}</span>
                  <span class="pet-sub"
                    >{{ pet.specie.name }} · {{ pet.breed.name }} · {{ genderLabel(pet.gender) }} ·
                    {{ reproductiveLabel(pet.reproductiveState) }}</span
                  >
                </div>
                <div v-if="canUpdatePet || canDeletePet" class="pet-actions">
                  <button
                    v-if="canUpdatePet"
                    type="button"
                    class="ds-btn ds-btn--ghost ds-btn--snug"
                    title="Editar"
                    @click="openEditPet(pet)"
                  >
                    <Pencil :size="13" :stroke-width="1.7" />
                  </button>
                  <button
                    v-if="canDeletePet"
                    type="button"
                    class="ds-btn ds-btn--ghost ds-btn--snug"
                    title="Eliminar"
                    @click="requestDeletePet(pet)"
                  >
                    <Trash2 :size="13" :stroke-width="1.7" />
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <footer class="foot">
            <button
              v-if="canUpdate"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--snug"
              :disabled="busy"
              @click="emit('edit', owner)"
            >
              <Pencil :size="14" :stroke-width="1.7" />
              Editar
            </button>
            <div class="ds-flex-fill" />
            <button
              v-if="canDelete"
              type="button"
              class="danger"
              :class="{ 'ds-is-disabled--60': busy }"
              :disabled="busy"
              @click="emit('delete', owner)"
            >
              <Trash2 :size="14" :stroke-width="1.7" />
              Eliminar
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>

  <PetFormModal
    v-if="owner"
    :open="petModalOpen"
    :owner-id="owner.id"
    :pet-id="editingPetId"
    @close="closePetModal"
    @saved="onPetSaved"
  />
</template>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  background: color-mix(in oklch, var(--amatista-900) 35%, transparent);
  backdrop-filter: blur(2px);
  z-index: var(--z-drawer);
  font-family: var(--font-sans);
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 100vw;
  background: var(--warm-50);
  border-left: 1px solid var(--warm-200);
  box-shadow: -20px 0 60px -20px color-mix(in oklch, var(--amatista-900) 25%, transparent);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}

.head {
  position: relative;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--warm-200);
}

.close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  transition: background 0.12s ease;
}

.name {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.15;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  overflow-wrap: anywhere;
  padding-right: 34px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--warm-600);
}

.body {
  flex: 1;
  overflow: auto;
  padding: 18px 26px 28px;
}

.pets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pets-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-800);
}

.pets-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 10px;
  text-align: center;
  color: var(--warm-500);
  font-size: 12.5px;
  background: var(--warm-100);
  border: 1px dashed var(--warm-300);
  border-radius: 10px;
}

.pets-empty p {
  margin: 0;
}

.pets-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.pet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
}

.pet-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pet-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.pet-sub {
  font-size: 11.5px;
  color: var(--warm-500);
}

.pet-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 26px;
  border-top: 1px solid var(--warm-200);
  background: var(--warm-100);
  flex-wrap: wrap;
}

.danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  background: var(--danger-150);
  color: var(--danger-700);
  border: 1px solid var(--danger-700);
}

.danger:hover:not(:disabled) {
  background: var(--danger-200);
}

.danger:disabled {
  cursor: not-allowed;
}
</style>
