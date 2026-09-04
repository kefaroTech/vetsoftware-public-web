<script setup lang="ts">
import { computed } from 'vue'

/**
 * Cabecera de identidad de la empresa: inicial, razón social, etiquetas del
 * perfil fiscal y fecha de alta. Se extrajo de `EmpresaView.vue` (530 líneas)
 * como bloque autocontenido: sólo pinta lo que recibe, sin estado propio ni
 * acciones.
 */
const props = defineProps<{
  legalName: string
  docTypeLabel: string | null
  idDisplay: string | null
  taxRegimeLabel: string | null
  personType: string | null
  createdDate: string
  profileMissing: boolean
}>()

const initial = computed(() => props.legalName.trim()[0]?.toUpperCase() || 'E')
</script>

<template>
  <div class="hero">
    <div class="mark">{{ initial }}</div>
    <div class="ds-flex-fill">
      <div class="heroname">{{ legalName }}</div>
      <div class="herotags ds-wrap-row">
        <span v-if="docTypeLabel && idDisplay" class="tag mono tag-neutral"
          >{{ docTypeLabel }} · {{ idDisplay }}</span
        >
        <span v-else-if="idDisplay" class="tag mono tag-neutral">{{ idDisplay }}</span>
        <span v-if="taxRegimeLabel" class="tag ds-tone--accent">{{ taxRegimeLabel }}</span>
        <span v-if="personType" class="tag tag-neutral">{{ personType }}</span>
        <span v-if="profileMissing" class="tag warn">Perfil fiscal sin configurar</span>
      </div>
    </div>
    <div v-if="createdDate" class="herometa ds-stack">
      <span class="herometa-label">Activa desde</span>
      <span class="herometa-value">{{ createdDate }}</span>
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--amatista-50), var(--warm-50));
  border: 1px solid var(--amatista-100);
  margin-bottom: 20px;
}

.mark {
  width: 58px;
  height: 58px;
  border-radius: 15px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--amatista-500), var(--amatista-700));
  color: white;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 30px;
  box-shadow: 0 6px 16px -6px oklch(45% 0.18 var(--hue) / 50%);
}

.heroname {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.1;
}

/* La fila que envuelve es `.ds-wrap-row`. El tono amatista migró a
   `.ds-tone--accent`: para que la primitiva (0,1,0) llegue, `.tag` se quedó
   sólo con la GEOMETRÍA y el color de CADA etiqueta —incluido el neutro por
   defecto— viaja en su propia clase desde el marcado. */
.herotags {
  margin-top: 10px;
}

.tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-weight: 500;
}

.tag.mono {
  font-family: var(--font-mono);
  font-size: 11.5px;
}

/* Tono por defecto de la etiqueta. No es `.ds-tone--neutral` (warm-200 /
   warm-600): éste es el par warm-150 / warm-700, otro matiz. */
.tag-neutral {
  background: var(--warm-150);
  color: var(--warm-700);
}

.tag.warn {
  background: var(--warning-50);
  color: oklch(45% 0.13 80deg);
}

.herometa {
  flex-shrink: 0;
  align-items: flex-end;
  text-align: right;
}

.herometa-label {
  font-size: 11px;
  color: var(--warm-500);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.herometa-value {
  font-size: 14px;
  color: var(--warm-800);
  font-weight: 500;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

@media (width <= 900px) {
  .hero {
    flex-wrap: wrap;
  }
}
</style>
