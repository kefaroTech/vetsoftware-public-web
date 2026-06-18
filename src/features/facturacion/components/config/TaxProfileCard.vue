<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '../../composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import { companyTaxProfileApi } from '../../api/companyTaxProfile.api'
import { economicActivityApi } from '../../api/economicActivity.api'
import {
  COMPANY_DOCTYPE_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type CompanyTaxProfileResponse,
  type EconomicActivity,
  type TaxRegime,
} from '../../types/facturacion'

const toast = useToast()
const { can } = useFacturacionAccess()
const canManage = can(PERMISSIONS.COMPANY_TAX_PROFILE_MANAGE)

// Catálogo de responsabilidades RUT (no hay endpoint; lista de uso común, igual que el diseño).
const RESPONSABILITIES = ['O-13', 'O-15', 'O-23', 'R-99-PN', 'O-47']

const existing = ref<CompanyTaxProfileResponse | null>(null)
const activities = ref<EconomicActivity[]>([])
const loading = ref(false)
const busy = ref(false)
const submitted = ref(false)

const form = reactive({
  documentType: 'NIT' as CompanyDocumentType,
  companyDocumentId: '',
  legalName: '',
  taxRegime: 'RESPONSABLE_IVA' as TaxRegime,
  fiscalEmail: '',
  commercialName: '',
  economicActivityId: '' as string,
  responsibilities: [] as string[],
})

const DOCTYPE_OPTIONS = (Object.entries(COMPANY_DOCTYPE_LABEL) as [CompanyDocumentType, string][]).map(
  ([value, label]) => ({ value, label }),
)
const REGIME_OPTIONS = (Object.entries(TAX_REGIME_LABEL) as [TaxRegime, string][]).map(
  ([value, label]) => ({ value, label }),
)
const activityOptions = computed(() =>
  activities.value.map((a) => ({ value: String(a.id), label: `${a.code} · ${a.name}` })),
)

onMounted(async () => {
  loading.value = true
  try {
    const [cfg, acts] = await Promise.all([companyTaxProfileApi.find(), economicActivityApi.listAll()])
    activities.value = acts
    existing.value = cfg
    if (cfg) {
      form.documentType = cfg.companyDocumentType
      form.companyDocumentId = cfg.companyDocumentId
      form.legalName = cfg.legalName
      form.taxRegime = cfg.taxRegime
      form.fiscalEmail = cfg.fiscalEmail
      form.commercialName = cfg.commercialName ?? ''
      form.economicActivityId = cfg.economicActivity ? String(cfg.economicActivity.id) : ''
      form.responsibilities = [...cfg.responsibilities]
    }
  } catch (e) {
    toast.error('No se pudo cargar el perfil fiscal', getProblemDetailMessage(e))
  } finally {
    loading.value = false
  }
})

function toggleResp(code: string) {
  const i = form.responsibilities.indexOf(code)
  if (i >= 0) form.responsibilities.splice(i, 1)
  else form.responsibilities.push(code)
}

const errors = computed(() => ({
  companyDocumentId: form.companyDocumentId.trim() ? null : 'Requerido',
  legalName: form.legalName.trim() ? null : 'Requerido',
  fiscalEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.fiscalEmail) ? null : 'Correo inválido',
  // Opcional: solo se materializan en el XML de la factura electrónica; una venta sin FE no las usa.
  responsibilities: null as string | null,
}))
function err(k: keyof typeof errors.value): string | undefined {
  return submitted.value && errors.value[k] ? errors.value[k]! : undefined
}

async function save() {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) {
    toast.warn('Revisa los campos', 'Hay datos obligatorios sin completar.')
    return
  }
  busy.value = true
  try {
    const payload = {
      documentType: form.documentType,
      companyDocumentId: form.companyDocumentId.trim(),
      legalName: form.legalName.trim(),
      taxRegime: form.taxRegime,
      fiscalEmail: form.fiscalEmail.trim(),
      commercialName: form.commercialName.trim() || null,
      economicActivityId: form.economicActivityId ? Number(form.economicActivityId) : null,
      responsibilities: form.responsibilities,
    }
    const saved = existing.value
      ? await companyTaxProfileApi.update(payload)
      : await companyTaxProfileApi.create(payload)
    existing.value = saved
    toast.success('Perfil fiscal guardado', 'Los datos del emisor se actualizaron.')
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
        <h2>Perfil fiscal de la empresa</h2>
        <p>Identidad fiscal del emisor ante la DIAN.</p>
      </div>
    </header>

    <div v-if="loading" class="muted">Cargando…</div>
    <template v-else>
      <div class="grid2">
        <BaseField label="Tipo de documento" required>
          <template #default="{ id }"><BaseSelect :id="id" v-model="form.documentType" :options="DOCTYPE_OPTIONS" :disabled="!canManage" /></template>
        </BaseField>
        <BaseField label="Número de documento" required :error="err('companyDocumentId')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.companyDocumentId" :disabled="!canManage" :invalid="!!err('companyDocumentId')" /></template>
        </BaseField>
        <BaseField label="Razón social" required :error="err('legalName')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.legalName" :disabled="!canManage" :invalid="!!err('legalName')" /></template>
        </BaseField>
        <BaseField label="Régimen tributario" required>
          <template #default="{ id }"><BaseSelect :id="id" v-model="form.taxRegime" :options="REGIME_OPTIONS" :disabled="!canManage" /></template>
        </BaseField>
        <BaseField label="Correo fiscal" required :error="err('fiscalEmail')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.fiscalEmail" type="email" :disabled="!canManage" :invalid="!!err('fiscalEmail')" /></template>
        </BaseField>
        <BaseField label="Nombre comercial">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.commercialName" :disabled="!canManage" /></template>
        </BaseField>
        <BaseField label="Actividad económica (CIIU)">
          <template #default="{ id }"><BaseSelect :id="id" v-model="form.economicActivityId" :options="activityOptions" :disabled="!canManage" placeholder="Selecciona una actividad" /></template>
        </BaseField>
      </div>

      <BaseField label="Responsabilidades RUT" hint="Opcional · requeridas solo para facturación electrónica" :error="err('responsibilities')">
        <template #default>
          <div class="chips">
            <button
              v-for="code in RESPONSABILITIES"
              :key="code"
              type="button"
              class="chip"
              :class="{ on: form.responsibilities.includes(code) }"
              :disabled="!canManage"
              @click="toggleResp(code)"
            >{{ code }}</button>
          </div>
        </template>
      </BaseField>

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
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  font-family: inherit; font-size: 12.5px; padding: 6px 12px; border-radius: 999px; cursor: pointer;
  background: var(--warm-50); border: 1px solid var(--warm-200); color: var(--warm-700);
}
.chip.on { background: var(--amatista-50); border-color: var(--amatista-500); color: var(--amatista-700); font-weight: 600; }
.chip:disabled { cursor: not-allowed; opacity: 0.7; }
.actions { margin-top: 18px; display: flex; justify-content: flex-end; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 9px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
