<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import PageHeader from '@/components/ui/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { formatMoney } from '@/composables/money'
import { useModulosStore } from '@/features/entitlements/stores/modulos.store'
import CicloFieldset from '@/features/landing/components/CicloFieldset.vue'
import ModuloCard from '../components/ModuloCard.vue'
import FormularioTarjetaWompi from '../components/FormularioTarjetaWompi.vue'
import { useModulosCompra } from '../composables/useModulosCompra'
import { cicloLabel } from '../composables/estadoSuscripcion'
import { notaCobroPrevio } from '../composables/modulosText'
import type { WompiPaymentMethodResponse } from '../types/pago.types'

/**
 * El escaparate entero del catálogo —lo que la empresa ya tiene y lo que podría tener— con la
 * compra de los módulos elegibles en la misma pantalla.
 */
const modulosStore = useModulosStore()
const { modulos, cargando, error } = storeToRefs(modulosStore)

const {
  seleccion,
  haySeleccion,
  alternar,
  ciclo,
  cicloBloqueado,
  cargandoMedios,
  cargarMedios,
  medioPorDefecto,
  medioNuevo,
  registrarMedioNuevo,
  paymentSourceId,
  comprando,
  confirmacion,
  confirmarCompra,
  textoLinea,
} = useModulosCompra()

onMounted(() => {
  void modulosStore.cargar(true)
  void cargarMedios(true)
})

const encabezado = ref<HTMLElement | null>(null)

/**
 * WCAG 2.2 §2.4.3: tras confirmar la compra, el foco vuelve al `<h1>` —que sigue existiendo pase
 * lo que pase— y no al botón de «Confirmar compra», que puede haber salido del árbol si la
 * compra vació la selección. Mismo patrón que `CotizacionDetalleView.vue`.
 */
function devolverFoco(): void {
  const h1 = encabezado.value?.querySelector<HTMLElement>('h1')
  if (!h1) return
  h1.tabIndex = -1
  h1.focus()
}

const seleccionados = computed(() =>
  modulos.value.filter((m) => m.code != null && seleccion.value.has(m.code)),
)

const incluyeNuncaGratis = computed(() => seleccionados.value.some((m) => m.state === 'NEVER_FREE'))

const totalMensual = computed(() =>
  seleccionados.value.reduce((acc, m) => acc + (m.monthlyPrice ?? 0), 0),
)
const totalAnual = computed(() =>
  seleccionados.value.reduce((acc, m) => acc + (m.annualPrice ?? 0), 0),
)
const totalTexto = computed(() =>
  ciclo.value === 'ANUAL' ? formatMoney(totalAnual.value) : formatMoney(totalMensual.value),
)

function onTarjetaGuardada(medio: WompiPaymentMethodResponse): void {
  registrarMedioNuevo(medio)
}

async function onConfirmar(): Promise<void> {
  const ok = await confirmarCompra(modulos.value)
  if (!ok) return
  await modulosStore.cargar(true)
  devolverFoco()
}
</script>

<template>
  <div>
    <div ref="encabezado">
      <PageHeader kicker="Mi suscripción" title="Tus módulos" />
    </div>

    <p class="ds-meta">
      Aquí ves el estado de cada módulo de tu clínica y puedes comprar los que quieras seguir usando
      cuando termine la prueba.
    </p>

    <p v-if="error" class="ds-empty ds-empty--boxed">{{ error }}</p>

    <template v-else>
      <SectionCard title="Tus módulos">
        <p v-if="cargando && modulos.length === 0" class="ds-empty ds-empty--tight">
          Cargando tus módulos…
        </p>
        <ul v-else class="ds-list-reset ds-stack ds-stack--14">
          <li v-for="m in modulos" :key="m.code">
            <ModuloCard
              :modulo="m"
              :seleccionado="m.code != null && seleccion.has(m.code)"
              @alternar="alternar"
            />
          </li>
        </ul>
      </SectionCard>

      <!-- La confirmación tiene que sobrevivir a `limpiarSeleccion()`: sin el `|| confirmacion`,
           el éxito de la propia compra vacía `haySeleccion` y se lleva por delante la sección
           que muestra su resultado antes de que nadie llegue a leerlo. -->
      <SectionCard
        v-if="haySeleccion || (confirmacion && confirmacion.length > 0)"
        title="Comprar módulos"
      >
        <div class="ds-stack ds-stack--18">
          <template v-if="haySeleccion">
            <div v-if="cicloBloqueado" class="ds-meta">
              Ciclo de tu plan:
              <strong>{{ cicloLabel(ciclo === 'ANUAL' ? 'ANNUAL' : 'MONTHLY') }}</strong>
            </div>
            <CicloFieldset v-else v-model="ciclo" legend="¿Cómo prefieres pagar?" />

            <div class="ds-stack ds-stack--8">
              <p v-for="m in seleccionados" :key="m.code" class="ds-flex-row">
                <span class="ds-flex-fill">{{ m.name }}</span>
                <span class="ds-num">
                  {{
                    formatMoney(ciclo === 'ANUAL' ? (m.annualPrice ?? 0) : (m.monthlyPrice ?? 0))
                  }}
                </span>
              </p>
              <p class="ds-flex-row tm-total">
                <span class="ds-flex-fill">Total</span>
                <span class="ds-num">{{ totalTexto }}</span>
              </p>
            </div>

            <p class="ds-meta">{{ notaCobroPrevio(incluyeNuncaGratis) }}</p>

            <p v-if="cargandoMedios" class="ds-meta">Cargando tu medio de pago…</p>
            <template v-else>
              <p v-if="medioPorDefecto" class="ds-meta">
                Pagaremos con la tarjeta terminada en <strong>{{ medioPorDefecto.lastFour }}</strong
                >.
              </p>
              <FormularioTarjetaWompi v-else-if="!medioNuevo" @guardado="onTarjetaGuardada" />
              <p v-else class="ds-meta">
                Pagaremos con la tarjeta terminada en <strong>{{ medioNuevo.lastFour }}</strong
                >.
              </p>
            </template>

            <button
              type="button"
              class="ds-btn ds-btn--primary ds-btn--lg"
              :disabled="comprando || paymentSourceId == null"
              @click="onConfirmar"
            >
              {{ comprando ? 'Confirmando…' : 'Confirmar compra' }}
            </button>
          </template>

          <div
            v-if="confirmacion && confirmacion.length > 0"
            class="ds-banner ds-banner--sm ds-banner--warning"
            role="status"
          >
            <span class="ds-flex-fill">
              <span
                v-for="item in confirmacion"
                :key="item.linea.catalogItemCode"
                class="tm-confirmacion-linea"
              >
                {{ textoLinea(item) }}
              </span>
            </span>
          </div>
        </div>
      </SectionCard>
    </template>
  </div>
</template>

<style scoped>
.tm-total {
  border-top: 1px solid var(--warm-200);
  padding-top: var(--space-8);
  font-weight: var(--weight-semibold);
}

.tm-confirmacion-linea {
  display: block;
}
</style>
