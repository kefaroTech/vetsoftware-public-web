<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { locationsApi } from '../api/locations.api'
import { registrationApi } from '../api/registration.api'
import type { City, Country, RegisterUserRequest, State } from '../types'
import {
  COMPANY_DOCTYPE_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type TaxRegime,
} from '@/features/facturacion/types/facturacion'
import { getProblemDetailFieldErrors, getProblemDetailMessage } from '@/services/http/http.client'

const emit = defineEmits<{ success: [] }>()

const form = ref({
  companyName: '',
  documentType: 'NIT' as CompanyDocumentType,
  companyIdentifier: '',
  companyAddress: '',
  companyContactNumber: '',
  countryId: null as number | null,
  stateId: null as number | null,
  cityId: null as number | null,
  taxRegime: null as TaxRegime | null,
  fiscalEmail: '',
  employeeName: '',
  employeeEmail: '',
  password: '',
})

// El tipo/número de documento, la razón social, el régimen y el correo fiscal arman el perfil fiscal del
// emisor (el backend lo crea en el signup). El DV del NIT lo calcula el backend.
const doctypeItems = (Object.entries(COMPANY_DOCTYPE_LABEL) as [CompanyDocumentType, string][]).map(
  ([value, title]) => ({ value, title }),
)
const regimeItems = (Object.entries(TAX_REGIME_LABEL) as [TaxRegime, string][]).map(
  ([value, title]) => ({ value, title }),
)
const isNit = computed(() => form.value.documentType === 'NIT')

const formValid = ref(false)
const formRef = ref()

const countries = ref<Country[]>([])
const states = ref<State[]>([])
const cities = ref<City[]>([])

const loadingCountries = ref(false)
const loadingStates = ref(false)
const loadingCities = ref(false)
const submitting = ref(false)

const submitError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const required = (v: unknown) => (v !== null && v !== undefined && v !== '') || 'Campo requerido'
const maxLen = (n: number) => (v: string) =>
  !v || v.length <= n || `Máximo ${n} caracteres`
const minLen = (n: number) => (v: string) =>
  !v || v.length >= n || `Mínimo ${n} caracteres`
const emailRule = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido'
const docNumberRule = (v: string) =>
  !v ||
  (isNit.value
    ? /^\d{5,15}$/.test(v) || 'El NIT debe ser numérico (entre 5 y 15 dígitos)'
    : /^[A-Za-z0-9]{4,20}$/.test(v) || 'Documento inválido (4–20 caracteres alfanuméricos)')

onMounted(async () => {
  loadingCountries.value = true
  try {
    countries.value = await locationsApi.listCountries()
  } catch (e) {
    submitError.value = getProblemDetailMessage(e, 'No se pudieron cargar los países')
  } finally {
    loadingCountries.value = false
  }
})

watch(
  () => form.value.countryId,
  async (countryId) => {
    form.value.stateId = null
    form.value.cityId = null
    states.value = []
    cities.value = []
    if (!countryId) return
    loadingStates.value = true
    try {
      states.value = await locationsApi.listStatesByCountry(countryId)
    } catch (e) {
      submitError.value = getProblemDetailMessage(e, 'No se pudieron cargar los estados')
    } finally {
      loadingStates.value = false
    }
  },
)

watch(
  () => form.value.stateId,
  async (stateId) => {
    form.value.cityId = null
    cities.value = []
    if (!stateId) return
    loadingCities.value = true
    try {
      cities.value = await locationsApi.listCitiesByState(stateId)
    } catch (e) {
      submitError.value = getProblemDetailMessage(e, 'No se pudieron cargar las ciudades')
    } finally {
      loadingCities.value = false
    }
  },
)

