import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  BadgePercent,
  Banknote,
  BarChart3,
  BedDouble,
  Beaker,
  BookText,
  Bug,
  ClipboardList,
  History,
  Package,
  ReceiptText,
  ScanLine,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Syringe,
  Truck,
} from 'lucide-vue-next'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Menú del sidebar: qué entradas existen y cuáles puede ver el empleado.
 *
 * Vive fuera de `AppSidebar.vue` porque eran ~225 de sus líneas (los iconos, las
 * 25 comprobaciones de permiso y las cuatro listas) y no tienen nada que ver con
 * el marcado ni con el acordeón. El SFC se queda con la interacción; esto es
 * datos.
 */
export function useSidebarNav() {
  const route = useRoute()
  const { can, canAny } = useAuthorization()

  // ── Permisos ───────────────────────────────────────────────────────────────
  const canVaccination = can(PERMISSIONS.VACCINATION_CREATE)
  const canHospital = can(PERMISSIONS.HOSPITALIZATION_CREATE)
  const canLabTest = can(PERMISSIONS.LABORATORY_TEST_CREATE)
  const canImaging = can(PERMISSIONS.DIAGNOSTIC_IMAGING_CREATE)
  const canDeworming = can(PERMISSIONS.DEWORMING_CREATE)
  const canSurgery = can(PERMISSIONS.SURGERY_CREATE)
  const canSpa = can(PERMISSIONS.SPA_CREATE)
  const canEmployees = can(PERMISSIONS.EMPLOYEE_READ)
  const canRoles = can(PERMISSIONS.ROLE_PERMISSIONS_READ)
  const canEmpresa = canAny(
    PERMISSIONS.COMPANY_READ,
    PERMISSIONS.BRANCH_CREATE,
    PERMISSIONS.BRANCH_UPDATE,
    PERMISSIONS.BRANCH_READ,
  )
  /**
   * «Mi suscripción». Basta CUALQUIERA de los cinco: la 377 documenta que varios de estos
   * permisos se sembraron y nunca se asignaron a los roles existentes, así que exigir el
   * `subscription.read` escondería la entrada a empresas que sí pueden ver sus cuentas de cobro
   * o sus propuestas. Dentro, cada sub-pantalla se protege por su cuenta.
   *
   * <p><b>Y ahora la entrada cumple lo que promete.</b> Esta lista tenía cuatro permisos y el
   * enlace iba directo a `suscripcion-plan`, que exige `subscription.read`: quien tenía
   * `quote.read` y no aquél pulsaba y el guard lo devolvía al tablero en silencio. El enlace
   * apunta hoy al armazón (`suscripcion`), que redirige a la primera sub-pantalla que el rol sí
   * alcanza. Falta `entitlement.read`, que abre «Cupos y consumo» y no estaba: era el quinto
   * caso del mismo fallo. La lista canónica es `SUSCRIPCION_DESTINOS` en `router/index.ts`.
   */
  const canSuscripcion = canAny(
    PERMISSIONS.SUBSCRIPTION_READ,
    PERMISSIONS.ENTITLEMENT_READ,
    PERMISSIONS.SUBSCRIPTION_BILLING_READ,
    PERMISSIONS.SUBSCRIPTION_PAYMENT_METHOD_READ,
    PERMISSIONS.QUOTE_READ,
  )
  const canMedicaments = can(PERMISSIONS.PRESCRIPTION_CREATE)
  const canLabProcess = can(PERMISSIONS.LABORATORY_TEST_READ)
  const canHospitalWard = can(PERMISSIONS.HOSPITALIZATION_READ)
  const canInventory = can(PERMISSIONS.PRODUCT_READ)
  const canCash = can(PERMISSIONS.CASHREGISTER_READ)
  const canServices = can(PERMISSIONS.SERVICE_READ)
  const canPromotions = can(PERMISSIONS.PROMOTION_READ)
  const canTaxes = can(PERMISSIONS.TAX_READ)
  const canAccounts = can(PERMISSIONS.OPEN_ACCOUNT_READ)
  const canAgenda = can(PERMISSIONS.APPOINTMENT_READ)
  const canCreateConsultation = can(PERMISSIONS.CONSULTATION_CREATE)

  // Compras (punto 7): proveedores, órdenes/recepción, facturas/CxP, libro de compras.
  const canSuppliers = can(PERMISSIONS.SUPPLIER_READ)
  const canPurchaseOrders = canAny(PERMISSIONS.PURCHASE_ORDER_READ, PERMISSIONS.GOODS_RECEIPT_READ)
  const canSupplierInvoices = can(PERMISSIONS.SUPPLIER_INVOICE_READ)
  const canPurchaseBook = can(PERMISSIONS.PURCHASE_REPORT_READ)

  // Facturación electrónica (DIAN) — gateada por permisos FE.
  const {
    hasModule: feHasModule,
    canDocuments: feCanDocuments,
    canReports: feCanReports,
    canConfig: feCanConfig,
  } = useFacturacionAccess()
  const showFacturacionSection = computed(() => canAccounts.value || feHasModule.value)

  // ── Rutas activas por sección ──────────────────────────────────────────────
  const consultaSubRoutes = [
    'consulta-nueva',
    'consulta-historial',
    'consulta-historial-pet',
    'consulta-historial-detail',
    'consulta-vacunacion',
    'consulta-hospital',
  ] as const
  const isConsultaActive = computed(() => consultaSubRoutes.some((name) => route.name === name))

  const historialActiveRoutes = [
    'consulta-historial',
    'consulta-historial-pet',
    'consulta-historial-detail',
  ]

  const accionesSubRoutes = [
    'acciones-laboratorio',
    'acciones-imagen',
    'acciones-vacunacion',
    'acciones-hospitalizacion',
    'acciones-desparasitacion',
    'acciones-cirugia',
    'acciones-spa',
  ] as const
  const isAccionesActive = computed(() => accionesSubRoutes.some((name) => route.name === name))

  const tiendaSubRoutes = [
    'tienda-pos',
    'caja',
    'tienda-inventario',
    'tienda-servicios',
    'tienda-promociones',
    'tienda-impuestos',
  ] as const
  const isTiendaActive = computed(() => tiendaSubRoutes.some((name) => route.name === name))

  const comprasSubRoutes = [
    'compras-proveedores',
    'compras-ordenes',
    'compras-facturas',
    'compras-libro',
  ] as const
  const isComprasActive = computed(() => comprasSubRoutes.some((name) => route.name === name))

  // La entrada del menú es UNA y sus cinco sub-pantallas se navegan DENTRO de la página, así
  // que se mantiene resaltada en las siete rutas hijas.
  const isSuscripcionActive = computed(() => String(route.name ?? '').startsWith('suscripcion-'))

  // ── Listas de entradas ─────────────────────────────────────────────────────
  const subItems = computed(() =>
    [
      {
        label: 'Historial clínico',
        icon: History,
        to: { name: 'consulta-historial' as const },
        activeRoutes: historialActiveRoutes,
        show: true,
      },
    ].filter((item) => item.show),
  )

  const accionesItems = computed(() =>
    [
      {
        label: 'Laboratorio',
        icon: Beaker,
        to: { name: 'acciones-laboratorio' as const },
        show: canLabTest.value,
      },
      {
        label: 'Imagen diagnóstica',
        icon: ScanLine,
        to: { name: 'acciones-imagen' as const },
        show: canImaging.value,
      },
      {
        label: 'Vacunación',
        icon: Syringe,
        to: { name: 'acciones-vacunacion' as const },
        show: canVaccination.value,
      },
      {
        label: 'Hospitalización',
        icon: BedDouble,
        to: { name: 'acciones-hospitalizacion' as const },
        show: canHospital.value,
      },
      {
        label: 'Desparasitación',
        icon: Bug,
        to: { name: 'acciones-desparasitacion' as const },
        show: canDeworming.value,
      },
      {
        label: 'Cirugía',
        icon: Scissors,
        to: { name: 'acciones-cirugia' as const },
        show: canSurgery.value,
      },
      { label: 'Spa', icon: Sparkles, to: { name: 'acciones-spa' as const }, show: canSpa.value },
    ].filter((item) => item.show),
  )

  const tiendaItems = computed(() =>
    [
      {
        label: 'Punto de venta',
        icon: ShoppingBag,
        to: { name: 'tienda-pos' as const },
        show: canInventory.value,
      },
      { label: 'Caja', icon: Banknote, to: { name: 'caja' as const }, show: canCash.value },
      {
        label: 'Inventario',
        icon: Package,
        to: { name: 'tienda-inventario' as const },
        show: canInventory.value,
      },
      {
        label: 'Servicios',
        icon: Stethoscope,
        to: { name: 'tienda-servicios' as const },
        show: canServices.value,
      },
      {
        label: 'Promociones',
        icon: BadgePercent,
        to: { name: 'tienda-promociones' as const },
        show: canPromotions.value,
      },
      {
        label: 'Impuestos',
        icon: BarChart3,
        to: { name: 'tienda-impuestos' as const },
        show: canTaxes.value,
      },
    ].filter((item) => item.show),
  )

  const comprasItems = computed(() =>
    [
      {
        label: 'Proveedores',
        icon: Truck,
        to: { name: 'compras-proveedores' as const },
        show: canSuppliers.value,
      },
      {
        label: 'Órdenes y recepción',
        icon: ClipboardList,
        to: { name: 'compras-ordenes' as const },
        show: canPurchaseOrders.value,
      },
      {
        label: 'Facturas / CxP',
        icon: ReceiptText,
        to: { name: 'compras-facturas' as const },
        show: canSupplierInvoices.value,
      },
      {
        label: 'Libro de compras',
        icon: BookText,
        to: { name: 'compras-libro' as const },
        show: canPurchaseBook.value,
      },
    ].filter((item) => item.show),
  )

  // ── Visibilidad de secciones ───────────────────────────────────────────────
  const showAccionesSection = computed(() => accionesItems.value.length > 0)
  const showAdminSection = computed(
    () =>
      canEmpresa.value ||
      canSuscripcion.value ||
      canEmployees.value ||
      canRoles.value ||
      canMedicaments.value,
  )
  const showTiendaMenu = computed(() => tiendaItems.value.length > 0)
  const showComprasSection = computed(() => comprasItems.value.length > 0)
  const showTiendaSection = computed(() => showTiendaMenu.value || showComprasSection.value)

  return {
    canCreateConsultation,
    canEmployees,
    canRoles,
    canEmpresa,
    canSuscripcion,
    canMedicaments,
    canLabProcess,
    canHospitalWard,
    canAccounts,
    canAgenda,
    feCanDocuments,
    feCanReports,
    feCanConfig,
    showFacturacionSection,
    isConsultaActive,
    isAccionesActive,
    isTiendaActive,
    isComprasActive,
    isSuscripcionActive,
    subItems,
    accionesItems,
    tiendaItems,
    comprasItems,
    showAccionesSection,
    showAdminSection,
    showTiendaMenu,
    showComprasSection,
    showTiendaSection,
  }
}
