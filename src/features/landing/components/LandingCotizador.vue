<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAsistente } from '@/features/asistente/composables/useAsistente'
import {
  ERROR_TEXTO_CORTO,
  MAX_DESCRIPCION,
  MIN_DESCRIPCION,
} from '@/features/asistente/content/copy.content'
import CotizadorCarril from './CotizadorCarril.vue'
import LandingSelectorModulos from './LandingSelectorModulos.vue'
import PropuestaDetectada from './PropuestaDetectada.vue'
import { detectarModulos } from '../composables/deteccionModulos'
import type { useCotizador } from '../composables/useCotizador'

/**
 * La tarjeta de la portada: se describe el negocio y se marcan los módulos.
 *
 * ── Aquí no hay precio, y es la decisión de fondo ───────────────────────────
 * El importe vive en `/planes`. Por eso este cotizador se monta sin red
 * (`conPrecio: false` en `LandingView`): pedir una cotización por casilla para
 * una cifra que nadie pinta gastaría el cupo por IP del prospecto antes de
 * llegar a la pantalla donde el precio sí se enseña.
 *
 * ── Qué sale del navegador y qué no ─────────────────────────────────────────
 * El `<textarea>` **no sale**. Viaja a un encargado en EE. UU. y eso exige dos
 * autorizaciones separadas (Ley 1581, art. 9 y art. 26 lit. a) que ya están
 * implementadas y razonadas en `AsistenteEntrada`; duplicarlas aquí sería un muro
 * de consentimiento sobre el primer pliegue, y no duplicarlas y enviar sería
 * ilegal. La propuesta se calcula en el propio navegador (`deteccionModulos`).
 *
 * ── Validación: al enviar, y NUNCA al `blur` ────────────────────────────────
 * Es una desviación consciente de la convención `@blur` del repositorio, y está
 * forzada por el sitio: en una caja del primer pliegue el `blur` ocurre
 * constantemente —el usuario mira la página— y marcaría el campo como tocado sin
 * que haya intentado nada.
 *
 * ── La caja vacía NO es un error ────────────────────────────────────────────
 * Vacío + enviar navega igual, sin queja. El hero no puede ser una puerta
 * cerrada: quien solo mira debe poder avanzar, y el mismo campo —más grande y
 * con su contexto— le espera en el destino. El error solo aparece cuando **lo
 * intentó** y se quedó corto.
 */
const props = defineProps<{ cotizador: ReturnType<typeof useCotizador> }>()

const { catalogo, modulos, alternarModulo, sembrarModulos } = props.cotizador

const { texto } = useAsistente()
const router = useRouter()

/**
 * El ejemplo es `placeholder` y no valor sembrado, así que la instrucción vive
 * FUERA: un placeholder desaparece al escribir, y quedarse con él como única
 * indicación es §3.3.2.
 */
const EJEMPLO =
  'Somos un petshop de barrio: baño y estética, vendemos alimento y accesorios, y los sábados ' +
  'viene un veterinario a consulta.'

/**
 * El silencio tras el que la propuesta se recalcula. Es el mismo
 * `PREVIEW_DEBOUNCE_MS` del cotizador y por el mismo motivo: una propuesta por
 * edición terminada, no una por tecla, que serían casillas saltando y una
 * locución por letra (§4.1.3).
 */
const REPOSO_MS = 500

const uid = useId()
const idTexto = `${uid}-texto`
const idAyuda = `${uid}-ayuda`
const idError = `${uid}-error`

const campo = useTemplateRef<HTMLTextAreaElement>('campo')

/** Solo se pone a `true` al enviar. Ver la cabecera. */
const enviado = ref(false)

const textoEnReposo = ref(texto.value)
let temporizador: ReturnType<typeof setTimeout> | null = null

watch(texto, (v) => {
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    textoEnReposo.value = v
  }, REPOSO_MS)
})

onBeforeUnmount(() => {
  if (temporizador) clearTimeout(temporizador)
})

const tieneTexto = computed(() => textoEnReposo.value.trim().length > 0)

const vendibles = computed(() =>
  (catalogo.value?.articulos ?? []).filter((a) => !a.obligatorio && a.vendible).map((a) => a.code),
)

const detectados = computed(() => detectarModulos(textoEnReposo.value, vendibles.value))

