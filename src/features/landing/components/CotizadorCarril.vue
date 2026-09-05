<script setup lang="ts">
import { computed } from 'vue'
import type { EstadoImporte } from '../composables/useCotizador'

/**
 * El carril derecho de la tarjeta del cotizador: qué va a pasar, cuánto cuesta
 * y el botón.
 *
 * <p>No es un `<aside>`: aquí dentro está la acción principal de la portada, y
 * un botón primario dentro de un punto de referencia «complementario» se anuncia
 * como algo accesorio.
 *
 * <p>El botón es `type="submit"` del formulario que lo envuelve, no un `emit`:
 * así Enter dentro del campo también avanza, que es lo que hace un formulario.
 *
 * ── Por qué el total se enseña aquí ─────────────────────────────────────────
 * Sin cifra, el comprador subestima lo que va a pagar, se decide por opciones
 * más caras y no cambia cuando el importe aparece al final (Rasch et al. 2020,
 * JEBO; Santana, Dallas & Morwitz). La cifra la suma el navegador con el
 * catálogo ya descargado —cero peticiones desde la portada, que es lo que
 * protege el cupo por IP de `POST /quotes/preview`— y por eso va rotulada
 * «desde» y orientativa: la escalera por volumen no se publica y el importe que
 * obliga lo calcula el servidor antes de pagar.
 *
 * <p>La región viva es la del importe y solo habla cuando se marca una casilla:
 * su contenido lo compone `useCotizador`, que es quien sabe cuándo un anuncio
 * deja de ser cierto.
 */
const props = defineProps<{
  /** Módulos marcados ahora mismo. */
  nModulos: number
  /** Módulos que el catálogo vigente vende a mano, marcados o no. */
  nVendibles: number
  /** Si lo marcado sigue siendo la combinación premarcada. Lo decide quien la conoce. */
  puntoDePartida: boolean
  /** La cifra ya formateada. Nunca `$ 0`: el guion es el marcador de «sin dato». */
  importe: string
  /** El rótulo del importe, con impuesto y ciclo. Nunca escrito a mano en la plantilla. */
  sufijo: string
  estado: EstadoImporte
  regionViva: string
}>()

const seleccion = computed(() =>
  props.nModulos === 0
    ? 'Solo clientes y mascotas'
    : `Clientes y mascotas + ${props.nModulos} ${props.nModulos === 1 ? 'módulo' : 'módulos'}`,
)

/**
 * Lo que NO se está pagando, en pantalla desde el primer momento y no al final
 * del embudo. Junto con el conteo de arriba es la divulgación que hace legítimo
 * que la portada llegue con casillas marcadas: ver `content/cotizador.content.ts`.
 */
const fuera = computed(() => {
  const sinContratar = Math.max(0, props.nVendibles - props.nModulos)
  if (sinContratar === 0) return null
  return sinContratar === 1
    ? 'No pagas el otro módulo.'
    : `No pagas los otros ${sinContratar} módulos.`
})

const nota = computed(() =>
  props.estado === 'CALCULANDO'
    ? 'Calculando con los precios de hoy…'
    : 'Todavía no podemos calcular tu total aquí. Sigue: el precio exacto lo ves antes de confirmar.',
)
</script>

<template>
  <div class="ds-rail lcc">
    <p class="lcc-eyebrow">Cómo funciona</p>

    <ol class="ds-steps lcc-pasos">
      <li>Marcas los módulos que usas, o dejas los que ya vienen marcados.</li>
      <li>Si no sabes cuáles, nos cuentas qué hace tu negocio y te los proponemos.</li>
      <li>Ves el precio exacto y las fechas de cobro antes de crear ninguna cuenta.</li>
    </ol>

    <div class="lcc-precio pub-tinted" :data-estado="estado">
      <!-- Ninguna afirmación sobre lo que eligen otros clientes: ese dato no
           está medido y el art. 30 de la Ley 1480 exige que lo que se afirma en
           publicidad sea verificable. Este es el sitio donde iría la prueba
           social el día que exista la medición (#375). -->
      <p v-if="puntoDePartida" class="lcc-partida">Un punto de partida: cámbialo a tu gusto</p>

      <p class="lcc-sel">{{ seleccion }}</p>

      <p v-if="estado === 'LISTO'" class="lcc-linea">
        <span class="lcc-desde">desde</span>
        <span class="lcc-cifra pub-num">{{ importe }}</span>
        <span class="lcc-suf">{{ sufijo }}</span>
      </p>

      <p v-else class="lcc-nota">{{ nota }}</p>

      <p v-if="fuera" class="lcc-fuera">{{ fuera }}</p>
    </div>

    <button type="submit" class="ds-btn ds-btn--primary lcc-cta">Empezar gratis</button>

    <!-- No es letra pequeña decorativa: «Empezar gratis» no dice a dónde lleva, y
         esta línea es lo único que anuncia el paso siguiente. -->
    <p class="lcc-pie">
      Cálculo orientativo con los precios de lista. Sin tarjeta y sin compromiso: en el paso
      siguiente ves el precio exacto y cuándo empieza a cobrarse.
    </p>

    <p class="ds-sr-only" aria-live="polite" aria-atomic="true">{{ regionViva }}</p>
  </div>
</template>

<style scoped>
.lcc-eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.lcc-pasos {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.lcc-precio {
  margin-block-start: 16px;
  padding: 14px 16px;
  border-radius: 12px;
}

/* Sin versalitas ni `letter-spacing`: es una frase y no un kicker de tres
   palabras, y en mayúsculas se lee peor y ocupa dos líneas del carril. */
.lcc-partida {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-ame-700);
}

.lcc-sel {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--pub-ink-500);
}

.lcc-linea {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 0;
}

.lcc-desde {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.lcc-cifra {
  font-size: 30px;
  color: var(--pub-ink-900);
}

.lcc-suf {
  font-size: 13px;
  color: var(--pub-ink-600);
}

.lcc-nota {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lcc-fuera {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lcc-cta {
  inline-size: 100%;
  margin-block-start: 18px;
  min-block-size: 52px;
  font-size: 15.5px;
}

.lcc-pie {
  margin: 11px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
  text-align: center;
}
</style>
