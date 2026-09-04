<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api/auth.api'
import { sanitizeRedirect, useAuth } from '../composables/useAuth'
import type { LoginEmployeeRequest } from '../types'
import {
  getProblemDetailCode,
  getProblemDetailFieldErrors,
  getProblemDetailMessage,
  getTraceId,
} from '@/services/http/http.client'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthBanner from '@/components/public/AuthBanner.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import { ArrowRight, IdCard, Lock, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const form = reactive({ employeeCode: '', password: '' })
const touched = reactive({ employeeCode: false, password: false })
const serverErrors = ref<Record<string, string>>({})

const submitting = ref(false)
const submitError = ref<string | null>(null)
// TR-05: el login tiene banner propio, no toast, asi que aqui el identificador de la traza se
// perdia. Y es la pantalla donde mas duele: un usuario que no entra no puede hacer nada mas.
const submitTraceId = ref<string | undefined>()
const emailNotVerified = ref(false)

function err(key: 'employeeCode' | 'password'): string | undefined {
  if (touched[key] && !form[key].trim()) return 'Campo requerido'
  return serverErrors.value[key]
}

async function submit() {
  submitError.value = null
  emailNotVerified.value = false
  serverErrors.value = {}
  submitTraceId.value = undefined
  touched.employeeCode = true
  touched.password = true
  if (!form.employeeCode.trim() || !form.password.trim()) return

  submitting.value = true
  try {
    const payload: LoginEmployeeRequest = {
      employeeCode: form.employeeCode.trim(),
      password: form.password,
    }
    // El refresh token no viene en la respuesta: el backend lo deja en una cookie HttpOnly.
    const { token, type } = await authApi.loginEmployee(payload)
    await login({ token, type })
    // El guard del router deja el destino original en `?redirect=` al mandar a
    // login; se sanea antes de usarlo (ver `sanitizeRedirect`) para no abrir un
    // redirect hacia fuera de la SPA, y se cae al home si no hay ninguno válido.
    const redirect = sanitizeRedirect(route.query.redirect)
    router.push(redirect ?? { name: 'home' })
  } catch (e) {
    serverErrors.value = getProblemDetailFieldErrors(e)
    submitTraceId.value = getTraceId(e)
    const code = getProblemDetailCode(e)
    // Auto-registro Opción B: cuenta sin verificar → 403 EMAIL_NOT_VERIFIED (banner específico).
    if (code === 'EMAIL_NOT_VERIFIED') {
      emailNotVerified.value = true
    } else if (code === 'INVALID_CREDENTIALS') {
      submitError.value =
        'El empleado o la contraseña no son correctos. Revísalos e intenta de nuevo.'
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
      <AuthBanner tone="error" @close="submitError = null"
        >{{ submitError }}
        <span v-if="submitTraceId" class="toast-trace-id login-trace">{{ submitTraceId }}</span>
      </AuthBanner>
    </div>

    <div class="ds-stack ds-stack--14">
      <AuthField label="Empleado" required :error="err('employeeCode')">
        <AuthInput
          v-model="form.employeeCode"
          :icon="IdCard"
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
          :icon="Lock"
          placeholder="••••••••"
          :maxlength="100"
          autocomplete="current-password"
          :invalid="!!err('password')"
          @blur="touched.password = true"
        />
      </AuthField>

      <div class="login-forgot">
        <RouterLink :to="{ name: 'recuperar-codigo' }">¿Olvidaste tu código?</RouterLink>
        <span class="login-forgot-sep">·</span>
        <RouterLink :to="{ name: 'recuperar-contrasena' }">¿Olvidaste tu contraseña?</RouterLink>
      </div>

      <PrimaryButton type="submit" :loading="submitting" loading-text="Ingresando…">
        Iniciar sesión <ArrowRight :size="14" aria-hidden="true" />
      </PrimaryButton>
    </div>

    <div class="login-divider ds-flex-row ds-flex-row--12">
      <span class="login-divider-line" />
      <span class="login-divider-word">o</span>
      <span class="login-divider-line" />
    </div>

    <RouterLink :to="{ name: 'signup' }" class="login-secondary">
      <Sparkles :size="15" aria-hidden="true" />
      Crear una cuenta nueva
    </RouterLink>
  </form>
</template>

<style scoped>
.login-form {
  font-family: Inter, sans-serif;
}

.login-banner {
  margin-bottom: 20px;
}

.login-forgot {
  margin-top: -4px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.login-forgot a {
  font-size: 13px;
  font-weight: 500;
  color: var(--pub-ame-700);
  text-decoration: none;
}

.login-forgot a:hover {
  text-decoration: underline;
}

.login-forgot-sep {
  color: var(--pub-line);
  font-size: 12px;
}

.login-divider {
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

  /* A11Y-09 · WCAG 2.2 §1.4.11: `--pub-line` medía 1,23:1 sobre el blanco del
     botón y el `#d6c8ea` del hover 1,48:1 sobre su relleno. `--pub-ink-400` es
     el escalón de la rampa pública reservado a glifos y bordes no textuales:
     3,94:1 en reposo y 3,70:1 sobre el relleno del hover, que por eso conserva
     el mismo borde. */
  border: 1px solid var(--pub-ink-400);
  background: #fff;
  color: var(--pub-ink-700);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
}

.login-secondary:hover {
  background: #faf6ff;
}

.login-secondary :deep(.v-icon) {
  color: var(--pub-ame-700);
}

/* TR-05: el identificador de la traza dentro del banner de error del login. */
.login-trace {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.75;
  font-family: ui-monospace, Menlo, monospace;
}
</style>
