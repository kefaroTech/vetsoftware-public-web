<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { User, Check } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useToast } from '@/composables/useToast'
import { economicActivityApi } from '../../api/economicActivity.api'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import { calcVerificationDigit, RESPONSIBILITY_OPTIONS } from '../../composables/feFormat'
import {
  COMPANY_DOCTYPE_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type EconomicActivity,
  type SaveCompanyTaxProfileRequest,
  type TaxRegime,
} from '../../types/facturacion'
import SectionHead from './SectionHead.vue'
import WizardFooter from './WizardFooter.vue'
import { scrollToFirstError } from '@/composables/scrollToError'

const emit = defineEmits<{ back: []; next: [] }>()

const { profile, saveProfile } = useFacturacionEnablement()
const toast = useToast()

const draft = reactive({
  documentType: (profile.value?.companyDocumentType ?? 'NIT') as CompanyDocumentType,
  companyDocumentId: profile.value?.companyDocumentId ?? '',
  legalName: profile.value?.legalName ?? '',
  commercialName: profile.value?.commercialName ?? '',
  fiscalEmail: profile.value?.fiscalEmail ?? '',
  taxRegime: (profile.value?.taxRegime ?? 'RESPONSABLE_IVA') as TaxRegime,
  economicActivityId: profile.value?.economicActivity?.id ?? null,
  responsibilities: [...(profile.value?.responsibilities ?? [])],
})

const submitted = ref(false)
const saving = ref(false)

const activities = ref<EconomicActivity[]>([])
const activityQuery = ref('')

onMounted(async () => {
  try {
    activities.value = await economicActivityApi.listAll()
  } catch {
    // El catálogo es opcional para guardar; si falla, el campo queda como texto libre de búsqueda.
  }
})

const isNit = computed(() => draft.documentType === 'NIT')
const verificationDigit = computed(() =>
  isNit.value ? calcVerificationDigit(draft.companyDocumentId) : '',
)
const selectedActivity = computed(() =>
  activities.value.find((a) => a.id === draft.economicActivityId),
)
const filteredActivities = computed(() => {
  const q = activityQuery.value.trim().toLowerCase()
  if (!q) return activities.value.slice(0, 8)
  return activities.value.filter((a) => `${a.code} ${a.name}`.toLowerCase().includes(q)).slice(0, 8)
})

const docTypeOptions = (Object.keys(COMPANY_DOCTYPE_LABEL) as CompanyDocumentType[]).map((k) => ({
  value: k,
  label: COMPANY_DOCTYPE_LABEL[k],
}))
const regimeOptions = (Object.keys(TAX_REGIME_LABEL) as TaxRegime[]).map((k) => ({
  value: k,
  label: TAX_REGIME_LABEL[k],
}))

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.fiscalEmail))
const errors = computed(() => ({
  companyDocumentId: draft.companyDocumentId.trim() ? null : 'Requerido',
  legalName: draft.legalName.trim().length >= 2 ? null : 'Requerido',
  fiscalEmail: !draft.fiscalEmail.trim()
    ? 'Requerido'
    : emailValid.value
      ? null
      : 'Correo inválido',
  // Backend (Create/UpdateCompanyTaxProfileRequest): responsibilities es List sin @NotEmpty; el dominio
  // hace default a lista vacía y la tabla hija admite 0 filas → opcional (no se exige al menos una).
  responsibilities: null,
}))
const isValid = computed(() => Object.values(errors.value).every((e) => !e))

type ErrorKey = 'companyDocumentId' | 'legalName' | 'fiscalEmail' | 'responsibilities'
function err(field: ErrorKey): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}

function toggleResponsibility(code: string) {
  const idx = draft.responsibilities.indexOf(code)
  if (idx >= 0) draft.responsibilities.splice(idx, 1)
  else draft.responsibilities.push(code)
}

function pickActivity(a: EconomicActivity) {
  draft.economicActivityId = a.id
  activityQuery.value = ''
}

