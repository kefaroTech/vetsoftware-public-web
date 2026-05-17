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
      class="mt-4"
      :loading="submitting"
    >
      Iniciar sesión
    </v-btn>
  </v-form>
</template>
