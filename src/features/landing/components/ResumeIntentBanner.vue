<script setup lang="ts">
import { computed } from 'vue'
import { CAPACITY_UNIT_LABEL, CAPACITY_UNIT_LABEL_ONE } from '../types/plans.types'

/**
 * §5, caso 1 — «cerró el navegador a mitad de elegir».
 *
 * La intención se restaura, pero **nunca en silencio**: aparece esta banda sobre
 * el hero. Es un `<aside>` y no un modal a propósito — quien vuelve a la landing
 * por otra cosa no puede quedarse bloqueado por una decisión que no tomó.
 *
 * «Empezar de nuevo» borra sin pedir confirmación: no destruye nada que costara
 * trabajo, y una confirmación para tirar dos números es fricción sin ganancia.
 */
const props = defineProps<{
  planNombre: string
  sedes: number
  usuarios: number
}>()

defineEmits<(e: 'seguir' | 'empezar-de-nuevo') => void>()

const sedesTexto = computed(
  () =>
    `${props.sedes} ${props.sedes === 1 ? CAPACITY_UNIT_LABEL_ONE.BRANCH : CAPACITY_UNIT_LABEL.BRANCH}`,
)
const usuariosTexto = computed(
  () =>
    `${props.usuarios} ${props.usuarios === 1 ? CAPACITY_UNIT_LABEL_ONE.USER : CAPACITY_UNIT_LABEL.USER}`,
)
</script>

<template>
  <aside class="land-resume" aria-labelledby="resume-titulo">
    <p id="resume-titulo" class="land-resume-text">
      Estabas mirando el plan <strong>{{ planNombre }}</strong> para {{ sedesTexto }} y
      {{ usuariosTexto }}. ¿Seguimos donde lo dejaste?
    </p>
    <div class="land-resume-actions">
      <button type="button" class="land-resume-primary" @click="$emit('seguir')">Seguir</button>
      <button type="button" class="land-resume-ghost" @click="$emit('empezar-de-nuevo')">
        Empezar de nuevo
      </button>
    </div>
  </aside>
</template>

<style scoped>
.land-resume {
  position: relative;
  z-index: 1;
  margin: 0 auto;
  max-width: 1120px;
  padding: 14px clamp(20px, 5vw, 44px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--pub-ame-300);
  border-radius: 12px;
  background: rgb(255 255 255 / 80%);
}

.land-resume-text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--pub-ink-700);
}

.land-resume-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.land-resume-primary,
.land-resume-ghost {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 9px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.land-resume-primary {
  border: none;
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  color: var(--pub-surface);
}

.land-resume-ghost {
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  color: var(--pub-ink-700);
}
</style>
