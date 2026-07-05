<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Receipt } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import { useToast } from '@/composables/useToast'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import { feMoney } from '../../composables/feFormat'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { withholding, saveWithholding } = useFacturacionEnablement()
const toast = useToast()

const draft = reactive({ reteFuenteRate: '0', reteIvaRate: '0', reteIcaRate: '0' })
const saving = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.reteFuenteRate = String(withholding.value?.reteFuenteRate ?? 0)
    draft.reteIvaRate = String(withholding.value?.reteIvaRate ?? 0)
    draft.reteIcaRate = String(withholding.value?.reteIcaRate ?? 0)
  },
)

const example = 1_000_000
const exFuente = computed(() => (example * Number(draft.reteFuenteRate || 0)) / 100)
const exIva = computed(() => (example * 0.19 * Number(draft.reteIvaRate || 0)) / 100)
const exIca = computed(() => (example * Number(draft.reteIcaRate || 0)) / 100)

async function save() {
  saving.value = true
  try {
    await saveWithholding({
      reteFuenteRate: Number(draft.reteFuenteRate || 0),
      reteIvaRate: Number(draft.reteIvaRate || 0),
      reteIcaRate: Number(draft.reteIcaRate || 0),
    })
    toast.success('Retenciones guardadas', 'Tarifas actualizadas.')
    emit('close')
  } catch {
    toast.error('No se pudo guardar', 'Revisa las tarifas e intenta de nuevo.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Retenciones"
    subtitle="Tarifas para clientes agentes retenedores (opcional)"
    :icon="Receipt"
    accent="amatista"
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid">
        <BaseField label="ReteFuente (% sobre base)">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.reteFuenteRate" type="number" inputmode="decimal" />
          </template>
        </BaseField>
        <BaseField label="ReteIVA (% sobre IVA)">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.reteIvaRate" type="number" inputmode="decimal" />
          </template>
        </BaseField>
        <BaseField label="ReteICA (% sobre base)">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.reteIcaRate" type="number" inputmode="decimal" />
          </template>
        </BaseField>
      </div>
      <div class="example">
        <div class="example-title">Ejemplo sobre base {{ feMoney(example) }} (IVA 19%)</div>
        <div class="example-rows">
          <div><span>ReteFuente</span><strong>−{{ feMoney(exFuente) }}</strong></div>
          <div><span>ReteIVA</span><strong>−{{ feMoney(exIva) }}</strong></div>
          <div><span>ReteICA</span><strong>−{{ feMoney(exIca) }}</strong></div>
        </div>
      </div>
      <p class="help">
        Se aplican solo a clientes marcados como <strong>agente retenedor</strong> en su ficha.
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="saving" @click="save">
        {{ saving ? 'Guardando…' : 'Guardar retenciones' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}
.example {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--warm-100);
}
.example-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--warm-700);
  margin-bottom: 8px;
}
.example-rows {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
}
.example-rows > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.example-rows span {
  font-size: 11px;
  color: var(--warm-500);
}
.example-rows strong {
  font-size: 13.5px;
  color: var(--warm-900);
  font-variant-numeric: tabular-nums;
}
.help {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--warm-600);
  border-left: 3px solid var(--amatista-300);
  padding-left: 10px;
  line-height: 1.5;
}
.btn-ghost {
  padding: 9px 16px;
  border-radius: 9px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary {
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
