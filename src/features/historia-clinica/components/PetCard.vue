<script setup lang="ts">
import { computed } from 'vue'
import { initials } from '@/composables/format'
import type { Animal } from '@/types/domain'

interface Props {
  pet: Animal
}
const props = defineProps<Props>()
const emit = defineEmits<(e: 'select', pet: Animal) => void>()

const petInitials = computed(() => initials(props.pet.name))

const sexLabel = computed(() => (props.pet.gender === 'FEMALE' ? 'Hembra' : 'Macho'))

const weightLabel = computed(() => {
  if (props.pet.weight == null) return 'Sin registro'
  const unit =
    props.pet.weightType === 'GRAMS' ? 'g' : props.pet.weightType === 'POUNDS' ? 'lb' : 'kg'
  return `${props.pet.weight} ${unit}`
})
</script>

<template>
  <button type="button" class="pet-card" @click="emit('select', pet)">
    <div class="avatar">{{ petInitials }}</div>
    <div class="body">
      <div class="name">{{ pet.name }}</div>
      <div class="taxa">{{ pet.specie.name }} · {{ pet.breed.name }}</div>
      <div class="row">
        <span class="muted">Sexo:</span> {{ sexLabel }}
        <span class="sep">·</span>
        <span class="muted">Peso:</span> {{ weightLabel }}
      </div>
      <div v-if="pet.bod" class="row"><span class="muted">Nacimiento:</span> {{ pet.bod }}</div>
    </div>
  </button>
</template>

<style scoped>
.pet-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 18px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}

.pet-card:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 15px;
  flex-shrink: 0;
}

.body {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 15px;
  font-weight: 500;
  color: var(--warm-900);
}

.taxa {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 3px;
}

.row {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 6px;
}

.row + .row {
  margin-top: 2px;
}

.muted {
  color: var(--warm-500);
}

.sep {
  color: var(--warm-300);
  margin: 0 6px;
}
</style>
