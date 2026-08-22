<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  icon: Component
  title: string
  subtitle?: string
  label: string
  placeholder?: string
  cta?: string
  /**
   * FORM-10 — lo controla el padre mientras la mutación está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()

const emit = defineEmits<{ save: [text: string]; close: [] }>()

const text = ref('')
const submitted = ref(false)

/**
 * FORM-10 — guarda de reenvío. `save()` emite y devuelve el control de
 * inmediato; hasta que el padre cierre el modal el botón sigue activo, y dos
 * pulsaciones son dos notas duplicadas en la historia. La bandera se levanta al
 * emitir y baja al reabrir.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

watch(
  () => props.open,
  (open) => {
    if (open) {
      text.value = ''
      submitted.value = false
      emitted.value = false
    }
  },
)

function save() {
  if (busy.value) return
  submitted.value = true
  if (text.value.trim().length < 2) {
    void scrollToFirstError()
    return
  }
  emitted.value = true
  emit('save', text.value.trim())
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="icon"
    :title="title"
    :subtitle="subtitle"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <BaseField
        :label="label"
        required
        :error="submitted && text.trim().length < 2 ? 'Escribe el contenido' : undefined"
      >
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="text"
            :rows="5"
            :placeholder="placeholder"
            :invalid="submitted && text.trim().length < 2"
          />
        </template>
      </BaseField>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" :disabled="busy" @click="save">
        {{ busy ? 'Guardando…' : (cta ?? 'Guardar') }}
      </button>
    </template>
  </ModalShell>
</template>
