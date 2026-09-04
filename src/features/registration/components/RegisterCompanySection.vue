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
import { Building2, FileText, MapPin, Phone, ReceiptText } from 'lucide-vue-next'

/**
 * Bloque «Empresa» del auto-registro. Se extrajo de `RegisterForm.vue` (646
 * líneas) por la costura que el propio formulario ya tenía: las dos `<section>`
 * separadas por `.reg-divider`. El estado, la validación y el envío siguen en el
 * padre; aquí sólo se pinta. `form` llega como el `toRefs` del mismo `reactive`,
 * así que escribir en estos `v-model` escribe en el borrador original — el mismo
 * trato que `AppointmentWhenFields` da al suyo.
 *
 * `fieldIds` baja desde el padre porque los enlaces de `ErrorSummary` tienen que
 * conocer el id del control ANTES de que este componente renderice.
 */
const props = defineProps<{
  form: ToRefs<RegisterFormState>
  err: (key: RegisterFieldKey) => string | undefined
  fieldIds: Readonly<Record<RegisterFieldKey, string>>
  markTouched: (key: RegisterFieldKey) => void
  sanitizeIdentifier: (value: string) => void
  sanitizePhone: (value: string) => void
  isNit: boolean
  docHint: string
  /** §5, caso 5: el servidor rechazó el documento. Ver `RegisterForm.vue`. */
  nitTaken: boolean
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
      :icon="Building2"
      title="Empresa"
      desc="Datos fiscales y ubicación del centro veterinario."
    />
    <div class="reg-fields ds-stack">
      <div class="reg-grid-2">
        <AuthField label="Tipo de documento" required>
          <AuthSelect v-model="documentType" :options="docTypeOptions" />
        </AuthField>
        <AuthField
          :id="fieldIds.companyIdentifier"
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
            :icon="FileText"
            :invalid="!!err('companyIdentifier')"
            @update:model-value="sanitizeIdentifier"
            @blur="markTouched('companyIdentifier')"
          />
          <template #after>
            <p v-if="nitTaken" class="reg-way-out">
              Si esta clínica es tuya,
              <RouterLink :to="{ name: 'login' }">inicia sesión</RouterLink>. Si crees que es un
              error, escríbenos a <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a>.
            </p>
          </template>
        </AuthField>
      </div>

      <AuthField
        :id="fieldIds.companyName"
        label="Razón social"
        required
        :error="err('companyName')"
        :counter="`${companyName.length}/100`"
      >
        <AuthInput
          v-model="companyName"
          placeholder="Clínica Veterinaria Patitas S.A.S."
          :maxlength="100"
          autocomplete="organization"
          :icon="Building2"
          :invalid="!!err('companyName')"
          @blur="markTouched('companyName')"
        />
      </AuthField>

      <div class="reg-grid-2">
        <AuthField
          :id="fieldIds.taxRegime"
          label="Régimen tributario"
          required
          :error="err('taxRegime')"
        >
          <AuthSelect
            v-model="taxRegime"
            :options="regimeOptions"
            placeholder="Selecciona…"
            :invalid="!!err('taxRegime')"
            @blur="markTouched('taxRegime')"
          />
        </AuthField>
        <AuthField
          :id="fieldIds.fiscalEmail"
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
            autocomplete="email"
            :icon="ReceiptText"
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
            autocomplete="street-address"
            :icon="MapPin"
          />
        </AuthField>
        <AuthField
          :id="fieldIds.companyContactNumber"
          label="Teléfono de contacto"
          hint="Opcional"
          :error="err('companyContactNumber')"
        >
          <AuthInput
            :model-value="companyContactNumber"
            type="tel"
            placeholder="+57 601 234 5678"
            :maxlength="30"
            autocomplete="tel"
            :icon="Phone"
            :invalid="!!err('companyContactNumber')"
            @update:model-value="sanitizePhone"
            @blur="markTouched('companyContactNumber')"
          />
        </AuthField>
      </div>

      <div class="reg-grid-3">
        <AuthField :id="fieldIds.countryId" label="País" required :error="err('countryId')">
          <AuthSelect
            v-model="countryId"
            :options="countryOptions"
            placeholder="Selecciona…"
            :invalid="!!err('countryId')"
            @blur="markTouched('countryId')"
          />
        </AuthField>
        <AuthField :id="fieldIds.stateId" label="Departamento" required :error="err('stateId')">
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
        <AuthField :id="fieldIds.cityId" label="Ciudad" required :error="err('cityId')">
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

.reg-way-out {
  margin: 2px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--pub-ink-600);
}

.reg-way-out :deep(a),
.reg-way-out a {
  color: var(--pub-ame-700);
  font-weight: 600;
}
</style>
