<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle, Info, Plus, Wallet } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useResultadoContratacionStore } from '@/features/contratacion/stores/resultadoContratacion.store'
import FormularioTarjetaWompi from '../components/FormularioTarjetaWompi.vue'
import MedioPagoCard from '../components/MedioPagoCard.vue'
import RevocarMedioModal from '../components/RevocarMedioModal.vue'
import { useMediosPago } from '../composables/useMediosPago'
import { useSuscripcion } from '../composables/useSuscripcion'
import { SIN_PERMISO } from '../composables/accesoBloqueado'
import { SIN_MEDIOS_PAGO } from '../composables/cotizacionesText'
import type { SubscriptionPaymentMethodResponse } from '../types/medios-pago.types'
import type { WompiPaymentMethodResponse } from '../types/pago.types'

/**
 * Medios de pago: el único bloque con escritura real de dinero para el tenant, y por un motivo
 * escrito en el backend — **revocar es un derecho que no puede quedar detrás de una gestión de
 * plataforma**. El alta, en cambio, sí queda detrás de su propio permiso
 * (`subscriptionPaymentMethod.create`): es la misma tokenización con Wompi del paso 6 de la
 * autocontratación (`FormularioTarjetaWompi.vue`), aquí para un medio adicional o de reemplazo.
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

const { can } = useAuthorization()
const puedeCrear = can(PERMISSIONS.SUBSCRIPTION_PAYMENT_METHOD_CREATE)

const toast = useToast()
const revocarAbierto = ref(false)
const medioARevocar = ref<SubscriptionPaymentMethodResponse | null>(null)
const formularioAbierto = ref(false)

// El backend no expone cuándo se reintentará el cobro rechazado: el aviso no promete fecha.
// Dos fuentes, no una: el store efímero solo cubre el rechazo de un cobro recién completado
// en esta misma sesión; el rebote de una renovación de días atrás solo lo cuenta el `status`
// real de la suscripción (`PAST_DUE`).
const resultadoStore = useResultadoContratacionStore()
const avisoReintento = computed(
  () =>
    resultadoStore.resultado?.pago?.status === 'DECLINED' ||
    subscription.value?.status === 'PAST_DUE',
)

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

async function onTarjetaGuardada(_medio: WompiPaymentMethodResponse) {
  formularioAbierto.value = false
  await load(true)
  toast.success('Tarjeta añadida', 'Tu nuevo medio de pago ya quedó registrado.')
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
      <div v-if="avisoReintento" class="ds-banner ds-banner--warning" role="status">
        <Info :size="16" :stroke-width="2" class="ds-banner-icon" aria-hidden="true" />
        <span class="ds-flex-fill">
          <strong>La reintentaremos automáticamente.</strong>
          No hace falta que hagas nada más. Puedes ver el estado en
          <RouterLink :to="{ name: 'suscripcion-cobros' }">Mis cuentas de cobro</RouterLink>.
        </span>
      </div>

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
        <template v-if="puedeCrear && !formularioAbierto" #action>
          <button
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--snug"
            @click="formularioAbierto = true"
          >
            <Plus :size="15" :stroke-width="1.8" aria-hidden="true" />
            Añadir tarjeta
          </button>
        </template>

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

        <FormularioTarjetaWompi
          v-if="formularioAbierto"
          class="alta-formulario"
          @guardado="onTarjetaGuardada"
          @cancelar="formularioAbierto = false"
        />
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
.alta-formulario {
  margin-top: var(--space-16);
}
</style>
