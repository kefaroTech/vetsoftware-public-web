import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import type { Ciclo } from '@/features/landing/types/plans.types'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'
import { useMediosPagoStore } from '../stores/medios-pago.store'
import { useSuscripcion } from './useSuscripcion'
import { compraModulosApi } from '../api/modulos.api'
import { textoConfirmacion } from './modulosText'
import type { PurchasedModuleLineResponse } from '../types/compraModulos.types'
import type { WompiPaymentMethodResponse } from '../types/pago.types'

function nuevoClientRequestId(): string {
  return crypto.randomUUID()
}

function cicloDeContrato(ciclo: Ciclo): 'MONTHLY' | 'ANNUAL' {
  return ciclo === 'ANUAL' ? 'ANNUAL' : 'MONTHLY'
}

function cicloDePantalla(ciclo: 'MONTHLY' | 'ANNUAL'): Ciclo {
  return ciclo === 'ANNUAL' ? 'ANUAL' : 'MENSUAL'
}

/**
 * El flujo de compra de «Tus módulos»: selección, ciclo, medio de pago y confirmación.
 *
 * <p>Es estado de ESTA pantalla —una instancia por invocación, nunca un singleton de módulo—, así
 * que vive en `ref()`s locales del composable y no en Pinia: `TusModulosView.vue` lo invoca una
 * sola vez y reparte lo que necesita a `ModuloCard.vue` por props/emits, igual que `useCotizador`
 * en el cotizador de la portada.
 */
export function useModulosCompra() {
  const toast = useToast()
  const mediosPagoStore = useMediosPagoStore()
  const { methods: mediosGuardados, loading: cargandoMedios } = storeToRefs(mediosPagoStore)
  const { subscription } = useSuscripcion()

  const seleccion = ref<Set<string>>(new Set())

  function alternar(code: string, marcado: boolean): void {
    const siguiente = new Set(seleccion.value)
    if (marcado) siguiente.add(code)
    else siguiente.delete(code)
    seleccion.value = siguiente
  }

  const seleccionados = computed(() => Array.from(seleccion.value))
  const haySeleccion = computed(() => seleccion.value.size > 0)

  function limpiarSeleccion(): void {
    seleccion.value = new Set()
  }

  /**
   * Si la empresa ya tiene un ciclo contratado, la compra se fija a ese valor y no se ofrece
   * elegir otro: el modelo de datos no contempla dos ciclos convivientes en la misma suscripción.
   */
  const cicloBloqueado = computed(() => subscription.value != null)
  const ciclo = ref<Ciclo>(
    subscription.value ? cicloDePantalla(subscription.value.billingCycle) : 'MENSUAL',
  )

  const medioPorDefecto = computed(
    () =>
      mediosGuardados.value.find((m) => m.mandateStatus === 'ACTIVE' && m.defaultMethod) ?? null,
  )

  /** El medio recién tokenizado en esta misma sesión de compra, cuando no había uno por defecto. */
  const medioNuevo = ref<WompiPaymentMethodResponse | null>(null)

  function registrarMedioNuevo(medio: WompiPaymentMethodResponse): void {
    medioNuevo.value = medio
  }

  const paymentSourceId = computed<number | null>(
    () => medioPorDefecto.value?.id ?? medioNuevo.value?.paymentMethodId ?? null,
  )

  const comprando = ref(false)
  const confirmacion = ref<{ nombre: string; linea: PurchasedModuleLineResponse }[] | null>(null)

  /**
   * `catalogo` viene del escaparate ya cargado: el nombre de cada módulo comprado sale de ahí,
   * nunca del código crudo que el usuario no reconoce.
   */
  async function confirmarCompra(catalogo: ModuleShowcaseResponse[]): Promise<boolean> {
    const idMedio = paymentSourceId.value
    if (idMedio == null || seleccion.value.size === 0) return false
    comprando.value = true
    try {
      const respuesta = await compraModulosApi.purchase({
        catalogItemCodes: seleccionados.value,
        billingCycle: cicloDeContrato(ciclo.value),
        paymentSourceId: idMedio,
        clientRequestId: nuevoClientRequestId(),
      })
      const lineas = respuesta.lines ?? []
      confirmacion.value = lineas.map((linea) => ({
        nombre:
          catalogo.find((m) => m.code === linea.catalogItemCode)?.name ??
          linea.catalogItemCode ??
          '',
        linea,
      }))
      const nombres = confirmacion.value.map((c) => c.nombre).join(', ') || 'Tu módulo'
      toast.success('Módulo comprado', `${nombres} ya está activo.`)
      limpiarSeleccion()
      medioNuevo.value = null
      return true
    } catch (e: unknown) {
      toast.errorFrom('No se pudo completar la compra', e)
      return false
    } finally {
      comprando.value = false
    }
  }

  function textoLinea(item: { nombre: string; linea: PurchasedModuleLineResponse }): string {
    return textoConfirmacion(item.linea, item.nombre)
  }

  return {
    seleccion,
    seleccionados,
    haySeleccion,
    alternar,
    limpiarSeleccion,
    ciclo,
    cicloBloqueado,
    cargandoMedios,
    cargarMedios: mediosPagoStore.load,
    medioPorDefecto,
    medioNuevo,
    registrarMedioNuevo,
    paymentSourceId,
    comprando,
    confirmacion,
    confirmarCompra,
    textoLinea,
  }
}
