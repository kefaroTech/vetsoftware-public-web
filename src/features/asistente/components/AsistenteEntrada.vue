<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, useTemplateRef } from 'vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import LegalConsentCheckbox from '../../legal/components/LegalConsentCheckbox.vue'
import {
  EJEMPLOS_COTIZADOR,
  ERROR_TEXTO_CORTO,
  MAX_DESCRIPCION,
  MIN_DESCRIPCION,
} from '../content/copy.content'
import type { AceptacionLegal } from '../types/asistente.types'

/**
 * La pantalla de entrada: el texto libre, el correo y las dos autorizaciones.
 *
 * <p>El `<h1>`, el subtítulo y la línea de moneda los pone la vista, no este
 * componente: monta y desmonta con el estado, y un encabezado que desaparece al
 * llegar la propuesta deja el documento sin nivel 1.
 *
 * <p>El `<h2>` **sí** vive aquí, y por el mismo argumento leído al revés: rotula
 * este estado de la pantalla, así que tiene que desaparecer con él. Antes el
 * contenido principal de `/planes` no tenía más rótulo que un `<label>` de
 * 13 px, mientras el bloque secundario lo encabezaba un `<summary>` de 16 px en
 * negrita; para quien navega por encabezados —que es la forma mayoritaria de
 * recorrer una página con lector de pantalla— el contenido principal
 * sencillamente no existía en el esquema del documento (§1.3.1).
 *
 * ── El folio en blanco, y los tres ejemplos que lo rompen ───────────────────
 * La ayuda enumera seis dimensiones en una frase de veinticuatro palabras: eso
 * es una lista de deberes, no un arranque. Los ejemplos pulsables enseñan la
 * FORMA de la respuesta con casos amplios que casi cualquier clínica reconoce, y
 * **rellenan sin enviar**. El patrón ya existía en el cuadro de refinamiento,
 * es decir, se le ofrecía solo a quien ya había superado el folio en blanco.
 *
 * ── El orden del DOM, y por qué el correo va DEBAJO del texto ───────────────
 * Pedir el correo antes de que el prospecto haya escrito una palabra convierte
 * la pantalla en un muro de captura de lead y la tasa de abandono se dispara.
 * Debajo, ya ha invertido su párrafo. Y lo que promete el texto de ayuda tiene
 * que ser verdad: el correo lleva el enlace de vuelta y nada más — sin líneas,
 * sin motivos, sin el nombre de la clínica.
 *
 * ── Dos casillas, no una ────────────────────────────────────────────────────
 * Una autoriza el tratamiento (Ley 1581, art. 9) y la otra la **transferencia
 * internacional** con su destino nombrado (art. 26, literal a): el texto libre
 * viaja a un encargado en EE. UU. Agrupar consentimientos de finalidad distinta
 * en un solo clic es lo que convierte una autorización en un formulismo — y lo
 * dice el propio componente, que por eso acepta el par de props. **Se reutiliza,
 * no se reconstruye.**
 *
 * ── Sin validación en vivo. Ninguna ─────────────────────────────────────────
 * Es la convención del repositorio (`touched` por campo, marca en `@blur`) y es
 * la guía de GOV.UK: validar mientras se teclea produce errores que se disparan
 * por escribir la mitad de una palabra correcta. Aquí es peor que en un
 * documento de identidad, porque el campo es prosa.
 *
 * ── Sin `autofocus` ─────────────────────────────────────────────────────────
 * El foco automático en un `<textarea>` grande al cargar salta el `<h1>` y deja
 * al lector de pantalla sin contexto.
 */
const props = defineProps<{ texto: string; email: string; ocupado: boolean }>()

const emit = defineEmits<{
  'update:texto': [valor: string]
  'update:email': [valor: string]
  enviar: [aceptaciones: AceptacionLegal[]]
}>()

const uid = useId()
const idTexto = `${uid}-texto`
const idAyudaTexto = `${uid}-texto-ayuda`
const idEjemplos = `${uid}-ejemplos`
const idErrorTexto = `${uid}-texto-error`
const idEmail = `${uid}-email`
const idAyudaEmail = `${uid}-email-ayuda`
const idErrorEmail = `${uid}-email-error`
const idTratamiento = `${uid}-tratamiento`
const idTransferencia = `${uid}-transferencia`

type Campo = 'texto' | 'email' | 'tratamiento' | 'transferencia'

/** Arrancan **todas** desmarcadas. El silencio no autoriza. */
const tratamiento = ref(false)
const transferencia = ref(false)

const refTratamiento = ref<InstanceType<typeof LegalConsentCheckbox> | null>(null)
const refTransferencia = ref<InstanceType<typeof LegalConsentCheckbox> | null>(null)
const resumen = ref<InstanceType<typeof ErrorSummary> | null>(null)

const touched = reactive<Record<Campo, boolean>>({
  texto: false,
  email: false,
  tratamiento: false,
  transferencia: false,
})

