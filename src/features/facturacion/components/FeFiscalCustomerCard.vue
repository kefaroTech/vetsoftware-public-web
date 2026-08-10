<script setup lang="ts">
import { computed } from 'vue'
import { User, Check, X } from 'lucide-vue-next'
import {
  feFiscalChecklist,
  OWNER_DOCTYPE_LABEL,
  type FiscalCustomer,
} from '../composables/feFiscalChecklist'

const props = defineProps<{ customer: FiscalCustomer | null; selectable?: boolean }>()
const emit = defineEmits<{ select: []; complete: [] }>()

const checklist = computed(() => feFiscalChecklist(props.customer))

const initials = computed(() => {
  const s = props.customer?.legalName || props.customer?.name || '?'
  return s.slice(0, 2).toUpperCase()
})
const docLabel = computed(() => {
  const c = props.customer
  if (!c?.documentType) return '—'
  const short = OWNER_DOCTYPE_LABEL[c.documentType].split(' (')[0]
  return `${short} ${c.documentId || ''}`.trim()
})
</script>

<template>
  <!-- Estado vacío: sin cliente -->
  <div v-if="!customer" class="custempty">
    <div class="custempty-ic"><User :size="20" :stroke-width="1.7" /></div>
    <div class="custempty-text">
      <div class="custempty-t">Cliente requerido</div>
      <div class="custempty-s">
        La factura electrónica debe ir a nombre de un cliente identificado.
      </div>
    </div>
    <button type="button" class="ds-btn ds-btn--primary ds-btn--strong" @click="emit('select')">
      Seleccionar cliente
    </button>
  </div>

  <!-- Cliente seleccionado: tarjeta + checklist -->
  <div v-else class="custcard" :class="{ ok: checklist.complete }">
    <div class="custcard-head">
      <div class="custcard-av">{{ initials }}</div>
      <div class="custcard-id">
        <div class="custcard-name">{{ customer.legalName || customer.name }}</div>
        <div class="custcard-doc">{{ docLabel }}</div>
      </div>
      <button v-if="selectable" type="button" class="custcard-change" @click="emit('select')">
        Cambiar
      </button>
    </div>

    <div class="checklistgrid">
      <div v-for="it in checklist.items" :key="it.key" class="clitem" :class="it.ok ? 'ok' : 'bad'">
        <Check v-if="it.ok" :size="13" :stroke-width="2.6" />
        <X v-else :size="13" :stroke-width="2.6" />
        <span>{{ it.label }}</span>
      </div>
    </div>

    <button v-if="!checklist.complete" type="button" class="custcard-cta" @click="emit('complete')">
      <User :size="14" :stroke-width="1.9" /> Completar datos fiscales del cliente
    </button>
  </div>
</template>

<style scoped>
.custempty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--warm-50);
  border: 1.5px dashed var(--warm-300);
}

.custempty-ic {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-500);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.custempty-text {
  flex: 1;
  min-width: 0;
}

.custempty-t {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--warm-900);
}

.custempty-s {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 1px;
}

.custcard {
  padding: 14px;
  border-radius: 12px;
  background: var(--warm-50);
  border: 1.5px solid oklch(88% 0.06 25deg);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.custcard.ok {
  border-color: oklch(85% 0.08 150deg);
}

.custcard-head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.custcard-av {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.custcard-id {
  flex: 1;
  min-width: 0;
}

.custcard-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-900);
}

.custcard-doc {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 1px;
}

.custcard-change {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--amatista-700);
  cursor: pointer;
}

.checklistgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
}

@media (width <= 420px) {
  .checklistgrid {
    grid-template-columns: 1fr;
  }
}

.clitem {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}

.clitem.ok {
  color: oklch(42% 0.12 150deg);
}

.clitem.bad {
  color: oklch(52% 0.16 25deg);
}

.clitem :deep(svg) {
  flex-shrink: 0;
}

.custcard-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  padding: 9px 14px;
  border-radius: 9px;
  border: none;
  background: var(--amatista-600);
  color: white;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
</style>
