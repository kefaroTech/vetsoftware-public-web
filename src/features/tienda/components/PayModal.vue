<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CreditCard, FileText, ShieldCheck, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { formatMoney } from '../composables/pricing'
import { useToast } from '@/composables/useToast'
import { useFeUvt } from '@/features/facturacion/composables/useFeUvt'
import {
  feFiscalChecklist,
  type FiscalCustomer,
} from '@/features/facturacion/composables/feFiscalChecklist'
import FeThresholdBanner from '@/features/facturacion/components/FeThresholdBanner.vue'
import FeFiscalCustomerCard from '@/features/facturacion/components/FeFiscalCustomerCard.vue'
import FeCustomerFiscalModal from '@/features/facturacion/components/FeCustomerFiscalModal.vue'
import {
  ownerApi,
  type OwnerResponse,
  type UpdateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/api/owner.api'

const props = defineProps<{ open: boolean; total: number; customer: OwnerResponse | null }>()
const emit = defineEmits<{
  close: []
  confirm: [method: string, received: number | null]
  selectCustomer: []
  customerUpdated: [owner: OwnerResponse]
}>()

const form = reactive({ method: 'EFECTIVO', received: '' })
const toast = useToast()

const METHOD_OPTIONS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
]

// ── FE obligatoria por superar 5 UVT ──────────────────────────────────────────
const { isOverThreshold, threshold, loaded: uvtLoaded, ensureLoaded: ensureUvtLoaded } = useFeUvt()
const overUvt = computed(() => isOverThreshold(props.total))
// Si el UVT no se leyó del backend, el umbral usa un default. Solo es seguro asumir POS cuando el total NO
// supera ese umbral (el default 2025 es menor al real, así que si no lo supera tampoco supera el real). Si lo
// supera y el UVT no cargó, no se puede decidir FE vs POS con certeza → se bloquea el cobro hasta cargarlo.
const uvtUncertain = computed(() => !uvtLoaded.value && props.total > threshold.value)
const localOwner = ref<OwnerResponse | null>(null)
const fiscalModalOpen = ref(false)

const feCustomer = computed<FiscalCustomer | null>(() =>
  localOwner.value ? toFiscalCustomer(localOwner.value) : null,
)
const feComplete = computed(
  () => !overUvt.value || (!!feCustomer.value && feFiscalChecklist(feCustomer.value).complete),
)

function toFiscalCustomer(o: OwnerResponse): FiscalCustomer {
  return {
    name: o.name,
    documentType: o.documentType ?? null,
    documentId: o.document,
    verificationDigit: o.verificationDigit ?? null,
    personType: o.personType ?? null,
    legalName: o.legalName ?? null,
    email: o.email ?? null,
    cityId: o.city?.id ?? null,
    cityName: o.city?.name ?? null,
    taxRegime: o.taxRegime ?? null,
    withholdingAgent: o.withholdingAgent ?? false,
  }
}

async function onSaveFiscal(data: Partial<FiscalCustomer>) {
  const o = localOwner.value
  if (!o) return
  // TR-01: el backend exige ambos (@NotNull). Se coaccionaban a `undefined`, así que el PUT
  // salía incompleto y volvía como un 400 sin decir qué faltaba.
  const documentType = data.documentType ?? o.documentType
  const personType = data.personType ?? o.personType
  if (!documentType || !personType) {
    toast.error(
      'Faltan datos fiscales',
      'Indica el tipo de documento y el tipo de persona del cliente.',
    )
    return
  }
  const payload: UpdateOwnerRequest = {
    name: o.name,
    email: data.email ?? o.email,
    document: data.documentId ?? o.document,
    address: o.address,
    phone: o.phone,
    cityId: o.city.id,
    documentType,
    personType,
    verificationDigit: data.verificationDigit ?? null,
    legalName: data.legalName ?? null,
    withholdingAgent: data.withholdingAgent ?? false,
    taxRegime: data.taxRegime ?? null,
  }
  try {
    const updated = await ownerApi.update(o.id, payload)
    localOwner.value = updated
    emit('customerUpdated', updated)
    fiscalModalOpen.value = false
    toast.success('Datos fiscales guardados', 'El cliente quedó listo para facturar.')
  } catch (e) {
    toast.errorFrom('No se pudieron guardar', e)
  }
}

