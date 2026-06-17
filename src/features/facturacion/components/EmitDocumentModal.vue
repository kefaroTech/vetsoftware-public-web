<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Receipt, User } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { openAccountApi } from '@/features/cuentas/api/openAccount.api'
import type { OpenAccountResponse } from '@/features/cuentas/types/cuentas'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import type { ElectronicDocumentType } from '../types/facturacion'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; emitted: [id: number] }>()

const docs = useFacturacionDocs()
const toast = useToast()

const accounts = ref<OpenAccountResponse[]>([])
const loadingAccounts = ref(false)
const selectedId = ref<number | null>(null)
const documentType = ref<ElectronicDocumentType>('FE_VENTA')
const finalConsumer = ref(false)
const busy = ref(false)

const DOC_TYPE_OPTIONS = [
  { value: 'FE_VENTA', label: 'Factura electrónica' },
  { value: 'DOC_EQUIV_POS', label: 'Documento POS' },
]

const selected = computed(() => accounts.value.find((a) => a.id === selectedId.value) ?? null)
const canEmit = computed(() => !busy.value && selectedId.value != null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    selectedId.value = null
    documentType.value = 'FE_VENTA'
    finalConsumer.value = false
    busy.value = false
    await loadClosedAccounts()
  },
)

// Gap backend: no hay endpoint de "cuentas cerradas facturables sin documento".
// Aproximamos listando las cuentas y filtrando status === 'CLOSE' (el backend es
// idempotente por openAccountId, así que re-emitir no duplica el documento).
async function loadClosedAccounts(): Promise<void> {
  loadingAccounts.value = true
  try {
    const all = await openAccountApi.listAll()
    accounts.value = all.filter((a) => a.enabled && a.status === 'CLOSE')
  } catch (e) {
    toast.error('No se pudieron cargar las cuentas', getProblemDetailMessage(e))
  } finally {
    loadingAccounts.value = false
  }
}

async function confirm(): Promise<void> {
  if (!selected.value || busy.value) return
  busy.value = true
  try {
    const created = await docs.emit({
      openAccountId: selected.value.id,
      documentType: documentType.value,
      finalConsumer: finalConsumer.value,
    })
    toast.success('Documento emitido', 'Enviado a la DIAN · validando…')
    emit('emitted', created.id)
    emit('close')
  } catch (e) {
    toast.error('No se pudo emitir', getProblemDetailMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Emisión manual"
    subtitle="Re-emitir desde una cuenta cerrada (saldo 0)"
    :icon="Receipt"
    :width="620"
    @close="emit('close')"
  >
    <template #body>
      <div class="body">
        <div>
          <div class="lab">Cuenta cerrada a facturar</div>
          <p v-if="loadingAccounts" class="muted">Cargando cuentas…</p>
          <p v-else-if="accounts.length === 0" class="muted">
            No hay cuentas cerradas disponibles.
          </p>
          <div v-else class="acclist">
            <button
              v-for="a in accounts"
              :key="a.id"
              type="button"
              class="accrow"
              :class="{ on: selectedId === a.id }"
              @click="selectedId = a.id"
            >
              <span class="check"><Check v-if="selectedId === a.id" :size="13" :stroke-width="2.6" /></span>
              <span class="acc-main">
                <span class="acc-name">{{ a.owner.name }}</span>
                <span class="acc-meta">Cerrada {{ a.closedAt?.slice(0, 10) ?? '—' }}</span>
              </span>
              <span class="acc-total">{{ formatMoney(a.totalAmount) }}</span>
            </button>
          </div>
        </div>

        <div class="grid2">
          <BaseField label="Tipo de documento" required>
            <template #default="{ id }">
              <BaseSelect :id="id" v-model="documentType" :options="DOC_TYPE_OPTIONS" />
            </template>
          </BaseField>
          <div class="toggle-wrap">
            <button
              type="button"
              class="toggle"
              :class="{ on: finalConsumer }"
              @click="finalConsumer = !finalConsumer"
            >
              <span class="toggle-box"><Check v-if="finalConsumer" :size="12" :stroke-width="2.6" /></span>
              Consumidor final
            </button>
          </div>
        </div>

        <div v-if="!finalConsumer && selected" class="clientwarn">
          <User :size="14" :stroke-width="1.8" />
          <span>Se facturará a <strong>{{ selected.owner.name }}</strong>. Verifica que tenga documento, tipo y ciudad completos en su ficha fiscal.</span>
        </div>
        <p class="asyncnote">
          La validación DIAN es asíncrona: el documento nace <strong>Validando…</strong> y obtiene su CUFE en unos segundos.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!canEmit" @click="confirm">
        {{ busy ? 'Emitiendo…' : 'Emitir' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: 16px; }
.lab { font-size: 12.5px; font-weight: 600; color: var(--warm-700); margin-bottom: 8px; }
.muted { font-size: 13px; color: var(--warm-500); margin: 0; }
.acclist { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
.accrow {
  display: flex; align-items: center; gap: 10px; text-align: left; font-family: inherit; cursor: pointer;
  padding: 11px 13px; border-radius: 11px; background: var(--warm-50); border: 1px solid var(--warm-200);
  transition: border-color 0.12s, background 0.12s;
}
.accrow:hover { border-color: var(--amatista-300); }
.accrow.on { border-color: var(--amatista-500); background: var(--amatista-50); }
.check {
  width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; display: grid; place-items: center;
  border: 1px solid var(--warm-300); background: var(--warm-50); color: white;
}
.accrow.on .check { background: var(--amatista-600); border-color: var(--amatista-600); }
.acc-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.acc-name { font-size: 13px; font-weight: 600; color: var(--warm-900); }
.acc-meta { font-size: 11.5px; color: var(--warm-500); }
.acc-total { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--warm-900); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
.toggle-wrap { display: flex; align-items: flex-end; }
.toggle {
  display: inline-flex; align-items: center; gap: 9px; font-family: inherit; font-size: 13px; cursor: pointer;
  padding: 10px 14px; border-radius: 9px; background: var(--warm-50); border: 1px solid var(--warm-200);
  color: var(--warm-800);
}
.toggle.on { border-color: var(--amatista-500); background: var(--amatista-50); color: var(--amatista-700); }
.toggle-box {
  width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center;
  border: 1px solid var(--warm-300); background: white; color: white;
}
.toggle.on .toggle-box { background: var(--amatista-600); border-color: var(--amatista-600); }
.clientwarn {
  display: flex; align-items: flex-start; gap: 8px; padding: 11px 13px; border-radius: 10px;
  background: oklch(95% 0.06 80); border: 1px solid oklch(88% 0.09 80); color: oklch(42% 0.10 70);
  font-size: 12.5px; line-height: 1.4;
}
.asyncnote { margin: 0; font-size: 12px; color: var(--warm-500); line-height: 1.4; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
