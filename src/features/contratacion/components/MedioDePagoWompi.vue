<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { CreditCard } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { importeEstimado } from '@/features/landing/composables/planPricing'
import { useMediosPagoStore } from '@/features/suscripcion/stores/medios-pago.store'
import FormularioTarjetaWompi from '@/features/suscripcion/components/FormularioTarjetaWompi.vue'
import {
  pareceCorreo,
  validarCorreoAceptante,
} from '@/features/suscripcion/composables/tarjetaWompi'
import type { WompiPaymentMethodResponse } from '@/features/suscripcion/types/pago.types'

/**
 * El bloque de pago del paso 6: deja a la empresa con un medio de pago WOMPI registrado, listo
 * para que `usePasoContratar` acepte la oferta.
 *
 * <p>Este componente **no acepta la oferta ni navega**: solo llega hasta tener un medio de pago
 * activo (uno nuevo, tokenizado por `FormularioTarjetaWompi`, o el que ya existiera por defecto)
 * y entonces emite `pagar`. Quien decide qué pasa después —`POST /quotes/{id}/accept`, guardar
 * el resultado, navegar— es `usePasoContratar`, porque eso es contratación y no pago.
 */
const props = defineProps<{
  total: number | null
  /** El padre está aceptando la oferta (`POST /quotes/{id}/accept`): deshabilita los botones
   * para que un segundo clic no dispare un segundo cobro mientras el primero sigue en vuelo. */
  procesando?: boolean
}>()
const emit = defineEmits<{ pagar: [payload: { acceptedByEmail: string }] }>()

const mediosStore = useMediosPagoStore()
const { methods: mediosGuardados } = storeToRefs(mediosStore)

const cargandoMedios = ref(true)
onMounted(async () => {
  await mediosStore.load(true)
  cargandoMedios.value = false
})

/** El medio con el que se puede pagar sin tokenizar nada. */
const medioPorDefecto = computed(
  () =>
    mediosGuardados.value.find(
      (m) => m.gateway === 'WOMPI' && m.mandateStatus === 'ACTIVE' && m.defaultMethod,
    ) ?? null,
)

/**
 * En el auto-registro el usuario de acceso del administrador ES su correo
 * (`RegisterUserService`), así que `employeeCode` suele valer como valor por defecto — pero
 * sigue siendo editable, y un empleado invitado después puede tener un código que no lo sea.
 */
const { me } = useAuth()
const correo = ref(
  me.value?.employeeCode && pareceCorreo(me.value.employeeCode) ? me.value.employeeCode : '',
)
const correoTocado = ref(false)
const errorCorreo = computed(() =>
  correoTocado.value ? (validarCorreoAceptante(correo.value) ?? undefined) : undefined,
)
function marcarCorreo() {
  correoTocado.value = true
}

/** El total, formateado. `null` mientras la oferta todavía no responde. */
const totalTexto = computed(() => (props.total === null ? '—' : importeEstimado(props.total)))

function pagarConMedioExistente() {
  correoTocado.value = true
  if (validarCorreoAceptante(correo.value)) return
  emit('pagar', { acceptedByEmail: correo.value.trim() })
}

function onTarjetaGuardada(_medio: WompiPaymentMethodResponse) {
  emit('pagar', { acceptedByEmail: correo.value.trim() })
}

/** Deshabilita el botón del atajo: el `accept` que corre después en el padre. El envío de la
 * tarjeta nueva lo gestiona `FormularioTarjetaWompi` con su propio estado. */
const bloqueado = computed(() => !!props.procesando)

const formularioRef = useTemplateRef<InstanceType<typeof FormularioTarjetaWompi>>('formularioRef')

/** Llamado por el padre si `POST /quotes/{id}/accept` falla: reabre el botón para reintentar. */
function restablecer() {
  formularioRef.value?.restablecer()
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

    <p v-if="cargandoMedios" class="ds-meta">Cargando el formulario de pago…</p>

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
          :error="errorCorreo"
        >
          <BaseInput
            v-model="correo"
            type="email"
            inputmode="email"
            autocomplete="email"
            :invalid="!!errorCorreo"
            @blur="marcarCorreo"
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

      <FormularioTarjetaWompi
        v-else
        ref="formularioRef"
        v-model:correo="correo"
        modo-contratacion
        :procesando="procesando"
        @guardado="onTarjetaGuardada"
      />
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
</style>