async function save() {
  submitted.value = true
  if (!isValid.value) {
    scrollToFirstError()
    return
  }
  saving.value = true
  try {
    const body: SaveCompanyTaxProfileRequest = {
      documentType: draft.documentType,
      companyDocumentId: draft.companyDocumentId.trim(),
      companyDocumentVerificationDigit: isNit.value ? verificationDigit.value : null,
      legalName: draft.legalName.trim(),
      taxRegime: draft.taxRegime,
      fiscalEmail: draft.fiscalEmail.trim(),
      commercialName: draft.commercialName.trim() || null,
      economicActivityId: draft.economicActivityId,
      responsibilities: draft.responsibilities,
    }
    await saveProfile(body)
    toast.success('Identidad fiscal guardada', draft.legalName.trim())
    emit('next')
  } catch {
    toast.error('No se pudo guardar', 'Revisa los datos fiscales e intenta de nuevo.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="formcol">
    <SectionHead
      :icon="User"
      title="Identidad fiscal de la empresa"
      sub="Datos del emisor tal como están registrados en el RUT. Aparecen en cada documento."
    />
    <div class="ds-card">
      <div class="grid">
        <BaseField label="Tipo de documento" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.documentType" :options="docTypeOptions" />
          </template>
        </BaseField>
        <div class="doc-row">
          <BaseField label="Número de documento" required :error="err('companyDocumentId')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.companyDocumentId"
                placeholder="901456789"
                inputmode="numeric"
                :invalid="!!err('companyDocumentId')"
                @update:model-value="draft.companyDocumentId = String($event).replace(/\D/g, '')"
              />
            </template>
          </BaseField>
          <div v-if="isNit" class="dv">
            <div class="dv-lbl">DV</div>
            <div class="dv-val">{{ verificationDigit || '–' }}</div>
          </div>
        </div>
        <p v-if="isNit" class="help span-2">
          El dígito de verificación se calcula automáticamente.
        </p>
        <div class="span-2">
          <BaseField label="Razón social" required :error="err('legalName')">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="draft.legalName" :invalid="!!err('legalName')" />
            </template>
          </BaseField>
        </div>
        <BaseField label="Nombre comercial">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.commercialName" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Correo fiscal (DIAN)" required :error="err('fiscalEmail')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.fiscalEmail"
              type="email"
              inputmode="email"
              :invalid="!!err('fiscalEmail')"
            />
          </template>
        </BaseField>
        <BaseField label="Régimen de IVA" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxRegime" :options="regimeOptions" />
          </template>
        </BaseField>
        <div class="span-2 actpick">
          <BaseField label="Actividad económica (CIIU)">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                :model-value="
                  selectedActivity
                    ? `${selectedActivity.code} · ${selectedActivity.name}`
                    : activityQuery
                "
                placeholder="Busca por código o descripción…"
                @update:model-value="
                  (v) => {
                    draft.economicActivityId = null
                    activityQuery = String(v)
                  }
                "
              />
            </template>
          </BaseField>
          <div v-if="activityQuery && !selectedActivity" class="actlist">
            <button
              v-for="a in filteredActivities"
              :key="a.id"
              type="button"
              class="actrow"
              @click="pickActivity(a)"
            >
              <strong>{{ a.code }}</strong> {{ a.name }}
            </button>
            <div v-if="filteredActivities.length === 0" class="actrow empty">Sin resultados</div>
          </div>
        </div>
      </div>

      <div class="resp">
        <div class="resp-label">Responsabilidades fiscales (RUT)</div>
        <p class="help" style="margin: 4px 0 10px">Selecciona las que apliquen según tu RUT.</p>
        <div class="resplist">
          <button
            v-for="opt in RESPONSIBILITY_OPTIONS"
            :key="opt.code"
            type="button"
            class="respitem"
            :class="{ on: draft.responsibilities.includes(opt.code) }"
            @click="toggleResponsibility(opt.code)"
          >
            <span class="respbox">
              <Check
                v-if="draft.responsibilities.includes(opt.code)"
                :size="11"
                :stroke-width="2.6"
              />
            </span>
            <span
              ><strong>{{ opt.code }}</strong> · {{ opt.description }}</span
            >
          </button>
        </div>
        <p v-if="err('responsibilities')" class="resp-err">{{ err('responsibilities') }}</p>
      </div>
    </div>

    <WizardFooter
      show-back
      :next-disabled="saving"
      :next-label="saving ? 'Guardando…' : 'Guardar y continuar'"
      draft-note="Los datos se guardan al continuar"
      @back="emit('back')"
      @next="save"
    />
  </div>
</template>

<style scoped>
.formcol {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 22px;
}

@media (width <= 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.span-2 {
  grid-column: 1 / -1;
}

.doc-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.dv {
  text-align: center;
  padding: 0 4px 4px;
}

.dv-lbl {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
}

.dv-val {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--amatista-700);
  background: var(--amatista-50);
  border-radius: 8px;
  padding: 6px 12px;
  min-width: 40px;
}

.help {
  margin: 0;
  font-size: 11.5px;
  color: var(--warm-500);
}

.actpick {
  position: relative;
}

.actlist {
  position: absolute;
  z-index: 5;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  box-shadow: 0 12px 30px -10px rgb(20 15 30 / 25%);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

.actrow {
  display: block;
  width: 100%;
  text-align: left;
  padding: 9px 14px;
  font-size: 12.5px;
  color: var(--warm-800);
  background: transparent;
  border: none;
  cursor: pointer;
}

.actrow:hover {
  background: var(--amatista-50);
}

.actrow.empty {
  color: var(--warm-500);
  cursor: default;
}

.resp {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--warm-200);
}

.resp-label {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
}

.req {
  color: var(--danger-500);
}

.resplist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.respitem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  background: var(--warm-50);
  font-size: 13px;
  color: var(--warm-800);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.14s,
    background 0.14s;
}

.respitem:hover {
  border-color: var(--amatista-300);
}

.respitem.on {
  border-color: var(--amatista-600);
  background: linear-gradient(135deg, var(--amatista-50), var(--warm-50));
}

.respbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid var(--warm-300);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
}

.respitem.on .respbox {
  background: var(--amatista-600);
  border-color: var(--amatista-600);
}

.resp-err {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--danger-500);
}

/* Override mínimo sobre `.ds-card`. */
.ds-card {
  padding: clamp(20px, 2vw, 28px);
}
</style>
