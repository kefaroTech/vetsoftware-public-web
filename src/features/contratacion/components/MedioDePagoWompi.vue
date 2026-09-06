<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId } from 'vue'
import { storeToRefs } from 'pinia'
import axios from 'axios'
import { CreditCard, Lock } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useAuth } from '@/features/auth/composables/useAuth'
import { importeEstimado } from '@/features/landing/composables/planPricing'
import { useMediosPagoStore } from '@/features/suscripcion/stores/medios-pago.store'
import { tokenizarTarjeta, wompiApi } from '../api/pago.api'
import {
  pareceCorreo,
  validarCorreoAceptante,
  validarCvc,
  validarNumeroTarjeta,
  validarTitular,
  validarVencimiento,
} from '../composables/tarjetaWompi'
import type { WompiCheckoutConfigResponse } from '../types/pago.types'

/**
 * El bloque de pago del paso 6: tokeniza la tarjeta contra Wompi y deja a la empresa con un medio
 * de pago registrado, listo para que `usePasoContratar` acepte la oferta.
 *
 * <p>Este componente **no acepta la oferta ni navega**: solo llega hasta tener un medio de pago
 * WOMPI activo (uno nuevo, o el que ya existiera por defecto) y entonces emite `pagar`. Quien
 * decide qué pasa después —`POST /quotes/{id}/accept`, guardar el resultado, navegar— es
 * `usePasoContratar`, porque eso es contratación y no pago.
 *
 * <p>El número de tarjeta y el CVC viven solo en `tarjeta`, un `reactive()` local de esta
 * instancia: no hay ningún `ref()` de módulo (la regla dura de Pinia no aplica al estado por
 * instancia de componente) y los dos campos se limpian en cuanto se obtiene el token.
 */
const props = defineProps<{
  total: number | null
  /** El padre está aceptando la oferta (`POST /quotes/{id}/accept`): deshabilita los botones
   * para que un segundo clic no dispare un segundo cobro mientras el primero sigue en vuelo. */
  procesando?: boolean
}>()
const emit = defineEmits<{ pagar: [payload: { acceptedByEmail: string }] }>()

type FaseConfig = 'cargando' | 'no-disponible' | 'listo'
const fase = ref<FaseConfig>('cargando')
const config = ref<WompiCheckoutConfigResponse | null>(null)

const mediosStore = useMediosPagoStore()
const { methods: mediosGuardados } = storeToRefs(mediosStore)

/** El medio con el que se puede pagar sin tokenizar nada. */
const medioPorDefecto = computed(
  () =>
    mediosGuardados.value.find(
      (m) => m.gateway === 'WOMPI' && m.mandateStatus === 'ACTIVE' && m.defaultMethod,
    ) ?? null,
)