async function submit() {
  submitError.value = null
  fieldErrors.value = {}
  const { valid } = await formRef.value.validate()
  if (!valid) return
  if (form.value.cityId == null || form.value.taxRegime == null) return

  submitting.value = true
  try {
    const payload: RegisterUserRequest = {
      companyName: form.value.companyName.trim(),
      documentType: form.value.documentType,
      companyIdentifier: form.value.companyIdentifier.trim(),
      companyAddress: form.value.companyAddress.trim() || undefined,
      companyContactNumber: form.value.companyContactNumber.trim() || undefined,
      cityId: form.value.cityId,
      taxRegime: form.value.taxRegime,
      fiscalEmail: form.value.fiscalEmail.trim(),
      employeeName: form.value.employeeName.trim(),
      employeeEmail: form.value.employeeEmail.trim(),
      password: form.value.password,
    }
    await registrationApi.register(payload)
    emit('success')
  } catch (e) {
    fieldErrors.value = getProblemDetailFieldErrors(e)
    submitError.value = getProblemDetailMessage(e, 'No se pudo crear la cuenta')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-card class="vet-auth-card mx-auto" max-width="720" :elevation="0">
    <h1 class="vet-auth-title">Crear cuenta</h1>
    <p class="vet-auth-sub">
      Registra tu empresa y tu primer usuario administrador.
    </p>

    <v-alert v-if="submitError" type="error" variant="tonal" class="mb-4" closable>
      {{ submitError }}
    </v-alert>

    <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
      <div class="text-subtitle-1 font-weight-medium mb-2">Empresa</div>

      <v-row dense>
        <v-col cols="12" md="5">
          <v-select
            v-model="form.documentType"
            :items="doctypeItems"
            item-title="title"
            item-value="value"
            label="Tipo de documento"
            :rules="[required]"
            :error-messages="fieldErrors.documentType"
          />
        </v-col>
        <v-col cols="12" md="7">
          <v-text-field
            v-model="form.companyIdentifier"
            label="Número de documento"
            :rules="[required, docNumberRule]"
            :error-messages="fieldErrors.companyIdentifier"
            maxlength="20"
            :inputmode="isNit ? 'numeric' : 'text'"
            counter
            :hint="isNit ? 'El dígito de verificación se calcula automáticamente' : 'Debe ser único en todo el sistema'"
            persistent-hint
          />
        </v-col>
      </v-row>

      <v-text-field
        v-model="form.companyName"
        label="Razón social"
        :rules="[required, maxLen(100)]"
        :error-messages="fieldErrors.companyName"
        maxlength="100"
        counter
      />

      <v-row dense>
        <v-col cols="12" md="6">
          <v-select
            v-model="form.taxRegime"
            :items="regimeItems"
            item-title="title"
            item-value="value"
            label="Régimen tributario"
            :rules="[required]"
            :error-messages="fieldErrors.taxRegime"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.fiscalEmail"
            label="Correo fiscal"
            type="email"
            :rules="[required, emailRule, maxLen(255)]"
            :error-messages="fieldErrors.fiscalEmail"
            maxlength="255"
            hint="Correo donde llegan las facturas/documentos electrónicos"
            persistent-hint
          />
        </v-col>
      </v-row>

      <v-text-field
        v-model="form.companyAddress"
        label="Dirección (opcional)"
        :rules="[maxLen(200)]"
        :error-messages="fieldErrors.companyAddress"
        maxlength="200"
      />

      <v-text-field
        v-model="form.companyContactNumber"
        label="Teléfono de contacto (opcional)"
        :rules="[maxLen(30)]"
        :error-messages="fieldErrors.companyContactNumber"
        maxlength="30"
      />

      <v-row dense>
        <v-col cols="12" md="4">
          <v-select
            v-model="form.countryId"
            :items="countries"
            item-title="name"
            item-value="id"
            label="País"
            :rules="[required]"
            :loading="loadingCountries"
            :disabled="loadingCountries"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="form.stateId"
            :items="states"
            item-title="name"
            item-value="id"
            label="Estado / Departamento"
            :rules="[required]"
            :loading="loadingStates"
            :disabled="!form.countryId || loadingStates"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="form.cityId"
            :items="cities"
            item-title="name"
            item-value="id"
            label="Ciudad"
            :rules="[required]"
            :error-messages="fieldErrors.cityId"
            :loading="loadingCities"
            :disabled="!form.stateId || loadingCities"
          />
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <div class="text-subtitle-1 font-weight-medium mb-2">Usuario administrador</div>

      <v-text-field
        v-model="form.employeeName"
        label="Nombre completo"
        :rules="[required, maxLen(100)]"
        :error-messages="fieldErrors.employeeName"
        maxlength="100"
      />

      <v-text-field
        v-model="form.employeeEmail"
        label="Email"
        type="email"
        :rules="[required, emailRule, maxLen(100)]"
        :error-messages="fieldErrors.employeeEmail"
        maxlength="100"
      />

      <v-text-field
        v-model="form.password"
        label="Contraseña"
        type="password"
        :rules="[required, minLen(8), maxLen(100)]"
        :error-messages="fieldErrors.password"
        maxlength="100"
        hint="Mínimo 8 caracteres"
        persistent-hint
      />

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        class="mt-6 vet-auth-submit"
        :loading="submitting"
      >
        Crear cuenta
      </v-btn>

      <div class="vet-auth-footer text-body-2 mt-6 text-center">
        ¿Ya tienes cuenta?
        <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
      </div>
    </v-form>
  </v-card>
</template>

<style scoped>
.vet-auth-card {
  border: 1px solid var(--warm-200) !important;
  border-radius: 16px !important;
  padding: 36px !important;
  background: #ffffff;
  box-shadow:
    0 1px 2px rgba(50, 20, 80, 0.04),
    0 12px 40px -16px oklch(40% 0.18 var(--hue) / 0.18) !important;
}

.vet-auth-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.1;
}

.vet-auth-sub {
  margin: 4px 0 24px;
  color: var(--warm-600);
  font-size: 14px;
  line-height: 1.5;
}

.vet-auth-submit {
  background: linear-gradient(135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 9px !important;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
  box-shadow:
    0 1px 2px rgba(50, 20, 80, 0.08),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.4) !important;
  transition: filter 0.15s ease;
}
.vet-auth-submit:hover:not(:disabled) {
  filter: brightness(1.05);
}

.vet-auth-footer {
  color: var(--warm-600);
}
.vet-auth-footer :deep(a) {
  color: var(--amatista-700);
  text-decoration: none;
  font-weight: 500;
}
.vet-auth-footer :deep(a:hover) {
  color: var(--amatista-600);
  text-decoration: underline;
}

/* Focus ring amatista para los inputs */
.v-text-field :deep(.v-field--focused),
.v-select :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px var(--amatista-50);
  border-radius: 4px;
}
</style>