// Al abrir (Efectivo por defecto) el campo arranca con el total a pagar: el caso común es pago exacto.
watch(
  () => props.open,
  (open) => {
    if (open) {
      form.method = 'EFECTIVO'
      form.received = String(Math.round(props.total))
      localOwner.value = props.customer
      fiscalModalOpen.value = false
      // Reintenta cargar el UVT si una lectura previa falló (ensureLoaded es idempotente si ya cargó).
      void ensureUvtLoaded()
    }
  },
)
watch(
  () => props.customer,
  (c) => {
    localOwner.value = c
  },
)
// Al volver a Efectivo, re-precarga el total a pagar.
watch(
  () => form.method,
  (method) => {
    if (method === 'EFECTIVO') form.received = String(props.total)
  },
)

const isCash = computed(() => form.method === 'EFECTIVO')
const due = computed(() => Math.round(props.total))
const receivedNum = computed(() => Number(form.received.replace(/\D/g, '')) || 0)
const receivedDisplay = computed({
  get: () => (form.received === '' ? '' : formatMoney(receivedNum.value)),
  set: (v: string) => {
    form.received = v.replace(/\D/g, '')
  },
})
const change = computed(() => Math.max(0, receivedNum.value - due.value))
const cashOk = computed(() => !isCash.value || receivedNum.value >= due.value)
const canConfirm = computed(() => cashOk.value && feComplete.value && !uvtUncertain.value)
const confirmLabel = computed(() =>
  overUvt.value ? 'Emitir factura electrónica' : 'Confirmar cobro',
)

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', form.method, isCash.value ? receivedNum.value : null)
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="overUvt ? 'Cobrar y facturar' : 'Cobrar'"
    :subtitle="`Total: ${formatMoney(total)}`"
    :icon="CreditCard"
    :width="overUvt ? 560 : 440"
    @close="emit('close')"
  >
    <template #body>
      <div class="form">
        <div v-if="uvtUncertain" class="uvt-warn">
          No se pudieron cargar los parámetros fiscales (UVT). No es posible determinar si esta
          venta requiere factura electrónica; reintenta en un momento para cobrar este monto.
        </div>
        <template v-if="overUvt">
          <FeThresholdBanner :total="total" />
          <div class="doctypesel">
            <div class="doctype on">
              <FileText :size="15" :stroke-width="1.8" /> Factura electrónica
            </div>
            <div class="doctype off" title="No disponible por encima de 5 UVT">
              <ShieldCheck :size="14" :stroke-width="1.8" style="opacity: 0.5" /> Documento POS
              <span class="lock"><X :size="11" :stroke-width="2.4" /></span>
            </div>
          </div>
          <FeFiscalCustomerCard
            :customer="feCustomer"
            selectable
            @select="emit('selectCustomer')"
            @complete="fiscalModalOpen = true"
          />
        </template>

        <BaseField label="Método de pago" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="form.method" :options="METHOD_OPTIONS" />
          </template>
        </BaseField>
        <BaseField v-if="isCash" label="Efectivo recibido" required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="receivedDisplay" inputmode="numeric" placeholder="$0" />
          </template>
        </BaseField>
        <div v-if="isCash && receivedNum > 0" class="change">
          <span>Cambio</span>
          <strong>{{ formatMoney(change) }}</strong>
        </div>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="!canConfirm"
        @click="confirm"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </ModalShell>

  <FeCustomerFiscalModal
    :open="fiscalModalOpen"
    :customer="feCustomer"
    @save="onSaveFiscal"
    @close="fiscalModalOpen = false"
  />
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.uvt-warn {
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.4;
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
  color: oklch(40% 0.1 70deg);
}
.change {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--amatista-50);
  border-radius: 10px;
  font-size: 14px;
  color: var(--warm-800);
}
.change strong {
  font-size: 17px;
  color: var(--amatista-700);
}
.doctypesel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.doctype {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  position: relative;
}
.doctype.on {
  background: var(--amatista-50);
  border: 1.5px solid var(--amatista-400);
  color: var(--amatista-700);
}
.doctype.off {
  background: var(--warm-100);
  border: 1.5px solid var(--warm-200);
  color: var(--warm-400);
  cursor: not-allowed;
}
.lock {
  margin-left: auto;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--warm-200);
  color: var(--warm-500);
  display: grid;
  place-items: center;
}
</style>
