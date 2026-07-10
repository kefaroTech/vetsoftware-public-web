<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Mail } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'

const props = defineProps<{
  open: boolean
  employee: Employee | null
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [password: string]
}>()

type FieldKey = 'password' | 'confirm'

const password = ref('')
const confirm = ref('')
const touched = reactive<Record<FieldKey, boolean>>({ password: false, confirm: false })
const banner = ref(false)

function reset() {
  password.value = ''
  confirm.value = ''
  touched.password = false
  touched.confirm = false
  banner.value = false
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
  { immediate: true },
)

const errors = computed(() => {
  const e: Partial<Record<FieldKey, string>> = {}
  const pw = password.value
  if (!pw) e.password = 'La contraseña es requerida'
  else if (pw.length < 8) e.password = 'Mínimo 8 caracteres'
  else if (pw.length > 100) e.password = 'Máximo 100 caracteres'

  if (!confirm.value) e.confirm = 'Confirma la contraseña'
  else if (confirm.value !== pw) e.confirm = 'Las contraseñas no coinciden'
  return e
})

function err(field: FieldKey): string | undefined {
  return touched[field] && errors.value[field] ? errors.value[field] : undefined
}

function markTouched(field: FieldKey) {
  touched[field] = true
}

function submit() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  if (Object.keys(errors.value).length > 0) {
    banner.value = true
    return
  }
  banner.value = false
  emit('confirm', password.value)
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Reenviar invitación"
    subtitle="Se enviará de nuevo el correo con una nueva contraseña provisional."
    :icon="Mail"
    accent="amatista"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="banner" class="banner">Revisa los campos marcados antes de continuar.</div>
      <p class="intro">
        La contraseña anterior de
        <strong>{{ employee?.name ?? 'este empleado' }}</strong>
        ya está cifrada y no se puede recuperar. Escribe una nueva contraseña provisional; se enviará por
        correo a <strong>{{ employee?.email }}</strong> y deberá cambiarla en su próximo ingreso.
      </p>

      <div class="form">
        <BaseField
          label="Nueva contraseña provisional"
          required
          hint="Mínimo 8 caracteres."
          :error="err('password')"
        >
          <BaseInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            :invalid="!!err('password')"
            autocomplete="new-password"
            @blur="markTouched('password')"
          />
        </BaseField>

        <BaseField label="Confirmar contraseña" required :error="err('confirm')">
          <BaseInput
            v-model="confirm"
            type="password"
            placeholder="••••••••"
            :invalid="!!err('confirm')"
            autocomplete="new-password"
            @blur="markTouched('confirm')"
          />
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ghost" :disabled="busy" @click="emit('close')">Cancelar</button>
      <button type="button" class="primary" :disabled="busy" @click="submit">
        Reenviar invitación
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  margin-bottom: 14px;
}
.intro {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--warm-600);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ghost,
.primary {
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid transparent;
}
.ghost {
  background: var(--warm-50);
  color: var(--warm-700);
  border-color: var(--warm-200);
}
.ghost:hover:not(:disabled) {
  background: var(--warm-100);
}
.primary {
  background: var(--amatista-700);
  color: white;
}
.primary:hover:not(:disabled) {
  background: var(--amatista-800);
}
.ghost:disabled,
.primary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
