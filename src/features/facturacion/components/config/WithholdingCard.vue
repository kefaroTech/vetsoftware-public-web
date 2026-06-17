<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '../../composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import { withholdingConfigApi } from '../../api/withholdingConfig.api'

const toast = useToast()
const { can } = useFacturacionAccess()
const canManage = can(PERMISSIONS.WITHHOLDING_CONFIG_MANAGE)

const reteFuente = ref('')
const reteIva = ref('')
const reteIca = ref('')
const loading = ref(false)
const busy = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const cfg = await withholdingConfigApi.find()
    reteFuente.value = cfg ? String(cfg.reteFuenteRate) : '0'
    reteIva.value = cfg ? String(cfg.reteIvaRate) : '0'
    reteIca.value = cfg ? String(cfg.reteIcaRate) : '0'
  } catch (e) {
    toast.error('No se pudieron cargar las retenciones', getProblemDetailMessage(e))
  } finally {
    loading.value = false
  }
}

function num(v: string): number {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

async function save() {
  if (busy.value) return
  busy.value = true
  try {
    await withholdingConfigApi.save({
      reteFuenteRate: num(reteFuente.value),
      reteIvaRate: num(reteIva.value),
      reteIcaRate: num(reteIca.value),
    })
    toast.success('Retenciones guardadas', 'Las tarifas se actualizaron.')
  } catch (e) {
    toast.error('No se pudo guardar', getProblemDetailMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <div>
        <h2>Retenciones</h2>
        <p>Tarifas que se aplican cuando el cliente es agente retenedor.</p>
      </div>
    </header>
    <div v-if="loading" class="muted">Cargando…</div>
    <template v-else>
      <div class="grid3">
        <BaseField label="ReteFuente %">
          <template #default="{ id }"><BaseInput :id="id" v-model="reteFuente" :disabled="!canManage" inputmode="decimal" suffix="%" /></template>
        </BaseField>
        <BaseField label="ReteIVA %">
          <template #default="{ id }"><BaseInput :id="id" v-model="reteIva" :disabled="!canManage" inputmode="decimal" suffix="%" /></template>
        </BaseField>
        <BaseField label="ReteICA %">
          <template #default="{ id }"><BaseInput :id="id" v-model="reteIca" :disabled="!canManage" inputmode="decimal" suffix="%" /></template>
        </BaseField>
      </div>
      <div v-if="canManage" class="actions">
        <button type="button" class="btn-primary" :disabled="busy" @click="save">{{ busy ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.card { background: white; border: 1px solid var(--warm-200); border-radius: 14px; padding: 22px 24px; }
.card-head { margin-bottom: 16px; }
.card-head h2 { margin: 0; font-family: var(--font-serif); font-size: 20px; color: var(--warm-900); font-weight: 400; }
.card-head p { margin: 4px 0 0; font-size: 12.5px; color: var(--warm-500); }
.muted { font-size: 13px; color: var(--warm-500); }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 640px) { .grid3 { grid-template-columns: 1fr; } }
.actions { margin-top: 18px; display: flex; justify-content: flex-end; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 9px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
