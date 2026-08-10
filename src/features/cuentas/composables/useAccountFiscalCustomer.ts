import { ref, type Ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import {
  ownerApi,
  type OwnerResponse,
  type UpdateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type { FiscalCustomer } from '@/features/facturacion/composables/feFiscalChecklist'
import type { OwnerSummary } from '../types/cuentas'

/**
 * Datos fiscales del titular de una cuenta, para poder emitir su documento DIAN.
 *
 * Sale de `CloseAccountModal` porque eran ~110 líneas dedicadas a un solo tema:
 * traer el propietario completo, mapearlo a `FiscalCustomer` y persistir lo que
 * el usuario complete en el modal fiscal.
 *
 * Dos detalles que conviene no perder al tocarlo:
 * - Se precarga desde el resumen del titular para que la tarjeta fiscal nunca
 *   aparezca vacía pidiendo "Seleccionar cliente"; `load()` la enriquece luego.
 * - Si ese `load()` falla, `loadError` queda en true. Importa distinguirlo de
 *   "faltan datos": lo que falta es la carga, no el dato, y el usuario debe
 *   poder reintentar en vez de rellenar a mano lo que ya existe.
 */
export function useAccountFiscalCustomer(ownerId: Ref<number | null | undefined>) {
  const toast = useToast()

  const ownerFull = ref<OwnerResponse | null>(null)
  const customer = ref<FiscalCustomer | null>(null)
  const modalOpen = ref(false)
  const loading = ref(false)
  const loadError = ref(false)

  /** Precarga inmediata desde el resumen del titular, sin esperar al fetch. */
  function fromOwnerSummary(o: OwnerSummary): FiscalCustomer {
    return {
      name: o.name,
      documentType: null,
      documentId: o.document ?? '',
      verificationDigit: null,
      personType: null,
      legalName: null,
      email: null,
      cityId: null,
      cityName: null,
      taxRegime: null,
      withholdingAgent: false,
    }
  }

  function toFiscalCustomer(o: OwnerResponse): FiscalCustomer {
    return {
      name: o.name,
      documentType: o.documentType ?? null,
      documentId: o.document,
      verificationDigit: o.verificationDigit ?? null,
      personType: o.personType ?? null,
      legalName: o.legalName ?? null,
      email: o.email ?? null,
      cityId: o.city?.id ?? null,
      cityName: o.city?.name ?? null,
      taxRegime: o.taxRegime ?? null,
      withholdingAgent: o.withholdingAgent ?? false,
    }
  }

  /** Rellena la precarga sin pisar lo que ya se hubiera cargado del backend. */
  function preload(o: OwnerSummary) {
    customer.value = fromOwnerSummary(o)
  }

  async function load() {
    const id = ownerId.value
    if (!id) return
    loading.value = true
    loadError.value = false
    try {
      const o = await ownerApi.findById(id)
      ownerFull.value = o
      customer.value = toFiscalCustomer(o)
    } catch {
      // Se conserva la precarga, pero sin los datos fiscales completos (tipo de
      // documento, ciudad, régimen…): el checklist quedaría incompleto. Se marca
      // el error para que el usuario reintente en vez de creer que faltan datos.
      loadError.value = true
    } finally {
      loading.value = false
    }
  }

  async function save(data: Partial<FiscalCustomer>) {
    const id = ownerId.value
    if (!id) return
    // Si el fetch inicial falló, `ownerFull` quedó null. Antes eso hacía que el
    // guardado retornara en silencio: se recarga aquí para poder construir el PUT.
    let o = ownerFull.value
    if (!o) {
      try {
        o = await ownerApi.findById(id)
        ownerFull.value = o
      } catch (e) {
        toast.error(
          'No se pudo guardar',
          getProblemDetailMessage(e, 'No se pudo cargar el cliente.'),
        )
        return
      }
    }
    const payload: UpdateOwnerRequest = {
      name: o.name,
      email: data.email ?? o.email,
      document: data.documentId ?? o.document,
      address: o.address,
      phone: o.phone,
      cityId: o.city.id,
      documentType: data.documentType ?? o.documentType ?? undefined,
      personType: data.personType ?? o.personType ?? undefined,
      verificationDigit: data.verificationDigit ?? null,
      legalName: data.legalName ?? null,
      withholdingAgent: data.withholdingAgent ?? false,
      taxRegime: data.taxRegime ?? null,
    }
    try {
      const updated = await ownerApi.update(o.id, payload)
      ownerFull.value = updated
      customer.value = toFiscalCustomer(updated)
      modalOpen.value = false
      toast.success('Datos fiscales guardados', 'El cliente quedó listo para facturar.')
    } catch (e) {
      toast.error('No se pudieron guardar', getProblemDetailMessage(e))
    }
  }

  function reset() {
    ownerFull.value = null
    customer.value = null
    modalOpen.value = false
    loadError.value = false
  }

  return { ownerFull, customer, modalOpen, loading, loadError, preload, load, save, reset }
}
