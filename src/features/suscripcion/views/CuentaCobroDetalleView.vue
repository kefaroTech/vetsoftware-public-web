<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Receipt } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { formatDateShort } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import { useCobros } from '../composables/useCobros'
import { useCupos } from '../composables/useCupos'
import { SIN_PERMISO } from '../composables/accesoBloqueado'
import {
  billingReasonLabel,
  documentKindLabel,
  estadoDocumento,
  excedenteTexto,
  impuestoTexto,
  referenciaDocumento,
  taxTreatmentLabel,
} from '../composables/cobrosText'
import { sustantivo } from '../composables/cuposText'
import type { SubscriptionChargeResponse } from '../types/cobros.types'

/**
 * La ficha de una cuenta de cobro: responde a «¿de dónde salen estos 18.500?» **dentro** de la
 * propia ficha, porque quien se hace la pregunta la tiene delante.
 *
 * <p>Lo que se enseña y lo que no está fijado en `cobros.types.ts`, campo por campo. En
 * resumen: la factura fiscal sí, el `DC-…` interno no, y ninguna referencia de pasarela o de
 * liquidación — son claves compartidas entre clínicas y enseñarlas abre los importes de las
 * otras.
 */
const props = defineProps<{ id: string }>()

const {
  document,
  grupos,
  impuestos,
  chargesTruncated,
  detailLoading,
  detailError,
  detailErrorTraceId,
  detailForbidden,
  loadDocument,
} = useCobros()

/**
 * Los cupos, **para poder responder de verdad a «¿de dónde salen estos 18.500?»**.
 *
 * <p>Un cargo `OVERAGE` no lleva ni el nombre de la dimensión ni el tope: los dos hay que
 * cruzarlos en el cliente, igual que ya se cruzan consumo y límite en «Cupos y consumo». El
 * cruce es `charge.subscriptionItemId` → `SubscriptionItemLimitResponse` (tope) →
 * `limitDimensionId` → `CompanyCapacityResponse` (nombre del eje).
 *
 * <p>Es un bloque secundario: si el 403 de `subscriptionItemLimit.read` deja `limits` vacío, la
 * línea vuelve a su descripción y la ficha sigue entera. Nunca se inventa un tope.
 */
const { cupos, limits, load: loadCupos } = useCupos()

const documentoId = computed(() => Number(props.id))

const estado = computed(() => (document.value ? estadoDocumento(document.value) : null))

onMounted(() => {
  void loadDocument(documentoId.value)
  void loadCupos(true)
})

/**
 * La línea de un cargo, en palabras.
 *
 * <p>Para un excedente, la frase de `excedenteTexto` —que estaba escrita y **no la llamaba
 * nadie**, así que el excedente se pintaba como «— 40 × $450», que es exactamente la pregunta
 * sin responder—. Para el resto, su descripción; y si el excedente no se puede resolver entero
 * (sin tope, sin cantidad o sin unitario), también: media frase con un hueco es peor que la
 * descripción del servidor.
 */
function descripcionCargo(c: SubscriptionChargeResponse): string {
  const porDefecto = c.description ?? '—'
  if (c.chargeType !== 'OVERAGE') return porDefecto

  const tope = limits.value.find((l) => l.subscriptionItemId === c.subscriptionItemId)
  if (!tope || tope.limitQuantity == null || c.quantity == null || c.unitAmount == null) {
    return porDefecto
  }
  const cupo = cupos.value.find((x) => x.capacidad.limitDimensionId === tope.limitDimensionId)
  return excedenteTexto(
    sustantivo(cupo?.capacidad.dimensionCode),
    c.quantity,
    tope.limitQuantity,
    c.unitAmount,
  )
}
</script>

