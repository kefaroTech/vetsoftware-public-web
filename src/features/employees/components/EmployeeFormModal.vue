<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { UserPlus, Pencil } from 'lucide-vue-next'
import type { Employee, EmployeeStatus } from '@/types/domain'
import { useRoles } from '@/features/roles/composables/useRoles'
import { useBranches } from '@/features/branches/composables/useBranches'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import RoleSelectorGrid from './RoleSelectorGrid.vue'
import BranchSelectorGrid from './BranchSelectorGrid.vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { employeeApi } from '../api/employee.api'

const props = defineProps<{
  open: boolean
  initial: Employee | null
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [data: EmployeeFormData]
}>()

export interface EmployeeFormData {
  employeeCode: string
  name: string
  email: string
  status: EmployeeStatus
  password: string
  roleIds: number[]
  branchIds: number[]
}

type FieldKey = 'employeeCode' | 'name' | 'email' | 'password' | 'roles' | 'branches'

const isEditing = computed(() => props.initial !== null)

const { list: roles } = useRoles()
// Sedes ASIGNABLES por el usuario actual: admin ve todas las activas; un no-admin solo sus sedes.
const { visibleBranches } = useBranches()

const draft = ref<EmployeeFormData>({
  employeeCode: '',
  name: '',
  email: '',
  status: 'ACTIVE',
  password: '',
  roleIds: [],
  branchIds: [],
})

const selectedRoleIds = ref<Set<number>>(new Set())
const selectedBranchIds = ref<Set<number>>(new Set())

// --- Autogeneración del código (solo alta): bloqueado hasta escribir el nombre, editable, disp. en vivo ---
type CodeStatus = 'idle' | 'checking' | 'available' | 'taken'
const codeStatus = ref<CodeStatus>('idle')
let codeAuto = true // true hasta que el usuario edite el código a mano
let applyingSuggestion = false
let suggestTimer: ReturnType<typeof setTimeout> | undefined
let availTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Dos semánticas distintas que antes vivían colapsadas en un solo booleano
 * (`isEditing || !name.trim()`) y en el mismo píxel:
 *
 * - **En edición** el código ya existe y es INMUTABLE. Eso es solo lectura: el
 *   usuario tiene que poder enfocarlo, leerlo y copiarlo, y el valor sigue
 *   viajando en el envío. Lo dice el propio `hint`.
 * - **En alta sin nombre** el código todavía no se puede generar. Eso sí es
 *   deshabilitado: es temporal y se resuelve escribiendo el nombre.
 */
const codeReadonly = computed(() => isEditing.value)
const codeDisabled = computed(() => !isEditing.value && !draft.value.name.trim())
const codeHint = computed<string | undefined>(() => {
  if (isEditing.value) return 'El código no se puede modificar una vez creado el empleado.'
  if (codeDisabled.value)
    return 'Escribe el nombre y se genera automáticamente. Luego puedes editarlo.'
  if (codeStatus.value === 'checking') return 'Verificando disponibilidad…'
  if (codeStatus.value === 'available') return '✓ Disponible'
  return 'Puedes editarlo.'
})

/**
 * FORM-05 — orden VISUAL, etiqueta e id del CONTROL de cada campo. El id lo pasa
 * el padre (prop `id` de `BaseField`) porque no puede adivinar el `useId()` que
 * la primitiva genera dentro, y sin él el resumen no tiene a dónde enlazar.
 */
const uid = useId()
const FIELDS: readonly (readonly [FieldKey, string])[] = [
  ['name', 'Nombre completo'],
  ['employeeCode', 'Código de empleado'],
  ['email', 'Correo'],
  ['password', 'Contraseña inicial'],
  ['roles', 'Roles'],
  ['branches', 'Sedes'],
]
const fid = (k: FieldKey) => `${uid}-${k}`

// Las claves salen de `FIELDS` para que orden, etiqueta, id y `touched` no
// puedan desincronizarse: antes eran dos listas escritas a mano.
const touched = reactive(
  Object.fromEntries(FIELDS.map(([k]) => [k, false])) as Record<FieldKey, boolean>,
)

function reset() {
  // Las dos ramas solo diferían en cuatro valores; el resto estaba duplicado.
  const it = props.initial
  draft.value = {
    employeeCode: it?.employeeCode ?? '',
    name: it?.name ?? '',
    email: it?.email ?? '',
    status: it && !it.enabled ? 'INACTIVE' : 'ACTIVE',
    password: '',
    roleIds: [],
    branchIds: [],
  }
  selectedRoleIds.value = new Set()
  selectedBranchIds.value = new Set()
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = false))
  banner.value = false
  confirming.value = false
  codeStatus.value = 'idle'
  codeAuto = !props.initial // en edición no autogeneramos
  applyingSuggestion = false
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
  { immediate: true },
)

async function fetchSuggestion() {
  if (isEditing.value || !codeAuto) return
  const name = draft.value.name.trim()
  if (!name) return
  try {
    const suggestion = await employeeApi.suggestCode(name)
    if (isEditing.value || !codeAuto) return
    applyingSuggestion = true
    draft.value.employeeCode = suggestion
    codeStatus.value = 'available'
  } catch {
    /* sin sugerencia: el usuario escribe el código a mano */
  }
}

