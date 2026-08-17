<script setup lang="ts">
import { PawPrint } from 'lucide-vue-next'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'

/**
 * Ficha compacta del paciente ya fijado, la que sustituye al selector cuando el
 * modal no deja cambiar de animal. Estaba copiada —marcado y CSS— en los siete
 * modales de acciones (deworm, hosp, imaging, lab, spa, surgery, vaccine).
 *
 * Absorbe las DOS ramas que allí convivían, porque cada origen trae un dato de
 * apoyo distinto y ninguno de los dos puede derivarse del otro:
 *
 *   - `summary`: el animal embebido en el registro que se está editando. Los
 *     `*AnimalSummary` de las siete respuestas son todos `{id, name, code}`, así
 *     que aquí basta la forma mínima. Bajo el nombre se pinta el código.
 *   - `animal`: el `AnimalResponse` completo que llega preseleccionado desde la
 *     vista. Bajo el nombre se pinta `especie · raza [· propietario]`.
 *
 * Precedencia: manda `summary`. Es la misma que tenía la cadena de `v-else-if`
 * original, donde la rama de edición iba antes que la de preselección; al editar
 * desde una lista con paciente seleccionado llegan los dos y debe ganar el
 * animal del registro. Sin ninguno de los dos no renderiza nada.
 */
defineProps<{
  /** Animal del registro en edición. Solo necesita nombre y código. */
  summary?: { name: string; code: string } | null
  /** Animal preseleccionado por la vista, con su ficha completa. */
  animal?: AnimalResponse | null
}>()
</script>

<template>
  <div v-if="summary || animal" class="patient-fixed">
    <div class="paw ds-tone--accent"><PawPrint :size="14" :stroke-width="1.7" /></div>
    <div>
      <div class="ds-item-label">{{ summary?.name ?? animal?.name }}</div>
      <div v-if="summary" class="ds-hint ds-hint--spaced">{{ summary.code }}</div>
      <div v-else-if="animal" class="ds-hint ds-hint--spaced">
        {{ animal.specie.name }} · {{ animal.breed.name }}
        <span v-if="animal.owner"> · {{ animal.owner.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.patient-fixed {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 10px 12px;
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.paw {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
</style>
