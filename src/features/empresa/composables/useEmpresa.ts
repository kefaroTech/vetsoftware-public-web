import { computed, ref } from 'vue'
import { companyApi } from '../api/company.api'
import type { CompanyResponse, UpdateCompanyRequest } from '../types/company.types'
import { companyTaxProfileApi } from '@/features/facturacion/api/companyTaxProfile.api'
import type { CompanyTaxProfileResponse } from '@/features/facturacion/types/facturacion'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Carga los datos de la empresa para la sección Empresa: base (nombre/identificador/dirección/ciudad)
 * vía {@link companyApi} y la identidad fiscal vía el perfil tributario. Ambas fuentes son opcionales:
 * la vista degrada con gracia si falta el perfil fiscal o si no hay permiso para leer la empresa.
 *
 * Estado view-local (no singleton module-scoped): la sección Empresa es su único consumidor.
 */
export function useEmpresa() {
  const { companyId } = useAuth()
  const { hasPermission } = useAuthorization()
  const company = ref<CompanyResponse | null>(null)
  const taxProfile = ref<CompanyTaxProfileResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasTaxProfile = computed(() => taxProfile.value != null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const id = companyId.value
      const canReadTaxProfile = hasPermission(PERMISSIONS.ELECTRONIC_BILLING_READ)
      const [co, tp] = await Promise.all([
        id != null ? companyApi.findById(id) : Promise.resolve(null),
        canReadTaxProfile ? companyTaxProfileApi.find() : Promise.resolve(null),
      ])
      company.value = co
      taxProfile.value = tp
    } catch {
      error.value = 'No se pudieron cargar los datos de la empresa.'
    } finally {
      loading.value = false
    }
  }

  async function update(payload: UpdateCompanyRequest): Promise<CompanyResponse> {
    const id = companyId.value
    if (id == null) throw new Error('No se pudo determinar la empresa actual.')
    const updated = await companyApi.update(id, payload)
    company.value = updated
    return updated
  }

  return { company, taxProfile, hasTaxProfile, loading, error, load, update }
}
