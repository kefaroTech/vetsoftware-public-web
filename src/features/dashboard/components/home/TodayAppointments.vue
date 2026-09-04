<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, PawPrint } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import AppointmentStatusPill from './AppointmentStatusPill.vue'
import { APPT_TYPES, apptTime, type AppointmentResponse } from '@/features/agenda/types/appointment'
import { appointmentSubject } from '../../composables/useTodayAgenda'

const props = defineProps<{
  appointments: AppointmentResponse[]
  loading: boolean
  error: string | null
}>()

/** Es un avance de la jornada, no la agenda: el resto se ve en su pantalla. */
const MAX_ROWS = 5

const rows = computed(() => props.appointments.slice(0, MAX_ROWS))
</script>

<template>
  <section>
    <header class="header ds-block-head">
      <h3 class="title">Citas de hoy</h3>
      <RouterLink :to="{ name: 'agenda' }" class="link">Ver la agenda →</RouterLink>
    </header>

    <div class="ds-frame">
      <div v-if="loading" class="ds-empty ds-empty--tight">Cargando…</div>
      <!-- EST-01: la rama de error va ANTES que la de vacío. Si se invierten, un 500
           vuelve a disfrazarse de «no hay citas». -->
      <div v-else-if="error" class="ds-banner ds-banner--error ds-banner--flush" role="alert">
        <AlertTriangle :size="16" :stroke-width="2" class="ds-banner-icon" />
        <span>{{ error }}</span>
      </div>
      <div v-else-if="!rows.length" class="ds-empty ds-empty--tight">No hay citas para hoy.</div>
      <template v-else>
        <article
          v-for="(a, idx) in rows"
          :key="a.id"
          class="row"
          :class="{ last: idx === rows.length - 1 }"
        >
          <div class="avatar ds-tone--accent">
            <PawPrint :size="16" :stroke-width="1.5" />
          </div>
          <div class="ds-item-label">{{ appointmentSubject(a) }}</div>
          <div class="ds-meta-dark ds-meta-dark--sm">{{ a.owner?.name }}</div>
          <div class="ds-meta-dark ds-meta-dark--sm">{{ APPT_TYPES[a.type].label }}</div>
          <div class="ds-meta-dark ds-meta-dark--sm">{{ apptTime(a.startAt) }}</div>
          <AppointmentStatusPill :status="a.status" />
        </article>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* Residuo sobre `.ds-block-head`: 14px de hueco, no los 10 de la primitiva. */
.header {
  margin-bottom: 14px;
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-800);
}

.link {
  font-size: 12px;
  color: var(--amatista-700);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.row {
  display: grid;
  grid-template-columns: 32px 1.4fr 1fr 1fr 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid var(--warm-150);
}

.row.last {
  border-bottom: none;
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
