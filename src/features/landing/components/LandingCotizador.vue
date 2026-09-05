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
import { EJEMPLO_DE_NEGOCIO, SELECCION_POR_DEFECTO } from '../content/cotizador.content'
import { detectarModulos } from '../composables/deteccionModulos'
import { useSeleccionPortadaStore } from '../stores/seleccionPortada.store'
import type { useCotizador } from '../composables/useCotizador'

/**
 * La tarjeta de la portada: se describe el negocio, se marcan los módulos y se
 * ve lo que suman.
 *
 * ── El precio se calcula aquí, y no se pide ─────────────────────────────────
 * La cifra la suma `estimarSeleccion` con el catálogo que ya está descargado:
 * la portada no hace ni una petición a `POST /quotes/preview`. Ese endpoint
 * tiene cupo por IP y gastarlo casilla a casilla dejaría al prospecto limitado
 * al llegar a `/planes`, que es donde el importe tiene que venir del servidor.
 * Lo que se evita es la red; esconder el total no: sin él se subestima lo que se
 * va a pagar y la decisión ya no se revisa cuando el precio aparece
 * (Rasch et al. 2020, JEBO; Santana, Dallas & Morwitz).
 *
 * ── El selector se ve desde el primer momento ───────────────────────────────
 * No se oculta hasta que alguien escriba. El metaanálisis de choice overload
 * (Scheibehenne, Greifeneder & Todd, 2010, JCR) mide un efecto medio
 * prácticamente nulo en 63 condiciones de 50 experimentos, así que trece
 * casillas no son un motivo; y un selector que aparece al teclear le cambia
 * solo el índice de encabezados a quien navega con lector.
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

const {
  catalogo,
  modulos,
  estado,
  importe,
  sufijoImpuesto,
  regionViva,
  alternarModulo,
  sembrarModulos,
} = props.cotizador

const { texto } = useAsistente()
const router = useRouter()
const seleccionPortada = useSeleccionPortadaStore()

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

/**
 * El ejemplo se SIEMBRA como valor del campo, y no como `placeholder`: el
 * placeholder desaparece en cuanto se escribe, así que como instrucción no
 * sobrevive al primer carácter (§3.3.2). La ayuda persistente de debajo sigue
 * ahí y sigue siendo la que describe el campo por `aria-describedby`.
 *
 * <p>Y solo se siembra sobre un campo vacío: el relato que el visitante ya
 * escribió es lo más caro de esta pantalla y no se pisa nunca.
 */
const ejemploIntacto = ref(texto.value.trim().length === 0)
if (ejemploIntacto.value) texto.value = EJEMPLO_DE_NEGOCIO

/**
 * Lo que la detección lee. Arranca en blanco mientras el ejemplo esté intacto:
 * marcar módulos por un texto que el visitante no escribió sería decidir por él.
 */
const textoEnReposo = ref(ejemploIntacto.value ? '' : texto.value)
let temporizador: ReturnType<typeof setTimeout> | null = null

watch(texto, (v) => {
  ejemploIntacto.value = false
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

/**
 * El conjunto premarcado, cruzado contra la tarifa vigente: marcar un código que
 * el catálogo de hoy no publica mandaría a cotizar una línea que el servidor no
 * resuelve.
 */
const porDefecto = computed(() =>
  SELECCION_POR_DEFECTO.filter((code) => vendibles.value.includes(code)),
)

/**
 * Se siembra UNA vez, en cuanto hay catálogo. Recargar la tarifa —cambiar de
 * ciclo produce una lista nueva con los mismos códigos— no puede volver a marcar
 * lo que el visitante acaba de quitar.
 */
let semillaPuesta = false
watch(
  vendibles,
  (codigos) => {
    if (semillaPuesta || codigos.length === 0) return
    semillaPuesta = true
    sembrarModulos(porDefecto.value)
  },
  { immediate: true },
)

/**
 * El rótulo del carril solo se sostiene mientras lo marcado ES la combinación
 * premarcada: en cuanto el visitante la cambia, la pantalla ya no es el punto de
 * partida que ofreció, sino la selección de él.
 */
const esElPuntoDePartida = computed(
  () =>
    porDefecto.value.length > 0 &&
    modulos.value.length === porDefecto.value.length &&
    porDefecto.value.every((code) => modulos.value.includes(code)),
)

const detectados = computed(() => detectarModulos(textoEnReposo.value, vendibles.value))

/**
 * Las casillas que el visitante tocó a mano. El texto ya no manda sobre ellas.
 */
const tocadas = new Set<string>()

function alternar(code: string, marcado: boolean): void {
  tocadas.add(code)
  alternarModulo(code, marcado)
}

/**
 * Reescribir el relato vuelve a proponer, pero **no deshace lo que se marcó o se
 * quitó a mano**: rehacer la selección entera en cada edición borraba una
 * decisión que el visitante acababa de tomar mirando la lista, y eso se lee como
 * que la pantalla no obedece. Sobre lo que nadie tocó sigue mandando el texto.
 *
 * <p>Se compara por contenido y no por referencia porque recargar el catálogo al
 * cambiar de ciclo produce una lista nueva con los mismos códigos, y eso no es
 * una reescritura.
 */
watch(
  () => detectados.value.join('|'),
  () => {
    const suyas = modulos.value.filter((code) => tocadas.has(code))
    sembrarModulos([...detectados.value.filter((code) => !tocadas.has(code)), ...suyas])
  },
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
  // Sin esta entrega `/planes` siembra desde el paquete recomendado y pisa lo
  // que el visitante acaba de marcar. Va incluso vacía: quitarlo todo también
  // es una decisión suya.
  seleccionPortada.entregar(modulos.value)
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
          :premarcados="porDefecto"
          @alternar="alternar"
        />
      </div>

      <CotizadorCarril
        :n-modulos="modulos.length"
        :n-vendibles="vendibles.length"
        :punto-de-partida="esElPuntoDePartida"
        :importe="importe"
        :sufijo="sufijoImpuesto"
        :estado="estado"
        :region-viva="regionViva"
      />
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
