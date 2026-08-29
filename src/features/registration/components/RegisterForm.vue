<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, toRefs, watch } from 'vue'
import { registrationApi } from '../api/registration.api'
import type { RegisterUserRequest } from '../types'
import {
  COMPANY_DOCTYPE_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type TaxRegime,
} from '@/features/facturacion/types/facturacion'
import {
  getProblemDetailCode,
  getProblemDetailFieldErrors,
  getProblemDetailMessage,
  getTraceId,
} from '@/services/http/http.client'
import { useRecaptcha } from '../composables/useRecaptcha'
import { useRegisterFields } from '../composables/useRegisterFields'
import { useRegistroGeo } from '../composables/useRegistroGeo'
import PrimaryButton from '@/components/public/PrimaryButton.vue'
import AuthBanner from '@/components/public/AuthBanner.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import RegisterCompanySection from './RegisterCompanySection.vue'
import RegisterAdminSection from './RegisterAdminSection.vue'
import {
  REGISTER_FIELD_DOM_ORDER,
  REGISTER_FIELD_IDS,
  REGISTER_RECAPTCHA_ID,
  type RegisterFormState,
  type RegisterOption as Opt,
} from '../types/register-form.types'

const emit = defineEmits<(e: 'success', email: string) => void>()

const form = reactive<RegisterFormState>({
  documentType: 'NIT',
  companyIdentifier: '',
  companyName: '',
  taxRegime: '',
  fiscalEmail: '',
  companyAddress: '',
  companyContactNumber: '',
  countryId: '',
  stateId: '',
  cityId: '',
  employeeName: '',
  employeeEmail: '',
  password: '',
})

// Las dos secciones extraídas escriben en el mismo borrador a través de estas
// refs (patrón de `AppointmentWhenFields`): no copian estado ni lo replican.
const formRefs = toRefs(form)

// La validación por campo y la cascada geográfica viven ahora en sus
// composables. Ni una regla ni un mensaje cambiaron al sacarlas; lo que cambió
// es que este SFC volvió por debajo del techo de 500 líneas de `css:budget`.
const {
  touched,
  serverErrors,
  isNit,
  docHint,
  err,
  markTouched,
  markAllTouched,
  hasErrors,
  sanitizeIdentifier,
  sanitizePhone,
} = useRegisterFields(form)

const {
  countryOptions,
  stateOptions,
  cityOptions,
  loadingStates,
  loadingCities,
  error: geoError,
  loadCountries,
} = useRegistroGeo(form)

const globalError = ref<string | null>(null)
const globalTraceId = ref<string | undefined>()
const submitting = ref(false)
const cardRef = ref<HTMLElement | null>(null)

const docTypeOptions: Opt[] = (
  Object.entries(COMPANY_DOCTYPE_LABEL) as [CompanyDocumentType, string][]
).map(([value, label]) => ({ value, label }))
const regimeOptions: Opt[] = (Object.entries(TAX_REGIME_LABEL) as [TaxRegime, string][]).map(
  ([value, label]) => ({ value, label }),
)

/**
 * A11Y — el resumen de errores sustituye a «Revisa los campos marcados en rojo».
 *
 * Ese texto solo funcionaba si el usuario VE el rojo (§1.4.1), y encima obligaba
 * a recorrer trece campos a ojo para encontrar cuáles. `ErrorSummary` lista cada
 * problema con su texto literal y un ancla que mueve el FOCO al control, que es
 * lo que §3.3.1 y §2.4.3 piden en el formulario más largo del producto.
 *
 * Se enciende solo tras un envío fallido: mientras se teclea no aparece, igual
 * que los errores en línea (nunca validación prematura).
 */
const showSummary = ref(false)
const summaryRef = ref<InstanceType<typeof ErrorSummary> | null>(null)

/**
 * §5, caso 4 — «ya tienes cuenta» no es un callejón sin salida.
 *
 * El error del campo dice el problema; sin una salida al lado, quien se equivocó
 * de puerta pierde también la elección de plan que ya había hecho. El enlace
 * lleva a login CONSERVANDO el destino de contratación.
 */
const emailTaken = ref(false)

/**
 * §5, caso 5 — el NIT repetido.
 *
 * El backend NO tiene hoy un código propio para esto (`GlobalExceptionHandler`
 * solo declara `EMAIL_ALREADY_REGISTERED` para el registro), así que la señal
 * disponible es que el servidor haya puesto un error sobre `companyIdentifier`.
 * Su mensaje se respeta tal cual; lo que se añade es la salida, y NUNCA quién
 * registró la empresa, ni cuándo, ni con qué correo: eso sería filtrar datos de
 * otra empresa a cualquiera que teclee un NIT.
 */
const nitTaken = computed(() => !!serverErrors.value.companyIdentifier)

