<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDateLong } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import { CICLO_LABEL } from '@/features/landing/types/plans.types'
import DemoModeNotice from '../components/DemoModeNotice.vue'
import SiguientesPasos from '../components/SiguientesPasos.vue'
import TrialLinesTable from '../components/TrialLinesTable.vue'
import { SIN_ENDPOINT_DE_CONTRATACION, sumarDias } from '../api/contratacion.source'
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
    <h1 ref="h1" class="ds-display ds-display--sm" tabindex="-1">
      Listo. Tu plan {{ resultado.planNombre }} está activo.
    </h1>
    <p class="ds-subtitle">
      {{ modulos }} ya están encendidos para <strong>{{ resultado.empresaNombre }}</strong
      >.
    </p>

    <section class="ds-stack ds-stack--10" aria-labelledby="cobro-titulo">
      <h2 id="cobro-titulo" class="ds-title">Qué se va a cobrar y cuándo</h2>

      <TrialLinesTable :lineas="resultado.lineasPrueba" />

      <p class="ds-meta">
        {{ CICLO_LABEL[resultado.ciclo] }} · {{ formatMoney(resultado.subtotal) }} + IVA
        {{ formatMoney(resultado.impuesto) }} = <strong>{{ formatMoney(resultado.total) }}</strong>
        <template v-if="primerCobro">
          · Primer cobro previsto: {{ formatDateLong(primerCobro) }}
        </template>
      </p>

      <p class="ds-meta">Te vamos a avisar por correo antes del primer cobro.</p>

      <!-- La segunda y ÚLTIMA vez que aparece el aviso. Nunca más. -->
      <DemoModeNotice compacto />

      <!-- Lo que todavía no es verdad, dicho donde se puede leer y sin adornos.
           No existe ningún endpoint con el que una clínica contrate su propio
           plan (`CreateQuoteUseCase` sigue siendo `hasRole('SYSTEM')`), así que
           esta confirmación no ha viajado al servidor. Es la única frase de
           esta pantalla que desaparecerá el día que exista el endpoint. -->
      <p v-if="SIN_ENDPOINT_DE_CONTRATACION" class="ds-meta">
        La conexión con el servicio de suscripciones todavía no está publicada, así que esta
        confirmación no ha viajado al servidor. Escríbenos a
        <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y la dejamos aplicada en
        tu cuenta.
      </p>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="ahora-titulo">
      <h2 id="ahora-titulo" class="ds-title">Tres cosas que hacer ahora</h2>
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

.ex h1:focus,
.ex h1:focus-visible {
  outline-offset: 3px;
}
</style>
