<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth.api'
import { useAuth } from '../composables/useAuth'
import type { LoginEmployeeRequest } from '../types'
import {
  getProblemDetailCode,
  getProblemDetailFieldErrors,
  getProblemDetailMessage,
} from '@/services/http/http.client'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthBanner from '@/components/public/AuthBanner.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'

const router = useRouter()
const { login } = useAuth()

const form = reactive({ employeeCode: '', password: '' })
const touched = reactive({ employeeCode: false, password: false })
const serverErrors = ref<Record<string, string>>({})

const submitting = ref(false)
const submitError = ref<string | null>(null)
const emailNotVerified = ref(false)

function err(key: 'employeeCode' | 'password'): string | undefined {
  if (touched[key] && !form[key].trim()) return 'Campo requerido'
  return serverErrors.value[key]
}

async function submit() {
  submitError.value = null
  emailNotVerified.value = false
  serverErrors.value = {}
  touched.employeeCode = true
  touched.password = true
  if (!form.employeeCode.trim() || !form.password.trim()) return

  submitting.value = true
  try {
    const payload: LoginEmployeeRequest = {
      employeeCode: form.employeeCode.trim(),
      password: form.password,
    }
    const { token, type, refreshToken } = await authApi.loginEmployee(payload)
    await login({ token, type, refreshToken })
    router.push({ name: 'home' })
  } catch (e) {
    serverErrors.value = getProblemDetailFieldErrors(e)
    const code = getProblemDetailCode(e)
    // Auto-registro Opción B: cuenta sin verificar → 403 EMAIL_NOT_VERIFIED (banner específico).
    if (code === 'EMAIL_NOT_VERIFIED') {
      emailNotVerified.value = true
    } else if (code === 'INVALID_CREDENTIALS') {
      submitError.value = 'El empleado o la contraseña no son correctos. Revísalos e intenta de nuevo.'
    } else {
      submitError.value = getProblemDetailMessage(e, 'No se pudo iniciar sesión')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="login-form" novalidate @submit.prevent="submit">
    <div v-if="emailNotVerified" class="login-banner">
      <AuthBanner tone="error" @close="emailNotVerified = false">
        Tu cuenta aún no está verificada. Abre el enlace que te enviamos por correo para activarla.
      </AuthBanner>
    </div>
    <div v-else-if="submitError" class="login-banner">
      <AuthBanner tone="error" @close="submitError = null">{{ submitError }}</AuthBanner>
    </div>

    <div class="login-fields">
      <AuthField label="Empleado" required :error="err('employeeCode')">
        <AuthInput
          v-model="form.employeeCode"
          icon="mdi-card-account-details-outline"
          placeholder="ADMIN-001"
          :maxlength="50"
          autocomplete="username"
          :invalid="!!err('employeeCode')"
          @blur="touched.employeeCode = true"
        />
      </AuthField>

      <AuthField label="Contraseña" required :error="err('password')">
        <AuthInput
          v-model="form.password"
          type="password"
          icon="mdi-lock-outline"
          placeholder="••••••••"
          :maxlength="100"
          autocomplete="current-password"
          :invalid="!!err('password')"
          @blur="touched.password = true"
        />
      </AuthField>

      <PrimaryButton type="submit" :loading="submitting" loading-text="Ingresando…">
        Iniciar sesión <v-icon size="14">mdi-arrow-right</v-icon>
      </PrimaryButton>
    </div>

    <div class="login-divider">
      <span class="login-divider-line" />
      <span class="login-divider-word">o</span>
      <span class="login-divider-line" />
    </div>

    <RouterLink :to="{ name: 'signup' }" class="login-secondary">
      <v-icon size="15">mdi-star-four-points-outline</v-icon>
      Crear una cuenta nueva
    </RouterLink>
  </form>
</template>

<style scoped>
.login-form {
  font-family: 'Inter', sans-serif;
}
.login-banner {
  margin-bottom: 20px;
}
.login-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 18px;
}
.login-divider-line {
  flex: 1;
  height: 1px;
  background: var(--pub-line);
}
.login-divider-word {
  font-size: 11px;
  color: #a08bbd;
  font-weight: 500;
}
.login-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 9px;
  border: 1px solid var(--pub-line);
  background: #fff;
  color: var(--pub-ink-700);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
}
.login-secondary:hover {
  border-color: #d6c8ea;
  background: #faf6ff;
}
.login-secondary :deep(.v-icon) {
  color: var(--pub-ame-700);
}
</style>
