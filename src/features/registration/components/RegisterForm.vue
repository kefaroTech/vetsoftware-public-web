<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { locationsApi } from '../api/locations.api'
import { registrationApi } from '../api/registration.api'
import type { City, Country, RegisterUserRequest, State } from '../types'
import {
  COMPANY_DOCTYPE_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type TaxRegime,
} from '@/features/facturacion/types/facturacion'
import {
  getProblemDetailCode,
  getProblemDetailFieldErrors,
  getProblemDetailMessage,
} from '@/services/http/http.client'
import { useRecaptcha } from '../composables/useRecaptcha'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthBanner from '@/components/public/AuthBanner.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import AuthSelect from '@/components/public/AuthSelect.vue'
import SectionHead from '@/components/public/SectionHead.vue'

interface Opt {
  value: string
  label: string
}

const emit = defineEmits<(e: 'success', email: string) => void>()

type FieldKey =
  | 'companyIdentifier'
  | 'companyName'
  | 'taxRegime'
  | 'fiscalEmail'
  | 'companyContactNumber'
  | 'countryId'
  | 'stateId'
  | 'cityId'
  | 'employeeName'
  | 'employeeEmail'
  | 'password'

const form = reactive({
  documentType: 'NIT' as string,
  companyIdentifier: '',
  companyName: '',
  taxRegime: '' as string,
  fiscalEmail: '',
  companyAddress: '',
  companyContactNumber: '',
  countryId: '',
  stateId: '',
  cityId: '',
  employeeName: '',
  employeeEmail: '',
  password: '',
})

const touched = reactive<Record<FieldKey, boolean>>({
  companyIdentifier: false,
  companyName: false,
  taxRegime: false,
  fiscalEmail: false,
  companyContactNumber: false,
  countryId: false,
  stateId: false,
  cityId: false,
  employeeName: false,
  employeeEmail: false,
  password: false,
})

const serverErrors = ref<Record<string, string>>({})
const globalError = ref<string | null>(null)
const submitting = ref(false)

const docTypeOptions: Opt[] = (
  Object.entries(COMPANY_DOCTYPE_LABEL) as [CompanyDocumentType, string][]
).map(([value, label]) => ({ value, label }))
const regimeOptions: Opt[] = (Object.entries(TAX_REGIME_LABEL) as [TaxRegime, string][]).map(
  ([value, label]) => ({ value, label }),
)

const isNit = computed(() => form.documentType === 'NIT')
const docHint = computed(() =>
  isNit.value
    ? 'El dígito de verificación se calcula automáticamente.'
    : 'Debe ser único en todo el sistema.',
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s\-()]{6,29}$/

function validate(key: FieldKey): string | null {
  const v = String(form[key as keyof typeof form] ?? '')
  switch (key) {
    case 'companyIdentifier':
      if (!v.trim()) return 'Ingresa el número de documento.'
      return isNit.value
        ? /^\d{5,15}$/.test(v)
          ? null
          : 'Para NIT debe ser numérico, 5 a 15 dígitos.'
        : /^[a-zA-Z0-9]{4,20}$/.test(v)
          ? null
          : 'Alfanumérico, 4 a 20 caracteres.'
    case 'companyName':
      return v.trim() ? null : 'Ingresa la razón social.'
    case 'taxRegime':
      return v ? null : 'Selecciona el régimen tributario.'
    case 'fiscalEmail':
      if (!v.trim()) return 'Ingresa el correo fiscal.'
      return EMAIL_RE.test(v) ? null : 'Correo no válido.'
    case 'companyContactNumber':
      if (!v.trim()) return null
      return PHONE_RE.test(v) ? null : 'Teléfono no válido (7–15 dígitos).'
    case 'countryId':
      return v ? null : 'Selecciona el país.'
    case 'stateId':
      return v ? null : 'Selecciona el departamento.'
    case 'cityId':
      return v ? null : 'Selecciona la ciudad.'
    case 'employeeName':
      return v.trim() ? null : 'Ingresa el nombre completo.'
    case 'employeeEmail':
      if (!v.trim()) return 'Ingresa el correo.'
      return EMAIL_RE.test(v) ? null : 'Correo no válido.'
    case 'password':
      if (!v) return 'Ingresa una contraseña.'
      return v.length >= 8 ? null : 'Mínimo 8 caracteres.'
    default:
      return null
  }
}

const REQUIRED: FieldKey[] = [
  'companyIdentifier',
  'companyName',
  'taxRegime',
  'fiscalEmail',
  'countryId',
  'stateId',
  'cityId',
  'employeeName',
  'employeeEmail',
  'password',
]

