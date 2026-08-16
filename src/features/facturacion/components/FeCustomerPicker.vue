<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Search, User, Plus, ChevronRight, ArrowLeft, X, Check } from 'lucide-vue-next'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/features/auth/composables/useAuth'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useGeoCascade } from '@/features/dashboard/views/consulta/nueva/composables/useGeoCascade'
import {
  ownerApi,
  type OwnerResponse,
  type CreateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { calcVerificationDigit } from '../composables/feFormat'
import { OWNER_DOCTYPE_LABEL, type OwnerDocumentType } from '../composables/feFiscalChecklist'
import { TAX_REGIME_LABEL, type PersonType, type TaxRegime } from '../types/facturacion'

// mode: 'basic'  → POS ≤ 5 UVT, datos fiscales opcionales.
//       'fiscal' → FE > 5 UVT, datos fiscales requeridos.
const props = defineProps<{ mode: 'basic' | 'fiscal' }>()
const emit = defineEmits<{ pick: [owner: OwnerResponse] }>()

const fiscal = computed(() => props.mode === 'fiscal')
const toast = useToast()
const { companyId } = useAuth()

const view = ref<'search' | 'create'>('search')

// ── Búsqueda de cliente existente ─────────────────────────────────────────────
const query = ref('')
const results = ref<OwnerResponse[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (timer) clearTimeout(timer)
  const term = q.trim()
  if (term.length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    try {
      // BE-06: la busqueda llega paginada; este picker muestra solo la primera pagina.
      results.value = (await ownerApi.search(term)).content
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 300)
})

function goCreate() {
  view.value = 'create'
}

// ── Creación in-situ ──────────────────────────────────────────────────────────
const draft = reactive({
  name: '',
  documentId: '',
  phone: '',
  email: '',
  address: '',
  countryId: '',
  stateId: '',
  cityId: '',
  documentType: 'CEDULA_CIUDADANIA' as OwnerDocumentType,
  personType: 'NATURAL' as PersonType,
  taxRegime: 'NO_RESPONSABLE_IVA' as TaxRegime,
  withholdingAgent: false,
})

const countryRef = computed({ get: () => draft.countryId, set: (v) => (draft.countryId = v) })
const stateRef = computed({ get: () => draft.stateId, set: (v) => (draft.stateId = v) })
const {
  countryOptions,
  stateOptions,
  cityOptions,
  loadingStates,
  loadingCities,
  error: geoError,
} = useGeoCascade(countryRef, stateRef)

watch(
  () => draft.countryId,
  () => {
    draft.stateId = ''
    draft.cityId = ''
  },
)
watch(
  () => draft.stateId,
  () => {
    draft.cityId = ''
  },
)

const isNit = computed(() => draft.documentType === 'NIT')
const isJuridica = computed(() => draft.personType === 'JURIDICA')
const dv = computed(() => (isNit.value ? calcVerificationDigit(draft.documentId) : ''))
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email))
// Teléfono: opcional (backend nullable), pero si se ingresa debe respetar el formato
// convencional (solo [+\d\s\-()], entre 7 y 15 dígitos). Se sanitiza en vivo.
const phoneDigits = (v: string) => (v.match(/\d/g) ?? []).length
const phoneValid = computed(() => {
  const v = draft.phone.trim()
  return /^[+\d\s\-()]+$/.test(v) && phoneDigits(v) >= 7 && phoneDigits(v) <= 15
})
const phoneModel = computed({
  get: () => draft.phone,
  set: (v: string) => (draft.phone = v.replace(/[^+\d\s\-()]/g, '')),
})

type FieldKey = 'name' | 'documentId' | 'phone' | 'email' | 'cityId' | 'legalName'
const touched = reactive<Record<FieldKey, boolean>>({
  name: false,
  documentId: false,
  phone: false,
  email: false,
  cityId: false,
  legalName: false,
})
const submitting = ref(false)
const submitError = ref<string | null>(null)

