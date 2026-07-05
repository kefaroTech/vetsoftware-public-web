<script setup lang="ts">
import { ref, watch, type Component } from 'vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
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
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="save">
        {{ cta ?? 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn-ghost:hover { background: var(--warm-100); }
.btn-primary {
  background: var(--amatista-700);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover { filter: brightness(1.05); }
</style>
