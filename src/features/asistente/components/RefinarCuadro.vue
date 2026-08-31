<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { MAX_REFINAMIENTO, MIN_REFINAMIENTO, RELLENOS_RAPIDOS } from '../content/copy.content'

/**
 * «¿Se nos olvidó algo?»
 *
 * ── Dónde va, y por qué NO va arriba ────────────────────────────────────────
 * Después del botón de continuar y antes del catálogo manual. Arriba, junto al
 * resultado, se lee como «vuelve a empezar» y produce el peor comportamiento
 * posible: que el usuario borre y reescriba su párrafo original entero.
 *
 * ── La frase que hace todo el trabajo ───────────────────────────────────────
 * «No hace falta que repitas lo de antes» es el elemento de diseño más
 * importante de este bloque. Sin ella el usuario reescribe su descripción
 * completa, el modelo devuelve casi lo mismo, y eso se lee como «no funcionó».
 *
 * ⚠️ **Y la promesa la cumple el servidor, no el copy.** Los turnos son
 * acumulativos: el modelo recibe la descripción original, todos los añadidos y
 * el carrito vigente. Si se le mandara solo el texto nuevo, «Tenemos dos sedes»
 * —diecisiete caracteres— sería todo el contexto.
 *
 * ── Los tres rellenos rápidos ───────────────────────────────────────────────
 * **Rellenan el campo, no envían.** Un botón que dispara una llamada de pago con
 * un texto que el usuario no ha leído es un gasto que él no autorizó. Y ninguno
 * mide menos que `MIN_REFINAMIENTO`, cosa que `asistente-store.spec.ts` afirma:
 * un botón que la interfaz ofrece y el servidor rechaza es el peor fallo posible
 * de un formulario, porque el usuario hizo literalmente lo que se le indicó.
 *
 * <p>El `<textarea>` es de 3 filas, no 6: la forma del campo comunica que se
 * espera una frase, no un párrafo.
 */
const props = defineProps<{
  /** `null` antes del primer ajuste: un contador sin usar es ansiedad gratis. */
  aviso: string | null
  sinAjustes: boolean
  ocupado: boolean
}>()

const emit = defineEmits<{ ajustar: [texto: string] }>()

const uid = useId()
const idCampo = `${uid}-refinar`
const idAyuda = `${uid}-refinar-ayuda`

/** Estado por instancia dentro del componente: esto no es el patrón prohibido. */
const texto = ref('')

const listo = computed(() => texto.value.trim().length >= MIN_REFINAMIENTO)

function enviar(): void {
  // `aria-disabled` en vez de `disabled` deja el foco donde está; el `return`
  // temprano es lo que de verdad impide el envío.
  if (!listo.value || props.ocupado) return
  emit('ajustar', texto.value.trim())
  texto.value = ''
}
</script>

<template>
  <section class="ref" aria-labelledby="refinar-h2">
    <h2 id="refinar-h2" class="ref-h2">¿Se nos olvidó algo?</h2>

    <!-- Tras el tercer ajuste el campo se sustituye por una salida humana.
         Nunca un control apagado sin explicación: eso se lee como un fallo de la
         aplicación, no como un límite. -->
    <p v-if="sinAjustes" class="ds-banner ref-agotado">
      Ya hiciste los 3 ajustes. Si todavía no encaja, quítale o añádele módulos aquí abajo, o
      escríbenos a
      <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y lo armamos contigo.
    </p>

    <template v-else>
      <label :for="idCampo" class="ref-label">Añade lo que falte y ajustamos la propuesta.</label>
      <p :id="idAyuda" class="ref-ayuda">
        <strong>No hace falta que repitas lo de antes.</strong>
        <span v-if="aviso"> {{ aviso }}</span>
      </p>

      <div class="ref-rellenos">
        <button
          v-for="ejemplo in RELLENOS_RAPIDOS"
          :key="ejemplo"
          type="button"
          class="ds-btn ds-btn--ghost ref-relleno"
          @click="texto = ejemplo"
        >
          {{ ejemplo }}
        </button>
      </div>

      <textarea
        :id="idCampo"
        v-model="texto"
        class="pub-campo pub-campo-rest"
        rows="3"
        :maxlength="MAX_REFINAMIENTO"
        :aria-describedby="idAyuda"
      />

      <button
        type="button"
        class="ds-btn ds-btn--primary ref-enviar"
        :aria-disabled="!listo || ocupado ? 'true' : undefined"
        @click="enviar"
      >
        Ajustar la propuesta
      </button>
    </template>
  </section>
</template>

<style scoped>
.ref {
  margin-block-start: 22px;
}

.ref-h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.ref-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-700);
}

.ref-ayuda {
  margin: 3px 0 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.ref-agotado {
  font-size: 13px;
  line-height: 1.5;
}

.ref-rellenos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 10px;
}

/* 40 px de alto y 8 de separación: cumplen §2.5.8 por tamaño, no por la
   excepción de espaciado, que es más frágil ante un cambio de tipografía. */
.ref-relleno {
  min-block-size: 40px;
}

.ref-enviar {
  margin-block-start: 10px;
  min-block-size: 44px;
}
</style>
