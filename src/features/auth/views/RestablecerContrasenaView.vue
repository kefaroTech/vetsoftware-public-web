<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import { authApi } from '../api/auth.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

type State = 'loading' | 'form' | 'invalid' | 'success'

const route = useRoute()
const router = useRouter()

const state = ref<State>('loading')
const token = ref('')
const form = reactive({ password: '', confirm: '' })
const touched = reactive({ password: false, confirm: false })
const submitting = ref(false)
const submitError = ref<string | null>(null)

function err(key: 'password' | 'confirm'): string | undefined {
  if (!touched[key]) return undefined
  if (key === 'password') {
    if (!form.password) return 'La contraseña es requerida'
    if (form.password.length < 8) return 'Mínimo 8 caracteres'
    if (form.password.length > 100) return 'Máximo 100 caracteres'
    return undefined
  }
  if (!form.confirm) return 'Confirma la contraseña'
  if (form.confirm !== form.password) return 'Las contraseñas no coinciden'
  return undefined
}

onMounted(async () => {
  const raw = route.query.token
  const t = Array.isArray(raw) ? raw[0] : raw
  if (!t) {
    state.value = 'invalid'
    return
  }
  token.value = t
  try {
    state.value = (await authApi.validateResetToken(t)) ? 'form' : 'invalid'
  } catch {
    state.value = 'invalid'
  }
})

async function submit() {
  submitError.value = null
  touched.password = true
  touched.confirm = true
  if (err('password') || err('confirm')) return
  submitting.value = true
  try {
    await authApi.resetPassword(token.value, form.password)
    state.value = 'success'
  } catch (e) {
    submitError.value = getProblemDetailMessage(e, 'No se pudo restablecer la contraseña.')
    // Si el token expiró/ya se usó entre la validación y el envío, mostramos el estado inválido.
    state.value = 'invalid'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PublicLayout>
    <template #topRight>
      <RouterLink :to="{ name: 'login' }">Iniciar sesión</RouterLink>
    </template>

    <div class="rp-card pub-reveal">
      <!-- Validando token -->
      <template v-if="state === 'loading'">
        <div class="rp-center">
          <span class="rp-spin" />
          <p class="rp-sub">Validando el enlace…</p>
        </div>
      </template>

      <!-- Formulario de nueva contraseña -->
      <template v-else-if="state === 'form'">
        <div class="rp-eyebrow">Restablecer contraseña</div>
        <h1 class="rp-title">Crea una contraseña nueva</h1>
        <p class="rp-sub">Elige una contraseña nueva para tu cuenta. La usarás cada vez que inicies sesión.</p>

        <form class="rp-form" novalidate @submit.prevent="submit">
          <div v-if="submitError" class="rp-error">{{ submitError }}</div>

          <AuthField label="Nueva contraseña" required :error="err('password')">
            <AuthInput
              v-model="form.password"
              type="password"
              icon="mdi-lock-outline"
              placeholder="••••••••"
              :maxlength="100"
              autocomplete="new-password"
              :invalid="!!err('password')"
              @blur="touched.password = true"
            />
          </AuthField>

          <AuthField label="Confirmar contraseña" required :error="err('confirm')">
            <AuthInput
              v-model="form.confirm"
              type="password"
              icon="mdi-lock-check-outline"
              placeholder="••••••••"
              :maxlength="100"
              autocomplete="new-password"
              :invalid="!!err('confirm')"
              @blur="touched.confirm = true"
            />
          </AuthField>

          <PrimaryButton type="submit" :loading="submitting" loading-text="Guardando…">
            Guardar contraseña <v-icon size="14">mdi-arrow-right</v-icon>
          </PrimaryButton>
        </form>
      </template>

      <!-- Éxito -->
      <template v-else-if="state === 'success'">
        <div class="rp-icon rp-icon--ok">
          <v-icon size="38">mdi-check-circle-outline</v-icon>
        </div>
        <h1 class="rp-title">Contraseña actualizada</h1>
        <p class="rp-sub">Tu contraseña quedó cambiada. Ya puedes iniciar sesión con la nueva.</p>
        <div class="rp-actions">
          <PrimaryButton @click="router.push({ name: 'login' })">Iniciar sesión</PrimaryButton>
        </div>
      </template>

      <!-- Token inválido / expirado -->
      <template v-else>
        <div class="rp-icon rp-icon--err">
          <v-icon size="38">mdi-alert-circle-outline</v-icon>
        </div>
        <h1 class="rp-title">Enlace no válido</h1>
        <p class="rp-sub">El enlace de restablecimiento no es válido, expiró o ya se usó. Solicita uno nuevo.</p>
        <div class="rp-actions rp-actions--stack">
          <PrimaryButton @click="router.push({ name: 'recuperar-contrasena' })">
            Solicitar uno nuevo
          </PrimaryButton>
          <button type="button" class="rp-textbtn" @click="router.push({ name: 'login' })">
            Ir a iniciar sesión
          </button>
        </div>
      </template>
    </div>
  </PublicLayout>
</template>

<style scoped>
.rp-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: 40px 44px;
}
.rp-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--pub-ame-700);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.rp-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.06;
}
.rp-sub {
  font-size: 13px;
  color: var(--pub-ink-500);
  margin: 10px 0 26px;
  line-height: 1.55;
}
.rp-form {
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rp-error {
  background: var(--pub-err-bg);
  border: 1px solid var(--pub-err-bd);
  color: var(--pub-err-tx);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
}
.rp-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 0;
}
.rp-spin {
  width: 42px;
  height: 42px;
  border: 4px solid #e9d5ff;
  border-top-color: var(--pub-ame-700);
  border-radius: 50%;
  display: block;
  animation: pub-spin 0.8s linear infinite;
}
.rp-icon {
  width: 68px;
  height: 68px;
  margin: 0 0 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.rp-icon--ok {
  background: var(--pub-ok-bg);
  border: 1px solid var(--pub-ok-bd);
  color: var(--pub-ok-tx);
}
.rp-icon--err {
  background: var(--pub-err-bg);
  border: 1px solid var(--pub-err-bd);
  color: var(--pub-err-tx);
}
.rp-actions {
  margin-top: 24px;
}
.rp-actions--stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rp-textbtn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--pub-ink-500);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
}
.rp-textbtn:hover {
  color: var(--pub-ame-700);
}
@media (max-width: 520px) {
  .rp-card {
    padding: 32px 24px;
  }
}
</style>
