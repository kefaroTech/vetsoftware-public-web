import { computed, reactive, ref, watch } from 'vue'
import type { RegisterFieldKey, RegisterFormState } from '../types/register-form.types'

/**
 * Validación por campo del auto-registro.
 *
 * Es la convención documentada del tenant, movida tal cual desde
 * `RegisterForm.vue` —validador puro por clave → `touched` que arranca en
 * `false` → el error solo se muestra tras `@blur` o tras el envío— sin cambiar
 * ni un mensaje ni una regla. Se saca a un composable por la misma razón que la
 * cascada geográfica: el SFC pasó de las 500 líneas del presupuesto, y esta era
 * la otra costura real que ya tenía dentro.
 *
 * **Estado por instancia**: `touched` y `serverErrors` viven dentro de la
 * función, no a nivel de módulo.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s\-()]{6,29}$/

/** Los campos que el envío exige. `companyContactNumber` valida pero es opcional. */
export const REQUIRED: RegisterFieldKey[] = [
  'companyIdentifier',
  'companyName',
  'taxRegime',
  'fiscalEmail',
  'countryId',
  'stateId',
  'cityId',
  'employeeName',
  'employeeEmail',
  'password',
]

export function useRegisterFields(form: RegisterFormState) {
  const touched = reactive<Record<RegisterFieldKey, boolean>>({
    companyIdentifier: false,
    companyName: false,
    taxRegime: false,
    fiscalEmail: false,
    companyContactNumber: false,
    countryId: false,
    stateId: false,
    cityId: false,
    employeeName: false,
    employeeEmail: false,
    password: false,
  })

  const serverErrors = ref<Record<string, string>>({})

  const isNit = computed(() => form.documentType === 'NIT')
  const docHint = computed(() =>
    isNit.value
      ? 'El dígito de verificación se calcula automáticamente.'
      : 'Debe ser único en todo el sistema.',
  )

  function validate(key: RegisterFieldKey): string | null {
    const v = String(form[key as keyof typeof form] ?? '')
    switch (key) {
      case 'companyIdentifier':
        if (!v.trim()) return 'Ingresa el número de documento.'
        return isNit.value
          ? /^\d{5,15}$/.test(v)
            ? null
            : 'Para NIT debe ser numérico, 5 a 15 dígitos.'
          : /^[a-zA-Z0-9]{4,20}$/.test(v)
            ? null
            : 'Alfanumérico, 4 a 20 caracteres.'
      case 'companyName':
        return v.trim() ? null : 'Ingresa la razón social.'
      case 'taxRegime':
        return v ? null : 'Selecciona el régimen tributario.'
      case 'fiscalEmail':
        if (!v.trim()) return 'Ingresa el correo fiscal.'
        return EMAIL_RE.test(v) ? null : 'Correo no válido.'
      case 'companyContactNumber':
        if (!v.trim()) return null
        return PHONE_RE.test(v) ? null : 'Teléfono no válido (7–15 dígitos).'
      case 'countryId':
        return v ? null : 'Selecciona el país.'
      case 'stateId':
        return v ? null : 'Selecciona el departamento.'
      case 'cityId':
        return v ? null : 'Selecciona la ciudad.'
      case 'employeeName':
        return v.trim() ? null : 'Ingresa el nombre completo.'
      case 'employeeEmail':
        if (!v.trim()) return 'Ingresa el correo.'
        return EMAIL_RE.test(v) ? null : 'Correo no válido.'
      case 'password':
        if (!v) return 'Ingresa una contraseña.'
        return v.length >= 8 ? null : 'Mínimo 8 caracteres.'
      default:
        return null
    }
  }

  /** El error VISIBLE: el local solo si el campo se tocó, y si no, el del servidor. */
  function err(key: RegisterFieldKey): string | undefined {
    if (touched[key]) {
      const local = validate(key)
      if (local) return local
    }
    return serverErrors.value[key]
  }

  function markTouched(key: RegisterFieldKey) {
    touched[key] = true
  }

  /** Al enviar se marca todo, para que ningún error se quede escondido. */
  function markAllTouched() {
    REQUIRED.forEach(markTouched)
    markTouched('companyContactNumber')
  }

  function hasErrors(): boolean {
    return [...REQUIRED, 'companyContactNumber' as const].some((k) => validate(k))
  }

  function sanitizeIdentifier(v: string) {
    form.companyIdentifier = (v ?? '').replace(/[^A-Za-z0-9]/g, '')
  }
  function sanitizePhone(v: string) {
    form.companyContactNumber = (v ?? '').replace(/[^+\d\s\-()]/g, '')
  }

  // Al cambiar el tipo de documento, el error del servidor sobre el número deja
  // de aplicar: la regla que lo produjo era la del tipo anterior.
  watch(
    () => form.documentType,
    () => {
      if (touched.companyIdentifier)
        serverErrors.value = { ...serverErrors.value, companyIdentifier: '' }
    },
  )

  return {
    touched,
    serverErrors,
    isNit,
    docHint,
    validate,
    err,
    markTouched,
    markAllTouched,
    hasErrors,
    sanitizeIdentifier,
    sanitizePhone,
  }
}
