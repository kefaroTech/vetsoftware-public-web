<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import { authApi } from '../api/auth.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

const RESEND_COOLDOWN_SECONDS = 60

const form = reactive({ employeeCode: '' })
const touched = reactive({ employeeCode: false })
const submitting = ref(false)
const submitError = ref<string | null>(null)
const sent = ref(false)

// Reenvío con cooldown: tras enviar, hay que esperar 60 s antes de poder reenviar el correo.
const cooldown = ref(0)
const resending = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function startCooldown() {
  stopTimer()
  cooldown.value = RESEND_COOLDOWN_SECONDS
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) stopTimer()
  }, 1000)
}

onUnmounted(stopTimer)

function err(): string | undefined {
  if (touched.employeeCode && !form.employeeCode.trim()) return 'Campo requerido'
  return undefined
}

async function submit() {
  submitError.value = null
  touched.employeeCode = true
  if (!form.employeeCode.trim()) return
  submitting.value = true
  try {
    await authApi.forgotPassword(form.employeeCode.trim())
    // El backend responde igual exista o no el código (anti-enumeración): mostramos siempre "revisa tu correo".
    sent.value = true
    startCooldown()
  } catch (e) {
    submitError.value = getProblemDetailMessage(e, 'No se pudo procesar la solicitud. Inténtalo de nuevo.')
  } finally {
    submitting.value = false
  }
}

async function resend() {
  if (cooldown.value > 0 || resending.value) return
  submitError.value = null
  resending.value = true
  try {
    await authApi.forgotPassword(form.employeeCode.trim())
    startCooldown()
  } catch (e) {
    submitError.value = getProblemDetailMessage(e, 'No se pudo reenviar el correo. Inténtalo de nuevo.')
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <PublicLayout>
    <template #topRight>
      ¿Ya la recordaste? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
    </template>

    <div class="rc-card pub-reveal">
      <template v-if="!sent">
        <div class="rc-eyebrow">Recuperar contraseña</div>
        <h1 class="rc-title">¿Olvidaste tu contraseña?</h1>
        <p class="rc-sub">
          Escribe tu <strong>código de usuario</strong> y te enviaremos un enlace al correo registrado para
          crear una contraseña nueva.
        </p>

        <form class="rc-form" novalidate @submit.prevent="submit">
          <div v-if="submitError" class="rc-error">{{ submitError }}</div>

          <AuthField label="Código de usuario" required :error="err()">
            <AuthInput
              v-model="form.employeeCode"
              icon="mdi-card-account-details-outline"
              placeholder="ADMIN-001"
              :maxlength="50"
              autocomplete="username"
              :invalid="!!err()"
              @blur="touched.employeeCode = true"
            />
          </AuthField>

          <PrimaryButton type="submit" :loading="submitting" loading-text="Enviando…">
            Enviar enlace <v-icon size="14">mdi-arrow-right</v-icon>
          </PrimaryButton>
        </form>
      </template>

      <template v-else>
        <div class="rc-icon">
          <v-icon size="38">mdi-email-check-outline</v-icon>
        </div>
        <h1 class="rc-title">Revisa tu correo</h1>
        <p class="rc-sub">
          Si el código <strong>{{ form.employeeCode.trim() }}</strong> corresponde a una cuenta, enviamos un
          enlace al correo registrado. El enlace vence en 1 hora.
        </p>

        <div v-if="submitError" class="rc-error rc-error--sent">{{ submitError }}</div>

        <div class="rc-resend">
          <span>¿No lo recibiste?</span>
          <span v-if="cooldown > 0" class="rc-resend-wait">Podrás reenviar en {{ cooldown }} s</span>
          <button
            v-else
            type="button"
            class="rc-resend-btn"
            :disabled="resending"
            @click="resend"
          >
            {{ resending ? 'Reenviando…' : 'Reenviar correo' }}
          </button>
        </div>

        <div class="rc-actions">
          <RouterLink :to="{ name: 'login' }" class="rc-link">Volver a iniciar sesión</RouterLink>
        </div>
      </template>
    </div>
  </PublicLayout>
</template>

<style scoped>
.rc-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: 40px 44px;
  text-align: left;
}
.rc-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--pub-ame-700);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.rc-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.06;
}
.rc-sub {
  font-size: 13px;
  color: var(--pub-ink-500);
  margin: 10px 0 26px;
  line-height: 1.55;
}
.rc-form {
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rc-error {
  background: var(--pub-err-bg);
  border: 1px solid var(--pub-err-bd);
  color: var(--pub-err-tx);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
}
.rc-icon {
  width: 68px;
  height: 68px;
  margin: 0 0 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--pub-ok-bg);
  border: 1px solid var(--pub-ok-bd);
  color: var(--pub-ok-tx);
}
.rc-error--sent {
  margin: 0 0 16px;
}
.rc-resend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--pub-ink-500);
}
.rc-resend-wait {
  color: var(--pub-ink-400, #a08bbd);
  font-weight: 500;
}
.rc-resend-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--pub-ame-700);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
}
.rc-resend-btn:hover:not(:disabled) {
  text-decoration: underline;
}
.rc-resend-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.rc-actions {
  margin-top: 24px;
}
.rc-link {
  color: var(--pub-ame-700);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
}
.rc-link:hover {
  text-decoration: underline;
}
@media (max-width: 520px) {
  .rc-card {
    padding: 32px 24px;
  }
}
</style>
