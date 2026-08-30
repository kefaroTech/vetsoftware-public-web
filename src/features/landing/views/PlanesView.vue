<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import PlanesConfigurador from '../components/PlanesConfigurador.vue'
import { usePlanes } from '../composables/usePlanes'
import { MONEDA_DE_FACTURACION } from '../composables/planPricing'
import type { Ciclo } from '../types/plans.types'

/**
 * Paso 2 del embudo — `/planes`.
 *
 * Lleva `guestOnly` como el resto de la zona pública: un cliente con sesión que
 * entra aquí va al tablero, que es lo correcto — su plan se gestiona desde
 * dentro, no desde el escaparate.
 *
 * La selección se siembra, en este orden: lo que traiga la URL (un enlace
 * compartido o el CTA de una tarjeta), lo que hubiera en la intención guardada,
 * y por último los mínimos. La URL manda porque es lo que el usuario acaba de
 * pulsar.
 *
 * ── Dos superficies, UNA ruta ───────────────────────────────────────────────
 * Desde el asistente de propuesta a medida, esta ruta tiene dos contenidos: el
 * cuadro de texto libre arriba, como contenido principal, y los tres paquetes
 * debajo en un `<details>`. **No hay ruta nueva**, y es una decisión: una
 * `/planes/asistente` partiría la entrada del embudo en dos URLs, obligaría a
 * mantener dos pantallas de precio y haría ilegible la analítica del paso 2.
 *
 * <p>Y los paquetes **no desaparecen**, por conversión y no por comodidad: son
 * el ancla de precio. El flujo a medida pide escribir un párrafo y esperar unos
 * segundos **antes de ver una sola cifra**; si al final del túnel sale un importe
 * fuera de presupuesto, quien no llegaba se va habiendo trabajado gratis. Con
 * los tres paquetes a mano se autoselecciona en dos segundos. Es el mismo
 * criterio que `LandingPlans` ya dejó escrito para no quitar los precios ni
 * cuando la petición falla.
 */
const route = useRoute()
const router = useRouter()
const { plans, loading, error, refresh } = usePlanes()
const { vigente, elegir } = useContratacion()

function texto(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null
}
function entero(v: unknown, porDefecto: number): number {
  const n = Math.trunc(Number(texto(v)))
  return Number.isFinite(n) && n >= 1 ? n : porDefecto
}

/** El paquete que la intención trae, o nada si lo que trae es una propuesta. */
const planDeLaIntencion = vigente.value?.origen === 'PLAN' ? vigente.value.planCode : undefined

const planCode = ref(texto(route.query.plan) ?? planDeLaIntencion ?? '')
const ciclo = ref<Ciclo>(
  route.query.ciclo === 'ANUAL' || route.query.ciclo === 'MENSUAL'
    ? route.query.ciclo
    : (vigente.value?.ciclo ?? 'MENSUAL'),
)
const sedes = ref(entero(route.query.sedes, vigente.value?.sedes ?? 1))
const usuarios = ref(entero(route.query.usuarios, vigente.value?.usuarios ?? 1))

// El catálogo llega después del primer render: si la URL no traía plan, o traía
// uno que ya no existe, se cae al recomendado en cuanto hay lista.
watch(
  plans,
  (lista) => {
    if (lista.length === 0) return
    if (!lista.some((p) => p.code === planCode.value)) {
      const porDefecto = lista.find((p) => p.recommended) ?? lista[0]
      if (porDefecto) planCode.value = porDefecto.code
    }
  },
  { immediate: true },
)

const planElegido = computed(() => plans.value.find((p) => p.code === planCode.value) ?? null)

/**
 * Guarda la intención y salta al registro. La elección viaja también en la query
 * —además de en el store— para que el enlace se pueda compartir y para que el
 * carril «Tu selección» del registro no dependa solo del almacenamiento.
 */
