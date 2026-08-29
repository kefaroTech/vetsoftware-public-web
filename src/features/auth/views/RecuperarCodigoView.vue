<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import { authApi } from '../api/auth.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

const RESEND_COOLDOWN_SECONDS = 60
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const form = reactive({ email: '' })
const touched = reactive({ email: false })
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
  if (!touched.email) return undefined
  if (!form.email.trim()) return 'Campo requerido'
  if (!EMAIL_RE.test(form.email.trim())) return 'Correo inválido'
  return undefined
}

async function submit() {
  submitError.value = null
  touched.email = true
  if (err()) return
  submitting.value = true
  try {
    await authApi.recoverCode(form.email.trim())
    // Respuesta uniforme exista o no el correo (anti-enumeración): mostramos siempre "revisa tu correo".
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
    await authApi.recoverCode(form.email.trim())
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
      ¿Ya lo recordaste? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
    </template>

    <div class="pub-card pub-reveal">
      <template v-if="!sent">
        <div class="pub-eyebrow">Recuperar código</div>
        <h1 class="pub-title">¿Olvidaste tu código?</h1>
        <p class="pub-sub">
          Escribe tu <strong>correo</strong> y te enviaremos tu código de usuario (y el de cada
          veterinaria si tienes más de una cuenta).
        </p>

        <form class="pub-form" novalidate @submit.prevent="submit">
          <div v-if="submitError" class="pub-error">{{ submitError }}</div>

          <AuthField label="Correo" required :error="err()">
            <AuthInput
              v-model="form.email"
              type="email"
              icon="mdi-email-outline"
              placeholder="tu@correo.com"
              :maxlength="100"
              autocomplete="email"
              :invalid="!!err()"
              @blur="touched.email = true"
            />
          </AuthField>

          <PrimaryButton type="submit" :loading="submitting" loading-text="Enviando…">
            Enviar código <v-icon size="14">mdi-arrow-right</v-icon>
          </PrimaryButton>
        </form>
      </template>

      <template v-else>
        <div class="rc-icon">
          <v-icon size="38">mdi-email-check-outline</v-icon>
        </div>
        <h1 class="pub-title">Revisa tu correo</h1>
        <p class="pub-sub">
          Si <strong>{{ form.email.trim() }}</strong> tiene cuentas en Vetrina, te enviamos tu(s)
          código(s) de usuario.
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
.rc-error--sent {
  margin: 0 0 16px;
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

.rc-resend {
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--pub-ink-500);
}

.rc-resend-wait {
  /* `--pub-ink-400` mide 4,05:1 sobre blanco y falla §1.4.3 AA; `--pub-ink-500` mide 6,12:1.
     El respaldo `#a08bbd` era además PEOR que el token que respaldaba (3,4:1), así que una
     cascada rota empeoraba el contraste en vez de conservarlo. Sin respaldo: el token está
     declarado en `.pub-scope`, que es el ámbito de esta pantalla. */
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
