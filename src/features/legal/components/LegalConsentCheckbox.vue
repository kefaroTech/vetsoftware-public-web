<script setup lang="ts">
import { computed, useId } from 'vue'
import { formatDateLong } from '@/composables/format'
import { useLegalDocuments } from '../composables/useLegalDocuments'
import { LEGAL_DOCUMENTS } from '../content/legal.content'
import { DESTINO_TRANSFERENCIA, regionesEnFrase } from '../content/transferencia'
import type { LegalAcceptanceRef, LegalDocumentCode } from '../types/legal.types'

/**
 * LA CASILLA DE CONSENTIMIENTO.
 *
 * ── Las tres cosas que la Ley 1581 exige y que un checkbox suele incumplir ──
 * El artículo 9 pide una autorización **previa, expresa e informada**, y el 12
 * enumera lo que hay que informar ANTES de pedirla. Traducido a esta casilla:
 *
 *  1. **Expresa.** `modelValue` arranca en `false` y no hay forma de marcarla
 *     por defecto: el componente no acepta un valor inicial verdadero de
 *     ninguna vía que no sea el usuario. El silencio no autoriza.
 *  2. **Informada.** El rótulo ENLAZA al documento que se acepta. Una casilla
 *     que nombra la política en negrita y no lleva a ella recoge un clic, no un
 *     consentimiento — y así estaba escrita la del paso de contratación antes de
 *     que estas páginas existieran. Los enlaces abren en pestaña nueva porque el
 *     formulario que rodea a la casilla se perdería al navegar, y perder lo
 *     escrito es la forma más eficaz de enseñar a nadie a no leer los términos.
 *  3. **Con referente.** Muestra —y devuelve— QUÉ VERSIÓN se está aceptando.
 *     «Aceptó la política» no prueba nada cuando la política de hoy no es la de
 *     dentro de seis meses; «aceptó la versión 1, vigente desde el 1 de
 *     septiembre de 2026» sí. Es el mismo par (`code`, `documentVersion`) con el
 *     que el backend versiona `legal_document_versions` desde el changeset 353,
 *     de modo que la aceptación y la fila publicada nombran la misma cosa.
 *
 * ── `transferencia` ────────────────────────────────────────────────────────
 * Cuando el formulario manda texto libre al asistente de propuesta, la casilla
 * tiene que nombrar la transferencia internacional Y su destino concreto: es la
 * excepción del literal a) del artículo 26, y una autorización que no dice a
 * dónde van los datos no la ampara. Las tres regiones salen de
 * `content/transferencia.ts`, que es el segundo lector de la lista declarada en
 * el Terraform — el primero es IAM.
 *
 * <p>La autorización de transferencia va en una casilla PROPIA, separada de la
 * de términos: agrupar consentimientos de finalidad distinta en un solo clic es
 * lo que convierte una autorización en un formulismo, y aquí además una es
 * necesaria para contratar y la otra no.
 */
const props = withDefaults(
  defineProps<{
    /** Marcada o no. Siempre arranca desmarcada desde el padre. */
    modelValue: boolean
    /** Los documentos que esta casilla acepta, en el orden en que se nombran. */
    documentos: LegalDocumentCode[]
    /** Si además autoriza la transferencia internacional del texto libre. */
    transferencia?: boolean
    /**
     * Marca el control como inválido sin escribir nada debajo. Es lo que usa
     * quien ya lista el fallo en un `ErrorSummary`: repetir el mismo mensaje en
     * dos sitios hace que el lector lo anuncie dos veces y que el usuario
     * busque dos problemas donde hay uno.
     */
    invalid?: boolean
    /**
     * Mensaje inline, para quien NO tiene resumen de errores. Implica
     * {@link invalid}.
     */
    error?: string
    /**
     * `id` del `<input>`. Se acepta de fuera porque `ErrorSummary` enfoca el
     * control por su `id` al pulsar en el resumen de errores: si el componente
     * se lo inventara siempre, el enlace del resumen no llevaría a ninguna
     * parte y el usuario se quedaría sin saber qué le falta.
     */
    id?: string
  }>(),
  { transferencia: false, invalid: false, error: undefined, id: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  blur: []
}>()

const invalido = computed(() => props.invalid || !!props.error)

const uid = useId()
const idCasilla = computed(() => props.id ?? `${uid}-consent`)
const idError = `${uid}-consent-error`
const idVersiones = `${uid}-consent-versions`

// Los documentos que la casilla enlaza se recargan al montar, como cualquier
// pantalla o modal del repositorio: la versión que se muestra tiene que ser la
// vigente ahora, no la que hubiera en caché de una visita anterior.
const { referencia } = useLegalDocuments(props.documentos)

const enlaces = computed(() =>
  props.documentos.map((code) => ({
    code,
    titulo: LEGAL_DOCUMENTS[code].title,
    ruta: code === 'PRIVACY_POLICY' ? 'legal-privacidad' : 'legal-terminos',
  })),
)

/**
 * Las referencias de versión que el padre debe guardar con la aceptación.
 *
 * <p>Se EXPONE y no se emite: el padre la lee en el momento de confirmar.
 * Emitirla en cada pulsación invitaría a guardarla al marcar en vez de al
 * enviar, y lo que vale como prueba de aceptación es la versión vigente cuando
 * se pulsó, no la que hubiera media hora antes. (Este docblock citaba como
 * ejemplo que el aviso de deriva de precio desmarca la casilla; no lo hace, y
 * la línea que lo intentaba era inalcanzable — ver `ContratarView.vue`.)
 */
const referencias = computed<LegalAcceptanceRef[]>(() =>
  props.documentos.map((code) => referencia(code)).filter((ref) => ref !== null),
)

const textoVersiones = computed(() =>
  referencias.value
    .map(
      (ref) =>
        `${LEGAL_DOCUMENTS[ref.code].title}: versión ${ref.documentVersion}, vigente desde el ` +
        formatDateLong(ref.effectiveFrom),
    )
    .join(' · '),
)

defineExpose({ referencias })
</script>

<template>
  <div>
    <label class="pub-consent" :for="idCasilla">
      <input
        :id="idCasilla"
        type="checkbox"
        :checked="modelValue"
        :aria-invalid="invalido"
        :aria-describedby="error ? `${idVersiones} ${idError}` : idVersiones"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        @blur="emit('blur')"
      />
      <span>
        <template v-if="transferencia">
          Autorizo de forma expresa que el texto que escriba y mi correo electrónico se transfieran
          a {{ DESTINO_TRANSFERENCIA.pais }} ({{ DESTINO_TRANSFERENCIA.encargado }}, servicio
          {{ DESTINO_TRANSFERENCIA.servicio }}, regiones {{ regionesEnFrase() }}) para generar la
          propuesta, en los términos de la
        </template>
        <template v-else> He leído y acepto los </template>

        <template v-for="(enlace, i) in enlaces" :key="enlace.code">
          <span v-if="i > 0">{{ i === enlaces.length - 1 ? ' y la ' : ', ' }}</span>
          <RouterLink :to="{ name: enlace.ruta }" target="_blank" rel="noopener">
            {{ enlace.titulo }}<span class="ds-sr-only"> (se abre en una pestaña nueva)</span>
          </RouterLink>
        </template>
        .

        <span :id="idVersiones" class="pub-consent-version">{{ textoVersiones }}</span>
      </span>
    </label>

    <p v-if="error" :id="idError" class="pub-consent-error">{{ error }}</p>
  </div>
</template>
