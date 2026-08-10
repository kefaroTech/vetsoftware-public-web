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
    <button v-if="showBack" type="button" class="ds-btn ds-btn--ghost" @click="$emit('back')">
      Atrás
    </button>
    <span v-else />
    <div class="right">
      <span v-if="draftNote" class="draftnote">{{ draftNote }}</span>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--strong"
        :disabled="nextDisabled"
        @click="$emit('next')"
      >
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
</style>