/** Requerido y ≥ 15. **Quince, no cuarenta**: ver `copy.content.ts`. */
function validarTexto(v: string): string | null {
  const limpio = v.trim()
  if (limpio.length === 0) {
    return 'Cuéntanos a qué se dedica tu negocio para poder proponerte algo.'
  }
  if (limpio.length < MIN_DESCRIPCION) {
    // El literal vive en `copy.content.ts` y no aquí: la caja del hero da el
    // mismo fallo, y el mismo fallo con dos redacciones se lee como dos fallos.
    return ERROR_TEXTO_CORTO
  }
  return null
}

/** El mismo patrón de correo que el resto de formularios del repositorio. */
function validarEmail(v: string): string | null {
  const limpio = v.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) {
    return 'Necesitamos un correo válido para mandarte tu propuesta.'
  }
  return null
}

const errores = computed<Record<Campo, string | null>>(() => ({
  texto: validarTexto(props.texto),
  email: validarEmail(props.email),
  tratamiento: tratamiento.value
    ? null
    : 'Necesitamos tu autorización para poder leer lo que escribiste.',
  transferencia: transferencia.value
    ? null
    : 'Necesitamos tu autorización para enviar tu texto al proveedor que genera la propuesta.',
}))

function err(campo: Campo): string | undefined {
  // Sin aserción de no-nulo: el `?? undefined` dice lo mismo y no le pide al
  // lector que confíe en una promesa que el compilador no puede comprobar.
  return touched[campo] ? (errores.value[campo] ?? undefined) : undefined
}

/**
 * El resumen de errores repite el texto **literalmente**: GOV.UK lo exige y
 * `ErrorSummary` lo deja escrito. Y el orden es el del DOM, no el de las claves
 * del objeto (§2.4.3).
 */
const itemsResumen = computed(() =>
  toSummaryItems(
    {
      texto: err('texto'),
      email: err('email'),
      tratamiento: err('tratamiento'),
      transferencia: err('transferencia'),
    },
    {
      texto: idTexto,
      email: idEmail,
      tratamiento: idTratamiento,
      transferencia: idTransferencia,
    },
    ['texto', 'email', 'tratamiento', 'transferencia'],
  ),
)

const campo = useTemplateRef<HTMLTextAreaElement>('campo')

/**
 * Los ejemplos, **solo si se llega con el campo vacío**.
 *
 * <p>Se decide una vez, al montar, y a propósito no es reactivo. Como
 * `computed` la fila desaparecería al teclear la primera letra —un salto de
 * maquetación bajo el cursor— y, peor, se esfumaría en cuanto se pulsara el
 * primer ejemplo, impidiendo añadir un segundo. Quien llega desde la caja del
 * hero ya trae su párrafo: los ejemplos cumplieron su función allí y aquí solo
 * ocuparían el sitio del correo.
 */
const mostrarEjemplos = props.texto.trim().length === 0

/**
 * Añade un ejemplo al final del texto. **Rellena, no envía; añade, no
 * reemplaza.**
 *
 * <p>Un botón que dispara una llamada de pago con un texto que el usuario no ha
 * leído es un gasto que él no autorizó. Y el texto ya tecleado no se destruye
 * nunca: es lo más caro que hay en esta pantalla.
 */