async function checkAvailability() {
  const code = draft.value.employeeCode.trim()
  if (!code) {
    codeStatus.value = 'idle'
    return
  }
  codeStatus.value = 'checking'
  try {
    const available = await employeeApi.checkCodeAvailability(code)
    if (code !== draft.value.employeeCode.trim()) return // el valor cambió mientras respondía
    codeStatus.value = available ? 'available' : 'taken'
  } catch {
    codeStatus.value = 'idle'
  }
}

// Alta: al escribir el nombre se autogenera el código (mientras no se haya editado a mano).
watch(
  () => draft.value.name,
  () => {
    if (isEditing.value) return
    clearTimeout(suggestTimer)
    suggestTimer = setTimeout(fetchSuggestion, 450)
  },
)

// Alta: al editar el código, chequeo de disponibilidad (excepto cuando el valor lo puso la sugerencia).
watch(
  () => draft.value.employeeCode,
  () => {
    if (isEditing.value) return
    if (applyingSuggestion) {
      applyingSuggestion = false
      return
    }
    codeAuto = false
    clearTimeout(availTimer)
    availTimer = setTimeout(checkAvailability, 400)
  },
)

const errors = computed(() => {
  const e: Partial<Record<FieldKey, string>> = {}
  const code = draft.value.employeeCode.trim()
  if (!code) e.employeeCode = 'El código es requerido'
  else if (code.length > 50) e.employeeCode = 'Máximo 50 caracteres'
  else if (!isEditing.value && codeStatus.value === 'taken')
    e.employeeCode = 'Ese código ya está en uso'

  const name = draft.value.name.trim()
  if (!name) e.name = 'El nombre es requerido'
  else if (name.length < 2) e.name = 'Mínimo 2 caracteres'
  else if (name.length > 100) e.name = 'Máximo 100 caracteres'

  const email = draft.value.email.trim()
  if (!email) e.email = 'El correo es requerido'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Correo inválido'
  else if (email.length > 100) e.email = 'Máximo 100 caracteres'

  if (!isEditing.value) {
    const pw = draft.value.password
    if (!pw) e.password = 'La contraseña es requerida'
    else if (pw.length < 8) e.password = 'Mínimo 8 caracteres'
    else if (pw.length > 100) e.password = 'Máximo 100 caracteres'

    if (selectedRoleIds.value.size === 0) e.roles = 'Selecciona al menos un rol'
    if (selectedBranchIds.value.size === 0) e.branches = 'Selecciona al menos una sede'
  }

  return e
})

function err(field: FieldKey): string | undefined {
  return touched[field] && errors.value[field] ? errors.value[field] : undefined
}

function markTouched(field: FieldKey) {
  touched[field] = true
}

const banner = ref(false)
const confirming = ref(false)
/** FORM-05 — el resumen recibe el foco tras una validación fallida (WCAG §2.4.3). */
const summary = ref<{ focus: () => void } | null>(null)

/** La etiqueta va delante del texto literal del error: en línea son «Requerido»
 *  o «Mínimo 8 caracteres», que solos no dicen de qué campo hablan (§2.4.4). */
const summaryItems = computed(() =>
  FIELDS.flatMap(([k, label]) => {
    const text = err(k)
    return text ? [{ id: fid(k), text: `${label}: ${text}` }] : []
  }),
)

function submit() {
  if (props.busy) return
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  const ok = Object.keys(errors.value).length === 0
  if (!ok) {
    banner.value = true
    void nextTick().then(() => summary.value?.focus())
    void scrollToFirstError()
    return
  }
  banner.value = false
  // Alta: pedir confirmación antes de crear (se enviará la invitación por correo). Edición: guardar directo.
  if (!isEditing.value) {
    confirming.value = true
    return
  }
  doSubmit()
}

function doSubmit() {
  // La guarda va también AQUÍ: el botón «Confirmar y crear» llama a esta función
  // directamente, sin pasar por `submit()`.
  if (props.busy) return
  confirming.value = false
  emit('submit', {
    ...draft.value,
    roleIds: [...selectedRoleIds.value],
    branchIds: [...selectedBranchIds.value],
  })
}

function onSelectedIdsUpdate(next: Set<number>) {
  selectedRoleIds.value = next
  markTouched('roles')
}

function onSelectedBranchIdsUpdate(next: Set<number>) {
  selectedBranchIds.value = next
  markTouched('branches')
}

const titleText = computed(() => (isEditing.value ? 'Editar empleado' : 'Nuevo empleado'))
const subtitleText = computed(() =>
  isEditing.value
    ? 'Actualiza los datos del empleado.'
    : 'Crea una cuenta para un nuevo miembro del equipo.',
)
</script>

