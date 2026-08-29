<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { Ban } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { useToast } from '@/composables/useToast'
import { confirmarRevocacion } from '../composables/cotizacionesText'
import type { SubscriptionPaymentMethodResponse } from '../types/medios-pago.types'

/**
 * Revocar un medio de pago.
 *
 * <p>Va en `ModalShell` y no en el diálogo de confirmación porque hace falta un campo: el
 * backend exige `reason` (`@NotBlank`, máximo 255).
 *
 * <p>La **consecuencia va escrita antes del botón**, y el caso de único medio activo tiene su
 * propio texto: es el que puede dejar a la clínica sin cobro y pasar su plan a pago pendiente.
 * El botón **nombra la acción** («Revocar medio de pago»), no dice «Confirmar».
 *
 * <p>Validación según la convención del repositorio: validador puro → `errors` computado →
 * `touched` que arranca en `false` → el error **solo se pinta tras `@blur`** o tras un
 * `validate()` fallido. Nunca validación prematura. El resumen usa el **mismo texto literal**
 * que el error en línea.
 */
const props = defineProps<{
  open: boolean
  medio: SubscriptionPaymentMethodResponse | null
  esUnicoActivo: boolean
  nextBillingDate: string | undefined
}>()

const emit = defineEmits<{ close: []; revocado: [reason: string] }>()

const toast = useToast()

const MAX_REASON = 255

const reason = ref('')
const touched = reactive<{ reason: boolean }>({ reason: false })
const guardando = ref(false)
const resumen = ref<InstanceType<typeof ErrorSummary> | null>(null)
const reasonId = useId()

function validateReason(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Escribe por qué revocas este medio de pago.'
  if (t.length > MAX_REASON) return `El motivo no puede pasar de ${MAX_REASON} caracteres.`
  return null
}

const errors = computed(() => ({ reason: validateReason(reason.value) }))

function err(): string | undefined {
  return touched.reason && errors.value.reason ? errors.value.reason : undefined
}

const items = computed(() => toSummaryItems({ reason: err() }, { reason: reasonId }, ['reason']))

const consecuencia = computed(() =>
  confirmarRevocacion(
    props.medio?.brand,
    props.medio?.lastFour,
    props.esUnicoActivo,
    props.nextBillingDate,
  ),
)

// Recargar al abrir: el motivo de una revocación anterior no puede quedarse ahí.
watch(
  () => props.open,
  (abierto) => {
    if (!abierto) return
    reason.value = ''
    touched.reason = false
    guardando.value = false
  },
)

async function submit() {
  touched.reason = true
  if (errors.value.reason) {
    resumen.value?.focus()
    return
  }
  guardando.value = true
  try {
    emit('revocado', reason.value.trim())
  } catch (e: unknown) {
    toast.errorFrom('No se pudo revocar el medio de pago', e)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Revocar medio de pago"
    :subtitle="medio?.brand ?? undefined"
    :icon="Ban"
    accent="danger"
    compact
    :width="460"
    role="alertdialog"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--14">
        <ErrorSummary ref="resumen" :items="items" />
        <p class="ds-dialog-body">{{ consecuencia }}</p>
        <BaseField :id="reasonId" label="Motivo" required :error="err()">
          <BaseTextarea
            v-model="reason"
            :invalid="!!err()"
            placeholder="Por ejemplo: cambiamos de tarjeta corporativa."
            @blur="touched.reason = true"
          />
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="guardando"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--danger ds-btn--snug"
        :disabled="guardando"
        @click="submit"
      >
        {{ guardando ? 'Revocando…' : 'Revocar medio de pago' }}
      </button>
    </template>
  </ModalShell>
</template>