function usar(ejemplo: string): void {
  const actual = props.texto.trim()
  emit('update:texto', actual ? `${actual} ${ejemplo}` : ejemplo)
  void nextTick(() => {
    const el = campo.value
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
}

const restantes = computed(() => MAX_DESCRIPCION - props.texto.length)

/**
 * El contador **solo aparece cuando quedan menos de 200**.
 *
 * <p>Un contador siempre visible en un campo largo es una instrucción implícita
 * de escribir menos, que es justo lo contrario de lo que este campo necesita.
 */
const mostrarContador = computed(() => restantes.value < 200)

function enviar(): void {
  // `aria-disabled` deja el foco donde está; este `return` es lo que impide el
  // envío. Un `disabled` sacaría del orden de tabulación al botón que el
  // usuario acaba de pulsar y el lector se quedaría mudo justo entonces.
  if (props.ocupado) return

  for (const campo of Object.keys(touched) as Campo[]) touched[campo] = true
  if (itemsResumen.value.length > 0) {
    resumen.value?.focus()
    return
  }

  // La referencia de versión se lee **al enviar**, no al marcar: lo que vale
  // como prueba de aceptación es la versión vigente cuando se pulsó.
  const aceptaciones: AceptacionLegal[] = [
    ...(refTratamiento.value?.referencias ?? []),
    ...(refTransferencia.value?.referencias ?? []),
  ].map((r) => ({ code: r.code, documentVersion: r.documentVersion }))

  emit('enviar', aceptaciones)
}
</script>

<template>
  <!-- El ancla con la que se acotan las dos casillas legales de este bloque:
       `/planes` monta además el selector de módulos, así que contarlas en toda
       la pantalla cuenta también las casillas del catálogo. -->
  <div class="aen" data-testid="asistente-entrada">
    <ErrorSummary ref="resumen" :items="itemsResumen" />

    <h2 class="aen-h2">Cuéntanos qué hace tu negocio</h2>

    <label :for="idTexto" class="aen-label">¿A qué se dedica tu negocio?</label>
    <!-- Los ejemplos van FUERA del `placeholder`: un placeholder desaparece al
         escribir y es texto de bajo contraste que se lee como valor introducido. -->
    <p :id="idAyudaTexto" class="aen-ayuda">
      Por ejemplo: qué atiendes, si tienes quirófano, si vendes alimento, si haces baños, cuántas
      sedes y cuántas personas trabajan.
    </p>
    <textarea
      :id="idTexto"
      ref="campo"
      class="pub-campo"
      :class="err('texto') ? 'ds-field-invalid' : 'pub-campo-rest'"
      rows="6"
      :maxlength="MAX_DESCRIPCION"
      :value="texto"
      :aria-describedby="err('texto') ? `${idAyudaTexto} ${idErrorTexto}` : idAyudaTexto"
      :aria-invalid="err('texto') ? 'true' : undefined"
      @input="emit('update:texto', ($event.target as HTMLTextAreaElement).value)"
      @blur="touched.texto = true"
    />
    <p v-if="err('texto')" :id="idErrorTexto" class="aen-error">{{ err('texto') }}</p>

    <template v-if="mostrarEjemplos">
      <p :id="idEjemplos" class="aen-ejemplos-label">O empieza por aquí:</p>
      <ul class="aen-ejemplos" :aria-labelledby="idEjemplos">
        <li v-for="ejemplo in EJEMPLOS_COTIZADOR" :key="ejemplo">
          <button type="button" class="ds-btn ds-btn--ghost aen-ejemplo" @click="usar(ejemplo)">
            {{ ejemplo }}
          </button>
        </li>
      </ul>
    </template>

    <p v-if="mostrarContador" class="aen-contador" role="status" aria-live="polite">
      Te quedan {{ restantes }} caracteres.
    </p>

    <label :for="idEmail" class="aen-label">¿A qué correo te mandamos tu propuesta?</label>
    <p :id="idAyudaEmail" class="aen-ayuda">
      Te llega un enlace para volver a tu propuesta cuando quieras. No mandamos publicidad.
    </p>
    <input
      :id="idEmail"
      class="pub-campo pub-campo--linea"
      :class="err('email') ? 'ds-field-invalid' : 'pub-campo-rest'"
      type="email"
      autocomplete="email"
      :value="email"
      :aria-describedby="err('email') ? `${idAyudaEmail} ${idErrorEmail}` : idAyudaEmail"
      :aria-invalid="err('email') ? 'true' : undefined"
      @input="emit('update:email', ($event.target as HTMLInputElement).value)"
      @blur="touched.email = true"
    />
    <p v-if="err('email')" :id="idErrorEmail" class="aen-error">{{ err('email') }}</p>

    <div class="aen-consentimientos">
      <LegalConsentCheckbox
        :id="idTratamiento"
        ref="refTratamiento"
        v-model="tratamiento"
        :documentos="['PRIVACY_POLICY']"
        :invalid="!!err('tratamiento')"
        @blur="touched.tratamiento = true"
      />
      <LegalConsentCheckbox
        :id="idTransferencia"
        ref="refTransferencia"
        v-model="transferencia"
        :documentos="['PRIVACY_POLICY']"
        transferencia
        :invalid="!!err('transferencia')"
        @blur="touched.transferencia = true"
      />
    </div>

    <button
      type="button"
      class="ds-btn ds-btn--primary aen-enviar"
      :aria-disabled="ocupado ? 'true' : undefined"
      @click="enviar"
    >
      Ver mi propuesta
    </button>
  </div>
</template>

<style scoped>
.aen-ayuda {
  margin: 4px 0 8px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

/* 20 px contra los 17 px del `<h2>` de la sección de paquetes: el rótulo del
   contenido principal pesa más que el del secundario. */
.aen-h2 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--pub-ink-900);
}

.aen-ejemplos-label {
  margin: 14px 0 8px;
  font-size: 13px;
  color: var(--pub-ink-600);
}

.aen-ejemplos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 44 px de alto: el listón de la zona pública, que se usa con una sola mano. */
.aen-ejemplo {
  min-block-size: 44px;
}

.aen-label {
  display: block;
  margin-block-start: 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pub-ink-700);
}

.aen-error {
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pub-err-tx-2);
}

.aen-contador {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--pub-ink-600);
}

.aen-consentimientos {
  display: grid;
  gap: 10px;
  margin-block-start: 18px;
}

.aen-enviar {
  margin-block-start: 18px;
  min-block-size: 48px;
}
</style>
