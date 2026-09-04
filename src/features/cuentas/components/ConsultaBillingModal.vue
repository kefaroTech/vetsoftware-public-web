<script setup lang="ts">
import { toRef, watch } from 'vue'
import { MapPin, Receipt } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BillingDestinationPicker from './BillingDestinationPicker.vue'
import BillingChargeColumns from './BillingChargeColumns.vue'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { useConsultaBilling } from '../composables/useConsultaBilling'

const props = withDefaults(
  defineProps<{
    open: boolean
    ownerId: number | null
    ownerName: string
    animalId: number | null
    animalName: string
    heading?: string
    subtitle?: string
    /** `false` → modal no descartable: sin X, sin Cancelar, sin backdrop/Escape. */
    dismissible?: boolean
  }>(),
  { heading: 'Facturación', subtitle: '', dismissible: true },
)

const emit = defineEmits<{ close: []; finish: [] }>()

const {
  destino,
  existingAccount,
  existingCharges,
  loadingAccount,
  busy,
  tab,
  query,
  items,
  catalog,
  total,
  projectedSaldo,
  firstName,
  hasAccount,
  selectedHeading,
  primaryLabel,
  showCharges,
  canConfirm,
  retryHint,
  branchStore,
  selectTab,
  load,
  addItem,
  setQty,
  removeLine,
  confirm,
} = useConsultaBilling({
  ownerId: toRef(props, 'ownerId'),
  ownerName: toRef(props, 'ownerName'),
  animalId: toRef(props, 'animalId'),
})

// Regla del proyecto: el modal está siempre montado, así que recarga al abrirse.
watch(
  () => props.open,
  (open) => {
    if (open) void load()
  },
)

async function onConfirm() {
  if (!(await confirm())) return
  emit('finish')
  emit('close')
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="heading"
    :subtitle="subtitle || (animalName ? `${animalName} · ${ownerName}` : ownerName)"
    :icon="Receipt"
    :width="700"
    :closable="dismissible"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loadingAccount" class="state">Verificando cuenta…</div>

      <template v-else>
        <div v-if="branchStore.selectedBranchId == null" class="acct-none branch-required">
          <MapPin :size="15" :stroke-width="1.8" />
          <span>Selecciona una sede para agregar cargos o abrir una cuenta.</span>
        </div>

        <!-- Banda de estado de cuenta -->
        <div v-if="hasAccount && existingAccount" class="acctcard ds-flex-row ds-flex-row--12">
          <div class="ac-ic"><Receipt :size="17" :stroke-width="1.7" /></div>
          <div class="ds-flex-fill">
            <div class="ac-title">
              {{ firstName }} ya tiene una cuenta abierta en {{ existingAccount.branch.name }}
            </div>
            <div class="ac-sub">
              {{ existingCharges.length }} cargo(s) · desde
              {{ existingAccount.createdDate.slice(5, 10) }}
            </div>
          </div>
          <div class="ac-saldo">
            <span class="ac-saldo-lab">Saldo actual</span>
            <span class="ac-saldo-val">{{ formatMoney(existingAccount.outstandingAmount) }}</span>
          </div>
        </div>
        <div v-else class="acct-none">
          <Receipt :size="15" :stroke-width="1.8" />
          <span>
            <strong>{{ firstName }}</strong> no tiene cuenta abierta. Puedes abrir una con los
            cargos de esta consulta.
          </span>
        </div>

        <BillingDestinationPicker
          v-model="destino"
          :has-account="hasAccount"
          :projected-saldo="projectedSaldo"
        />

        <BillingChargeColumns
          v-if="showCharges"
          :tab="tab"
          :query="query"
          :catalog="catalog"
          :items="items"
          :existing-charges="existingCharges"
          :show-existing="destino === 'existing'"
          :heading="selectedHeading"
          :busy="busy"
          @select-tab="selectTab"
          @update:query="query = $event"
          @add="addItem(tab, $event.id, $event.name, $event.price, $event.soldOut)"
          @set-qty="setQty"
          @remove="removeLine"
        />

        <div v-if="retryHint" class="acct-none retry">
          <Receipt :size="15" :stroke-width="1.8" />
          <span>
            Guardado parcial: reintenta <strong>{{ primaryLabel }}</strong> para registrar los
            cargos restantes.
          </span>
        </div>
      </template>
    </template>

    <template #footer-left>
      <span v-if="showCharges && items.length" class="foottotal ds-meta-dark"
        >Total cargos <strong>{{ formatMoney(total) }}</strong></span
      >
    </template>
    <template #footer-actions>
      <button
        v-if="dismissible"
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--lg"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--lg"
        :disabled="!canConfirm"
        @click="onConfirm"
      >
        {{ busy ? 'Guardando…' : primaryLabel }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.state {
  padding: 24px;
  text-align: center;
  color: var(--warm-500);
  font-size: 13px;
}

/* Banda de estado. Layout via primitivas: .ds-flex-row(--12), .ds-flex-fill. */
.acctcard {
  padding: 14px 16px;
  margin-bottom: 16px;
  background: var(--success-bg);
  border: 1px solid var(--success-dot);
  border-radius: 12px;
}
.ac-ic {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: color-mix(in oklch, var(--success-bg), white 35%);
  color: var(--success-fg);
}
.ac-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--success-fg);
}
.ac-sub {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 2px;
}
.ac-saldo {
  text-align: right;
  flex-shrink: 0;
}
.ac-saldo-lab {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}
.ac-saldo-val {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--success-fg);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.acct-none {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  background: var(--warning-50);
  border: 1px solid var(--warning-border);
  color: oklch(40% 0.1 70deg);
  border-radius: 10px;
}
.acct-none strong {
  font-weight: 600;
}

/* El aviso de reintento va debajo de las columnas, no encima: antes llevaba un
   `style="margin-top: 14px"` en línea. */
.acct-none.retry {
  margin-top: 14px;
}

/* Footer */
.foottotal strong {
  font-size: 15px;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}

/* Los botones del footer usan `.ds-btn` (primitives.css). */
</style>
