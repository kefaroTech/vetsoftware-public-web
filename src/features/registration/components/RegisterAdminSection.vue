<script setup lang="ts">
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import SectionHead from '@/components/public/SectionHead.vue'
import type { ToRefs } from 'vue'
import type { RegisterFieldKey, RegisterFormState } from '../types/register-form.types'

/**
 * Bloque «Usuario administrador» del auto-registro. Mismo trato que la sección
 * de empresa: el estado, la validación y el envío siguen en `RegisterForm`, y
 * `form` llega como el `toRefs` de su borrador.
 */
const props = defineProps<{
  form: ToRefs<RegisterFormState>
  err: (key: RegisterFieldKey) => string | undefined
  markTouched: (key: RegisterFieldKey) => void
}>()

const { employeeName, employeeEmail, password } = props.form
</script>

<template>
  <section>
    <SectionHead
      icon="mdi-account-plus-outline"
      title="Usuario administrador"
      desc="La persona que gestionará la cuenta."
    />
    <div class="reg-fields ds-stack">
      <AuthField
        label="Nombre completo"
        required
        :error="err('employeeName')"
        :counter="`${employeeName.length}/100`"
      >
        <AuthInput
          v-model="employeeName"
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
            v-model="employeeEmail"
            type="email"
            placeholder="ana@clinica.com"
            :maxlength="100"
            icon="mdi-email-outline"
            :invalid="!!err('employeeEmail')"
            @blur="markTouched('employeeEmail')"
          />
        </AuthField>
        <AuthField label="Contraseña" required :error="err('password')" hint="Mínimo 8 caracteres.">
          <AuthInput
            v-model="password"
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
</template>

<style scoped>
.reg-fields {
  gap: 15px;
  margin-top: 18px;
}
</style>