/** Reexpuesto al marcado: los ids tienen que ser los MISMOS que usa el resumen. */
const fieldIds = REGISTER_FIELD_IDS

// --- reCAPTCHA ---
const recaptcha = useRecaptcha()
const recaptchaEl = ref<HTMLElement | null>(null)
const recaptchaTouched = ref(false)
const recaptchaMissing = computed(
  () => recaptchaTouched.value && recaptcha.ready.value && !recaptcha.getToken(),
)
// Sin widget no hay token, y sin token el backend rechaza el registro. Antes eso no impedía
// enviar (`captchaMissing` solo mira el caso `ready`), así que el usuario recibía un error
// genérico del servidor en vez de saber que la verificación no está disponible.
const recaptchaUnavailable = computed(() => recaptcha.failed.value)

/**
 * Los errores del resumen, en el orden VISUAL del formulario. Se construyen con
 * `err()`, la misma función que pinta el error en línea, para que el texto del
 * resumen sea LITERALMENTE el de abajo: reformularlo es el defecto clásico de
 * este patrón, porque quien llega al campo desde el enlace ya no reconoce el
 * mensaje que le trajo hasta ahí.
 */
const summaryItems = computed(() => {
  const errores: Record<string, string | undefined> = {}
  for (const k of REGISTER_FIELD_DOM_ORDER) errores[k] = err(k)
  const items = toSummaryItems(errores, REGISTER_FIELD_IDS, [...REGISTER_FIELD_DOM_ORDER])
  if (recaptchaMissing.value) {
    items.push({ id: REGISTER_RECAPTCHA_ID, text: 'Completa la verificación para continuar.' })
  }
  return items
})

async function focusSummary() {
  showSummary.value = true
  await nextTick()
  summaryRef.value?.focus()
}

// El fallo de carga de un catálogo geográfico se pinta en el banner de arriba,
// igual que antes de extraer la cascada.
watch(geoError, (mensaje) => {
  if (mensaje) globalError.value = mensaje
})

onMounted(async () => {
  // El widget de reCAPTCHA y el listado de países son independientes: uno baja un
  // script de un tercero (que en una red que lo bloquea tarda hasta su timeout) y
  // el otro es una petición nuestra. En serie, el selector de país se quedaba
  // vacío todo ese rato sin motivo (#254). `recaptcha.render()` no rechaza nunca
  // —traga su fallo en `failed`/`failureMessage`, que el marcado ya pinta— así
  // que esperarlo al final no cambia ningún mensaje de error visible.
  const recaptchaListo = recaptchaEl.value ? recaptcha.render(recaptchaEl.value) : Promise.resolve()
  await loadCountries()
  await recaptchaListo
})

