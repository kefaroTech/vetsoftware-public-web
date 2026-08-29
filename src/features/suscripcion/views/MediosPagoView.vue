<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Wallet } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { useToast } from '@/composables/useToast'
import MedioPagoCard from '../components/MedioPagoCard.vue'
import RevocarMedioModal from '../components/RevocarMedioModal.vue'
import { useMediosPago } from '../composables/useMediosPago'
import { useSuscripcion } from '../composables/useSuscripcion'
import { SIN_PERMISO } from '../composables/accesoBloqueado'
import { ALTA_MEDIO_PAGO, SIN_MEDIOS_PAGO } from '../composables/cotizacionesText'
import type { SubscriptionPaymentMethodResponse } from '../types/medios-pago.types'

/**
 * Medios de pago: el único bloque con escritura real de dinero para el tenant, y por un motivo
 * escrito en el backend — **revocar es un derecho que no puede quedar detrás de una gestión de
 * plataforma**.
 *
 * <p>Lo que **no** hay aquí es un formulario de alta, y no es un olvido: ver el hueco honesto
 * del pie de la lista y `RegisterSubscriptionPaymentMethodRequest`.
 */
const { subscription } = useSuscripcion()
const {
  medios,
  avisoPrincipal,
  esUnicoActivo,
  loading,
  error,
  errorTraceId,
  forbidden,
  anuncio,
  load,
  hacerPredeterminado,
  revocar,
} = useMediosPago(() => subscription.value?.nextBillingDate)

const toast = useToast()
const revocarAbierto = ref(false)
const medioARevocar = ref<SubscriptionPaymentMethodResponse | null>(null)

onMounted(() => void load(true))

const claseAviso = computed(() =>
  avisoPrincipal.value?.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)

function abrirRevocar(medio: SubscriptionPaymentMethodResponse) {
  medioARevocar.value = medio
  revocarAbierto.value = true
}

async function confirmarRevocar(reason: string) {
  const medio = medioARevocar.value
  if (!medio) return
  try {
    await revocar(medio, reason)
    revocarAbierto.value = false
  } catch (e: unknown) {
    toast.errorFrom('No se pudo revocar el medio de pago', e)
  }
}
</script>

<template>
  <div>
    <PageHeader kicker="Mi suscripción" title="Medios de pago" />

    <!-- Región invisible PERSISTENTE: el cambio de predeterminado no saca cartel porque la
         evidencia queda en pantalla, pero «no poner cartel» no es «no anunciar». -->
    <p class="ds-sr-only" role="status">{{ anuncio }}</p>

    <p v-if="forbidden" class="ds-empty ds-empty--boxed">{{ SIN_PERMISO }}</p>

    <div v-else-if="error" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">
        {{ error }}
        <span v-if="errorTraceId" class="ds-meta">{{ errorTraceId }}</span>
      </span>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--snug" @click="load(true)">
        Reintentar
      </button>
    </div>

    <div v-else class="ds-stack ds-stack--18">
      <!-- Se calcula contra `nextBillingDate`, no contra hoy: el caso que evita el cobro
           rechazado es «vence antes del próximo cobro», y es el que manda. -->
      <div v-if="avisoPrincipal" class="ds-banner" :class="claseAviso" role="status">
        <AlertTriangle :size="16" :stroke-width="2" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">
          <strong>{{ avisoPrincipal.fuerte }}</strong>
          {{ avisoPrincipal.resto }}
        </span>
      </div>

      <SectionCard title="Tus medios de pago" :icon="Wallet">
        <ul v-if="medios.length > 0" class="ds-list-reset ds-stack ds-stack--10">
          <li v-for="entrada in medios" :key="entrada.medio.id">
            <MedioPagoCard
              :entrada="entrada"
              @predeterminado="hacerPredeterminado(entrada.medio)"
              @revocar="abrirRevocar(entrada.medio)"
            />
          </li>
        </ul>
        <p v-else-if="!loading" class="ds-empty ds-empty--tight">{{ SIN_MEDIOS_PAGO }}</p>

        <!--
          El hueco honesto del alta.

          `POST /subscription-payment-methods` exige `token` —el de la pasarela— y este front no
          tiene ningún widget de tokenización: sus nueve dependencias no incluyen ninguna
          pasarela. Un formulario que le pida a una auxiliar «el token de la pasarela» promete
          una acción que no puede completar y la deja sintiéndose incapaz; pedirle el número de
          tarjeta sería peor, porque sin tokenización ese dato viajaría en claro por nuestro
          dominio. Cuando exista el widget, esto se sustituye por el formulario y el store, el
          cliente y el tipo ya están escritos.
        -->
        <div class="ds-empty ds-empty--boxed alta">
          <p>{{ ALTA_MEDIO_PAGO }}</p>
          <a class="ds-btn ds-btn--neutral" href="mailto:soporte@vetsoftware.co">Escríbenos</a>
        </div>
      </SectionCard>
    </div>

    <RevocarMedioModal
      :open="revocarAbierto"
      :medio="medioARevocar"
      :es-unico-activo="esUnicoActivo"
      :next-billing-date="subscription?.nextBillingDate"
      @close="revocarAbierto = false"
      @revocado="confirmarRevocar"
    />
  </div>
</template>

<style scoped>
.alta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-14);
  flex-wrap: wrap;
  margin-top: var(--space-16);
}

.alta a {
  text-decoration: none;
}
</style>
