<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import type { Animal } from '@/types/domain'
import BaseChip from '@/components/ui/BaseChip.vue'
import { calcAge, initials } from '@/composables/format'
import { genderLabel, weightUnitLabel } from '@/composables/domainLabels'
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
    <div class="head ds-flex-row ds-flex-row--12">
      <div class="avatar ds-tone--accent">{{ initials(pet.name) }}</div>
      <div class="ds-flex-fill">
        <div class="name ds-flex-row ds-flex-row--6 ds-text-strong">
          <span>{{ pet.name }}</span>
          <BaseChip v-if="pet.deceased" variant="neutral">Fallecido</BaseChip>
        </div>
        <div class="sub ds-meta">{{ pet.specie.name }} · {{ pet.breed.name }}</div>
      </div>
    </div>
    <div class="grid">
      <div>
        <div class="lab">Edad</div>
        <div class="val ds-text-strong">{{ calcAge(pet.bod) }}</div>
      </div>
      <div>
        <div class="lab">Género</div>
        <div class="val ds-text-strong">{{ genderLabel(pet.gender) }}</div>
      </div>
      <div>
        <div class="lab">Peso</div>
        <div class="val ds-text-strong">
          {{
            pet.weight != null ? `${pet.weight} ${weightUnitLabel(pet.weightType)}` : 'Sin registro'
          }}
        </div>
      </div>
      <div>
        <div class="lab">Última consulta</div>
        <div class="val ds-text-strong">{{ pet.lastVisit ?? '—' }}</div>
      </div>
    </div>
  </button>
</template>

<style scoped>
.pet-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  position: relative;
  text-align: left;
  font-family: inherit;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}

.pet-card:hover:not(.selected) {
  /* A11Y-09: era --warm-300 (1,48:1), más claro que el reposo ya migrado a
     --warm-450 (3,54:1). El estado seleccionado lo sigue ganando
     `.pet-card.selected` (0,2,0) con su `border` completo en amatista-700. */
  border-color: var(--warm-500);
}

.pet-card.selected {
  border: 1.5px solid var(--amatista-700);
  box-shadow: var(--ring);
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

/* Único añadido sobre `.ds-flex-row--12`: el hueco hacia la rejilla de datos. */
.head {
  margin-bottom: 12px;
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
}

/* Residuo sobre `.ds-flex-row--6` + `.ds-text-strong`: sólo el tamaño. */
.name {
  font-size: 15px;
}

/* Residuo sobre `.ds-meta` (warm-500 / 12px). */
.sub {
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

/* Residuo sobre `.ds-text-strong` (warm-900 / peso medio). */
.val {
  margin-top: 2px;
  font-size: 12.5px;
}
</style>