function err(key: FieldKey): string | undefined {
  if (touched[key]) {
    const local = validate(key)
    if (local) return local
  }
  return serverErrors.value[key]
}

function markTouched(key: FieldKey) {
  touched[key] = true
}

function sanitizeIdentifier(v: string) {
  form.companyIdentifier = (v ?? '').replace(/[^A-Za-z0-9]/g, '')
}
function sanitizePhone(v: string) {
  form.companyContactNumber = (v ?? '').replace(/[^+\d\s\-()]/g, '')
}

// --- reCAPTCHA ---
const recaptcha = useRecaptcha()
const recaptchaEl = ref<HTMLElement | null>(null)
const recaptchaTouched = ref(false)
const recaptchaMissing = computed(
  () => recaptchaTouched.value && recaptcha.ready.value && !recaptcha.getToken(),
)

// --- Cascada geográfica (endpoints reales) ---
const countries = ref<Country[]>([])
const states = ref<State[]>([])
const cities = ref<City[]>([])
const loadingStates = ref(false)
const loadingCities = ref(false)

const countryOptions = computed<Opt[]>(() =>
  countries.value.map((c) => ({ value: String(c.id), label: c.name })),
)
const stateOptions = computed<Opt[]>(() =>
  states.value.map((s) => ({ value: String(s.id), label: s.name })),
)
const cityOptions = computed<Opt[]>(() =>
  cities.value.map((c) => ({ value: String(c.id), label: c.name })),
)

onMounted(async () => {
  if (recaptchaEl.value) await recaptcha.render(recaptchaEl.value)
  try {
    countries.value = await locationsApi.listCountries()
  } catch (e) {
    globalError.value = getProblemDetailMessage(e, 'No se pudieron cargar los países')
  }
})

watch(
  () => form.countryId,
  async (id) => {
    form.stateId = ''
    form.cityId = ''
    states.value = []
    cities.value = []
    if (!id) return
    loadingStates.value = true
    try {
      states.value = await locationsApi.listStatesByCountry(Number(id))
    } catch (e) {
      globalError.value = getProblemDetailMessage(e, 'No se pudieron cargar los departamentos')
    } finally {
      loadingStates.value = false
    }
  },
)

watch(
  () => form.stateId,
  async (id) => {
    form.cityId = ''
    cities.value = []
    if (!id) return
    loadingCities.value = true
    try {
      cities.value = await locationsApi.listCitiesByState(Number(id))
    } catch (e) {
      globalError.value = getProblemDetailMessage(e, 'No se pudieron cargar las ciudades')
    } finally {
      loadingCities.value = false
    }
  },
)

// Al cambiar el tipo de documento, revalidar el número si ya fue tocado.
watch(
  () => form.documentType,
  () => {
    if (touched.companyIdentifier)
      serverErrors.value = { ...serverErrors.value, companyIdentifier: '' }
  },
)

const cardRef = ref<HTMLElement | null>(null)

