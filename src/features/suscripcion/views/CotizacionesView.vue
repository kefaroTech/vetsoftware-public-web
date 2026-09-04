<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { FileText } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
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
import type { PageResponse } from '@/types/pagination'
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

/**
 * Tamaño con el que se BARRE el servidor. No es el de la página que se pinta: es el tope de
 * filas por petición del backend, para drenar en el menor número de viajes posible.
 */
const BARRIDO = 200

/**
 * Cota del barrido. Una clínica tiene propuestas de su propio plan —decenas, no miles—, así que
 * 2.000 no se alcanza en la práctica. Existe para que un backend que devuelva `totalPages` mal
 * no deje un bucle vivo, no porque se espere llegar.
 */
const BARRIDO_MAX_PAGINAS = 10

/**
 * El paginador MENTÍA, y este es el arreglo.
 *
 * <p>`DRAFT` se filtraba **en el cliente, después de paginar**, mientras el paginador seguía
 * usando el `totalElements` del servidor. Consecuencia: una página podía salir entera vacía
 * —«Todavía no tienes propuestas»— con el pie diciendo «Mostrando 21–40 de 47». Y no hay forma
 * de arreglarlo desde la petición: `GET /quotes` (`listMine`) no acepta ningún filtro de estado,
 * solo `page` y `pageSize`.
 *
 * <p>Así que el filtro se aplica ANTES de contar: se drena el listado del servidor con el tope
 * de 200 filas —releyendo `totalPages` de cada respuesta, como manda el repositorio, y nunca
 * calculándolo del tamaño pedido—, se quitan los borradores y se sirve la página desde lo que
 * queda. El total que se anuncia es entonces el número de propuestas que la clínica puede ver,
 * y una página nunca sale vacía con un número al lado.
 *
 * <p>El día que `listMine` acepte `status`, esto se sustituye por un parámetro y desaparece.
 */
async function paginaListable(
  page: number,
  pageSize: number,
): Promise<PageResponse<QuoteSummaryResponse>> {
  const todas: QuoteSummaryResponse[] = []
  let pagina = 0
  let totalPaginas = 1
  while (pagina < totalPaginas && pagina < BARRIDO_MAX_PAGINAS) {
    const respuesta = await cotizacionesApi.listAll(pagina, BARRIDO)
    todas.push(...respuesta.content)
    totalPaginas = Math.max(1, respuesta.totalPages)
    pagina += 1
  }

  const listables = todas.filter((q) => esListable(q.status))
  const desde = page * pageSize
  return {
    content: listables.slice(desde, desde + pageSize),
    page,
    pageSize,
    totalElements: listables.length,
    totalPages: Math.max(1, Math.ceil(listables.length / pageSize)),
  }
}

const lista = useServerPaged<QuoteSummaryResponse>((page, pageSize) =>
  paginaListable(page, pageSize),
)

/** Ya vienen filtradas: `esListable` se aplicó antes de contar. */
const filas = computed(() => lista.items.value)

const desdeCupo = computed(() => route.query.motivo === 'cupo')

onMounted(() => void lista.reload())

const tabla = useTemplateRef<HTMLElement>('tabla')
const desborda = useScrollableRegion(tabla)
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
          <a class="ds-btn ds-btn--neutral" href="mailto:soporte@kefaro.tech">Escríbenos</a>
        </template>
        <p v-else>{{ SIN_COTIZACIONES }}</p>
      </div>

      <div
        v-else
        ref="tabla"
        class="ds-table-scroll ds-focus-ring"
        role="region"
        aria-label="Cotizaciones y cambios de plan"
        :tabindex="desborda ? 0 : undefined"
      >
        <table class="ds-table">
          <thead>
            <tr>
              <th scope="col">Propuesta</th>
              <th scope="col">Fecha</th>
              <th scope="col">Vigencia</th>
              <th scope="col" class="ds-num">Total</th>
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
