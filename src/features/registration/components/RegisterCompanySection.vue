<script setup lang="ts">
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import AuthSelect from '@/components/public/AuthSelect.vue'
import SectionHead from '@/components/public/SectionHead.vue'
import type { ToRefs } from 'vue'
import type {
  RegisterFieldKey,
  RegisterFormState,
  RegisterOption,
} from '../types/register-form.types'

/**
 * Bloque «Empresa» del auto-registro. Se extrajo de `RegisterForm.vue` (646
 * líneas) por la costura que el propio formulario ya tenía: las dos `<section>`
 * separadas por `.reg-divider`. El estado, la validación y el envío siguen en el
 * padre; aquí sólo se pinta. `form` llega como el `toRefs` del mismo `reactive`,
 * así que escribir en estos `v-model` escribe en el borrador original — el mismo
 * trato que `AppointmentWhenFields` da al suyo.
 */
const props = defineProps<{
  form: ToRefs<RegisterFormState>
  err: (key: RegisterFieldKey) => string | undefined
  markTouched: (key: RegisterFieldKey) => void
  sanitizeIdentifier: (value: string) => void
  sanitizePhone: (value: string) => void
  isNit: boolean
  docHint: string
  docTypeOptions: RegisterOption[]
  regimeOptions: RegisterOption[]
  countryOptions: RegisterOption[]
  stateOptions: RegisterOption[]
  cityOptions: RegisterOption[]
  loadingStates: boolean
  loadingCities: boolean
}>()

const {
  documentType,
  companyIdentifier,
  companyName,
  taxRegime,
  fiscalEmail,
  companyAddress,
  companyContactNumber,
  countryId,
  stateId,
  cityId,
} = props.form
</script>

<template>
  <section class="reg-section">
    <SectionHead
      icon="mdi-office-building-outline"
      title="Empresa"
      desc="Datos fiscales y ubicación del centro veterinario."
    />
    <div class="reg-fields ds-stack">
      <div class="reg-grid-2">
        <AuthField label="Tipo de documento" required>
          <AuthSelect v-model="documentType" :options="docTypeOptions" />
        </AuthField>
        <AuthField
          label="Número de documento"
          required
          :hint="docHint"
          :error="err('companyIdentifier')"
          :counter="`${companyIdentifier.length}/20`"
        >
          <AuthInput
            :model-value="companyIdentifier"
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
        :counter="`${companyName.length}/100`"
      >
        <AuthInput
          v-model="companyName"
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
            v-model="taxRegime"
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
            v-model="fiscalEmail"
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
            v-model="companyAddress"
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
            :model-value="companyContactNumber"
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
            v-model="countryId"
            :options="countryOptions"
            placeholder="Selecciona…"
            :invalid="!!err('countryId')"
            @blur="markTouched('countryId')"
          />
        </AuthField>
        <AuthField label="Departamento" required :error="err('stateId')">
          <AuthSelect
            v-model="stateId"
            :options="stateOptions"
            placeholder="Selecciona…"
            :disabled="!countryId"
            :loading="loadingStates"
            :invalid="!!err('stateId')"
            @blur="markTouched('stateId')"
          />
        </AuthField>
        <AuthField label="Ciudad" required :error="err('cityId')">
          <AuthSelect
            v-model="cityId"
            :options="cityOptions"
            placeholder="Selecciona…"
            :disabled="!stateId"
            :loading="loadingCities"
            :invalid="!!err('cityId')"
            @blur="markTouched('cityId')"
          />
        </AuthField>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reg-section {
  margin-top: 28px;
}

.reg-fields {
  gap: 15px;
  margin-top: 18px;
}
</style>
