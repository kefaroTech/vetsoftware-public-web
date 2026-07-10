<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registrationApi } from '../api/registration.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

const route = useRoute()
const router = useRouter()

type Status = 'verifying' | 'success' | 'error'
const status = ref<Status>('verifying')
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  const raw = route.query.token
  const token = Array.isArray(raw) ? raw[0] : raw
  if (!token) {
    status.value = 'error'
    errorMessage.value = 'El enlace de verificación no es válido o está incompleto.'
    return
  }
  try {
    await registrationApi.verifyEmail(token)
    status.value = 'success'
  } catch (e) {
    status.value = 'error'
    errorMessage.value = getProblemDetailMessage(
      e,
      'El enlace de verificación no es válido o expiró.',
    )
  }
})

function goToLogin() {
  router.push({ name: 'login' })
}
function goToSignup() {
  router.push({ name: 'signup' })
}
</script>

<template>
  <v-main class="vet-auth-shell">
    <v-container class="py-16 d-flex justify-center">
      <v-card class="vet-auth-card mx-auto text-center" max-width="520" :elevation="0">
        <template v-if="status === 'verifying'">
          <h1 class="vet-auth-title">Verificando tu cuenta…</h1>
          <p class="vet-auth-sub">Un momento, estamos confirmando tu correo.</p>
          <v-progress-circular indeterminate color="primary" class="mt-2" />
        </template>

        <template v-else-if="status === 'success'">
          <v-icon size="56" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
          <h1 class="vet-auth-title">¡Cuenta verificada!</h1>
          <p class="vet-auth-sub">Tu correo quedó confirmado. Ya puedes iniciar sesión.</p>
          <v-btn color="primary" size="large" block class="mt-4 vet-auth-submit" @click="goToLogin">
            Iniciar sesión
          </v-btn>
        </template>

        <template v-else>
          <v-icon size="56" color="error" class="mb-2">mdi-alert-circle-outline</v-icon>
          <h1 class="vet-auth-title">No pudimos verificar</h1>
          <p class="vet-auth-sub">{{ errorMessage }}</p>
          <v-btn color="primary" size="large" block class="mt-4 vet-auth-submit" @click="goToSignup">
            Volver a registrarme
          </v-btn>
          <v-btn variant="text" block class="mt-2" @click="goToLogin">Ir a iniciar sesión</v-btn>
        </template>
      </v-card>
    </v-container>
  </v-main>
</template>

<style scoped>
.vet-auth-shell {
  background:
    radial-gradient(at 25% 0%, oklch(95% 0.04 var(--hue)) 0%, transparent 50%),
    radial-gradient(at 75% 100%, oklch(95% 0.03 calc(var(--hue) - 20)) 0%, transparent 50%),
    var(--warm-100);
  min-height: 100vh;
}
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
  font-size: 26px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.15;
}
.vet-auth-sub {
  margin: 8px 0 0;
  color: var(--warm-600);
  font-size: 14px;
  line-height: 1.5;
}
.vet-auth-submit {
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 9px !important;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
}
.vet-auth-submit:hover:not(:disabled) {
  filter: brightness(1.05);
}
</style>
