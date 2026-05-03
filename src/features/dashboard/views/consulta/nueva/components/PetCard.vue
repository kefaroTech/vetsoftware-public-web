<script setup lang="ts">
import { PawPrint, Check } from 'lucide-vue-next'
import type { Animal } from '@/types/domain'
import BaseChip from '@/features/dashboard/components/ui/BaseChip.vue'
import { calcAge, genderLabel } from '../composables/format'

defineProps<{
  pet: Animal
  selected: boolean
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="pet-card"
    :class="{ selected, deceased: pet.deceased }"
    @click="$emit('select')"
  >
    <span v-if="selected" class="check">
      <Check :size="12" :stroke-width="2" />
    </span>
    <div class="head">
      <div class="avatar">
        <PawPrint :size="22" :stroke-width="1.6" />
      </div>
      <div class="meta">
        <div class="name">
          <span>{{ pet.name }}</span>
          <BaseChip v-if="pet.deceased" variant="neutral">Fallecido</BaseChip>
        </div>
        <div class="sub">{{ pet.specie.name }} · {{ pet.breed.name }}</div>
      </div>
    </div>
    <div class="grid">
      <div>
        <div class="lab">Edad</div>
        <div class="val">{{ calcAge(pet.bod) }}</div>
      </div>
      <div>
        <div class="lab">Género</div>
        <div class="val">{{ genderLabel(pet.gender) }}</div>
      </div>
      <div>
        <div class="lab">Peso</div>
        <div class="val">{{ pet.weight }} {{ pet.weightType }}</div>
      </div>
      <div>
        <div class="lab">Última consulta</div>
        <div class="val">{{ pet.lastVisit ?? '—' }}</div>
      </div>
    </div>
  </button>
</template>

<style scoped>
.pet-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  position: relative;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.pet-card:hover:not(.selected) {
  border-color: var(--warm-300);
}
.pet-card.selected {
  border: 1.5px solid var(--amatista-700);
  box-shadow: 0 0 0 3px var(--amatista-50);
  padding: 15.5px;
}
.pet-card.deceased {
  opacity: 0.7;
}
.pet-card:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: 2px;
}
.check {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--amatista-700);
  color: white;
  display: grid;
  place-items: center;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.meta {
  min-width: 0;
  flex: 1;
}
.name {
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--warm-900);
}
.sub {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 2px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 8px;
  font-size: 11.5px;
}
.lab {
  color: var(--warm-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
}
.val {
  color: var(--warm-900);
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 500;
}
</style>
