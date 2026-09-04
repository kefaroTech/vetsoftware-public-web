<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import { authApi } from '../api/auth.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { ArrowRight, IdCard, MailCheck } from 'lucide-vue-next'

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
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo procesar la solicitud. Inténtalo de nuevo.',
    )
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
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo reenviar el correo. Inténtalo de nuevo.',
    )
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

    <div class="pub-card pub-reveal">
      <template v-if="!sent">
        <div class="pub-eyebrow">Recuperar contraseña</div>
        <h1 class="pub-title">¿Olvidaste tu contraseña?</h1>
        <p class="pub-sub">
          Escribe tu <strong>código de usuario</strong> y te enviaremos un enlace al correo
          registrado para crear una contraseña nueva.
        </p>

        <form class="pub-form" novalidate @submit.prevent="submit">
          <div v-if="submitError" class="pub-error">{{ submitError }}</div>

          <AuthField label="Código de usuario" required :error="err()">
            <AuthInput
              v-model="form.employeeCode"
              :icon="IdCard"
              placeholder="ADMIN-001"
              :maxlength="50"
              autocomplete="username"
              :invalid="!!err()"
              @blur="touched.employeeCode = true"
            />
          </AuthField>

          <PrimaryButton type="submit" :loading="submitting" loading-text="Enviando…">
            Enviar enlace <ArrowRight :size="14" aria-hidden="true" />
          </PrimaryButton>
        </form>
      </template>

      <template v-else>
        <div class="rc-icon">
          <MailCheck :size="38" aria-hidden="true" />
        </div>
        <h1 class="pub-title">Revisa tu correo</h1>
        <p class="pub-sub">
          Si el código <strong>{{ form.employeeCode.trim() }}</strong> corresponde a una cuenta,
          enviamos un enlace al correo registrado. El enlace vence en 1 hora.
        </p>

        <div v-if="submitError" class="pub-error rc-error--sent">{{ submitError }}</div>

        <div class="rc-resend ds-flex-row">
          <span>¿No lo recibiste?</span>
          <span v-if="cooldown > 0" class="rc-resend-wait"
            >Podrás reenviar en {{ cooldown }} s</span
          >
          <button v-else type="button" class="rc-resend-btn" :disabled="resending" @click="resend">
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
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--pub-ink-500);
}

.rc-resend-wait {
  color: var(--pub-ink-500);
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

/* Override mínimo sobre `.pub-card` de public-auth.css. */
.pub-card {
  text-align: left;
}
</style>