<template>
  <ModalShell
    :open="open"
    :title="titleText"
    :subtitle="subtitleText"
    :icon="isEditing ? Pencil : UserPlus"
    accent="amatista"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="confirming" class="confirm">
        <p>
          Se creará la cuenta de <strong>{{ draft.name || 'este empleado' }}</strong> y se enviará
          una invitación a <strong>{{ draft.email }}</strong> con su usuario (<strong>{{
            draft.employeeCode
          }}</strong
          >) y la contraseña para el primer ingreso.
        </p>
        <p class="confirm-note">
          Al iniciar sesión por primera vez, el sistema le pedirá crear una contraseña nueva.
        </p>
      </div>

      <template v-else>
        <!-- FORM-05 · donde había un «Revisa los campos marcados» sin enlaces
             hay ahora uno por problema, que lleva el foco a su control.
             `v-if="banner"`: solo tras pulsar Guardar, no al primer `@blur`. -->
        <ErrorSummary v-if="banner" ref="summary" :items="summaryItems" />
        <div class="ds-stack ds-stack--14">
          <BaseField :id="fid('name')" label="Nombre completo" required :error="err('name')">
            <BaseInput
              v-model="draft.name"
              placeholder="Ej. Camilo Ríos Vargas"
              :invalid="!!err('name')"
              autocomplete="name"
              @blur="markTouched('name')"
            />
          </BaseField>

          <div class="grid-2 ds-grid-2">
            <!-- §5.4: `required` y `readonly` no conviven (MDN: el atributo no está
                 permitido junto a `readonly`) y un campo que no se edita no puede
                 fallar una validación. -->
            <BaseField
              :id="fid('employeeCode')"
              label="Código de empleado"
              :required="!codeReadonly"
              :readonly="codeReadonly"
              :error="err('employeeCode')"
              :hint="codeHint"
            >
              <BaseInput
                v-model="draft.employeeCode"
                placeholder="VET-001"
                :readonly="codeReadonly"
                :disabled="codeDisabled"
                :invalid="!!err('employeeCode')"
                @blur="markTouched('employeeCode')"
              />
            </BaseField>

            <BaseField :id="fid('email')" label="Correo" required :error="err('email')">
              <BaseInput
                v-model="draft.email"
                type="email"
                placeholder="nombre@clinica.com"
                :invalid="!!err('email')"
                autocomplete="email"
                @blur="markTouched('email')"
              />
            </BaseField>
          </div>

          <BaseField
            v-if="!isEditing"
            :id="fid('password')"
            label="Contraseña inicial"
            required
            hint="Mínimo 8 caracteres."
            :error="err('password')"
          >
            <!-- Sin placeholder: ocho puntos en un `type="password"` con etiqueta,
                 candado y ojo SIMULAN un campo ya relleno, y quien lleva prisa
                 pulsa Enter creyendo que ya está. La política de contraseña va en
                 el `hint`, que es donde se lee de verdad. -->
            <BaseInput
              v-model="draft.password"
              type="password"
              :invalid="!!err('password')"
              autocomplete="new-password"
              @blur="markTouched('password')"
            />
          </BaseField>

          <BaseField
            v-if="!isEditing"
            label="Roles"
            required
            hint="Un empleado puede tener varios roles. Debe tener al menos uno."
            :error="err('roles')"
          >
            <!-- id y `tabindex` caen por fallthrough en la raíz: son el ancla del
                 enlace del resumen, que aquí apunta a la lista, no a un control. -->
            <RoleSelectorGrid
              :id="fid('roles')"
              tabindex="-1"
              :available-roles="roles"
              :selected-ids="selectedRoleIds"
              @update:selected-ids="onSelectedIdsUpdate"
            />
          </BaseField>

          <BaseField
            v-if="!isEditing"
            label="Sedes"
            required
            hint="El empleado solo podrá operar en las sedes que asignes. Debe tener al menos una."
            :error="err('branches')"
          >
            <BranchSelectorGrid
              :id="fid('branches')"
              tabindex="-1"
              :available-branches="visibleBranches"
              :selected-ids="selectedBranchIds"
              @update:selected-ids="onSelectedBranchIdsUpdate"
            />
          </BaseField>
        </div>
      </template>
    </template>

    <template #footer-actions>
      <template v-if="confirming">
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="confirming = false"
        >
          Volver
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="busy"
          @click="doSubmit"
        >
          {{ busy ? 'Guardando…' : 'Confirmar y crear' }}
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="busy"
          @click="submit"
        >
          {{ busy ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear empleado' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
/* La trampa de especificidad de AGENTS.md, en su forma más tonta: `.confirm p`
   pesa (0,2,1) con el atributo del scoped y `.confirm-note` solo (0,2,0), así
   que la nota perdía el tono y el tamaño contra la regla de arriba y alguien lo
   resolvió con tres `!important`. Se retiran excluyendo la nota de la regla
   base en vez de ganarle por fuerza bruta: la descendencia se queda con lo que
   comparten los dos párrafos y el resto viaja por clase. */
.confirm p {
  line-height: 1.55;
}

.confirm p:not(.confirm-note) {
  margin: 0;
  font-size: 13.5px;
  color: var(--warm-700);
}

.confirm-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
}

/* `.ds-grid-2` ya trae las 2 columnas y el colapso a 640px; aquí solo el gap,
   que es uniforme (14px) en vez del 14/16 de la primitiva. */
.grid-2 {
  gap: 14px;
}
</style>