function continuar() {
  const plan = planElegido.value
  if (!plan) return
  elegir(plan, ciclo.value, sedes.value, usuarios.value)
  void router.push({
    name: 'signup',
    query: {
      plan: plan.code,
      ciclo: ciclo.value,
      sedes: String(sedes.value),
      usuarios: String(usuarios.value),
    },
  })
}
</script>

<template>
  <PublicLayout>
    <template #topRight>
      ¿Ya tienes cuenta? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
    </template>

    <div class="pl-page">
      <div class="pl-head">
        <!-- El `<h1>` vive AQUÍ y no dentro del asistente, y es deliberado: el
             panel monta y desmonta sus estados, así que un `<h1>` suyo
             desaparecería del documento en cuanto llegara la propuesta y la
             página se quedaría sin encabezado de nivel 1. -->
        <h1 class="pub-title">Armemos el plan de tu clínica</h1>
        <p class="pub-sub">
          Cuéntanos con tus palabras a qué se dedica tu veterinaria. Te proponemos los módulos que
          te sirven, con su precio. No te compromete a nada y no pedimos tarjeta.
        </p>
        <!-- El indicador de moneda va AQUÍ, una vez por pantalla, y no pegado a cada cifra: ver
             `MONEDA_DE_FACTURACION`. Sin él, «$ 149.000» en una web que se lee desde cualquier
             país es una cifra sin unidad en la pantalla donde alguien decide comprar. -->
        <p class="pl-moneda">Todos los precios están en {{ MONEDA_DE_FACTURACION }}, sin IVA.</p>
      </div>

      <div v-if="error" class="pub-error" role="alert">
        <p class="pl-state-title">No pudimos cargar los planes</p>
        <p class="pl-state-text">
          Puedes crear tu cuenta igualmente y ver el precio exacto antes de confirmar.
        </p>
        <button type="button" class="pl-retry" @click="refresh">
          <RefreshCw :size="14" :stroke-width="1.8" aria-hidden="true" />
          Volver a intentarlo
        </button>
      </div>

      <p v-else-if="loading" class="pl-state-text">Cargando los planes…</p>

      <p v-else-if="plans.length === 0" class="pl-state-text">
        Todavía no hay planes publicados. Escríbenos a
        <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a>.
      </p>

      <!-- Contenido principal: la propuesta a medida. -->
      <AsistentePanel />

      <!-- Y los tres paquetes, siempre disponibles. `open` en escritorio y
           cerrado en móvil no se puede expresar con un atributo estático, así
           que va abierto: en móvil cuesta un scroll; cerrado en escritorio
           costaría el ancla de precio, que es lo que sostiene la conversión. -->
      <details class="pl-paquetes" open>
        <summary class="pl-paquetes-sum">O elige uno de nuestros tres paquetes</summary>

        <PlanesConfigurador
          v-if="plans.length > 0"
          v-model:plan-code="planCode"
          v-model:ciclo="ciclo"
          v-model:sedes="sedes"
          v-model:usuarios="usuarios"
          :plans="plans"
          @continuar="continuar"
        />
      </details>
    </div>
  </PublicLayout>
</template>

<style scoped>
.pl-page {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 0;
}

.pl-head {
  margin-bottom: 26px;
}

.pl-moneda {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.pl-state-title {
  margin: 0;
  font-weight: 700;
}

.pl-state-text {
  margin: 6px 0 0;
  font-size: 13.5px;
  color: var(--pub-ink-600);
}

.pl-paquetes {
  margin-block-start: 30px;
  padding-block-start: 18px;
  border-block-start: 1px solid var(--pub-line-strong);
}

.pl-paquetes-sum {
  margin-block-end: 16px;
  font-size: 16px;
  font-weight: 700;
  color: var(--pub-ink-900);
  cursor: pointer;
}

.pl-retry {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid var(--pub-err-bd);
  background: var(--pub-surface);
  color: var(--pub-err-tx-2);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
