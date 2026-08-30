<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { AlertTriangle, Gauge } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { MAX_CANTIDAD_LINEA, MAX_CANTIDAD_LINEA_TXT } from '@/constants/cantidades'
import { avisoBajarCantidad } from '../composables/cotizacionesText'
import { sustantivo } from '../composables/cuposText'
import type { SubscriptionItemResponse } from '../types/suscripcion.types'

/**
 * Cambiar cuántas unidades de una línea tiene contratadas la clínica.
 *
 * <p>La petición **no lleva precio**: la clínica elige cuántas unidades, nunca a cuánto.
 *
 * <p>El consumo actual está a la vista, y si la cantidad nueva queda por debajo de lo ya usado
 * el aviso aparece **antes** de poder confirmar, no después de fallar.
 */
const props = defineProps<{
  open: boolean
  item: SubscriptionItemResponse | null
  /** Consumo actual de la dimensión que mide esta línea, si se conoce. */
  usado: number | null
  dimensionCode: string | undefined
}>()

const emit = defineEmits<{ close: []; guardar: [newQuantity: number] }>()

const cantidad = ref('1')
const touched = reactive<{ cantidad: boolean }>({ cantidad: false })
const guardando = ref(false)
const resumen = ref<InstanceType<typeof ErrorSummary> | null>(null)
const cantidadId = useId()

/** Se sanea en vivo: solo dígitos, para que no se pueda escribir algo que no es una cantidad. */
const cantidadModelo = computed({
  get: () => cantidad.value,
  set: (v: string) => (cantidad.value = v.replace(/\D/g, '')),
})

/**
 * El suelo y el techo, los dos aquí: es el único sitio donde esta pantalla dice
 * qué cantidad es válida, y una de las dos reglas faltaba.
 *
 * <p>El campo ya se sanea a dígitos, así que `1e10` no llega; lo que sí llega es
 * una fila de ceros. Sin techo, esa cantidad viaja como `quantity` y por encima
 * de `Integer.MAX_VALUE` el borde REST devuelve un 400 sin nombre de campo: la
 * clínica lee «no se pudo» sobre un formulario que no le señala nada.
 *
 * <p>Y se DICE, no se recorta: el mensaje nombra el límite y el número que se
 * tecleó se queda en el campo. Reescribirlo por detrás dejaría a alguien
 * convencido de haber pedido una cantidad que no pidió.
 */
function validateCantidad(v: string): string | null {
  if (!v.trim()) return 'Escribe cuántas unidades quieres.'
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return 'La cantidad tiene que ser 1 o más.'
  if (n > MAX_CANTIDAD_LINEA)
    return `Como máximo ${MAX_CANTIDAD_LINEA_TXT} unidades. Si necesitas más, escríbenos y lo ajustamos contigo.`
  return null
}

const errors = computed(() => ({ cantidad: validateCantidad(cantidad.value) }))

function err(): string | undefined {
  return touched.cantidad && errors.value.cantidad ? errors.value.cantidad : undefined
}

const items = computed(() =>
  toSummaryItems({ cantidad: err() }, { cantidad: cantidadId }, ['cantidad']),
)

/** El aviso de bajar por debajo de lo usado: se ve ANTES de confirmar. */
const avisoBaja = computed(() => {
  const n = Number(cantidad.value)
  if (props.usado == null || !Number.isFinite(n) || n < 1) return null
  if (n >= props.usado) return null
  return avisoBajarCantidad(props.usado, n, sustantivo(props.dimensionCode))
})

watch(
  () => props.open,
  (abierto) => {
    if (!abierto) return
    cantidad.value = String(props.item?.quantity ?? 1)
    touched.cantidad = false
    guardando.value = false
  },
)

function submit() {
  touched.cantidad = true
  if (errors.value.cantidad) {
    resumen.value?.focus()
    return
  }
  guardando.value = true
  emit('guardar', Number(cantidad.value))
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Cambiar cantidad"
    :subtitle="item?.itemName ?? undefined"
    :icon="Gauge"
    compact
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--14">
        <ErrorSummary ref="resumen" :items="items" />
        <p v-if="usado != null" class="ds-meta">
          Ahora usas {{ usado }} {{ sustantivo(dimensionCode) }}.
        </p>
        <BaseField :id="cantidadId" label="Unidades" required :error="err()">
          <BaseInput
            v-model="cantidadModelo"
            inputmode="numeric"
            :invalid="!!err()"
            @blur="touched.cantidad = true"
          />
        </BaseField>
        <div v-if="avisoBaja" class="ds-banner ds-banner--warning ds-banner--sm" role="status">
          <AlertTriangle :size="15" :stroke-width="2" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">{{ avisoBaja }}</span>
        </div>
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
        class="ds-btn ds-btn--primary ds-btn--snug"
        :disabled="guardando"
        @click="submit"
      >
        {{ guardando ? 'Guardando…' : 'Cambiar cantidad' }}
      </button>
    </template>
  </ModalShell>
</template>
