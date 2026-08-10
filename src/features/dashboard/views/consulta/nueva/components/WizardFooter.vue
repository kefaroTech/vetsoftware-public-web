<script setup lang="ts">
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    showBack?: boolean
    nextLabel?: string
    nextDisabled?: boolean
    nextVariant?: 'primary' | 'success'
    nextLoading?: boolean
    showNext?: boolean
  }>(),
  {
    showBack: true,
    nextLabel: 'Siguiente',
    nextVariant: 'primary',
    showNext: true,
  },
)

defineEmits<{ back: []; next: [] }>()
</script>

<template>
  <footer class="footer">
    <button v-if="showBack" type="button" class="ds-btn ds-btn--ghost" @click="$emit('back')">
      <ArrowLeft :size="13" :stroke-width="1.8" />
      <span>Atrás</span>
    </button>
    <div class="extra">
      <slot name="extra" />
    </div>
    <div class="end">
      <slot name="endExtra" />
      <button
        v-if="showNext"
        type="button"
        class="ds-btn ds-btn--solid next"
        :class="{ success: nextVariant === 'success' }"
        :disabled="nextDisabled || nextLoading"
        @click="$emit('next')"
      >
        <span>{{ nextLabel }}</span>
        <ArrowRight :size="13" :stroke-width="1.8" />
      </button>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--warm-200);
  background: var(--warm-50);
  padding: 14px clamp(16px, 4vw, 56px);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

@media (width <= 720px) {
  .footer {
    padding: 12px 16px;
  }
}

.extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.end {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.next.success {
  background: oklch(50% 0.15 145deg);
}

.next:disabled {
  /* Este botón ya comunica el estado con su propio gris, así que anula la
     opacidad que `.ds-btn:disabled` aplica por defecto. */
  opacity: 1;
  background: var(--warm-150);
  color: var(--warm-500);
  cursor: not-allowed;
}
</style>
