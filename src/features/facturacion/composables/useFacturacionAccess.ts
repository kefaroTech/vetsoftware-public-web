import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Gating del módulo Facturación electrónica.
 *
 * El módulo se muestra y se usa SOLO si el usuario tiene el permiso
 * `electronicbilling.create` (que el backend otorga únicamente a las empresas cuyos
 * entitlements de suscripción incluyen el submódulo BILLING). Si no lo tiene, el módulo
 * se oculta por completo.
 *
 * Todas las capacidades del módulo (documentos, emisión, reportes, configuración)
 * cuelgan del mismo permiso: quien puede facturar electrónicamente puede usar todo
 * el módulo mediante permisos empresariales explícitos.
 */
export function useFacturacionAccess() {
  const { can, hasPermission } = useAuthorization()

  const hasModule = can(PERMISSIONS.ELECTRONIC_BILLING_CREATE)

  return {
    hasModule,
    canDocuments: hasModule,
    canEmit: hasModule,
    canTransmit: hasModule,
    canReports: hasModule,
    canConfig: hasModule,
    // Helper imperativo para checks puntuales por permiso.
    can: (perm: string): boolean => hasPermission(perm),
  }
}
