<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Gauge, ShieldCheck } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { formatDateShort } from '@/composables/format'
import CupoCard from '../components/CupoCard.vue'
import { useCupos } from '../composables/useCupos'
import { CUPOS_ILEGIBLES, eventoLabel, sinContadores } from '../composables/cuposText'

/**
 * Cupos y consumo.
 *
 * <p>Es el bloque con más valor operativo de la feature: sin él, el tope llega a mitad de una
 * consulta veterinaria y la auxiliar no tiene dónde enterarse de por qué.
 *
 * <p><b>La rama que más importa de toda la pantalla</b> es la de `capacitiesLegibles`. Si
 * `capacities` llega ausente —el hueco que `MatchesContract` no ve— se dice «no pudimos leer tus
 * cupos», **nunca** «no tienes topes»: eso último es exactamente el fallo que R14 prohíbe y el
 * peor posible aquí.
 */
const {
  cupos,
  sinCupos,
  capacitiesLegibles,
  entitlements,
  entitlementsLegibles,
  events,
  eventsForbidden,
  eventsLoaded,
  effectiveLimits,
  limitsForbidden,
  error,
  errorTraceId,
  load,
  loadEvents,
  loadEffectiveLimit,
} = useCupos()

const historialAbierto = ref(false)

onMounted(() => void load(true))

/** El historial solo se pide cuando alguien lo despliega: son datos que casi nadie abre. */
function abrirHistorial() {
  historialAbierto.value = !historialAbierto.value
  if (historialAbierto.value && !eventsLoaded.value) void loadEvents()
}
</script>

<template>
  <div>
    <PageHeader kicker="Mi suscripción" title="Cupos y consumo" />

    <p class="ds-meta">Esto se calcula desde tu plan. Si algo no cuadra, escríbenos.</p>

    <div v-if="error" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">
        {{ error }}
        <span v-if="errorTraceId" class="ds-meta">{{ errorTraceId }}</span>
      </span>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="load(true)">
        Reintentar
      </button>
    </div>

    <div v-else class="ds-stack ds-stack--18">
      <SectionCard title="Tus cupos" :icon="Gauge">
        <!-- Rama explícita, nunca `?? []`. Ver la cabecera del componente. -->
        <div v-if="!capacitiesLegibles" class="ds-banner ds-banner--error" role="status">
          <span class="ds-flex-fill">{{ CUPOS_ILEGIBLES }}</span>
          <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="load(true)">
            Reintentar
          </button>
        </div>

        <!-- Un plan sin contadores no es un error y no se pinta como tal. -->
        <p v-else-if="sinCupos" class="ds-empty ds-empty--tight">{{ sinContadores() }}</p>

        <ul v-else class="ds-list-reset ds-stack ds-stack--18">
          <li v-for="c in cupos" :key="c.capacidad.dimensionCode ?? c.capacidad.id">
            <CupoCard
              :cupo="c"
              :origen="
                c.capacidad.limitDimensionId != null
                  ? effectiveLimits[c.capacidad.limitDimensionId]
                  : undefined
              "
              @pedir-origen="loadEffectiveLimit"
            />
          </li>
        </ul>

        <!-- Sin `subscriptionItemLimit.read` se conserva el «340 de 500» y se pierde el modo.
             No es motivo para vaciar la pantalla. -->
        <p v-if="limitsForbidden" class="ds-meta">
          Tu rol no incluye ver cómo se aplica cada tope, así que aquí solo aparece el consumo.
        </p>
      </SectionCard>

      <SectionCard title="Módulos de tu plan" :icon="ShieldCheck">
        <ul v-if="entitlementsLegibles" class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="ent in entitlements" :key="ent.id ?? ent.subModule?.code" class="ds-flex-row">
            <span class="ds-flex-fill ds-item-label">{{ ent.subModule?.name ?? '—' }}</span>
            <span class="ds-meta">{{ ent.accessLevel ?? '—' }}</span>
          </li>
        </ul>
        <p v-else class="ds-meta">No pudimos leer tus módulos.</p>
      </SectionCard>

      <details :open="historialAbierto">
        <summary class="ds-hint" @click.prevent="abrirHistorial">
          Lo que ha pasado con tus cupos
        </summary>
        <!-- 403 aquí esconde ESTE bloque y nada más: nunca la pantalla entera en rojo. -->
        <p v-if="eventsForbidden" class="ds-meta">
          Tu rol no incluye ver este historial. Pídeselo a quien administre los permisos de tu
          clínica.
        </p>
        <ul v-else-if="events.length > 0" class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="ev in events" :key="ev.id" class="ds-flex-row">
            <span class="ds-flex-fill">
              {{ eventoLabel(ev.eventType) }} · {{ ev.usedQuantity }} de {{ ev.limitQuantity }}
            </span>
            <span class="ds-meta">{{ formatDateShort(ev.occurredAt) }}</span>
          </li>
        </ul>
        <p v-else-if="eventsLoaded" class="ds-meta">Todavía no ha pasado nada con tus cupos.</p>
      </details>
    </div>
  </div>
</template>

<style scoped>
summary {
  cursor: pointer;
  margin-bottom: var(--space-8);
}
</style>
