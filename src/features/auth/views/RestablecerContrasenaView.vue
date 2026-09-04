<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { useTokenDeEnlace } from '@/composables/useTokenDeEnlace'
import { authApi } from '../api/auth.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { ArrowRight, CircleAlert, CircleCheck, Lock, ShieldCheck } from 'lucide-vue-next'

type State = 'loading' | 'form' | 'invalid' | 'success'

const router = useRouter()
const { tomarTokenDeLaUrl } = useTokenDeEnlace()

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
  // El token sale de la barra ANTES de gastarlo. Es la credencial más fuerte que
  // maneja el front sin sesión —permite FIJAR la contraseña de la cuenta hasta
  // que se consuma—, y el rato en que está expuesta es justo el que duran estas
  // dos peticiones: limpiar al terminar la dejaría visible durante todo el viaje
  // de red, y para siempre si la petición falla o se cuelga.
  //
  // El valor se queda en un `ref` de esta instancia y no en un store: `submit()`
  // lo necesita después, muere con la pantalla, y una acción de Pinia lo
  // republicaría en la línea de tiempo de las devtools. Por eso limpiar la URL
  // NO deja a la pantalla sin saber qué token traía.
  const t = await tomarTokenDeLaUrl()
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

    <div class="pub-card pub-reveal">
      <!-- Validando token -->
      <template v-if="state === 'loading'">
        <div class="rp-center ds-stack ds-stack--14">
          <PawLoader :size="42" :glow="false" :speed="900" label="Validando el enlace" />
          <p class="pub-sub">Validando el enlace…</p>
        </div>
      </template>

      <!-- Formulario de nueva contraseña -->
      <template v-else-if="state === 'form'">
        <div class="pub-eyebrow">Restablecer contraseña</div>
        <h1 class="pub-title">Crea una contraseña nueva</h1>
        <p class="pub-sub">
          Elige una contraseña nueva para tu cuenta. La usarás cada vez que inicies sesión.
        </p>

        <form class="pub-form" novalidate @submit.prevent="submit">
          <div v-if="submitError" class="pub-error">{{ submitError }}</div>

          <AuthField label="Nueva contraseña" required :error="err('password')">
            <AuthInput
              v-model="form.password"
              type="password"
              :icon="Lock"
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
              :icon="ShieldCheck"
              placeholder="••••••••"
              :maxlength="100"
              autocomplete="new-password"
              :invalid="!!err('confirm')"
              @blur="touched.confirm = true"
            />
          </AuthField>

          <PrimaryButton type="submit" :loading="submitting" loading-text="Guardando…">
            Guardar contraseña <ArrowRight :size="14" aria-hidden="true" />
          </PrimaryButton>
        </form>
      </template>

      <!-- Éxito -->
      <template v-else-if="state === 'success'">
        <div class="rp-icon rp-icon--ok">
          <CircleCheck :size="38" aria-hidden="true" />
        </div>
        <h1 class="pub-title">Contraseña actualizada</h1>
        <p class="pub-sub">Tu contraseña quedó cambiada. Ya puedes iniciar sesión con la nueva.</p>
        <div class="rp-actions">
          <PrimaryButton @click="router.push({ name: 'login' })">Iniciar sesión</PrimaryButton>
        </div>
      </template>

      <!-- Token inválido / expirado -->
      <template v-else>
        <div class="rp-icon rp-icon--err">
          <CircleAlert :size="38" aria-hidden="true" />
        </div>
        <h1 class="pub-title">Enlace no válido</h1>
        <p class="pub-sub">
          El enlace de restablecimiento no es válido, expiró o ya se usó. Solicita uno nuevo.
        </p>
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
.rp-center {
  align-items: center;
  padding: 20px 0;
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

/* `--pub-err-tx` sobre `--pub-err-bg` mide 4,41:1 y falla §1.4.3 AA por 0,09.
   `--pub-err-tx-2` mide 5,91:1 sobre el mismo fondo. Mismo cambio que ya llevaban
   `AuthField`, `AuthBanner` y `AuthInput`; estos dos se habían quedado atrás. */
.rp-icon--err {
  background: var(--pub-err-bg);
  border: 1px solid var(--pub-err-bd);
  color: var(--pub-err-tx-2);
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
</style>
