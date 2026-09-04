<script setup lang="ts">
import { Phone } from 'lucide-vue-next'
import type { Owner } from '@/types/domain'
import BaseChip from '@/components/ui/BaseChip.vue'
import { initials } from '@/composables/format'
defineProps<{
  owner: Owner
  petCount: number
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button type="button" class="row" @click="$emit('select')">
    <div class="avatar">{{ initials(owner.name) }}</div>
    <div class="ident">
      <div class="ds-item-label ds-item-label--lg">{{ owner.name }}</div>
      <div class="doc ds-meta">{{ owner.document }}</div>
    </div>
    <div class="phone ds-flex-row ds-flex-row--6 ds-meta-dark ds-meta-dark--sm">
      <Phone :size="12" :stroke-width="1.7" />
      <span class="ds-truncate">{{ owner.phone }}</span>
    </div>
    <div class="email ds-truncate ds-meta-dark ds-meta-dark--sm">{{ owner.email }}</div>
    <BaseChip variant="accent"> {{ petCount }} mascota{{ petCount === 1 ? '' : 's' }} </BaseChip>
  </button>
</template>

<style scoped>
.row {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--warm-450);
  padding: 14px 18px;
  display: grid;
  grid-template-columns: 38px 1.5fr 1fr 1fr auto;
  gap: 16px;
  align-items: center;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}

.row:hover {
  background: var(--warm-100);
}

.row:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: -2px;
}

.row:last-child {
  border-bottom: none;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--amatista-600), var(--amatista-800));
  color: var(--warm-50);
  font-weight: 600;
  font-size: 13px;
  display: grid;
  place-items: center;
}

.ident {
  min-width: 0;
}

/* Único añadido sobre `.ds-meta`: el hueco bajo el nombre. */
.doc {
  margin-top: 2px;
}

/* Residuo sobre `.ds-flex-row--6` + `.ds-meta-dark`/`--sm`. */
.phone {
  min-width: 0;
}

/* El recorte lo pone `.ds-truncate` y el par color+tamaño `.ds-meta-dark`
   + `--sm`. */
.email {
  min-width: 0;
}
</style>
