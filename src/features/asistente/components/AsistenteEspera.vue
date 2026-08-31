<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { CANCELAR_DESDE_MS, ESPERA_VISIBLE_DESDE_MS, FRASES_ESPERA } from '../content/copy.content'

/**
 * Los tres a ocho segundos de espera.
 *
 * ── Lo que NO se hace: el overlay global ────────────────────────────────────
 * La petición va con `skipGlobalLoader`. El `PageLoader` es `position: fixed;
 * inset: 0` con `cursor: wait` y z-index 2000: seis segundos de eso sobre la
 * pantalla que decide una compra son seis segundos en los que el prospecto **no
 * puede releer lo que escribió, no puede corregirlo y no puede cancelar**.
 *
 * ── La línea de tiempo, y por qué cada marca está donde está ────────────────
 * Por debajo de un segundo no hace falta indicador; entre uno y diez hay que
 * decir que se está trabajando; por encima de diez hace falta una forma clara de
 * interrumpir. De ahí las tres frases escalonadas y el «Cancelar» a los ocho
 * segundos — **adelantado a propósito**: aparecer justo en el umbral llega tarde.
 *
 * ── Una sola región viva, tres frases ───────────────────────────────────────
 * Las tres sustituyen el contenido de la MISMA región. Tres regiones distintas
 * producirían tres interrupciones apiladas. Y `role="status"`, no `alert`: no ha
 * fallado nada.
 *
 * <p>`PawLoader` va con `label=""` a propósito: trae `role="status"` propio, y
 * dejarle su etiqueta por defecto crearía una **segunda** región viva que
 * anunciaría «Cargando» encima de la frase. La región de verdad es la de abajo.
 *
 * <p>Y nada de barra de progreso con porcentaje: no sabemos el porcentaje. Una
 * barra inventada es una mentira que además se detecta — cuando llega al 90 % y
 * se queda, el usuario aprende que la aplicación miente.
 *
 * ── La guarda de los 200 ms ─────────────────────────────────────────────────
 * Nada se pinta durante los primeros {@link ESPERA_VISIBLE_DESDE_MS}. El camino
 * determinista vuelve en decenas de milisegundos y el `v-if` del panel monta y
 * desmonta este bloque entero: sin guarda, un destello con salto de maquetación.
 * Va **aquí dentro** y no en la condición del panel a propósito, para que el
 * panel siga teniendo un solo predicado de espera; y el cronómetro arranca en el
 * montaje, no en la aparición, así que las marcas de 3 s y 8 s siguen contando
 * desde que la petición salió y no desde que el usuario vio algo.
 */
defineProps<{ refinando?: boolean }>()

defineEmits<{ cancelar: [] }>()

const transcurrido = ref(0)
let intervalo: ReturnType<typeof setInterval> | null = null

/** `false` hasta pasar la guarda. Ver la cabecera. */
const visible = ref(false)
let aparicion: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  intervalo = setInterval(() => {
    transcurrido.value += 500
  }, 500)
  aparicion = setTimeout(() => {
    visible.value = true
  }, ESPERA_VISIBLE_DESDE_MS)
})

onBeforeUnmount(() => {
  if (intervalo) clearInterval(intervalo)
  if (aparicion) clearTimeout(aparicion)
})

const frase = computed(() => {
  const aplicables = FRASES_ESPERA.filter((f) => transcurrido.value >= f.desdeMs)
  return aplicables[aplicables.length - 1]?.texto ?? FRASES_ESPERA[0]?.texto ?? ''
})

const mostrarCancelar = computed(() => transcurrido.value >= CANCELAR_DESDE_MS)
</script>

<template>
  <div v-if="visible" class="aesp" aria-busy="true">
    <PawLoader :size="48" :glow="false" :speed="900" label="" />

    <p class="aesp-frase" role="status" aria-live="polite">
      {{ refinando ? 'Estamos ajustando tu propuesta con lo que nos acabas de contar.' : frase }}
    </p>

    <!-- Cancelar devuelve el control al usuario. **No cancela la invocación ni
         devuelve el gasto**, y por eso el copy no lo insinúa. -->
    <button
      v-if="mostrarCancelar"
      type="button"
      class="ds-btn ds-btn--ghost aesp-cancelar"
      @click="$emit('cancelar')"
    >
      Cancelar
    </button>
  </div>
</template>

<style scoped>
.aesp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-block: 32px;
  text-align: center;
}

.aesp-frase {
  margin: 0;
  max-inline-size: 44ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--pub-ink-700);
}

.aesp-cancelar {
  min-block-size: 44px;
}
</style>
