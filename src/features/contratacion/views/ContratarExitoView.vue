<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDateLong } from '@/composables/format'
import { importeEstimado } from '@/features/landing/composables/planPricing'
import { CICLO_LABEL } from '@/features/landing/types/plans.types'
import DemoModeNotice from '../components/DemoModeNotice.vue'
import SiguientesPasos from '../components/SiguientesPasos.vue'
import TrialLinesTable from '../components/TrialLinesTable.vue'
import { sumarDias } from '../api/contratacion.source'
import { useResultadoContratacionStore } from '../stores/resultadoContratacion.store'

/**
 * Paso 7 — el momento más importante, y el que peor se resuelve siempre.
 *
 * Tres bloques, en este orden: qué pasó en una línea con el dato que le importa;
 * qué se va a cobrar y cuándo, con las fechas reales por módulo; y tres cosas
 * que hacer ahora. Eso último es lo que convierte una compra en un uso.
 *
 * Sin resultado en el store no hay nada que contar —una recarga a la semana, un
 * enlace pegado—, y la pantalla manda al tablero en vez de repetir una
 * activación vieja como si acabara de ocurrir.
 */
const router = useRouter()
const { resultado } = storeToRefs(useResultadoContratacionStore())

const h1 = ref<HTMLElement | null>(null)

/**
 * Cuántos módulos quedaron reservados, contados sobre las líneas que se pintan
 * debajo. Se dice el número y no «el núcleo y N»: distinguir cuál de esas
 * líneas es el mínimo estructural exige el catálogo, y esta pantalla no lo
 * tiene — inventarlo sería contar mal en la frase que resume una compra.
 */
const cuantosModulos = computed(() => resultado.value?.modulosActivados.length ?? 0)

const modulos = computed(() => {
  const nombres = resultado.value?.modulosActivados ?? []
  if (nombres.length <= 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
})

/** El primer cobro es el día siguiente al final de la prueba que termina antes. */
const primerCobro = computed(() => {
  const primera = resultado.value?.lineasPrueba[0]
  return primera ? sumarDias(primera.trialEndDate, 1) : null
})

onMounted(async () => {
  if (!resultado.value) {
    void router.replace({ name: 'home' })
    return
  }
  await nextTick()
  h1.value?.focus()
})
</script>

<template>
  <main
    v-if="resultado"
    class="ds-page ds-page--contained ds-stack ds-stack--16 ex"
    data-testid="contratacion-exito"
  >
    <!-- «está activo» era mentira, y la propia pantalla la desmentía ochenta píxeles más abajo
         («esta confirmación no ha viajado al servidor»). «Reservado» es lo que de verdad
         ocurrió: la elección quedó tomada y guardada, y la activación es el paso que falta.
         Es el punto donde la app le habla a quien acaba de decidir una compra, así que lo
         primero que se lee no puede desmentir lo último. -->
    <!-- Un paquete se nombra («Tu plan Completo está reservado»); una propuesta a
         medida ya se llama a sí misma («Tu propuesta a medida está reservada»), y
         anteponerle «Tu plan» produciría «Tu plan Tu propuesta a medida». Es la
         primera frase que lee quien acaba de comprar: tiene que estar escrita en
         castellano, no en plantilla. -->
    <p class="ex-insignia ds-pill ds-tone--accent-soft">Reservado</p>

    <h1 ref="h1" class="ds-display ds-display--sm" tabindex="-1">
      <template v-if="resultado.origen === 'PLAN'">
        Listo. Reservaste {{ cuantosModulos }} {{ cuantosModulos === 1 ? 'módulo' : 'módulos' }}.
      </template>
      <template v-else> Listo. {{ resultado.titulo }} está reservada. </template>
    </h1>
    <p class="ds-subtitle">
      <template v-if="resultado.origen === 'PLAN'">{{ resultado.titulo }}. </template>
      {{ modulos }} son los módulos que quedan reservados para
      <strong>{{ resultado.empresaNombre }}</strong
      >.
    </p>

    <section class="ds-stack ds-stack--10" aria-labelledby="cobro-titulo">
      <h2 id="cobro-titulo" class="ds-title">Qué se va a cobrar, módulo por módulo</h2>

      <TrialLinesTable :lineas="resultado.lineasPrueba" />

      <p class="ds-meta">
        {{ CICLO_LABEL[resultado.ciclo] }} · {{ importeEstimado(resultado.subtotal) }} + IVA
        {{ importeEstimado(resultado.impuesto) }} =
        <strong>{{ importeEstimado(resultado.total) }}</strong>
        <template v-if="primerCobro">
          · Primer cobro previsto: {{ formatDateLong(primerCobro) }}
        </template>
      </p>

      <p class="ds-meta">Te vamos a avisar por correo antes del primer cobro.</p>

      <!-- La segunda y ÚLTIMA vez que aparece el aviso. Nunca más. -->
      <DemoModeNotice compacto />

      <!-- Lo que SÍ pasó y lo que todavía no, sin adornos y sin bandera que lo esconda.
           La confirmación viajó: `POST /quotes/self-serve` dejó una oferta emitida con estos
           importes, resueltos por el servidor. Lo que no ocurre solo es el último eslabón —hoy
           nadie reacciona a una oferta aceptada, así que los módulos no se encienden—, y eso se
           dice aquí en vez de dejar que el usuario lo descubra entrando al tablero. El número de
           la oferta es lo que convierte «escríbenos» en algo accionable. -->
      <p class="ds-meta">
        Ya registramos tu contratación
        <template v-if="resultado.cotizacionNumero">
          con el número <strong>{{ resultado.cotizacionNumero }}</strong>
        </template>
        <template v-if="resultado.validaHasta">
          , válida hasta el {{ formatDateLong(resultado.validaHasta) }}</template
        >. Para dejar los módulos encendidos en tu cuenta escríbenos a
        <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a
        ><template v-if="resultado.cotizacionNumero"> con ese número</template>.
      </p>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="ahora-titulo">
      <!-- «Tres cosas» prometía un número que el permiso del usuario puede no permitir:
           `SiguientesPasos` oculta la tarjeta cuyo destino el rol no alcanza. -->
      <h2 id="ahora-titulo" class="ds-title">Qué hacer ahora</h2>
      <SiguientesPasos />
    </section>
  </main>
</template>

<style scoped>
.ex {
  max-width: 860px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ex-insignia {
  align-self: flex-start;
  margin: 0;
}

.ex h1:focus,
.ex h1:focus-visible {
  outline-offset: 3px;
}
</style>