async function submit() {
  globalError.value = null
  serverErrors.value = {}
  recaptchaTouched.value = true
  REQUIRED.forEach(markTouched)
  markTouched('companyContactNumber')

  const hasErrors = [...REQUIRED, 'companyContactNumber'].some((k) => validate(k as FieldKey))
  const captchaToken = recaptcha.getToken()
  const captchaMissing = recaptcha.ready.value && !captchaToken

  if (hasErrors || captchaMissing) {
    if (hasErrors) globalError.value = 'Revisa los campos marcados en rojo antes de continuar.'
    cardRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  submitting.value = true
  try {
    const payload: RegisterUserRequest = {
      companyName: form.companyName.trim(),
      documentType: form.documentType as CompanyDocumentType,
      companyIdentifier: form.companyIdentifier.trim(),
      companyAddress: form.companyAddress.trim() || undefined,
      companyContactNumber: form.companyContactNumber.trim() || undefined,
      cityId: Number(form.cityId),
      taxRegime: form.taxRegime as TaxRegime,
      fiscalEmail: form.fiscalEmail.trim(),
      employeeName: form.employeeName.trim(),
      employeeEmail: form.employeeEmail.trim(),
      password: form.password,
      recaptchaToken: captchaToken || undefined,
    }
    const res = await registrationApi.register(payload)
    emit('success', res.email)
  } catch (e) {
    serverErrors.value = getProblemDetailFieldErrors(e)
    // Un email = una veterinaria: si el correo ya está registrado, se marca el campo de email.
    if (getProblemDetailCode(e) === 'EMAIL_ALREADY_REGISTERED') {
      serverErrors.value = {
        ...serverErrors.value,
        employeeEmail: 'Ese correo ya está registrado.',
      }
      touched.employeeEmail = true
    }
    globalError.value = getProblemDetailMessage(e, 'No se pudo crear la cuenta')
    recaptcha.reset()
    cardRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div ref="cardRef" class="reg-scroll">
    <form class="reg-card" novalidate @submit.prevent="submit">
      <div class="reg-eyebrow">VetSoftware</div>
      <h1 class="reg-title">Crear cuenta</h1>
      <p class="reg-sub">Registra tu empresa y tu primer usuario administrador.</p>

      <div v-if="globalError" class="reg-banner-wrap">
        <AuthBanner tone="error" @close="globalError = null">{{ globalError }}</AuthBanner>
      </div>

      <!-- Sección Empresa -->
      <section class="reg-section">
        <SectionHead
          icon="mdi-office-building-outline"
          title="Empresa"
          desc="Datos fiscales y ubicación del centro veterinario."
        />
        <div class="reg-fields">
          <div class="reg-grid-2">
            <AuthField label="Tipo de documento" required>
              <AuthSelect v-model="form.documentType" :options="docTypeOptions" />
            </AuthField>
            <AuthField
              label="Número de documento"
              required
              :hint="docHint"
              :error="err('companyIdentifier')"
              :counter="`${form.companyIdentifier.length}/20`"
            >
              <AuthInput
                :model-value="form.companyIdentifier"
                :placeholder="isNit ? '900123456' : 'ABC12345'"
                :maxlength="20"
                :inputmode="isNit ? 'numeric' : 'text'"
                icon="mdi-file-document-outline"
                :invalid="!!err('companyIdentifier')"
                @update:model-value="sanitizeIdentifier"
                @blur="markTouched('companyIdentifier')"
              />
            </AuthField>
          </div>

          <AuthField
            label="Razón social"
            required
            :error="err('companyName')"
            :counter="`${form.companyName.length}/100`"
          >
            <AuthInput
              v-model="form.companyName"
              placeholder="Clínica Veterinaria Patitas S.A.S."
              :maxlength="100"
              icon="mdi-office-building-outline"
              :invalid="!!err('companyName')"
              @blur="markTouched('companyName')"
            />
          </AuthField>

          <div class="reg-grid-2">
            <AuthField label="Régimen tributario" required :error="err('taxRegime')">
              <AuthSelect
                v-model="form.taxRegime"
                :options="regimeOptions"
                placeholder="Selecciona…"
                :invalid="!!err('taxRegime')"
                @blur="markTouched('taxRegime')"
              />
            </AuthField>
            <AuthField
              label="Correo fiscal"
              required
              :error="err('fiscalEmail')"
              hint="Correo donde llegan las facturas y documentos electrónicos."
            >
              <AuthInput
                v-model="form.fiscalEmail"
                type="email"
                placeholder="facturacion@clinica.com"
                :maxlength="255"
                icon="mdi-receipt-text-outline"
                :invalid="!!err('fiscalEmail')"
                @blur="markTouched('fiscalEmail')"
              />
            </AuthField>
          </div>

          <div class="reg-grid-2">
            <AuthField label="Dirección" hint="Opcional">
              <AuthInput
                v-model="form.companyAddress"
                placeholder="Cra 12 # 34-56"
                :maxlength="200"
                icon="mdi-map-marker-outline"
              />
            </AuthField>
            <AuthField
              label="Teléfono de contacto"
              hint="Opcional"
              :error="err('companyContactNumber')"
            >
              <AuthInput
                :model-value="form.companyContactNumber"
                type="tel"
                placeholder="+57 601 234 5678"
                :maxlength="30"
                icon="mdi-phone-outline"
                :invalid="!!err('companyContactNumber')"
                @update:model-value="sanitizePhone"
                @blur="markTouched('companyContactNumber')"
              />
            </AuthField>
          </div>

          <div class="reg-grid-3">
            <AuthField label="País" required :error="err('countryId')">
              <AuthSelect
                v-model="form.countryId"
                :options="countryOptions"
                placeholder="Selecciona…"
                :invalid="!!err('countryId')"
                @blur="markTouched('countryId')"
              />
            </AuthField>
            <AuthField label="Departamento" required :error="err('stateId')">
              <AuthSelect
                v-model="form.stateId"
                :options="stateOptions"
                placeholder="Selecciona…"
                :disabled="!form.countryId"
                :loading="loadingStates"
                :invalid="!!err('stateId')"
                @blur="markTouched('stateId')"
              />
            </AuthField>
            <AuthField label="Ciudad" required :error="err('cityId')">
              <AuthSelect
                v-model="form.cityId"
                :options="cityOptions"
                placeholder="Selecciona…"
                :disabled="!form.stateId"
                :loading="loadingCities"
                :invalid="!!err('cityId')"
                @blur="markTouched('cityId')"
              />
            </AuthField>
          </div>
        </div>
      </section>

      <div class="reg-divider" />

      <!-- Sección Usuario administrador -->
      <section>
        <SectionHead
          icon="mdi-account-plus-outline"
          title="Usuario administrador"
          desc="La persona que gestionará la cuenta."
        />
        <div class="reg-fields">
          <AuthField
            label="Nombre completo"
            required
            :error="err('employeeName')"
            :counter="`${form.employeeName.length}/100`"
          >
            <AuthInput
              v-model="form.employeeName"
              placeholder="Dr. Ana Martínez"
              :maxlength="100"
              icon="mdi-account-multiple"
              :invalid="!!err('employeeName')"
              @blur="markTouched('employeeName')"
            />
          </AuthField>
          <div class="reg-grid-2">
            <AuthField
              label="Email"
              required
              :error="err('employeeEmail')"
              hint="A este correo llega el enlace de verificación."
            >
              <AuthInput
                v-model="form.employeeEmail"
                type="email"
                placeholder="ana@clinica.com"
                :maxlength="100"
                icon="mdi-email-outline"
                :invalid="!!err('employeeEmail')"
                @blur="markTouched('employeeEmail')"
              />
            </AuthField>
            <AuthField
              label="Contraseña"
              required
              :error="err('password')"
              hint="Mínimo 8 caracteres."
            >
              <AuthInput
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                :maxlength="100"
                icon="mdi-lock-outline"
                :invalid="!!err('password')"
                @blur="markTouched('password')"
              />
            </AuthField>
          </div>
        </div>
      </section>

      <!-- reCAPTCHA -->
      <div class="reg-recaptcha">
        <div ref="recaptchaEl" class="reg-recaptcha-widget"></div>
        <p v-if="recaptchaMissing" class="reg-recaptcha-err">
          <v-icon size="12">mdi-alert-circle-outline</v-icon>
          Completa la verificación para continuar.
        </p>
        <div v-if="recaptcha.failed.value" class="reg-recaptcha-warn">
          <AuthBanner tone="warning" :closable="false">
            No se pudo cargar el reCAPTCHA. Verifica tu conexión y recarga la página.
          </AuthBanner>
        </div>
      </div>

      <div class="reg-submit">
        <PrimaryButton type="submit" :loading="submitting" loading-text="Creando cuenta…">
          Crear cuenta <v-icon size="14">mdi-arrow-right</v-icon>
        </PrimaryButton>
      </div>

      <p class="reg-foot">
        ¿Ya tienes cuenta?
        <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.reg-scroll {
  width: 100%;
  max-width: 720px;
  max-height: 100%;
  overflow-y: auto;
  margin: 0 auto;
}

.reg-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: clamp(24px, 4vw, 40px);
}

.reg-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--pub-ame-700);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.reg-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.08;
}

.reg-sub {
  font-size: 13.5px;
  color: var(--pub-ink-500);
  margin: 9px 0 0;
  line-height: 1.5;
}

.reg-banner-wrap {
  margin-top: 20px;
}

.reg-section {
  margin-top: 28px;
}

.reg-fields {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 18px;
}

.reg-divider {
  height: 1px;
  background: var(--pub-line-2);
  margin: 28px 0;
}

.reg-recaptcha {
  margin-top: 26px;
}

.reg-recaptcha-widget {
  display: flex;
  justify-content: center;
}

.reg-recaptcha-err {
  font-size: 11.5px;
  color: var(--pub-err-tx);
  text-align: center;
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.reg-recaptcha-warn {
  margin-top: 10px;
}

.reg-submit {
  margin-top: 22px;
}

.reg-foot {
  font-size: 13px;
  color: var(--pub-ink-500);
  text-align: center;
  margin: 18px 0 0;
}

.reg-foot :deep(a) {
  color: var(--pub-ame-700);
  font-weight: 600;
  text-decoration: none;
}
</style>
