import { computed } from 'vue'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Gating del módulo Facturación electrónica: 100% por permisos (no hay bandera de
 * capacidad en /auth/me). El módulo es visible si el usuario tiene AL MENOS uno de
 * los permisos FE; cada acción/pantalla se gatea por su permiso puntual.
 */
const FE_PERMISSIONS = [
  PERMISSIONS.ELECTRONIC_DOCUMENT_READ,
  PERMISSIONS.ELECTRONIC_DOCUMENT_EMIT,
  PERMISSIONS.ELECTRONIC_DOCUMENT_TRANSMIT,
  PERMISSIONS.ELECTRONIC_DOCUMENT_CREATE,
  PERMISSIONS.SALES_REPORT_READ,
  PERMISSIONS.DIAN_PROVIDER_CONFIG_MANAGE,
  PERMISSIONS.DIAN_PROVIDER_CONFIG_READ,
  PERMISSIONS.NUMBERING_RESOLUTION_CREATE,
  PERMISSIONS.NUMBERING_RESOLUTION_UPDATE,
  PERMISSIONS.NUMBERING_RESOLUTION_READ,
  PERMISSIONS.NUMBERING_RESOLUTION_DELETE,
  PERMISSIONS.WITHHOLDING_CONFIG_MANAGE,
  PERMISSIONS.WITHHOLDING_CONFIG_READ,
  PERMISSIONS.COMPANY_TAX_PROFILE_MANAGE,
  PERMISSIONS.COMPANY_TAX_PROFILE_READ,
] as const

const CONFIG_PERMISSIONS = [
  PERMISSIONS.DIAN_PROVIDER_CONFIG_MANAGE,
  PERMISSIONS.DIAN_PROVIDER_CONFIG_READ,
  PERMISSIONS.NUMBERING_RESOLUTION_READ,
  PERMISSIONS.WITHHOLDING_CONFIG_MANAGE,
  PERMISSIONS.WITHHOLDING_CONFIG_READ,
  PERMISSIONS.COMPANY_TAX_PROFILE_MANAGE,
  PERMISSIONS.COMPANY_TAX_PROFILE_READ,
] as const

export function useFacturacionAccess() {
  const { canAny, hasPermission } = useAuthorization()

  const hasModule = canAny(...FE_PERMISSIONS)
  const canDocuments = canAny(
    PERMISSIONS.ELECTRONIC_DOCUMENT_READ,
    PERMISSIONS.ELECTRONIC_DOCUMENT_EMIT,
  )
  const canEmit = canAny(PERMISSIONS.ELECTRONIC_DOCUMENT_EMIT)
  const canTransmit = canAny(PERMISSIONS.ELECTRONIC_DOCUMENT_TRANSMIT)
  const canReports = canAny(PERMISSIONS.SALES_REPORT_READ)
  const canConfig = canAny(...CONFIG_PERMISSIONS)

  // Helper imperativo (no reactivo) para checks puntuales.
  function can(perm: string): boolean {
    return hasPermission(perm)
  }

  return {
    feModulePermissions: computed(() => [...FE_PERMISSIONS]),
    feConfigPermissions: computed(() => [...CONFIG_PERMISSIONS]),
    hasModule,
    canDocuments,
    canEmit,
    canTransmit,
    canReports,
    canConfig,
    can,
  }
}
