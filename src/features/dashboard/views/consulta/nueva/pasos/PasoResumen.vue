<script setup lang="ts">
import { computed } from 'vue'
import {
  User,
  PawPrint,
  Stethoscope,
  Pencil,
  TriangleAlert,
  RefreshCw,
} from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import SummaryRow from '../components/SummaryRow.vue'
import { useNuevaConsultaDraft, type WizardStep } from '../composables/useNuevaConsultaDraft'
import {
  formatDateLong,
  calcAge,
  genderLabel,
  reproductiveLabel,
  weightUnitLabel,
} from '../composables/format'

const draft = useNuevaConsultaDraft()
const emit = defineEmits<{ 'edit-step': [step: WizardStep] }>()

const owner = computed(() => draft.state.owner)
const pet = computed(() => draft.state.pet)
const c = computed(() => draft.state.consultation)
const cType = computed(() => draft.state.consultationType)

const ownerLocation = computed(() => {
  const o = owner.value
  if (!o?.city) return ''
  const country = o.city.state?.country?.name
  const tail = country ? `${o.city.name}, ${country}` : o.city.name
  return `${o.address ? o.address + ' · ' : ''}${tail}`
})

const petData = computed(() => {
  const p = pet.value
  if (!p) return ''
  return `${genderLabel(p.gender)} · ${calcAge(p.bod)} · ${p.weight} ${weightUnitLabel(p.weightType)} · ${reproductiveLabel(p.reproductiveState)}`
})

const dateAndType = computed(() => {
  const d = formatDateLong(c.value.date)
  const t = cType.value?.name
  if (d && t) return `${d} · ${t}`
  return d || t || '—'
})

const optionalEmpty = computed(() => {
  return (
    !c.value.diagnosis.trim() ||
    !c.value.diagnosticPlan.trim() ||
    !c.value.therapeuticPlan.trim()
  )
})
</script>

<template>
  <ContentWrap>
    <PageHeading
      title="Revisa antes de guardar"
      subtitle="Verifica que todo esté correcto. Puedes editar cualquier sección antes de confirmar."
    />

    <div v-if="draft.hasPartialSave.value" class="resume-banner">
      <RefreshCw :size="16" :stroke-width="1.7" />
      <span>
        Hay datos de un intento anterior ya guardados en servidor. Al pulsar
        <strong>Guardar consulta</strong> solo se enviarán los registros que
        falten — los ya guardados no se duplicarán.
      </span>
    </div>

    <div class="stack">
      <SectionCard accent :icon="User" title="Propietario">
        <template #action>
          <button type="button" class="ghost-btn" @click="emit('edit-step', 1)">
            <Pencil :size="12" :stroke-width="1.7" />
            <span>Editar</span>
          </button>
        </template>
        <SummaryRow label="Nombre" :value="owner?.name" />
        <SummaryRow label="Documento" :value="owner?.document" />
        <SummaryRow
          label="Contacto"
          :value="
            owner ? `${owner.phone}${owner.email ? ' · ' + owner.email : ''}` : ''
          "
        />
        <SummaryRow label="Dirección" :value="ownerLocation" last />
      </SectionCard>

      <SectionCard :icon="PawPrint" title="Mascota">
        <template #action>
          <button type="button" class="ghost-btn" @click="emit('edit-step', 2)">
            <Pencil :size="12" :stroke-width="1.7" />
            <span>Editar</span>
          </button>
        </template>
        <SummaryRow
          label="Nombre"
          :value="pet ? `${pet.name} · ${pet.code}` : ''"
        />
        <SummaryRow
          label="Especie / Raza"
          :value="pet ? `${pet.specie.name} · ${pet.breed.name}` : ''"
        />
        <SummaryRow label="Datos" :value="petData" />
        <SummaryRow
          label="Color"
          :value="pet?.color ?? ''"
          :empty="!pet?.color"
          last
        />
      </SectionCard>

      <SectionCard :icon="Stethoscope" title="Consulta">
        <template #action>
          <button type="button" class="ghost-btn" @click="emit('edit-step', 3)">
            <Pencil :size="12" :stroke-width="1.7" />
            <span>Editar</span>
          </button>
        </template>
        <SummaryRow label="Fecha · Tipo" :value="dateAndType" />
        <SummaryRow
          label="Anamnesis"
          :value="c.anamnesis"
          :empty="!c.anamnesis.trim()"
        />
        <SummaryRow
          label="Diagnóstico"
          :value="c.diagnosis"
          :empty="!c.diagnosis.trim()"
        />
        <SummaryRow
          label="Plan diagnóstico"
          :value="c.diagnosticPlan"
          :empty="!c.diagnosticPlan.trim()"
        />
        <SummaryRow
          label="Plan terapéutico"
          :value="c.therapeuticPlan"
          :empty="!c.therapeuticPlan.trim()"
        />
        <SummaryRow
          label="Próximo control"
          :value="
            c.nextControlDate
              ? formatDateLong(c.nextControlDate) +
                (c.nextControlNotes ? ' · ' + c.nextControlNotes : '')
              : ''
          "
          :empty="!c.nextControlDate"
          last
        />
      </SectionCard>

      <div v-if="optionalEmpty" class="warning">
        <TriangleAlert :size="16" :stroke-width="1.7" />
        <span>
          Diagnóstico y planes están vacíos. Puedes guardar la consulta así y
          completarlos durante la atención.
        </span>
      </div>
    </div>
  </ContentWrap>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ghost-btn {
  background: transparent;
  border: 1px solid var(--warm-200);
  padding: 5px 10px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--warm-600);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ghost-btn:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
.warning {
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  background: oklch(96% 0.04 80);
  border: 1px solid oklch(88% 0.07 80);
  border-radius: 10px;
  font-size: 12.5px;
  color: oklch(35% 0.10 80);
  line-height: 1.55;
  align-items: flex-start;
}
.warning :deep(svg) {
  flex-shrink: 0;
  margin-top: 1px;
}
.resume-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--amatista-700);
  line-height: 1.55;
}
.resume-banner :deep(svg) {
  flex-shrink: 0;
  margin-top: 1px;
}
.resume-banner strong {
  font-weight: 600;
}
</style>
