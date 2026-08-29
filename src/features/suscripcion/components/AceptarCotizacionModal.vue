<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { Check } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { confirmarAceptacion } from '../composables/cotizacionesText'
import type { QuoteResponse } from '../types/cotizaciones.types'

/**
 * Aceptar una propuesta.
 *
 * <p><b>Se cita el importe que se mostró en pantalla</b>, guardado al cargar el detalle, no uno
 * recalculado en el instante del clic: es lo que la clínica está aceptando.
 *
 * <p>`AcceptQuoteRequest` solo lleva `acceptedByEmail`. **La IP y la marca de tiempo las escribe
 * el servidor**: no hay campo de IP, porque una prueba que teclea el cliente no prueba nada y
 * pedirla sería fabricar evidencia.
 *
 * <p>El correo se rellena por omisión con `prospectEmail` y **se limpia al abrir**: uno tecleado
 * para otra propuesta no puede quedarse ahí.
 */
const props = defineProps<{
  open: boolean
  quote: QuoteResponse | null
  totalMostrado: number | null
}>()

const emit = defineEmits<{ close: []; aceptar: [acceptedByEmail: string] }>()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const email = ref('')
const touched = reactive<{ email: boolean }>({ email: false })
const enviando = ref(false)
const resumen = ref<InstanceType<typeof ErrorSummary> | null>(null)
const emailId = useId()

function validateEmail(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Escribe el correo de quien acepta la propuesta.'
  if (!EMAIL_RE.test(t)) return 'Escribe un correo válido, por ejemplo nombre@clinica.com.'
  return null
}

const errors = computed(() => ({ email: validateEmail(email.value) }))

function err(): string | undefined {
  return touched.email && errors.value.email ? errors.value.email : undefined
}

const items = computed(() => toSummaryItems({ email: err() }, { email: emailId }, ['email']))

const texto = computed(() =>
  confirmarAceptacion(props.quote?.quoteNumber, props.totalMostrado ?? 0),
)

watch(
  () => props.open,
  (abierto) => {
    if (!abierto) return
    email.value = props.quote?.prospectEmail ?? ''
    touched.email = false
    enviando.value = false
  },
)

function submit() {
  touched.email = true
  if (errors.value.email) {
    resumen.value?.focus()
    return
  }
  enviando.value = true
  emit('aceptar', email.value.trim())
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Aceptar propuesta"
    :subtitle="quote?.quoteNumber ?? undefined"
    :icon="Check"
    compact
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--14">
        <ErrorSummary ref="resumen" :items="items" />
        <p class="ds-dialog-body">
          {{ texto.antes }} <strong>{{ texto.importe }}</strong
          >{{ texto.despues }}
        </p>
        <BaseField :id="emailId" label="Correo de quien acepta" required :error="err()">
          <BaseInput
            v-model="email"
            type="email"
            inputmode="email"
            :invalid="!!err()"
            autocomplete="email"
            @blur="touched.email = true"
          />
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="enviando"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--snug"
        :disabled="enviando"
        @click="submit"
      >
        {{ enviando ? 'Aceptando…' : 'Aceptar propuesta' }}
      </button>
    </template>
  </ModalShell>
</template>
