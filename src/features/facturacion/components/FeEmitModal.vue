<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Receipt, Check, User, History } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useToast } from '@/composables/useToast'
import { openAccountApi } from '@/features/cuentas/api/openAccount.api'
import type { OpenAccountResponse } from '@/features/cuentas/types/cuentas'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import { feMoney } from '../composables/feFormat'
import type { ElectronicDocumentResponse, ElectronicDocumentType } from '../types/facturacion'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ emitted: [doc: ElectronicDocumentResponse]; close: [] }>()

const { emit: emitDocument } = useFacturacionDocs()
const toast = useToast()

const accounts = ref<OpenAccountResponse[]>([])
const loadingAccounts = ref(false)
const selected = ref<OpenAccountResponse | null>(null)
const docType = ref<ElectronicDocumentType>('FE_VENTA')
const finalConsumer = ref(false)
const submitting = ref(false)

const docTypeOptions = [
  { value: 'FE_VENTA', label: 'Factura electrónica' },
  { value: 'DOC_EQUIV_POS', label: 'Documento POS' },
]

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    selected.value = null
    docType.value = 'FE_VENTA'
    finalConsumer.value = false
    loadingAccounts.value = true
    try {
      // Facturables: cuentas cerradas con saldo 0. El estado ya lo filtra el servidor (BE-06);
      // el saldo se comprueba aquí porque no hay filtro para él. Sigue acotado a una página:
      // es un selector de un modal, no un listado.
      const { content } = await openAccountApi.search({
        statuses: ['CLOSE'],
        enabled: true,
        page: 0,
        pageSize: 200,
      })
      accounts.value = content.filter((a) => a.outstandingAmount === 0)
    } catch {
      accounts.value = []
      toast.error('No se pudieron cargar las cuentas', 'Intenta de nuevo más tarde.')
    } finally {
      loadingAccounts.value = false
    }
  },
)

const canEmit = computed(() => !!selected.value && !submitting.value)

async function submit() {
  if (!selected.value) return
  submitting.value = true
  try {
    const doc = await emitDocument({
      openAccountId: selected.value.id,
      documentType: docType.value,
      finalConsumer: finalConsumer.value,
    })
    toast.success('Documento emitido', 'Enviado a la DIAN · validando…')
    emit('emitted', doc)
  } catch {
    toast.error('No se pudo emitir', 'Verifica la configuración fiscal y el estado de la cuenta.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Emisión manual"
    subtitle="Emitir desde una cuenta cerrada (saldo 0)"
    :icon="Receipt"
    accent="amatista"
    :width="620"
    @close="emit('close')"
  >
    <template #body>
      <div class="fieldlabel">Cuenta cerrada a facturar</div>
      <div v-if="loadingAccounts" class="acc-empty">Cargando cuentas…</div>
      <div v-else-if="accounts.length === 0" class="acc-empty">
        No hay cuentas cerradas pendientes de facturar.
      </div>
      <div v-else class="ds-stack ds-stack--8">
        <button
          v-for="a in accounts"
          :key="a.id"
          type="button"
          class="accrow ds-flex-row ds-flex-row--12"
          :class="{ on: selected?.id === a.id }"
          @click="selected = a"
        >
          <div
            class="acc-check"
            :class="selected?.id === a.id ? 'ds-tone--accent-solid' : 'acc-check-off'"
          >
            <Check v-if="selected?.id === a.id" :size="13" :stroke-width="2.6" />
          </div>
          <div class="ds-flex-fill">
            <div class="acc-name ds-strong">{{ a.owner.name }}</div>
            <div class="ds-meta">
              Cuenta #{{ a.id
              }}<template v-if="a.closedAt"> · cerrada {{ a.closedAt.slice(0, 10) }}</template>
            </div>
          </div>
          <span class="acc-total ds-strong">{{ feMoney(a.totalAmount) }}</span>
        </button>
      </div>

      <div class="grid">
        <BaseField label="Tipo de documento" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="docType" :options="docTypeOptions" />
          </template>
        </BaseField>
        <div class="toggle-wrap">
          <button
            type="button"
            class="toggle"
            :class="{ on: finalConsumer }"
            @click="finalConsumer = !finalConsumer"
          >
            <span
              class="toggle-box"
              :class="finalConsumer ? 'ds-tone--accent-solid' : 'toggle-box-off'"
            >
              <Check v-if="finalConsumer" :size="12" :stroke-width="2.6" />
            </span>
            Consumidor final
          </button>
        </div>
      </div>

      <div v-if="!finalConsumer && selected" class="clientwarn">
        <User :size="14" :stroke-width="1.8" />
        <span>
          Se facturará a <strong>{{ selected.owner.name }}</strong
          >. Verifica que tenga documento, tipo y ciudad completos en su ficha fiscal.
        </span>
      </div>
      <div class="asyncnote ds-meta">
        <History :size="13" :stroke-width="1.8" />
        La validación DIAN es asíncrona: el documento nace <strong>Validando…</strong> y obtiene su
        CUFE en unos segundos.
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--strong"
        :disabled="!canEmit"
        @click="submit"
      >
        {{ submitting ? 'Emitiendo…' : 'Emitir' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Layout desde primitives.css: .ds-stack--8 (lista de cuentas),
   .ds-flex-row--12 (fila), .ds-flex-fill, .ds-strong y .ds-meta (tipografía). */
.fieldlabel {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 8px;
}

.acc-empty {
  padding: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-500);
  background: var(--warm-100);
  border-radius: 10px;
}

.accrow {
  padding: 11px 14px;
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  background: var(--warm-50);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.14s,
    background 0.14s;
}

.accrow:hover {
  border-color: var(--amatista-300);
}

.accrow.on {
  border-color: var(--amatista-600);
  background: var(--amatista-50);
}

/* Las dos casillas de este modal reciben su tono desde el template
   (`.ds-tone--accent-solid` marcadas, `*-off` en reposo). Con `background` o
   `border-color` en la regla base, el `[data-v-…]` del scope las subiría a
   (0,2,0) y la primitiva (0,1,0) nunca ganaría. */
.acc-check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border-width: 1px;
  border-style: solid;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
}

.acc-check-off {
  border-color: var(--warm-300);
}

.acc-name {
  font-size: 13.5px;
}

.acc-total {
  font-variant-numeric: tabular-nums;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px 22px;
  margin-top: 18px;
}

.toggle-wrap {
  display: flex;
  align-items: flex-end;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  font-size: 13px;
  color: var(--warm-800);
  cursor: pointer;
}

.toggle.on {
  border-color: var(--amatista-600);
  background: var(--amatista-50);
  color: var(--amatista-800, var(--amatista-700));
}

.toggle-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border-width: 1px;
  border-style: solid;
  display: grid;
  place-items: center;
  color: #fff;
}

.toggle-box-off {
  border-color: var(--warm-300);
}

.clientwarn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 11px 14px;
  border-radius: 10px;
  background: oklch(97% 0.03 80deg);
  border: 1px solid oklch(88% 0.06 80deg);
  font-size: 12.5px;
  color: oklch(40% 0.1 70deg);
  line-height: 1.45;
}

.asyncnote {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  line-height: 1.45;
}
</style>
