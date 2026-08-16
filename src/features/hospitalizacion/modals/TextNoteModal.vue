<script setup lang="ts">
import { ref, watch, type Component } from 'vue'
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
}>()

const emit = defineEmits<{ save: [text: string]; close: [] }>()

const text = ref('')
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      text.value = ''
      submitted.value = false
    }
  },
)

function save() {
  submitted.value = true
  if (text.value.trim().length < 2) {
    scrollToFirstError()
    return
  }
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
      <button type="button" class="ds-btn ds-btn--solid" @click="save">
        {{ cta ?? 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>
