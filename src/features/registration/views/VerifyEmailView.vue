<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registrationApi } from '../api/registration.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useTokenDeEnlace } from '@/composables/useTokenDeEnlace'

/** Pantalla 3 — Verificación de correo (handoff §7.3). 3 estados: loading | success | error. */
const router = useRouter()
const { tomarTokenDeLaUrl } = useTokenDeEnlace()

type State = 'loading' | 'success' | 'error'
const state = ref<State>('loading')
const errorMessage = ref('El enlace de verificación no es válido o expiró.')

onMounted(async () => {
  // El token sale de la barra ANTES de gastarlo: si la verificación falla o
  // tarda, no ha estado visible entretanto. Se recibe ya en una variable local,
  // así que el desenlace de error —token inválido o caducado— sigue teniendo el
  // valor que necesita para pedirlo y para contarlo.
  const token = await tomarTokenDeLaUrl()
  if (!token) {
    state.value = 'error'
    return
  }
  try {
    await registrationApi.verifyEmail(token)
    state.value = 'success'
  } catch (e) {
    errorMessage.value = getProblemDetailMessage(
      e,
      'El enlace de verificación no es válido o expiró.',
    )
    state.value = 'error'
  }
})
</script>

<template>
  <PublicLayout footer-center>
    <div class="verify-card pub-reveal">
      <!-- Verificando -->
      <template v-if="state === 'loading'">
        <div class="verify-icon verify-icon--load">
          <PawLoader :size="46" :glow="false" :speed="900" label="Verificando tu cuenta" />
        </div>
        <h1 class="verify-title">Verificando tu cuenta…</h1>
        <p class="verify-text">Un momento, estamos confirmando tu correo.</p>
      </template>

      <!-- Éxito -->
      <template v-else-if="state === 'success'">
        <div class="verify-icon verify-icon--ok">
          <v-icon size="40">mdi-check-circle-outline</v-icon>
        </div>
        <h1 class="verify-title">¡Cuenta verificada!</h1>
        <p class="verify-text">Tu correo quedó confirmado. Ya puedes iniciar sesión.</p>
        <div class="verify-actions">
          <PrimaryButton @click="router.push({ name: 'login' })">Iniciar sesión</PrimaryButton>
        </div>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="verify-icon verify-icon--err">
          <v-icon size="40">mdi-alert-circle-outline</v-icon>
        </div>
        <h1 class="verify-title">No pudimos verificar</h1>
        <p class="verify-text">{{ errorMessage }}</p>
        <div class="verify-actions verify-actions--stack">
          <PrimaryButton @click="router.push({ name: 'signup' })"
            >Volver a registrarme</PrimaryButton
          >
          <button type="button" class="verify-textbtn" @click="router.push({ name: 'login' })">
            Ir a iniciar sesión
          </button>
        </div>
      </template>
    </div>
  </PublicLayout>
</template>

<style scoped>
.verify-card {
  width: 100%;
  max-width: 520px;
  text-align: center;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: clamp(30px, 5vw, 46px) clamp(26px, 5vw, 44px);
}

.verify-icon {
  width: 74px;
  height: 74px;
  margin: 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.verify-icon--load {
  border-radius: 0;
}

.verify-icon--ok {
  background: var(--pub-ok-bg);
  border: 1px solid var(--pub-ok-bd);
  color: var(--pub-ok-tx);
}

/* `--pub-err-tx` sobre `--pub-err-bg` mide 4,41:1 y falla §1.4.3 AA por 0,09.
   `--pub-err-tx-2` mide 5,91:1 sobre el mismo fondo. */
.verify-icon--err {
  background: var(--pub-err-bg);
  border: 1px solid var(--pub-err-bd);
  color: var(--pub-err-tx-2);
}

.verify-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  font-weight: 400;
  margin: 18px 0 0;
  letter-spacing: -0.02em;
  line-height: 1.08;
}

.verify-text {
  font-size: 14.5px;
  color: var(--pub-ink-600);
  line-height: 1.6;
  margin: 12px auto 0;
  max-width: 380px;
}

.verify-actions {
  margin-top: 26px;
}

.verify-actions--stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verify-textbtn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--pub-ink-500);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
}

.verify-textbtn:hover {
  color: var(--pub-ame-700);
}
</style>
