<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  Stethoscope,
  ClipboardList,
  TriangleAlert,
  Pill,
  FlaskConical,
  Calendar,
} from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import ContextHeader from '../components/ContextHeader.vue'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import QuickActionsCard from '../components/QuickActionsCard.vue'
import { consultationTypes } from '../data/consultationTypes'
import { useNuevaConsultaDraft } from '../composables/useNuevaConsultaDraft'

const draft = useNuevaConsultaDraft()
const c = computed(() => draft.state.consultation)

const typeOptions = consultationTypes.map((t) => ({
  value: t.id,
  label: t.name,
}))

watch(
  () => c.value.typeId,
  (id) => {
    const found = consultationTypes.find((t) => t.id === id) ?? null
    draft.state.consultationType = found
  },
  { immediate: true },
)
</script>

<template>
  <ContentWrap :max-width="920">
    <ContextHeader
      v-if="draft.state.owner && draft.state.pet"
      :owner="draft.state.owner"
      :pet="draft.state.pet"
    />
    <PageHeading
      title="Datos de la consulta"
      subtitle="Solo el tipo y la anamnesis son obligatorios. Lo demás puedes completarlo durante la atención."
    />

    <div class="stack">
      <SectionCard accent :icon="Stethoscope" title="Información general">
        <div class="grid-1-2">
          <BaseField label="Fecha" required>
            <template #default="{ id }">
              <DateInput :id="id" v-model="c.date" />
            </template>
          </BaseField>
          <BaseField label="Tipo de consulta" required>
            <template #default="{ id }">
              <BaseSelect
                :id="id"
                v-model="c.typeId"
                :options="typeOptions"
                placeholder="Selecciona un tipo"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <SectionCard
        :icon="ClipboardList"
        title="Anamnesis"
        subtitle="Lo que reporta el dueño · Antecedentes"
      >
        <BaseTextarea
          v-model="c.anamnesis"
          :rows="4"
          placeholder="Motivo de consulta, signos observados, antecedentes relevantes…"
        />
      </SectionCard>

      <SectionCard
        :icon="TriangleAlert"
        title="Diagnóstico"
        subtitle="Presuntivo o definitivo · Diferenciales"
      >
        <BaseTextarea
          v-model="c.diagnosis"
          :rows="3"
          placeholder="Diagnóstico presuntivo, diagnósticos diferenciales considerados…"
        />
      </SectionCard>

      <div class="planes">
        <SectionCard
          :icon="FlaskConical"
          title="Plan diagnóstico"
          subtitle="Exámenes complementarios"
        >
          <BaseTextarea
            v-model="c.diagnosticPlan"
            :rows="4"
            placeholder="Hemograma, bioquímica, ecografía abdominal…"
          />
        </SectionCard>
        <SectionCard
          :icon="Pill"
          title="Plan terapéutico"
          subtitle="Tratamiento e indicaciones"
        >
          <BaseTextarea
            v-model="c.therapeuticPlan"
            :rows="4"
            placeholder="Medicación, indicaciones para el dueño, dieta…"
          />
        </SectionCard>
      </div>

      <SectionCard :icon="Calendar" title="Próximo control" subtitle="Opcional">
        <div class="grid-1-2">
          <BaseField label="Fecha sugerida">
            <template #default="{ id }">
              <DateInput :id="id" v-model="c.nextControlDate" />
            </template>
          </BaseField>
          <BaseField label="Notas para el control">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="c.nextControlNotes"
                placeholder="Ej. revisar evolución del apetito, control de peso"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <QuickActionsCard />
    </div>
  </ContentWrap>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.grid-1-2 {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
}
.planes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 880px) {
  .grid-1-2,
  .planes {
    grid-template-columns: 1fr;
  }
}
</style>
