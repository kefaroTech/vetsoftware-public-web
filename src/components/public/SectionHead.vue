<script setup lang="ts">
/** Encabezado de sección con chip de ícono amatista (handoff reg-fields `SectionHead`). */
defineProps<{
  icon: string
  title: string
  desc?: string
}>()
</script>

<template>
  <div class="pub-sechead">
    <div class="pub-sechead-chip">
      <v-icon size="17">{{ icon }}</v-icon>
    </div>
    <div>
      <div class="pub-sechead-title">{{ title }}</div>
      <div v-if="desc" class="pub-sechead-desc">{{ desc }}</div>
    </div>
  </div>
</template>

<style scoped>
.pub-sechead {
  display: flex;
  align-items: center;
  gap: 11px;
}

.pub-sechead-chip {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  border: 1px solid #ecd9fb;
  display: grid;
  place-items: center;
  color: var(--pub-ame-700);
  flex-shrink: 0;
}

.pub-sechead-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--pub-ink-900);
  letter-spacing: -0.01em;
}

.pub-sechead-desc {
  font-size: 12px;

  /* `--pub-ink-400` mide 4,05:1 sobre blanco: falla §1.4.3 AA para texto normal, y esta
     bajada es de 12 px. `--pub-ink-500` mide 6,12:1. Superviviente de la tabla de
     contraste que ya corrigió `PublicLayout`. */
  color: var(--pub-ink-500);
  margin-top: 1px;
}
</style>
