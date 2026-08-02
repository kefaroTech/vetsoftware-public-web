<script setup lang="ts">
withDefaults(
  defineProps<{
    showBack?: boolean
    nextLabel?: string
    nextDisabled?: boolean
    draftNote?: string | null
  }>(),
  { showBack: false, nextLabel: 'Guardar y continuar', nextDisabled: false, draftNote: null },
)

defineEmits<{ back: []; next: [] }>()
</script>

<template>
  <div class="wizfoot">
    <button v-if="showBack" type="button" class="btn-ghost" @click="$emit('back')">Atrás</button>
    <span v-else />
    <div class="right">
      <span v-if="draftNote" class="draftnote">{{ draftNote }}</span>
      <button type="button" class="btn-primary" :disabled="nextDisabled" @click="$emit('next')">
        {{ nextLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wizfoot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.draftnote {
  font-size: 12px;
  color: var(--warm-500);
}

.btn-ghost {
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-ghost:hover {
  background: var(--warm-100);
}

.btn-primary {
  padding: 9px 20px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgb(50 20 80 / 8%),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 45%);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
