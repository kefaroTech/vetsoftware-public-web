<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import AddChargeCatalogPicker from './AddChargeCatalogPicker.vue'
import type { CatalogChargeRequest } from './AddChargeCatalogPicker.vue'
import AddChargeGeneralForm from './AddChargeGeneralForm.vue'
import type { GeneralChargeDraft } from './AddChargeGeneralForm.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useCuentas } from '../composables/useCuentas'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useAttemptKeys } from '@/composables/useAttemptKeys'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  accountId: number
  /** Mascotas del propietario de la cuenta. */
  pets: { id: number; name: string }[]
}>()

const emit = defineEmits<{ close: []; added: []; refresh: [] }>()

const tienda = useTienda()
const cuentas = useCuentas()
const toast = useToast()

type PetSel = number | 'general'
const selectedPet = ref<PetSel>('general')
const busy = ref(false)

const catalogPicker = useTemplateRef<{ clearQty: (id: number) => void }>('catalogPicker')
const generalForm = useTemplateRef<{ reset: () => void }>('generalForm')

/**
 * Claves de idempotencia vivas de este modal, una por operación pendiente.
 *
 * Son del INTENTO, no del clic: volver a pulsar tras un fallo es EL MISMO cargo
 * y tiene que reenviar la misma clave, o el POST que llegó al servidor pero
 * perdió la respuesta se cobra dos veces. El porqué completo está en
 * `useAttemptKeys`; aquí lo que importa es que el `op` que identifica cada
 * operación lo arman `addCatalogItem` y `addGeneral` con todo lo que distingue
 * un cargo de otro, y que la clave se descarta al completarse para que un
 * segundo clic deliberado sí sume otra unidad.
 */
const attempts = useAttemptKeys()

watch(
  () => props.open,
  (open) => {
    if (!open) return
    tienda.ensureLoaded()
    selectedPet.value = props.pets[0]?.id ?? 'general'
    // Pestaña, búsqueda, cantidades y formulario general son estado de los dos
    // hijos, y `ModalShell` los monta de cero en cada apertura (`v-if="open"`),
    // así que aquí solo queda lo que sobrevive al cierre: las claves vivas.
    attempts.reset()
  },
)

const isGeneral = computed(() => selectedPet.value === 'general')

/**
 * `catch` único de los dos envíos. El 409 de concurrencia no es culpa de quien
 * cobra —otra persona tocó la cuenta—, así que avisa y pide recargar en vez de
 * teñirlo de rojo; el resto pasa por `errorFrom`, que conserva el mensaje del
 * `ProblemDetail` y el `X-Trace-Id`.
 */
function reportChargeError(e: unknown): void {
  if (isConcurrencyConflict(e)) {
    toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
    emit('refresh')
  } else {
    toast.errorFrom('Ocurrió un error', e, 'No se pudo agregar el cargo')
  }
}

async function addCatalogItem(charge: CatalogChargeRequest) {
  if (isGeneral.value || busy.value || charge.qty < 1) return
  busy.value = true
  try {
    const animalId = selectedPet.value as number
    // Clave de idempotencia del intento, no del clic: si el POST se reintenta tras fallar
    // (respuesta perdida a mitad), viaja la MISMA clave y el backend devuelve el cargo que
    // ya hubiera creado en vez de cobrarlo otra vez.
    const op = `${charge.kind}:${animalId}:${charge.itemId}:${charge.qty}`
    const reqId = attempts.keyFor(op)
    if (charge.kind === 'service')
      await cuentas.addServiceCharge(props.accountId, animalId, charge.itemId, reqId)
    else {
      await cuentas.addProductCharge(props.accountId, animalId, charge.itemId, charge.qty, reqId)
      catalogPicker.value?.clearQty(charge.itemId)
    }
    // Operación completada: la clave muere aquí, así el siguiente clic sobre el mismo ítem
    // es un cargo nuevo de verdad.
    attempts.settle(op)
    toast.success('Cargo agregado', 'Se añadió a la cuenta.')
    emit('added')
  } catch (e) {
    reportChargeError(e)
  } finally {
    busy.value = false
  }
}

async function addGeneral(charge: GeneralChargeDraft) {
  if (busy.value) return
  busy.value = true
  // Misma regla que en el catálogo: la clave es del intento (este concepto, este importe,
  // esta cantidad, este impuesto), no del clic, y sobrevive al reintento tras un fallo.
  const op = `general:${charge.name}:${charge.unitAmount}:${charge.quantity}:${charge.taxId ?? ''}`
  try {
    await cuentas.addGeneralCharge({
      ...charge,
      openAccountId: props.accountId,
      clientRequestId: attempts.keyFor(op),
    })
    attempts.settle(op)
    toast.success('Cargo agregado', 'Cargo general añadido a la cuenta.')
    // Se vacía SOLO con el cargo ya creado: si falla, lo escrito se queda para
    // que el reintento reconstruya el mismo `op` y reenvíe la misma clave.
    generalForm.value?.reset()
    emit('added')
  } catch (e) {
    reportChargeError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Agregar cargo"
    subtitle="Selecciona la mascota y los ítems a cobrar"
    :icon="Plus"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div class="section">
        <div class="label">¿Para cuál mascota?</div>
        <div class="ds-wrap-row">
          <button
            v-for="p in pets"
            :key="p.id"
            type="button"
            class="chip"
            :class="{ active: selectedPet === p.id }"
            @click="selectedPet = p.id"
          >
            {{ p.name }}
          </button>
          <button
            type="button"
            class="chip"
            :class="{ active: selectedPet === 'general' }"
            @click="selectedPet = 'general'"
          >
            General
          </button>
        </div>
      </div>

      <AddChargeCatalogPicker
        v-if="!isGeneral"
        ref="catalogPicker"
        :busy="busy"
        @add="addCatalogItem"
      />
      <AddChargeGeneralForm v-else ref="generalForm" :busy="busy" @add="addGeneral" />
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Listo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Layout via primitivas: .ds-wrap-row, .ds-btn(--ghost, --lg). El catálogo y el
   cargo general se llevaron sus reglas a `AddChargeCatalogPicker` y
   `AddChargeGeneralForm`; aquí solo queda el selector de mascota. */
.section {
  margin-bottom: 16px;
}
.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 500;
  margin-bottom: 8px;
}

.chip {
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: var(--warm-100);
  border: 1px solid var(--warm-450);
  color: var(--warm-700);
}
.chip.active {
  background: var(--amatista-50);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
  font-weight: 500;
}
</style>
