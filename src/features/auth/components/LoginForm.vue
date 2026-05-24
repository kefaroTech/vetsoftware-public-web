<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth.api'
import { useAuth } from '../composables/useAuth'
import type { LoginEmployeeRequest } from '../types'
import { getProblemDetailFieldErrors, getProblemDetailMessage } from '@/services/http/http.client'

const router = useRouter()
const { login } = useAuth()

const form = ref({
  employeeCode: '',
  password: '',
})

const formValid = ref(false)
const formRef = ref()
const showPassword = ref(false)

const submitting = ref(false)
const submitError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const required = (v: unknown) => (v !== null && v !== undefined && v !== '') || 'Campo requerido'
const maxLen = (n: number) => (v: string) =>
  !v || v.length <= n || `Máximo ${n} caracteres`

async function submit() {
  submitError.value = null
  fieldErrors.value = {}
  const { valid } = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  try {
    const payload: LoginEmployeeRequest = {
      employeeCode: form.value.employeeCode.trim(),
      password: form.value.password,
    }
    const { token, type } = await authApi.loginEmployee(payload)
    await login({ token, type })
    router.push({ name: 'home' })
  } catch (e) {
    fieldErrors.value = getProblemDetailFieldErrors(e)
    submitError.value = getProblemDetailMessage(e, 'No se pudo iniciar sesión')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
    <v-alert v-if="submitError" type="error" variant="tonal" class="mb-4" closable>
      {{ submitError }}
    </v-alert>

    <v-text-field
      v-model="form.employeeCode"
      label="Código de empleado"
      :rules="[required, maxLen(50)]"
      :error-messages="fieldErrors.employeeCode"
      maxlength="50"
      autocomplete="username"
      autofocus
    />

    <v-text-field
      v-model="form.password"
      label="Contraseña"
      :type="showPassword ? 'text' : 'password'"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      :rules="[required, maxLen(100)]"
      :error-messages="fieldErrors.password"
      maxlength="100"
      autocomplete="current-password"
      @click:append-inner="showPassword = !showPassword"
    />

    <v-btn
      type="submit"
      color="primary"
      size="large"
      block
      class="mt-4 vet-auth-submit"
      :loading="submitting"
    >
      Iniciar sesión
    </v-btn>
  </v-form>
</template>

<style scoped>
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

/* Focus ring amatista en los inputs de Vuetify dentro del form */
.v-text-field :deep(.v-field--focused) .v-field__outline__start,
.v-text-field :deep(.v-field--focused) .v-field__outline__end,
.v-text-field :deep(.v-field--focused) .v-field__outline__notch::before,
.v-text-field :deep(.v-field--focused) .v-field__outline__notch::after {
  color: var(--amatista-500);
}
.v-text-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px var(--amatista-50);
  border-radius: 4px;
}
</style>