async function cargar() {
  fase.value = 'cargando'
  try {
    config.value = await wompiApi.checkoutConfig()
    await mediosStore.load(true)
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

const motivoNoDisponible = ref('')
onMounted(cargar)

const tarjeta = reactive({ numero: '', vencimiento: '', cvc: '', titular: '' })

/**
 * En el auto-registro el usuario de acceso del administrador ES su correo
 * (`RegisterUserService`), así que `employeeCode` suele valer como valor por defecto — pero
 * sigue siendo editable, y un empleado invitado después puede tener un código que no lo sea.
 */
const { me } = useAuth()
const correo = ref(
  me.value?.employeeCode && pareceCorreo(me.value.employeeCode) ? me.value.employeeCode : '',
)
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
  correo: validarCorreoAceptante(correo.value),
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

/** El total, formateado. `null` mientras la oferta todavía no responde. */
const totalTexto = computed(() => (props.total === null ? '—' : importeEstimado(props.total)))

/** Limpia lo sensible en cuanto deja de hacer falta. Nunca sobrevive al `try`. */
function limpiarTarjeta() {
  tarjeta.numero = ''
  tarjeta.cvc = ''
}

function validarFormularioNuevo(): boolean {
  ;(['numero', 'vencimiento', 'cvc', 'titular', 'correo', 'terminos', 'datos'] as Campo[]).forEach(
    marcar,
  )
  return (
    !errors.value.numero &&
    !errors.value.vencimiento &&
    !errors.value.cvc &&
    !errors.value.titular &&
    !errors.value.correo &&
    !errors.value.terminos &&
    !errors.value.datos
  )
}

async function pagarConTarjetaNueva() {
  if (!validarFormularioNuevo() || !config.value) return
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
    await wompiApi.crearFuenteDePago({
      cardToken: token.id,
      acceptanceToken: config.value.acceptance.token,
      personalDataAuthToken: config.value.personalDataAuthorization.token,
      brand: token.brand,
      lastFour: token.last_four,
      expMonth: Number(token.exp_month),
      expYear: Number(token.exp_year),
    })
    limpiarTarjeta()
    emit('pagar', { acceptedByEmail: correo.value.trim() })
  } catch (e) {
    errorPago.value = getProblemDetailMessage(e, 'No pudimos guardar tu tarjeta con Wompi.')
    traceId.value = getTraceId(e)
  } finally {
    enviando.value = false
  }
}

function pagarConMedioExistente() {
  touched.correo = true
  if (errors.value.correo) return
  emit('pagar', { acceptedByEmail: correo.value.trim() })
}

/** Deshabilita los dos botones: el propio envío, y el `accept` que corre después en el padre. */
const bloqueado = computed(() => enviando.value || !!props.procesando)

/** Llamado por el padre si `POST /quotes/{id}/accept` falla: reabre el botón para reintentar. */
function restablecer() {
  enviando.value = false
}

defineExpose({ restablecer })

const idCorreo = useId()
</script>

<template>
  <section class="ds-card mp-wompi" aria-labelledby="mp-wompi-h2">
    <h2 id="mp-wompi-h2" class="ds-title">Medio de pago</h2>
    <p class="ds-subtitle">
      Total a pagar hoy: <strong>{{ totalTexto }}</strong>
    </p>

    <p v-if="fase === 'cargando'" class="ds-meta">Cargando el formulario de pago…</p>

    <p v-else-if="fase === 'no-disponible'" class="ds-banner ds-banner--error" role="alert">
      {{ motivoNoDisponible }}
    </p>

    <template v-else>
      <div v-if="medioPorDefecto" class="ds-stack ds-stack--14">
        <p class="ds-meta mp-existente">
          <CreditCard :size="16" :stroke-width="1.8" aria-hidden="true" />
          Pagaremos con la tarjeta terminada en <strong>{{ medioPorDefecto.lastFour }}</strong
          >.
        </p>

        <BaseField
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

        <button
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg"
          :disabled="bloqueado"
          @click="pagarConMedioExistente"
        >
          {{
            procesando
              ? 'Confirmando pago…'
              : `Pagar con la tarjeta terminada en ${medioPorDefecto.lastFour}`
          }}
        </button>
      </div>

      <form v-else class="ds-stack ds-stack--14" novalidate @submit.prevent="pagarConTarjetaNueva">
        <div class="mp-grid">
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

        <label class="mp-check">
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
        <p v-if="err('terminos')" class="mp-error">{{ err('terminos') }}</p>

        <label class="mp-check">
          <input
            v-model="aceptaDatosPersonales"
            type="checkbox"
            :aria-invalid="!!err('datos')"
            @blur="marcar('datos')"
          />
          <span>
            Autorizo el tratamiento de mis datos personales, según la
            <a :href="config?.personalDataAuthorization.permalink" target="_blank" rel="noopener"
              >autorización de Wompi<span class="ds-sr-only">
                (se abre en una pestaña nueva)</span
              ></a
            >.
          </span>
        </label>
        <p v-if="err('datos')" class="mp-error">{{ err('datos') }}</p>

        <p v-if="errorPago" class="ds-banner ds-banner--error" role="alert" tabindex="-1">
          {{ errorPago }}
          <code v-if="traceId" class="mp-trace">{{ traceId }}</code>
        </p>

        <button type="submit" class="ds-btn ds-btn--primary ds-btn--lg" :disabled="bloqueado">
          <PawLoader v-if="bloqueado" :size="18" :glow="false" :speed="900" />
          <Lock v-else :size="15" :stroke-width="1.8" aria-hidden="true" />
          {{
            enviando
              ? 'Guardando tarjeta…'
              : procesando
                ? 'Confirmando pago…'
                : 'Guardar tarjeta y pagar'
          }}
        </button>
      </form>
    </template>
  </section>
</template>

<style scoped>
.mp-wompi {
  display: flex;
  flex-direction: column;
  gap: var(--space-14);
}

.mp-existente {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

@media (width <= 560px) {
  .mp-grid {
    grid-template-columns: 1fr;
  }
}

.mp-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.mp-error {
  margin: -8px 0 0;
  font-size: 12px;
  color: var(--danger-500);
}

.mp-trace {
  display: block;
  margin-top: 6px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11.5px;
}
</style>
