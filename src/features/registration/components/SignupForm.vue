<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { locationsApi } from '../api/locations.api'
import { registrationApi } from '../api/registration.api'
import type { City, Country, RegisterUserRequest, State } from '../types'
import { getProblemDetailFieldErrors, getProblemDetailMessage } from '@/services/http/http.client'

const emit = defineEmits<{ success: [] }>()

const form = ref({
  companyName: '',
  companyIdentifier: '',
  companyAddress: '',
  companyContactNumber: '',
  countryId: null as number | null,
  stateId: null as number | null,
  cityId: null as number | null,
  employeeName: '',
  employeeEmail: '',
  password: '',
})

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
  if (form.value.cityId == null) return

  submitting.value = true
  try {
    const payload: RegisterUserRequest = {
      companyName: form.value.companyName.trim(),
      companyIdentifier: form.value.companyIdentifier.trim(),
      companyAddress: form.value.companyAddress.trim() || undefined,
      companyContactNumber: form.value.companyContactNumber.trim() || undefined,
      cityId: form.value.cityId,
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
  <v-card class="pa-6 mx-auto" max-width="720">
    <v-card-title class="text-h5 mb-2">Crear cuenta</v-card-title>
    <v-card-subtitle class="mb-4">
      Registra tu empresa y tu primer usuario administrador.
    </v-card-subtitle>

    <v-alert v-if="submitError" type="error" variant="tonal" class="mb-4" closable>
      {{ submitError }}
    </v-alert>

    <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
      <div class="text-subtitle-1 font-weight-medium mb-2">Empresa</div>

      <v-text-field
        v-model="form.companyName"
        label="Nombre de la empresa"
        :rules="[required, maxLen(100)]"
        :error-messages="fieldErrors.companyName"
        maxlength="100"
        counter
      />

      <v-text-field
        v-model="form.companyIdentifier"
        label="Identificador / NIT"
        :rules="[required, maxLen(50)]"
        :error-messages="fieldErrors.companyIdentifier"
        maxlength="50"
        counter
        hint="Debe ser único en todo el sistema"
        persistent-hint
      />

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
        class="mt-6"
        :loading="submitting"
      >
        Crear cuenta
      </v-btn>
    </v-form>
  </v-card>
</template>
