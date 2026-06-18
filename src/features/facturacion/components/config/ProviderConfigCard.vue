<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '../../composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import { dianProviderConfigApi } from '../../api/dianProviderConfig.api'
import type {
  DianProviderConfigResponse,
  SaveDianProviderConfigRequest,
} from '../../types/facturacion'

const toast = useToast()
const { can } = useFacturacionAccess()
const canManage = can(PERMISSIONS.DIAN_PROVIDER_CONFIG_MANAGE)

const existing = ref<DianProviderConfigResponse | null>(null)
const loading = ref(false)
const busy = ref(false)

const form = reactive({
  baseUrl: '',
  clientId: '',
  numberingProviderRef: '',
  // Secretos: vacío = conservar el actual.
  clientSecret: '',
  username: '',
  password: '',
  apiToken: '',
  webhookSecret: '',
})

const SECRETS = [
  { key: 'clientSecret', label: 'Client Secret', flag: 'clientSecretConfigured' },
  { key: 'username', label: 'Usuario (email MATIAS)', flag: 'usernameConfigured' },
  { key: 'password', label: 'Contraseña', flag: 'passwordConfigured' },
  { key: 'apiToken', label: 'API Token (PAT)', flag: 'apiTokenConfigured' },
  { key: 'webhookSecret', label: 'Webhook Secret', flag: 'webhookSecretConfigured' },
] as const

onMounted(load)

async function load() {
  loading.value = true
  try {
    const cfg = await dianProviderConfigApi.find()
    existing.value = cfg
    if (cfg) {
      form.baseUrl = cfg.baseUrl
      form.clientId = cfg.clientId ?? ''
      form.numberingProviderRef = cfg.numberingProviderRef ?? ''
    }
  } catch (e) {
    toast.error('No se pudo cargar el proveedor', getProblemDetailMessage(e))
  } finally {
    loading.value = false
  }
}

function configured(flag: string): boolean {
  return !!existing.value && (existing.value as unknown as Record<string, boolean>)[flag]
}

async function save() {
  if (busy.value || !form.baseUrl.trim()) {
    if (!form.baseUrl.trim()) toast.warn('Falta la URL', 'La URL base es obligatoria.')
    return
  }
  busy.value = true
  const payload: SaveDianProviderConfigRequest = {
    provider: 'MATIAS',
    baseUrl: form.baseUrl.trim(),
    clientId: form.clientId.trim() || null,
    numberingProviderRef: form.numberingProviderRef.trim() || null,
  }
  // Solo enviar secretos que el usuario escribió (vacío = conservar).
  for (const s of SECRETS) {
    const v = (form[s.key] as string).trim()
    if (v) (payload as unknown as Record<string, unknown>)[s.key] = v
  }
  try {
    const saved = existing.value
      ? await dianProviderConfigApi.update(payload)
      : await dianProviderConfigApi.create(payload)
    existing.value = saved
    for (const s of SECRETS) form[s.key] = ''
    toast.success('Proveedor guardado', 'La configuración DIAN se actualizó.')
  } catch (e) {
    toast.error('No se pudo guardar', getProblemDetailMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="card">
    <header class="card-head">
      <div>
        <h2>Proveedor DIAN</h2>
        <p>Conexión con el proveedor tecnológico (MATIAS). Los secretos no se muestran; déjalos vacíos para conservarlos.</p>
      </div>
    </header>

    <div v-if="loading" class="muted">Cargando…</div>
    <template v-else>
      <div class="grid2">
        <BaseField label="URL base" required>
          <template #default="{ id }"><BaseInput :id="id" v-model="form.baseUrl" :disabled="!canManage" placeholder="https://api.matias.co/v1" /></template>
        </BaseField>
        <BaseField label="Client ID">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.clientId" :disabled="!canManage" /></template>
        </BaseField>
        <BaseField label="Ref. numeración del proveedor">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.numberingProviderRef" :disabled="!canManage" /></template>
        </BaseField>
      </div>

      <div class="secrets">
        <div class="secrets-lab">Credenciales (secretas)</div>
        <div class="grid2">
          <BaseField v-for="s in SECRETS" :key="s.key" :label="s.label">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="form[s.key]"
                type="password"
                :disabled="!canManage"
                :placeholder="configured(s.flag) ? 'Configurado — dejar vacío para conservar' : 'Sin configurar'"
              />
            </template>
          </BaseField>
        </div>
      </div>

      <div v-if="canManage" class="actions">
        <button type="button" class="btn-primary" :disabled="busy" @click="save">{{ busy ? 'Guardando…' : 'Guardar' }}</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.card { background: white; border: 1px solid var(--warm-200); border-radius: 14px; padding: 22px 24px; }
.card-head { margin-bottom: 16px; }
.card-head h2 { margin: 0; font-family: var(--font-serif); font-size: 20px; color: var(--warm-900); font-weight: 400; }
.card-head p { margin: 4px 0 0; font-size: 12.5px; color: var(--warm-500); max-width: 560px; }
.muted { font-size: 13px; color: var(--warm-500); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
.secrets { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--warm-100); }
.secrets-lab { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--warm-500); margin-bottom: 12px; font-weight: 600; }
.actions { margin-top: 18px; display: flex; justify-content: flex-end; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 9px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
