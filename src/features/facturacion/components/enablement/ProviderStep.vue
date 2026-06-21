<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Settings } from 'lucide-vue-next'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useToast } from '@/composables/useToast'
import { useFacturacionEnablement } from '../../composables/useFacturacionEnablement'
import type { SaveDianProviderConfigRequest } from '../../types/facturacion'
import SectionHead from './SectionHead.vue'
import WizardFooter from './WizardFooter.vue'

const emit = defineEmits<{ back: []; next: [] }>()

const { provider, saveProvider } = useFacturacionEnablement()
const toast = useToast()

const draft = reactive({
  baseUrl: provider.value?.baseUrl ?? '',
  clientId: provider.value?.clientId ?? '',
  numberingProviderRef: provider.value?.numberingProviderRef ?? '',
  clientSecret: '',
  apiToken: '',
  username: '',
  password: '',
  webhookSecret: '',
})

const submitted = ref(false)
const saving = ref(false)

function invalid(field: 'baseUrl' | 'clientId'): boolean {
  return submitted.value && !draft[field].trim()
}

const SECRETS = [
  { field: 'clientSecret', label: 'Client Secret', flag: 'clientSecretConfigured' },
  { field: 'apiToken', label: 'API Token (PAT)', flag: 'apiTokenConfigured' },
  { field: 'username', label: 'Usuario (login MATIAS)', flag: 'usernameConfigured' },
  { field: 'password', label: 'Contraseña', flag: 'passwordConfigured' },
  { field: 'webhookSecret', label: 'Webhook Secret (HMAC)', flag: 'webhookSecretConfigured' },
] as const

function configured(flag: (typeof SECRETS)[number]['flag']): boolean {
  return !!provider.value?.[flag]
}

async function save() {
  submitted.value = true
  if (!draft.baseUrl.trim() || !draft.clientId.trim()) return
  saving.value = true
  try {
    // Los secretos vacíos se omiten: el backend conserva el valor cifrado actual.
    const body: SaveDianProviderConfigRequest = {
      provider: 'MATIAS',
      baseUrl: draft.baseUrl.trim(),
      clientId: draft.clientId.trim() || null,
      numberingProviderRef: draft.numberingProviderRef.trim() || null,
    }
    if (draft.clientSecret) body.clientSecret = draft.clientSecret
    if (draft.apiToken) body.apiToken = draft.apiToken
    if (draft.username) body.username = draft.username
    if (draft.password) body.password = draft.password
    if (draft.webhookSecret) body.webhookSecret = draft.webhookSecret
    await saveProvider(body)
    toast.success('Proveedor guardado', 'Conexión con MATIAS actualizada.')
    emit('next')
  } catch {
    toast.error('No se pudo guardar', 'Revisa los datos del proveedor e intenta de nuevo.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="formcol">
    <SectionHead
      :icon="Settings"
      title="Cuenta del proveedor (MATIAS)"
      sub="Enlaza la cuenta emisora de la clínica con el proveedor tecnológico autorizado por la DIAN. Contiene credenciales secretas."
    />
    <div class="card">
      <div class="grid">
        <BaseField label="Proveedor">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              model-value="MATIAS"
              :options="[{ value: 'MATIAS', label: 'MATIAS' }]"
              disabled
            />
          </template>
        </BaseField>
        <BaseField label="Ref. de numeración del proveedor">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.numberingProviderRef" placeholder="Opcional" />
          </template>
        </BaseField>
        <div class="span-2">
          <BaseField
            label="URL base del proveedor"
            required
            :error="invalid('baseUrl') ? 'Requerida' : undefined"
            hint="Te la entrega MATIAS al crear la cuenta de la clínica."
          >
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.baseUrl"
                placeholder="https://api.matias.co/v1"
                :invalid="invalid('baseUrl')"
              />
            </template>
          </BaseField>
        </div>
        <div class="span-2">
          <BaseField
            label="Client ID"
            required
            :error="invalid('clientId') ? 'Requerido' : undefined"
          >
            <template #default="{ id }">
              <BaseInput :id="id" v-model="draft.clientId" :invalid="invalid('clientId')" />
            </template>
          </BaseField>
        </div>
      </div>

      <div class="secrets">
        <div class="secrets-label">Credenciales (secretas)</div>
        <div class="grid">
          <BaseField v-for="s in SECRETS" :key="s.field" :label="s.label">
            <template #default="{ id }">
              <div>
                <BaseInput
                  :id="id"
                  v-model="draft[s.field]"
                  type="password"
                  :placeholder="configured(s.flag) ? '•••••••• (configurado)' : 'Sin configurar'"
                />
                <div class="secret-state" :class="{ ok: configured(s.flag) }">
                  {{
                    configured(s.flag)
                      ? 'Configurado · deja vacío para conservar'
                      : 'Sin configurar'
                  }}
                </div>
              </div>
            </template>
          </BaseField>
        </div>
      </div>
    </div>

    <WizardFooter
      :next-disabled="saving"
      :next-label="saving ? 'Guardando…' : 'Guardar y continuar'"
      @next="save"
    />
  </div>
</template>

<style scoped>
.formcol {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: clamp(20px, 2vw, 28px);
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 22px;
}
.span-2 {
  grid-column: 1 / -1;
}
.secrets {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--warm-200);
}
.secrets-label {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 12px;
}
.secret-state {
  margin-top: 5px;
  font-size: 11px;
  color: var(--warm-500);
}
.secret-state.ok {
  color: oklch(45% 0.12 150);
}
</style>
