<script setup lang="ts">
import { CircleAlert, TriangleAlert, X } from 'lucide-vue-next'
/**
 * Banner cerrable error/warning (handoff reg-fields `Banner`).
 *
 * El `role` sigue al `tone`. Estaba fijo en `alert` para los dos, y en las 16
 * pantallas públicas un «Revisa tu correo para confirmar la cuenta» cortaba la
 * locución en curso igual que un fallo de contraseña: es el mecanismo exacto por
 * el que alguien que usa lector de pantalla aprende a ignorar las alertas.
 * `assertive` se reserva a lo que hace perder trabajo
 * (`docs/ux/patron-de-mensajes.md` §4.2b); el aviso es `status` (polite).
 */
withDefaults(
  defineProps<{
    tone?: 'error' | 'warning'
    closable?: boolean
  }>(),
  { tone: 'error', closable: true },
)
const emit = defineEmits<(e: 'close') => void>()
</script>

<template>
  <div
    class="pub-banner"
    :class="`pub-banner--${tone}`"
    :role="tone === 'error' ? 'alert' : 'status'"
    :aria-live="tone === 'error' ? undefined : 'polite'"
  >
    <component
      :is="tone === 'warning' ? TriangleAlert : CircleAlert"
      :size="17"
      class="ds-banner-icon"
      aria-hidden="true"
    />
    <div class="pub-banner-body"><slot /></div>
    <button
      v-if="closable"
      type="button"
      class="pub-banner-close"
      aria-label="Cerrar"
      @click="emit('close')"
    >
      <X :size="15" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.pub-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.45;
  border: 1px solid;
}

.pub-banner--error {
  background: var(--pub-err-bg);
  border-color: var(--pub-err-bd);
  color: var(--pub-err-tx-2);
}

.pub-banner--warning {
  background: var(--pub-warn-bg);
  border-color: var(--pub-warn-bd);
  color: var(--pub-warn-tx);
}

/* El icono usa `.ds-banner-icon` (primitives.css). */
.pub-banner-body {
  flex: 1;
}

.pub-banner-body :deep(a) {
  color: inherit;
  font-weight: 600;
}

.pub-banner-close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pub-banner-close:hover {
  opacity: 1;
}
</style>
