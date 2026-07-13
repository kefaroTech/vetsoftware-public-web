import { computed, ref } from 'vue'
import { companyApi, type CompanyResponse } from '../api/company.api'
import { companyTaxProfileApi } from '@/features/facturacion/api/companyTaxProfile.api'
import type { CompanyTaxProfileResponse } from '@/features/facturacion/types/facturacion'
import { useAuth } from '@/features/auth/composables/useAuth'

/**
 * Carga los datos de la empresa para la sección Empresa: base (nombre/identificador/dirección/ciudad)
 * vía {@link companyApi} y la identidad fiscal vía el perfil tributario. Ambas fuentes son opcionales:
 * la vista degrada con gracia si falta el perfil fiscal o si no hay permiso para leer la empresa.
 *
 * Estado view-local (no singleton module-scoped): la sección Empresa es su único consumidor.
 */
export function useEmpresa() {
  const { companyId } = useAuth()
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
      const [co, tp] = await Promise.all([
        id != null ? companyApi.findById(id) : Promise.resolve(null),
        companyTaxProfileApi.find(),
      ])
      company.value = co
      taxProfile.value = tp
    } catch {
      error.value = 'No se pudieron cargar los datos de la empresa.'
    } finally {
      loading.value = false
    }
  }

  return { company, taxProfile, hasTaxProfile, loading, error, load }
}