<template>
  <div>
    <PageHeader
      kicker="Mi suscripción"
      :title="document ? referenciaDocumento(document) : 'Cuenta de cobro'"
    >
      <template #action>
        <RouterLink :to="{ name: 'suscripcion-cobros' }" class="ds-btn ds-btn--neutral volver">
          Volver a mis cuentas
        </RouterLink>
      </template>
    </PageHeader>

    <p v-if="detailForbidden" class="ds-empty ds-empty--boxed">{{ SIN_PERMISO }}</p>

    <div v-else-if="detailError" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">
        {{ detailError }}
        <span v-if="detailErrorTraceId" class="ds-meta">{{ detailErrorTraceId }}</span>
      </span>
      <button
        type="button"
        class="ds-btn ds-btn--neutral ds-btn--snug"
        @click="loadDocument(documentoId)"
      >
        Reintentar
      </button>
    </div>

    <div v-else-if="document" class="ds-stack ds-stack--18">
      <SectionCard title="Resumen" :icon="Receipt">
        <dl class="ds-detail-grid">
          <div>
            <dt class="ds-label">Tipo</dt>
            <dd class="ds-item-label">{{ documentKindLabel(document.documentKind) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Motivo</dt>
            <dd class="ds-item-label">{{ billingReasonLabel(document.billingReason) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Periodo</dt>
            <dd class="ds-item-label">
              {{ formatDateShort(document.periodStart) }} –
              {{ formatDateShort(document.periodEnd) }}
            </dd>
          </div>
          <div>
            <dt class="ds-label">Vence</dt>
            <dd class="ds-item-label">{{ formatDateShort(document.dueDate) }}</dd>
          </div>
          <div v-if="document.externalIssuedAt">
            <dt class="ds-label">Emitida</dt>
            <dd class="ds-item-label">{{ formatDateShort(document.externalIssuedAt) }}</dd>
          </div>
          <div v-if="document.externalCufe" class="ds-grid-span">
            <dt class="ds-label">CUFE</dt>
            <dd class="ds-meta ds-truncate">{{ document.externalCufe }}</dd>
          </div>
          <div class="ds-grid-span">
            <dt class="ds-label">Estado</dt>
            <dd class="ds-item-label">{{ estado?.texto }}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="De dónde sale este importe">
        <!-- Honesto por diseño: el endpoint del tenant no filtra por documento, así que si el
             barrido llegó a su cota se dice, en vez de dar por completo lo que se tiene. -->
        <p v-if="chargesTruncated" class="ds-banner ds-banner--warning" role="status">
          Tienes tantos cargos que no pudimos revisarlos todos. Lo que ves puede estar incompleto;
          si no cuadra, escríbenos.
        </p>
        <div v-for="grupo in grupos" :key="grupo.titulo" class="ds-stack ds-stack--8 grupo">
          <p class="ds-item-label">{{ grupo.titulo }}</p>
          <ul class="ds-list-reset ds-stack ds-stack--8">
            <li v-for="c in grupo.cargos" :key="c.id" class="ds-flex-row ds-flex-row--12">
              <span class="ds-flex-fill">{{ descripcionCargo(c) }}</span>
              <span v-if="c.prorationDays != null && c.periodDays != null" class="ds-meta">
                {{ c.prorationDays }} de {{ c.periodDays }} días
              </span>
              <span v-if="c.quantity != null" class="ds-meta">{{ c.quantity }} ×</span>
              <span class="ds-num">{{ formatMoney(c.unitAmount ?? 0) }}</span>
              <span class="ds-num">{{ formatMoney(c.subtotalAmount ?? 0) }}</span>
            </li>
          </ul>
        </div>
        <p v-if="grupos.length === 0" class="ds-empty ds-empty--tight">
          Esta cuenta no tiene cargos detallados.
        </p>
      </SectionCard>

      <SectionCard title="Impuestos y total">
        <!-- El desglose se pinta como frase, no como una columna de `taxRate` que nadie lee. -->
        <ul class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="(t, i) in impuestos" :key="t.id ?? i" class="ds-flex-row ds-flex-row--12">
            <span class="ds-flex-fill">{{
              impuestoTexto(t.taxRate, t.taxableBase, t.taxAmount)
            }}</span>
            <span class="ds-meta">{{ taxTreatmentLabel(t.taxTreatment) }}</span>
          </li>
        </ul>
        <dl class="ds-detail-grid totales">
          <div>
            <dt class="ds-label">Subtotal</dt>
            <dd class="ds-num">{{ formatMoney(document.subtotalAmount ?? 0) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Impuestos</dt>
            <dd class="ds-num">{{ formatMoney(document.taxAmount ?? 0) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Total</dt>
            <dd class="ds-num fuerte">{{ formatMoney(document.totalAmount ?? 0) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Pendiente</dt>
            <dd class="ds-num fuerte">{{ formatMoney(document.balanceAmount ?? 0) }}</dd>
          </div>
        </dl>
      </SectionCard>
    </div>

    <p v-else-if="!detailLoading" class="ds-empty ds-empty--boxed">
      No encontramos esta cuenta de cobro.
    </p>
  </div>
</template>

<style scoped>
.volver {
  text-decoration: none;
}

.grupo + .grupo {
  margin-top: var(--space-16);
}

.totales {
  margin-top: var(--space-16);
}

.fuerte {
  font-weight: var(--weight-semibold);
}
</style>