const errors = computed<Record<FieldKey, string | null>>(() => ({
  name: draft.name.trim() ? null : 'Requerido',
  documentId: draft.documentId.trim() ? null : 'Requerido',
  // Backend (CreateOwnerRequest): phone es @Size(max=30) sin @NotBlank y la columna es nullable → opcional.
  // Si el usuario lo ingresa, validamos el formato (solo [+\d\s\-()], 7–15 dígitos).
  phone: draft.phone.trim() && !phoneValid.value ? 'Teléfono inválido (7 a 15 dígitos)' : null,
  // Backend: email es @Email (solo formato) sin @NotBlank y la columna es nullable → opcional en ambos modos.
  // El email del adquiriente en la FE es un snapshot best-effort (columna nullable, el proveedor tolera null).
  email: draft.email.trim() && !emailValid.value ? 'Correo inválido' : null,
  cityId: draft.cityId ? null : 'Requerida',
  legalName: fiscal.value && isJuridica.value && !draft.name.trim() ? 'Requerido' : null,
}))
const isValid = computed(() => Object.values(errors.value).every((e) => !e))

function err(field: FieldKey): string | undefined {
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}
function markTouched(field: FieldKey) {
  touched[field] = true
}

const docTypeOptions = (Object.keys(OWNER_DOCTYPE_LABEL) as OwnerDocumentType[]).map((k) => ({
  value: k,
  label: OWNER_DOCTYPE_LABEL[k],
}))
const regimeOptions = (Object.keys(TAX_REGIME_LABEL) as TaxRegime[]).map((k) => ({
  value: k,
  label: TAX_REGIME_LABEL[k],
}))

