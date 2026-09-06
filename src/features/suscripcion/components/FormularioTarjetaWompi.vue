<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId } from 'vue'
import axios from 'axios'
import { Lock } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { tokenizarTarjeta, wompiApi } from '../api/pago.api'
import {
  validarCorreoAceptante,
  validarCvc,
  validarNumeroTarjeta,
  validarTitular,
  validarVencimiento,
} from '../composables/tarjetaWompi'
import type { WompiCheckoutConfigResponse, WompiPaymentMethodResponse } from '../types/pago.types'

/**
 * El formulario de tarjeta con Wompi: carga la configuración de la pasarela, tokeniza y da de
 * alta la fuente de pago (`POST /payment-gateway/wompi/payment-sources`). Lo usan dos pantallas
 * con necesidades distintas —el paso 6 de la autocontratación (`MedioDePagoWompi.vue`) y el alta
 * de un medio adicional (`MediosPagoView.vue`)— y la única diferencia entre ellas es el correo de
 * quien acepta y paga: solo hace falta para aceptar una propuesta, así que solo aparece con
 * `modoContratacion`.
 *
 * <p>El número de tarjeta y el CVC viven solo en `tarjeta`, un `reactive()` local de esta
 * instancia (la regla dura de Pinia no aplica al estado por instancia de componente) y los dos
 * campos se limpian en cuanto se obtiene el token.
 */
const props = defineProps<{
  modoContratacion?: boolean
  /** El padre está confirmando un pago con el medio recién creado: deshabilita el envío. */
  procesando?: boolean
}>()
const emit = defineEmits<{ guardado: [payload: WompiPaymentMethodResponse]; cancelar: [] }>()

const correo = defineModel<string>('correo', { default: '' })

type Fase = 'cargando' | 'no-disponible' | 'listo'
const fase = ref<Fase>('cargando')
const config = ref<WompiCheckoutConfigResponse | null>(null)
const motivoNoDisponible = ref('')

async function cargar() {
  fase.value = 'cargando'
  try {
    config.value = await wompiApi.checkoutConfig()
    fase.value = 'listo'
  } catch (e) {
    fase.value = 'no-disponible'
    config.value = null
    // El backend responde 409/503 cuando `vetsoftware.payments.wompi.enabled=false`: la
    // pasarela no está configurada, no es un fallo pasajero. El resto de códigos también deja
    // de poder cobrar, así que el bloqueo es el mismo — solo cambia el motivo que se guarda.
    const status = axios.isAxiosError(e) ? e.response?.status : undefined
    motivoNoDisponible.value =
      status === 409 || status === 503
        ? 'El pago con tarjeta todavía no está disponible.'
        : getProblemDetailMessage(e, 'El pago con tarjeta todavía no está disponible.')
  }
}
onMounted(cargar)

const tarjeta = reactive({ numero: '', vencimiento: '', cvc: '', titular: '' })

const aceptaTerminosWompi = ref(false)
const aceptaDatosPersonales = ref(false)

type Campo = 'numero' | 'vencimiento' | 'cvc' | 'titular' | 'correo' | 'terminos' | 'datos'
const touched = reactive<Record<Campo, boolean>>({
  numero: false,
  vencimiento: false,
  cvc: false,
  titular: false,
  correo: false,
  terminos: false,
  datos: false,
})

const errors = computed(() => ({
  numero: validarNumeroTarjeta(tarjeta.numero),
  vencimiento: validarVencimiento(tarjeta.vencimiento),
  cvc: validarCvc(tarjeta.cvc),
  titular: validarTitular(tarjeta.titular),
  correo: props.modoContratacion ? validarCorreoAceptante(correo.value) : null,
  terminos: aceptaTerminosWompi.value ? null : 'Tienes que aceptar los términos de Wompi.',
  datos: aceptaDatosPersonales.value
    ? null
    : 'Tienes que autorizar el tratamiento de tus datos personales.',
}))

function err(campo: Campo): string | undefined {
  return touched[campo] ? (errors.value[campo] ?? undefined) : undefined
}

function marcar(campo: Campo) {
  touched[campo] = true
}

const vencimientoModel = computed({
  get: () => tarjeta.vencimiento,
  set: (v: string) => {
    const digitos = v.replace(/\D/g, '').slice(0, 4)
    tarjeta.vencimiento =
      digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos
  },
})

const enviando = ref(false)
const errorPago = ref<string | null>(null)
const traceId = ref<string | undefined>()

/** Limpia lo sensible en cuanto deja de hacer falta. Nunca sobrevive al `try`. */
function limpiarTarjeta() {
  tarjeta.numero = ''
  tarjeta.cvc = ''
}

function campos(): Campo[] {
  const base: Campo[] = ['numero', 'vencimiento', 'cvc', 'titular', 'terminos', 'datos']
  return props.modoContratacion ? [...base, 'correo'] : base
}

function validarFormulario(): boolean {
  const lista = campos()
  lista.forEach(marcar)
  return lista.every((c) => !errors.value[c])
}

async function guardarTarjeta() {
  if (!validarFormulario() || !config.value) return
  errorPago.value = null
  traceId.value = undefined
  enviando.value = true
  const [mm, aa] = tarjeta.vencimiento.split('/')
  try {
    const token = await tokenizarTarjeta(config.value.apiBaseUrl, config.value.publicKey, {
      number: tarjeta.numero.replace(/\s+/g, ''),
      cvc: tarjeta.cvc,
      expMonth: mm ?? '',
      expYear: aa ?? '',
      cardHolder: tarjeta.titular.trim(),
    })
    const medio = await wompiApi.crearFuenteDePago({
      cardToken: token.id,
      acceptanceToken: config.value.acceptance.token,
      personalDataAuthToken: config.value.personalDataAuthorization.token,
      brand: token.brand,
      lastFour: token.last_four,
      expMonth: Number(token.exp_month),
      expYear: Number(token.exp_year),
    })
    limpiarTarjeta()
    emit('guardado', medio)
  } catch (e) {
    errorPago.value = getProblemDetailMessage(e, 'No pudimos guardar tu tarjeta con Wompi.')
    traceId.value = getTraceId(e)
  } finally {
    enviando.value = false
  }
}