/**
 * Reescribir el relato rehace la propuesta desde cero y se lleva por delante lo
 * que se hubiera marcado a mano. Es agresivo y es coherente: lo marcado era la
 * lectura del texto anterior, y el texto anterior ya no existe.
 *
 * <p>Se compara por contenido y no por referencia porque recargar el catálogo al
 * cambiar de ciclo produce una lista nueva con los mismos códigos, y eso no es
 * una reescritura.
 */
watch(
  () => detectados.value.join('|'),
  () => sembrarModulos(detectados.value),
)

const error = computed(() => {
  if (!enviado.value) return null
  const limpio = texto.value.trim()
  // Vacío NO es error, y esa es una decisión entera de este componente.
  if (limpio.length === 0 || limpio.length >= MIN_DESCRIPCION) return null
  return ERROR_TEXTO_CORTO
})

const CONFIANZA = [
  'Enciendes y apagas módulos cuando quieras',
  'Sin plan mínimo ni módulos atados',
  'Tus datos en Colombia, cifrados',
]

function enviar(): void {
  enviado.value = true
  if (error.value) {
    campo.value?.focus()
    return
  }
  void router.push({ name: 'planes' })
}
</script>

<template>
  <!-- `tabindex="-1"` para que los anclajes que apuntan aquí muevan el foco
       además del scroll. Mismo patrón que `#planes`. -->
  <section id="cotizador" class="lcot-sec" tabindex="-1" aria-labelledby="cotizador-h2">
    <h2 id="cotizador-h2" class="lcot-h2">Arma tu plan</h2>

    <form class="lcot" novalidate @submit.prevent="enviar">
      <div class="lcot-col">
        <label :for="idTexto" class="lcot-label">¿Qué hace tu negocio?</label>
        <p :id="idAyuda" class="lcot-ayuda">
          Clínica, spa, guardería, petshop o todo a la vez: escríbelo con tus palabras y te
          proponemos los módulos que encajan.
        </p>
        <textarea
          :id="idTexto"
          ref="campo"
          v-model="texto"
          class="pub-campo lcot-texto"
          :class="error ? 'ds-field-invalid' : 'pub-campo-rest'"
          rows="6"
          :placeholder="EJEMPLO"
          :maxlength="MAX_DESCRIPCION"
          :aria-describedby="error ? `${idAyuda} ${idError}` : idAyuda"
          :aria-invalid="error ? 'true' : undefined"
        />
        <p v-if="error" :id="idError" class="lcot-error" role="alert">{{ error }}</p>

        <PropuestaDetectada
          class="lcot-propuesta"
          :cantidad="detectados.length"
          :tiene-texto="tieneTexto"
        />

        <LandingSelectorModulos
          class="lcot-selector"
          :catalogo="catalogo"
          :modulos="modulos"
          :con-precio="false"
          :detectados="detectados"
          @alternar="alternarModulo"
        />
      </div>

      <CotizadorCarril :n-modulos="modulos.length" :tiene-texto="tieneTexto" />
    </form>

    <ul class="land-trust">
      <li v-for="punto in CONFIANZA" :key="punto" class="land-trust-item">{{ punto }}</li>
    </ul>
  </section>
</template>

<style scoped>
.lcot-sec {
  max-inline-size: 1240px;
  margin: 34px auto 0;
  padding-inline: 24px;
}

#cotizador:focus {
  outline: none;
}

.lcot-h2 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lcot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
  gap: 28px;
  padding: 26px;
  border: 1px solid var(--pub-line-strong);
  border-radius: 18px;
  background: var(--pub-surface);
  box-shadow: var(--pub-card-shadow);
  text-align: start;
}

.lcot-col {
  min-inline-size: 0;
}

.lcot-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lcot-ayuda {
  margin: 5px 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}

.lcot-texto {
  resize: vertical;
  min-block-size: 150px;
}

.lcot-error {
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-err-tx-2);
}

.lcot-propuesta {
  margin-block-start: 18px;
}

.lcot-selector {
  margin-block-start: 18px;
}

.land-trust {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  font-size: 13px;
  color: var(--pub-ink-600);
}

.land-trust-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.land-trust-item::before {
  content: '';
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--pub-ame-600);
}

@media (width <= 900px) {
  .lcot {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 600px) {
  .lcot-sec {
    padding-inline: 16px;
  }

  .lcot {
    padding: 20px 16px;
  }
}
</style>