async function submit() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  if (!isValid.value || submitting.value) return
  if (companyId.value == null) {
    submitError.value = 'No se pudo determinar la empresa. Vuelve a iniciar sesión.'
    return
  }
  submitting.value = true
  submitError.value = null
  const payload: CreateOwnerRequest = {
    name: draft.name.trim(),
    document: draft.documentId.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    cityId: Number(draft.cityId),
    documentType: draft.documentType,
    personType: draft.personType,
    verificationDigit: isNit.value ? dv.value : null,
    legalName: isJuridica.value ? draft.name.trim() : null,
    withholdingAgent: draft.withholdingAgent,
    taxRegime: draft.taxRegime,
  }
  try {
    const created = await ownerApi.create(payload)
    toast.success('Cliente creado', `${created.name} quedó registrado y seleccionado.`)
    emit('pick', created)
  } catch (e) {
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo crear el cliente. Revisa los datos e inténtalo de nuevo.',
    )
    toast.error('No se pudo crear el cliente', submitError.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- ══ Vista de búsqueda ══ -->
  <div v-if="view === 'search'" class="cpk">
    <div class="cpk-searchrow">
      <div class="search">
        <Search :size="14" :stroke-width="1.7" class="s-icon" />
        <input v-model="query" type="text" placeholder="Buscar por nombre o documento…" autofocus />
        <PawLoader v-if="searching" :size="20" :glow="false" :speed="900" class="s-loader" />
      </div>
      <button type="button" class="newbtn" @click="goCreate">
        <Plus :size="15" :stroke-width="2.2" /> Crear cliente
      </button>
    </div>

    <ul v-if="results.length" class="results">
      <li v-for="o in results" :key="o.id">
        <button type="button" class="result" @click="emit('pick', o)">
          <span class="avatar"><User :size="14" :stroke-width="1.7" /></span>
          <span class="info">
            <span class="name">{{ o.name }}</span>
            <span class="meta">{{ o.document }}{{ o.phone ? ' · ' + o.phone : '' }}</span>
          </span>
          <ChevronRight :size="15" :stroke-width="1.8" class="chev" />
        </button>
      </li>
    </ul>

    <div v-else-if="query.trim().length >= 2 && !searching" class="empty">
      <div class="empty-ic"><Search :size="20" :stroke-width="1.7" /></div>
      <div class="empty-t">Sin resultados para “{{ query.trim() }}”</div>
      <div class="empty-s">No encontramos un cliente con ese nombre o documento.</div>
      <button type="button" class="ds-btn ds-btn--primary ds-btn--strong" @click="goCreate">
        <Plus :size="14" :stroke-width="2.2" /> Crear cliente nuevo
      </button>
    </div>

    <p v-else class="hint">
      Escribe el nombre o documento del cliente. Si no existe, podrás crearlo.
    </p>
  </div>

  <!-- ══ Vista de creación ══ -->
  <div v-else class="cpk-create">
    <button type="button" class="back" @click="view = 'search'">
      <ArrowLeft :size="14" :stroke-width="1.9" /> Volver a la búsqueda
    </button>

    <div v-if="submitError" class="failbanner">
      <X :size="14" :stroke-width="2.2" /> {{ submitError }}
    </div>
    <div v-if="geoError" class="failbanner">
      <X :size="14" :stroke-width="2.2" /> {{ geoError }}
    </div>

    <div class="sectlabel">Datos básicos</div>
    <div class="grid">
      <BaseField label="Nombre" required :error="err('name')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.name"
            placeholder="Nombre y apellido o razón social"
            :invalid="!!err('name')"
            @blur="markTouched('name')"
          />
        </template>
      </BaseField>
      <BaseField label="Teléfono" :error="err('phone')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="phoneModel"
            placeholder="+57 …"
            inputmode="tel"
            :invalid="!!err('phone')"
            @blur="markTouched('phone')"
          />
        </template>
      </BaseField>

      <div class="doc-row" :class="{ nit: isNit }">
        <BaseField label="Número de documento" required :error="err('documentId')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.documentId"
              inputmode="numeric"
              :invalid="!!err('documentId')"
              @update:model-value="draft.documentId = String($event).replace(/\D/g, '')"
              @blur="markTouched('documentId')"
            />
          </template>
        </BaseField>
        <div v-if="isNit" class="dv">
          <div class="dv-lbl">DV</div>
          <div class="dv-val">{{ dv || '–' }}</div>
        </div>
      </div>

      <BaseField :label="fiscal ? 'Correo electrónico' : 'Correo (opcional)'" :error="err('email')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.email"
            type="email"
            inputmode="email"
            :invalid="!!err('email')"
            @blur="markTouched('email')"
          />
        </template>
      </BaseField>

      <div class="span-2 geo">
        <BaseField label="País" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.countryId"
              :options="countryOptions"
              placeholder="País"
            />
          </template>
        </BaseField>
        <BaseField label="Departamento" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.stateId"
              :options="stateOptions"
              :placeholder="loadingStates ? 'Cargando…' : 'Departamento'"
              :disabled="!draft.countryId"
            />
          </template>
        </BaseField>
        <BaseField label="Ciudad" required :error="err('cityId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.cityId"
              :options="cityOptions"
              :placeholder="loadingCities ? 'Cargando…' : 'Ciudad'"
              :disabled="!draft.stateId"
              :invalid="!!err('cityId')"
              @blur="markTouched('cityId')"
            />
          </template>
        </BaseField>
      </div>

      <div class="span-2">
        <BaseField label="Dirección (opcional)">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.address" />
          </template>
        </BaseField>
      </div>
    </div>

    <div class="sectlabel with-tag">
      Datos fiscales
      <span v-if="fiscal" class="reqtag">requeridos para factura electrónica</span>
      <span v-else class="opttag">opcionales</span>
    </div>
    <div class="fiscalbox" :class="{ req: fiscal }">
      <div class="grid">
        <BaseField label="Tipo de documento" :required="fiscal">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.documentType" :options="docTypeOptions" />
          </template>
        </BaseField>
        <div class="field">
          <div class="field-lab">Tipo de persona <span v-if="fiscal" class="req">*</span></div>
          <div class="segmented">
            <button
              type="button"
              class="seg"
              :class="{ on: draft.personType === 'NATURAL' }"
              @click="draft.personType = 'NATURAL'"
            >
              Natural
            </button>
            <button
              type="button"
              class="seg"
              :class="{ on: draft.personType === 'JURIDICA' }"
              @click="draft.personType = 'JURIDICA'"
            >
              Jurídica
            </button>
          </div>
        </div>
        <BaseField label="Régimen tributario" :required="fiscal">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxRegime" :options="regimeOptions" />
          </template>
        </BaseField>
      </div>
      <p v-if="isJuridica" class="juridica-hint">
        El <strong>Nombre</strong> se usará como razón social de la empresa.
      </p>
      <button
        type="button"
        class="agenttoggle"
        :class="{ on: draft.withholdingAgent }"
        @click="draft.withholdingAgent = !draft.withholdingAgent"
      >
        <span class="agentbox">
          <Check v-if="draft.withholdingAgent" :size="12" :stroke-width="2.6" />
        </span>
        <span>
          <strong>Agente retenedor</strong>
          <span class="agenthint">Si está activo se aplicarán retenciones.</span>
        </span>
      </button>
    </div>

    <div class="createfoot">
      <button type="button" class="ds-btn ds-btn--ghost" @click="view = 'search'">Cancelar</button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--strong"
        :disabled="!isValid || submitting"
        @click="submit"
      >
        {{ submitting ? 'Creando…' : 'Crear y seleccionar' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.cpk {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--font-sans);
}
.cpk-searchrow {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}
.s-icon {
  position: absolute;
  left: 12px;
  color: var(--warm-500);
}
.s-loader {
  position: absolute;
  right: 10px;
}

.search input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 10px 14px 10px 34px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}
.search input:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}

.newbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1.5px solid var(--amatista-300);
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.newbtn:hover {
  background: var(--amatista-100);
}

.results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  font-family: inherit;
}
.result:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  display: block;
}
.meta {
  font-size: 12px;
  color: var(--warm-500);
}
.chev {
  color: var(--warm-400);
  flex-shrink: 0;
}

.hint {
  font-size: 12.5px;
  color: var(--warm-500);
  text-align: center;
  padding: 18px;
  margin: 0;
}
.empty {
  text-align: center;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.empty-ic {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--warm-100);
  color: var(--warm-400);
  display: grid;
  place-items: center;
  margin-bottom: 6px;
}
.empty-t {
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-900);
}
.empty-s {
  font-size: 12px;
  color: var(--warm-500);
  margin-bottom: 12px;
}

/* ── Creación ── */
.cpk-create {
  display: flex;
  flex-direction: column;
  font-family: var(--font-sans);
}

.back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--amatista-700);
  cursor: pointer;
  padding: 0;
  margin-bottom: 14px;
}

.failbanner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 9px;
  background: var(--danger-100);
  border: 1px solid var(--danger-300);
  color: oklch(48% 0.16 25deg);
  font-size: 12.5px;
  margin-bottom: 12px;
}

.sectlabel {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--warm-600);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sectlabel.with-tag {
  margin-top: 16px;
}
.reqtag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--warning-50);
  color: oklch(45% 0.11 70deg);
}
.opttag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-500);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}
.span-2 {
  grid-column: 1 / -1;
}
.geo {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 20px;
}

@media (width <= 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .geo {
    grid-template-columns: 1fr;
  }
  .cpk-searchrow {
    flex-direction: column;
  }
  .newbtn {
    padding: 10px;
    justify-content: center;
  }
}
.doc-row.nit {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: start;
}
.dv {
  text-align: center;
  padding-bottom: 2px;
}
.dv-lbl {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-400);
}

.dv-val {
  width: 44px;
  height: 40px;
  border-radius: 8px;
  background: var(--warm-150, var(--warm-100));
  border: 1px solid var(--warm-200);
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 700;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  margin-top: 3px;
}

.fiscalbox {
  padding: 14px;
  border-radius: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}
.fiscalbox.req {
  background: oklch(98.5% 0.01 80deg);
  border-color: oklch(90% 0.05 80deg);
}
.juridica-hint {
  font-size: 12px;
  color: var(--warm-500);
  margin: 12px 0 0;
}
.field {
  display: flex;
  flex-direction: column;
}
.field-lab {
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-900);
  margin-bottom: 6px;
}
.req {
  color: var(--danger-500);
}
.segmented {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: var(--warm-150, var(--warm-100));
  border-radius: 9px;
}
.seg {
  padding: 7px 16px;
  border-radius: 7px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-600);
  cursor: pointer;
}
.seg.on {
  background: var(--warm-50);
  color: var(--amatista-700);
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(20 15 30 / 8%);
}

.agenttoggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 11px;
  background: var(--warm-50);
  border: 1.5px solid var(--warm-200);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
}
.agenttoggle.on {
  background: var(--amatista-50);
  border-color: var(--amatista-400);
}

.agentbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--warm-300);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: white;
}
.agenttoggle.on .agentbox {
  background: var(--amatista-600);
  border-color: var(--amatista-600);
}
.agenttoggle strong {
  font-size: 13px;
  color: var(--warm-900);
  display: block;
}
.agenthint {
  font-size: 11.5px;
  color: var(--warm-500);
}

.createfoot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--warm-200);
}
</style>