/** Deshabilita el envío: el propio, y el `accept` que corre después en el padre (contratación). */
const bloqueado = computed(() => enviando.value || !!props.procesando)

const submitLabel = computed(() => {
  if (enviando.value) return 'Guardando tarjeta…'
  if (props.procesando) return 'Confirmando pago…'
  return props.modoContratacion ? 'Guardar tarjeta y pagar' : 'Guardar tarjeta'
})

/** Llamado por el padre si el paso siguiente falla: reabre el botón para reintentar. */
function restablecer() {
  enviando.value = false
}

defineExpose({ restablecer })

const idCorreo = useId()
</script>

<template>
  <p v-if="fase === 'cargando'" class="ds-meta">Cargando el formulario de pago…</p>

  <p v-else-if="fase === 'no-disponible'" class="ds-banner ds-banner--error" role="alert">
    {{ motivoNoDisponible }}
  </p>

  <form v-else class="ds-stack ds-stack--14" novalidate @submit.prevent="guardarTarjeta">
    <div class="tw-grid">
      <BaseField label="Número de tarjeta" required :error="err('numero')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="tarjeta.numero"
            inputmode="numeric"
            autocomplete="cc-number"
            placeholder="4242 4242 4242 4242"
            :invalid="!!err('numero')"
            @blur="marcar('numero')"
          />
        </template>
      </BaseField>
      <BaseField label="Vencimiento (MM/AA)" required :error="err('vencimiento')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="vencimientoModel"
            inputmode="numeric"
            autocomplete="cc-exp"
            placeholder="08/29"
            :invalid="!!err('vencimiento')"
            @blur="marcar('vencimiento')"
          />
        </template>
      </BaseField>
      <BaseField label="CVC" required :error="err('cvc')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="tarjeta.cvc"
            inputmode="numeric"
            autocomplete="cc-csc"
            placeholder="123"
            :invalid="!!err('cvc')"
            @blur="marcar('cvc')"
          />
        </template>
      </BaseField>
      <BaseField label="Nombre del titular" required :error="err('titular')">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="tarjeta.titular"
            autocomplete="cc-name"
            placeholder="Como aparece en la tarjeta"
            :invalid="!!err('titular')"
            @blur="marcar('titular')"
          />
        </template>
      </BaseField>
    </div>

    <BaseField
      v-if="modoContratacion"
      :id="idCorreo"
      label="Correo de quien acepta y paga"
      required
      :error="err('correo')"
    >
      <BaseInput
        v-model="correo"
        type="email"
        inputmode="email"
        autocomplete="email"
        :invalid="!!err('correo')"
        @blur="marcar('correo')"
      />
    </BaseField>

    <label class="tw-check">
      <input
        v-model="aceptaTerminosWompi"
        type="checkbox"
        :aria-invalid="!!err('terminos')"
        @blur="marcar('terminos')"
      />
      <span>
        Acepto los
        <a :href="config?.acceptance.permalink" target="_blank" rel="noopener"
          >términos y condiciones de Wompi<span class="ds-sr-only">
            (se abre en una pestaña nueva)</span
          ></a
        >.
      </span>
    </label>
    <p v-if="err('terminos')" class="tw-error">{{ err('terminos') }}</p>

    <label class="tw-check">
      <input
        v-model="aceptaDatosPersonales"
        type="checkbox"
        :aria-invalid="!!err('datos')"
        @blur="marcar('datos')"
      />
      <span>
        Autorizo el tratamiento de mis datos personales, según la
        <a :href="config?.personalDataAuthorization.permalink" target="_blank" rel="noopener"
          >autorización de Wompi<span class="ds-sr-only"> (se abre en una pestaña nueva)</span></a
        >.
      </span>
    </label>
    <p v-if="err('datos')" class="tw-error">{{ err('datos') }}</p>

    <p v-if="errorPago" class="ds-banner ds-banner--error" role="alert" tabindex="-1">
      {{ errorPago }}
      <code v-if="traceId" class="tw-trace">{{ traceId }}</code>
    </p>

    <div class="tw-acciones">
      <button
        v-if="!modoContratacion"
        type="button"
        class="ds-btn ds-btn--neutral"
        :disabled="bloqueado"
        @click="emit('cancelar')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :class="{ 'tw-submit-solo': modoContratacion }"
        :disabled="bloqueado"
      >
        <PawLoader v-if="bloqueado" :size="18" :glow="false" :speed="900" />
        <Lock v-else :size="15" :stroke-width="1.8" aria-hidden="true" />
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.tw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

@media (width <= 560px) {
  .tw-grid {
    grid-template-columns: 1fr;
  }
}

.tw-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.tw-error {
  margin: -8px 0 0;
  font-size: 12px;
  color: var(--danger-500);
}

.tw-trace {
  display: block;
  margin-top: 6px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11.5px;
}

.tw-acciones {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Sin botón de cancelar (contratación), el único botón vuelve a ocupar todo el ancho: es el
   mismo CTA de siempre, no uno recortado por el `justify-content` que ordena Cancelar/Guardar. */
.tw-submit-solo {
  flex: 1;
}
</style>