async function submit() {
  globalError.value = null
  globalTraceId.value = undefined
  serverErrors.value = {}
  showSummary.value = false
  emailTaken.value = false
  recaptchaTouched.value = true
  markAllTouched()

  const errores = hasErrors()
  const captchaToken = recaptcha.getToken()
  const captchaMissing = recaptcha.ready.value && !captchaToken

  if (errores || captchaMissing || recaptchaUnavailable.value) {
    // «La verificación no está disponible» no es un campo que el usuario pueda
    // corregir, así que no entra en el resumen: es un banner y se queda arriba.
    if (recaptchaUnavailable.value)
      globalError.value =
        'No se puede crear la cuenta: la verificación anti-bots no está disponible.'
    if (errores || captchaMissing) await focusSummary()
    else cardRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  submitting.value = true
  try {
    const payload: RegisterUserRequest = {
      companyName: form.companyName.trim(),
      documentType: form.documentType as CompanyDocumentType,
      companyIdentifier: form.companyIdentifier.trim(),
      companyAddress: form.companyAddress.trim() || undefined,
      companyContactNumber: form.companyContactNumber.trim() || undefined,
      cityId: Number(form.cityId),
      taxRegime: form.taxRegime as TaxRegime,
      fiscalEmail: form.fiscalEmail.trim(),
      employeeName: form.employeeName.trim(),
      employeeEmail: form.employeeEmail.trim(),
      password: form.password,
      recaptchaToken: captchaToken || undefined,
    }
    const res = await registrationApi.register(payload)
    emit('success', res.email)
  } catch (e) {
    serverErrors.value = getProblemDetailFieldErrors(e)
    // Un email = una veterinaria: si el correo ya está registrado, se marca el campo de email.
    if (getProblemDetailCode(e) === 'EMAIL_ALREADY_REGISTERED') {
      serverErrors.value = {
        ...serverErrors.value,
        employeeEmail: 'Ese correo ya está registrado.',
      }
      touched.employeeEmail = true
      emailTaken.value = true
    }
    globalError.value = getProblemDetailMessage(e, 'No se pudo crear la cuenta')
    globalTraceId.value = getTraceId(e)
    recaptcha.reset()
    // El fallo del servidor puede venir con errores POR CAMPO (`ProblemDetail`
    // los trae en `errors`): si los hay, el resumen los lista igual que los
    // locales. Si no, solo queda el banner de arriba.
    if (summaryItems.value.length > 0) await focusSummary()
    else cardRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div ref="cardRef" class="reg-scroll">
    <form class="reg-card" novalidate @submit.prevent="submit">
      <div class="reg-eyebrow">VetSoftware</div>
      <h1 class="reg-title">Crear cuenta</h1>
      <p class="reg-sub">Registra tu empresa y tu primer usuario administrador.</p>

      <div v-if="globalError" class="reg-banner-wrap">
        <AuthBanner tone="error" @close="globalError = null"
          >{{ globalError }}
          <span v-if="globalTraceId" class="reg-trace">{{ globalTraceId }}</span>
        </AuthBanner>
      </div>

      <div v-if="showSummary" class="reg-banner-wrap">
        <ErrorSummary ref="summaryRef" :items="summaryItems" />
      </div>

      <RegisterCompanySection
        :form="formRefs"
        :err="err"
        :field-ids="fieldIds"
        :nit-taken="nitTaken"
        :mark-touched="markTouched"
        :sanitize-identifier="sanitizeIdentifier"
        :sanitize-phone="sanitizePhone"
        :is-nit="isNit"
        :doc-hint="docHint"
        :doc-type-options="docTypeOptions"
        :regime-options="regimeOptions"
        :country-options="countryOptions"
        :state-options="stateOptions"
        :city-options="cityOptions"
        :loading-states="loadingStates"
        :loading-cities="loadingCities"
      />

      <div class="reg-divider" />

      <RegisterAdminSection
        :form="formRefs"
        :err="err"
        :field-ids="fieldIds"
        :email-taken="emailTaken"
        :mark-touched="markTouched"
      />

      <!-- reCAPTCHA. `tabindex="-1"` porque es el destino de una fila del
           resumen: el widget lo pinta un `<iframe>` de un tercero y no hay
           control propio al que llevar el foco. -->
      <div :id="REGISTER_RECAPTCHA_ID" class="reg-recaptcha" tabindex="-1">
        <div ref="recaptchaEl" class="reg-recaptcha-widget"></div>
        <p v-if="recaptchaMissing" class="reg-recaptcha-err">
          <v-icon size="12">mdi-alert-circle-outline</v-icon>
          Completa la verificación para continuar.
        </p>
        <div v-if="recaptchaUnavailable" class="reg-recaptcha-warn">
          <AuthBanner tone="error" :closable="false">
            {{ recaptcha.failureMessage.value }}
          </AuthBanner>
        </div>
      </div>

      <div class="reg-submit">
        <PrimaryButton type="submit" :loading="submitting" loading-text="Creando cuenta…">
          Crear cuenta <v-icon size="14">mdi-arrow-right</v-icon>
        </PrimaryButton>
      </div>

      <p class="reg-foot">
        ¿Ya tienes cuenta?
        <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.reg-scroll {
  width: 100%;
  max-width: 720px;
  max-height: 100%;
  overflow-y: auto;
  margin: 0 auto;
}

.reg-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--pub-line);
  box-shadow: var(--pub-card-shadow);
  padding: clamp(24px, 4vw, 40px);
}

.reg-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--pub-ame-700);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.reg-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.08;
}

.reg-sub {
  font-size: 13.5px;
  color: var(--pub-ink-500);
  margin: 9px 0 0;
  line-height: 1.5;
}

.reg-banner-wrap {
  margin-top: 20px;
}

/* El identificador de traza dentro del banner de error del registro: sin él,
   soporte no puede correlacionar un alta fallida con el backend. */
.reg-trace {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.75;
  font-family: ui-monospace, Menlo, monospace;
}

.reg-recaptcha:focus {
  outline: none;
}

/* Las dos secciones del formulario (`RegisterCompanySection`,
   `RegisterAdminSection`) llevan su propio CSS. */
.reg-divider {
  height: 1px;
  background: var(--pub-line-2);
  margin: 28px 0;
}

.reg-recaptcha {
  margin-top: 26px;
}

.reg-recaptcha-widget {
  display: flex;
  justify-content: center;
}

.reg-recaptcha-err {
  font-size: 11.5px;
  color: var(--pub-err-tx-2);
  text-align: center;
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.reg-recaptcha-warn {
  margin-top: 10px;
}

.reg-submit {
  margin-top: 22px;
}

.reg-foot {
  font-size: 13px;
  color: var(--pub-ink-500);
  text-align: center;
  margin: 18px 0 0;
}

.reg-foot :deep(a) {
  color: var(--pub-ame-700);
  font-weight: 600;
  text-decoration: none;
}
</style>
