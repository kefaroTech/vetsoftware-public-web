<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/composables/money'
import { sufijoCiclo } from '../../landing/composables/planPricing'
import type { Ciclo } from '../../landing/types/plans.types'
import type { OfertaPaquete } from '../types/asistente.types'

/**
 * La comparación con un paquete. **Se compara, no se sustituye.**
 *
 * ── La decisión que este componente encarna, y los números que la sostienen ──
 * Una versión anterior del plan decía: «si un paquete cubre parte del carrito y
 * sale más barato, se sustituye». Eso es un patrón oscuro, y se demuestra con la
 * semilla: los tres `BUNDLE` son `NEVER_FREE`, mientras que once de los trece
 * módulos dan 14 o 30 días gratis. Sustituir en silencio ahorra unos pesos al
 * mes **y le quita al cliente el primer mes de prueba entero** — en una landing
 * que promete «Prueba gratis. Sin tarjeta.».
 *
 * Por eso aquí se enseñan **las dos dimensiones, juntas y con el mismo peso
 * visual**: lo que ahorra al mes y lo que pierde en prueba. Y el carrito por
 * defecto siguen siendo los módulos sueltos, que son los que conservan la
 * prueba. El paquete es una oferta que el cliente acepta con un clic, no un
 * cambio que le hacemos nosotros.
 *
 * ── «Cambiar al», nunca «Añadir» ────────────────────────────────────────────
 * Paquete y componente del paquete **no se compran juntos**: el servidor lo
 * rechaza, y `componentCodes` se publica precisamente para que el front evite el
 * conflicto en vez de descubrirlo con un 400. El verbo tiene que hacer imposible
 * el error, no advertir de él.
 *
 * <p>`ds-banner--success` porque es un ahorro real y `role="status"` porque no
 * ha fallado nada.
 */
const props = defineProps<{ oferta: OfertaPaquete; ciclo: Ciclo }>()

defineEmits<{ cambiar: [code: string] }>()

/** «Agenda, Historia clínica y Vacunación» — con «y», que es como se lee. */
const nombresDePrueba = computed(() => {
  const nombres = props.oferta.pruebasQuePierde.map((p) => p.nombre)
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
})

/**
 * Los días que se pierden, **tal como los agregó el servidor**.
 *
 * <p>Antes se calculaba aquí como el máximo de los días de cada módulo. Ya no:
 * `AssistantPackOfferResponse` publica `trialDaysLost` y ese es el número que el
 * backend considera correcto. Derivarlo en el cliente lo dejaría en manos de una
 * regla local que ni siquiera sabe si el servidor agrega por máximo o por suma —
 * y es la cifra que sostiene el aviso que impide que esta tarjeta sea un patrón
 * oscuro.
 */
const maxDias = computed(() => props.oferta.diasDePruebaPerdidos)
</script>

<template>
  <div class="ds-banner ds-banner--success cmp" role="status">
    <p class="cmp-t">¿Prefieres el {{ oferta.nombre }}?</p>

    <p class="cmp-p">
      Cuesta {{ formatMoney(oferta.ahorro) }} menos {{ sufijoCiclo(ciclo) }} —
      {{ formatMoney(oferta.importePaquete) }} frente a {{ formatMoney(oferta.importeActual) }}.
    </p>

    <!-- La otra mitad, con el mismo cuerpo de letra. Enseñar solo el ahorro es
         lo que convierte esta tarjeta en un patrón oscuro. -->
    <p v-if="oferta.pruebasQuePierde.length > 0" class="cmp-p cmp-p--perdida">
      Pero los paquetes no llevan prueba gratis: perderías hasta {{ maxDias }} días en
      {{ nombresDePrueba }}.
    </p>

    <p v-if="oferta.modulosExtra.length > 0" class="cmp-p">
      Además te llevarías {{ oferta.modulosExtra.join(', ') }}.
    </p>

    <button
      type="button"
      class="ds-btn ds-btn--ghost cmp-boton"
      @click="$emit('cambiar', oferta.code)"
    >
      Cambiar al {{ oferta.nombre }}
    </button>
    <span class="cmp-seguir">o sigue con tu propuesta a medida</span>
  </div>
</template>

<style scoped>
.cmp {
  margin-block-start: 16px;
}

.cmp-t {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.cmp-p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

.cmp-p--perdida {
  font-weight: 600;
}

.cmp-boton {
  margin-block-start: 12px;
  min-block-size: 44px;
}

.cmp-seguir {
  margin-inline-start: 10px;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}
</style>
