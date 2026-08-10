<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthBanner from '@/components/public/AuthBanner.vue'
import AuthField from '@/components/public/AuthField.vue'
import AuthInput from '@/components/public/AuthInput.vue'
import { authApi } from '../api/auth.api'
import { useAuth } from '../composables/useAuth'
import { getProblemDetailMessage } from '@/services/http/http.client'

const router = useRouter()
const { me, refreshMe, logout } = useAuth()

const form = reactive({ password: '', confirm: '' })
const touched = reactive({ password: false, confirm: false })
const submitting = ref(false)
const submitError = ref<string | null>(null)

const firstName = computed(() => me.value?.name?.split(/\s+/)[0] ?? '')

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

async function submit() {
  submitError.value = null
  touched.password = true
  touched.confirm = true
  if (err('password') || err('confirm')) return

  submitting.value = true
  try {
    await authApi.changePassword(form.password)
    await refreshMe()
    router.push({ name: 'home' })
  } catch (e) {
    submitError.value = getProblemDetailMessage(e, 'No se pudo cambiar la contraseña')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PublicLayout>
    <template #topRight>
      <a href="#" class="logout-link" @click.prevent="logout">Cerrar sesión</a>
    </template>

    <div class="pub-card pub-reveal">
      <div class="pub-eyebrow">Primer ingreso</div>
      <h1 class="pub-title">Crea tu contraseña</h1>
      <p class="pub-sub">
        <template v-if="firstName">Hola {{ firstName }}. </template>Por seguridad, define una
        contraseña nueva para tu cuenta. La necesitarás cada vez que inicies sesión.
      </p>

      <form class="cp-form" novalidate @submit.prevent="submit">
        <div v-if="submitError" class="cp-banner">
          <AuthBanner tone="error" @close="submitError = null">{{ submitError }}</AuthBanner>
        </div>

        <div class="cp-fields">
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
            Guardar y entrar <v-icon size="14">mdi-arrow-right</v-icon>
          </PrimaryButton>
        </div>
      </form>
    </div>
  </PublicLayout>
</template>

<style scoped>
.cp-banner {
  margin-bottom: 20px;
}

.cp-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.logout-link {
  color: var(--pub-ink-700);
  font-weight: 600;
  text-decoration: none;
}

.logout-link:hover {
  text-decoration: underline;
}

.cp-form {
  font-family: Inter, sans-serif;
}

/* Estas dos pantallas llevan el titular un punto más grande. */
.pub-title {
  font-size: 34px;
  line-height: 1.05;
}

.pub-sub {
  margin: 10px 0 28px;
  line-height: 1.5;
}
</style>
