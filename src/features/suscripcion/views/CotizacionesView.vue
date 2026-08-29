<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { FileText } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { useServerPaged } from '@/composables/useServerPaged'
import { formatDateShort } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import { cotizacionesApi } from '../api/cotizaciones.api'
import {
  PEDIR_MAS_CUPO,
  SIN_COTIZACIONES,
  esListable,
  quoteStatusLabel,
  vigencia,
} from '../composables/cotizacionesText'
import type { QuoteSummaryResponse } from '../types/cotizaciones.types'

/**
 * Listado de propuestas. **La plataforma propone, la clínica acepta**: no hay botón de crear,
 * porque `POST /quotes` es de sistema.
 *
 * <p>Cuando se llega desde un cupo agotado (`?motivo=cupo`), el vacío explica que ampliar
 * necesita una propuesta nueva. Es preferible a un botón deshabilitado con un `title`: un
 * control apagado sin explicación no le dice a nadie qué hacer.
 */
const route = useRoute()

const lista = useServerPaged<QuoteSummaryResponse>((page, pageSize) =>
  cotizacionesApi.listAll(page, pageSize),
)

/** `DRAFT` no se lista: es el borrador de plataforma y no le concierne a la clínica. */
const filas = computed(() => lista.items.value.filter((q) => esListable(q.status)))

const desdeCupo = computed(() => route.query.motivo === 'cupo')

onMounted(() => void lista.reload())
</script>

<template>
  <div>
    <PageHeader kicker="Mi suscripción" title="Cotizaciones y cambios de plan" />

    <SectionCard title="Propuestas" :icon="FileText">
      <!-- Error antes que vacío (EST-01). -->
      <div v-if="lista.error.value" class="ds-banner ds-banner--error" role="alert">
        <span class="ds-flex-fill">
          {{ lista.error.value }}
          <span v-if="lista.errorTraceId.value" class="ds-meta">
            {{ lista.errorTraceId.value }}
          </span>
        </span>
        <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="lista.reload()">
          Reintentar
        </button>
      </div>

      <div v-else-if="filas.length === 0" class="ds-empty ds-empty--boxed">
        <template v-if="desdeCupo">
          <p>
            <strong>{{ PEDIR_MAS_CUPO.fuerte }}</strong> {{ PEDIR_MAS_CUPO.resto }}
          </p>
          <a class="ds-btn ds-btn--neutral" href="mailto:soporte@vetsoftware.co">Escríbenos</a>
        </template>
        <p v-else>{{ SIN_COTIZACIONES }}</p>
      </div>

      <div v-else class="ds-table-scroll">
        <table class="ds-table">
          <thead>
            <tr>
              <th scope="col">Propuesta</th>
              <th scope="col">Fecha</th>
              <th scope="col">Vigencia</th>
              <th scope="col">Total</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in filas" :key="q.id">
              <td>
                <RouterLink
                  :to="{ name: 'suscripcion-cotizacion', params: { id: q.id } }"
                  class="referencia"
                >
                  {{ q.quoteNumber ?? `#${q.id}` }}
                </RouterLink>
              </td>
              <td>{{ formatDateShort(q.createdDate) }}</td>
              <td>{{ vigencia(q.validUntil).texto }}</td>
              <td class="ds-num">{{ formatMoney(q.totalAmount ?? 0) }}</td>
              <td>
                <span class="ds-pill ds-tone--neutral">{{ quoteStatusLabel(q.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination
        :page="lista.page.value"
        :page-count="lista.pageCount.value"
        :total="lista.total.value"
        :page-size="lista.pageSize"
        @update:page="lista.goTo($event)"
      />
    </SectionCard>
  </div>
</template>

<style scoped>
.referencia {
  color: var(--amatista-700);
  font-weight: var(--weight-medium);
}
</style>
