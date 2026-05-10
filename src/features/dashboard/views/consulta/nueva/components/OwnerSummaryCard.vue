<script setup lang="ts">
import { Phone, Mail, MapPin, Sparkles } from 'lucide-vue-next'
import type { Owner } from '@/types/domain'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import { User } from 'lucide-vue-next'

defineProps<{
  owner: Owner
  petCount: number
}>()

defineEmits<{ change: [] }>()

function formatLocation(owner: Owner): string {
  if (!owner.city) return '—'
  const parts = [owner.city.name]
  if (owner.city.state) parts.push(owner.city.state.name)
  if (owner.city.state?.country) parts.push(owner.city.state.country.name)
  return parts.join(' · ')
}
</script>

<template>
  <SectionCard
    accent
    :icon="User"
    :title="owner.name"
    :subtitle="owner.document"
  >
    <template #action>
      <button type="button" class="change" @click="$emit('change')">
        Cambiar
      </button>
    </template>
    <div class="grid">
      <div class="row">
        <div class="ic">
          <Phone :size="13" :stroke-width="1.7" />
        </div>
        <div>
          <div class="lab">Teléfono</div>
          <div class="val">{{ owner.phone }}</div>
        </div>
      </div>
      <div class="row">
        <div class="ic">
          <Mail :size="13" :stroke-width="1.7" />
        </div>
        <div>
          <div class="lab">Email</div>
          <div class="val">{{ owner.email || '—' }}</div>
        </div>
      </div>
      <div class="row">
        <div class="ic">
          <MapPin :size="13" :stroke-width="1.7" />
        </div>
        <div>
          <div class="lab">Dirección</div>
          <div class="val">{{ owner.address || '—' }}</div>
        </div>
      </div>
      <div class="row">
        <div class="ic">
          <MapPin :size="13" :stroke-width="1.7" />
        </div>
        <div>
          <div class="lab">Ciudad</div>
          <div class="val">{{ formatLocation(owner) }}</div>
        </div>
      </div>
    </div>
    <div class="banner">
      <Sparkles :size="14" :stroke-width="1.6" />
      <span>
        <strong>{{ petCount }} mascota{{ petCount === 1 ? '' : 's' }}</strong>
        registrada{{ petCount === 1 ? '' : 's' }} a su nombre. Las verás en el
        siguiente paso.
      </span>
    </div>
  </SectionCard>
</template>

<style scoped>
.change {
  background: transparent;
  border: 1px solid var(--warm-200);
  padding: 6px 12px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-900);
  cursor: pointer;
}
.change:hover {
  background: var(--warm-100);
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 1vw + 8px, 24px) clamp(20px, 3cqi + 8px, 56px);
}
.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
@container (max-width: 520px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.ic {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--warm-150);
  color: var(--warm-600);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.lab {
  font-size: 11px;
  color: var(--warm-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.val {
  font-size: 13px;
  color: var(--warm-900);
  margin-top: 2px;
  word-break: break-word;
}
.banner {
  margin-top: 18px;
  padding: 12px 14px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-100);
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  color: var(--warm-900);
}
.banner :global(svg) {
  color: var(--amatista-700);
  flex-shrink: 0;
}
.banner strong {
  font-weight: 600;
}
</style>
