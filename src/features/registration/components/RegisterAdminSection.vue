<script setup lang="ts">
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import SectionHead from '@/components/public/SectionHead.vue'
import type { ToRefs } from 'vue'
import type { RegisterFieldKey, RegisterFormState } from '../types/register-form.types'
import { Lock, Mail, UserPlus, Users } from 'lucide-vue-next'

/**
 * Bloque «Usuario administrador» del auto-registro. Mismo trato que la sección
 * de empresa: el estado, la validación y el envío siguen en `RegisterForm`, y
 * `form` llega como el `toRefs` de su borrador.
 */
const props = defineProps<{
  form: ToRefs<RegisterFormState>
  err: (key: RegisterFieldKey) => string | undefined
  fieldIds: Readonly<Record<RegisterFieldKey, string>>
  markTouched: (key: RegisterFieldKey) => void
  /** §5, caso 4: el correo ya tiene cuenta. Ver `RegisterForm.vue`. */
  emailTaken: boolean
}>()

const { employeeName, employeeEmail, password } = props.form
</script>

<template>
  <section>
    <SectionHead
      :icon="UserPlus"
      title="Usuario administrador"
      desc="La persona que gestionará la cuenta."
    />
    <div class="reg-fields ds-stack">
      <AuthField
        :id="fieldIds.employeeName"
        label="Nombre completo"
        required
        :error="err('employeeName')"
        :counter="`${employeeName.length}/100`"
      >
        <AuthInput
          v-model="employeeName"
          placeholder="Dr. Ana Martínez"
          :maxlength="100"
          autocomplete="name"
          :icon="Users"
          :invalid="!!err('employeeName')"
          @blur="markTouched('employeeName')"
        />
      </AuthField>
      <div class="reg-grid-2">
        <AuthField
          :id="fieldIds.employeeEmail"
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
            autocomplete="email"
            :icon="Mail"
            :invalid="!!err('employeeEmail')"
            @blur="markTouched('employeeEmail')"
          />
          <template #after>
            <p v-if="emailTaken" class="reg-way-out">
              <RouterLink :to="{ name: 'login', query: { redirect: '/dashboard/contratar' } }">
                Inicia sesión y sigue con tu plan
              </RouterLink>
            </p>
          </template>
        </AuthField>
        <AuthField
          :id="fieldIds.password"
          label="Contraseña"
          required
          :error="err('password')"
          hint="Mínimo 8 caracteres."
        >
          <AuthInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            :maxlength="100"
            autocomplete="new-password"
            :icon="Lock"
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

.reg-way-out {
  margin: 2px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
}

.reg-way-out :deep(a) {
  color: var(--pub-ame-700);
  font-weight: 600;
}
</style>
