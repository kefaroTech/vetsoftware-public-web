<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Download, Plus } from 'lucide-vue-next'
import PawLoader from '@/components/feedback/PawLoader.vue'
import type { Animal, Owner } from '@/types/domain'

/**
 * Cabecera del paciente en la historia clínica: identidad de la mascota, su
 * propietario y las dos acciones de la pantalla (exportar PDF, nueva consulta).
 *
 * Se extrajo de `HistoryStep.vue` tal cual, sin cambiar el marcado ni el CSS: el
 * paso completo pasaba de 500 líneas y esta cabecera es la sección más
 * autocontenida (no toca ni los filtros ni la línea de tiempo). La carga y el
 * error de hidratación siguen viviendo en la vista, que es quien llama a la API;
 * aquí sólo se pintan.
 */
const props = defineProps<{
  pet: Animal | null
  owner: Owner | null
  hydrating: boolean
  hydrateError: string | null
  exporting: boolean
  exportError: string | null
  canCreateConsultation: boolean
}>()

const emit = defineEmits<{
  back: []
  export: []
  'new-consultation': []
}>()

const sexLabel = computed(() => (props.pet?.gender === 'FEMALE' ? 'Hembra' : 'Macho'))

const weightLabel = computed(() => {
  const p = props.pet
  if (!p) return ''
  if (p.weight == null) return 'Sin registro'
  const unit = p.weightType === 'GRAMS' ? 'g' : p.weightType === 'POUNDS' ? 'lb' : 'kg'
  return `${p.weight} ${unit}`
})
</script>

<template>
  <header class="patient-head">
    <button type="button" class="back-btn" @click="emit('back')">
      <ArrowLeft :size="14" :stroke-width="1.7" />
      Cambiar mascota
    </button>

    <div v-if="hydrating" class="hydrating">
      <PawLoader :size="32" :glow="false" :speed="900" />
    </div>

    <div v-else-if="hydrateError" class="banner error">
      {{ hydrateError }}
    </div>

    <div v-else-if="pet" class="patient">
      <div class="avatar">
        {{ pet.name.slice(0, 2).toUpperCase() }}
      </div>
      <div class="ds-flex-fill">
        <h1 class="patient-name ds-display ds-display--sm">{{ pet.name }}</h1>
        <div class="pills">
          <span class="pill ds-pill">{{ pet.specie.name }}</span>
          <span class="pill ds-pill">{{ pet.breed.name }}</span>
          <span class="pill ds-pill">{{ sexLabel }}</span>
          <span class="pill ds-pill">{{ weightLabel }}</span>
          <span v-if="pet.color" class="pill ds-pill">{{ pet.color }}</span>
        </div>
        <div v-if="owner" class="owner-line">
          Propietario:
          <strong>{{ owner.name }}</strong>
          <template v-if="owner.phone"> · {{ owner.phone }}</template>
        </div>
      </div>
      <div class="actions">
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="exporting || !pet"
          @click="emit('export')"
        >
          <Download :size="14" :stroke-width="1.7" />
          {{ exporting ? 'Generando…' : 'Exportar PDF' }}
        </button>
        <button
          v-if="canCreateConsultation"
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          @click="emit('new-consultation')"
        >
          <Plus :size="14" :stroke-width="1.8" />
          Nueva consulta
        </button>
      </div>
    </div>

    <div v-if="exportError" class="banner error export-error">
      {{ exportError }}
    </div>
  </header>
</template>

<style scoped>
.patient-head {
  padding: 24px 36px;
  background: linear-gradient(180deg, var(--amatista-50), var(--warm-50));
  border-bottom: 1px solid var(--warm-200);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--warm-600);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  margin-bottom: 14px;
}

.back-btn:hover {
  color: var(--amatista-700);
}

.patient {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: var(--amatista-200);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 22px;
  flex-shrink: 0;
  font-family: var(--font-display);
}

.patient-name {
  line-height: 1.1;
}

.pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.pill {
  background: var(--warm-200);
  color: var(--warm-700);
}

.owner-line {
  font-size: 13px;
  color: var(--warm-600);
  margin-top: 8px;
}

.owner-line strong {
  color: var(--warm-900);
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.hydrating {
  display: grid;
  place-items: center;
  padding: 16px 0;
}

.banner.error {
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  border-radius: 10px;
  background: oklch(97% 0.02 25deg);
  color: var(--danger-700);
  border: 1px solid oklch(85% 0.06 25deg);
}

.export-error {
  margin-top: 12px;
  margin-bottom: 0;
}
</style>
