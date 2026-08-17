<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <!-- El tono es `.ds-tone--success`/`--neutral`; `on`/`off` se quedan porque
       tiñen el punto, que no tiene primitiva de color. -->
  <span class="pill ds-pill" :class="active ? 'on ds-tone--success' : 'off ds-tone--neutral'">
    <span class="dot ds-status-dot" />
    <span>{{ active ? 'Activo' : 'Inactivo' }}</span>
  </span>
</template>

<style scoped>
.pill {
  line-height: 1;
}

/* Forma del punto: `.ds-status-dot` (primitives.css); aquí sólo el tono. */
.pill.on .dot {
  background: var(--success-dot);
}

.pill.off .dot {
  background: var(--warm-500);
}
</style>
