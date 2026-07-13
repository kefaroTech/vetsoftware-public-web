import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import { PERMISSIONS } from '@/constants/permissions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/features/landing/views/LandingView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/registro',
      name: 'signup',
      component: () => import('@/features/registration/views/SignupView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/features/registration/views/VerifyEmailView.vue'),
      meta: { guestOnly: true },
    },
    {
      // Primer login del staff invitado: contraseña temporal → obligado a crear una nueva.
      path: '/cambiar-contrasena',
      name: 'cambiar-contrasena',
      component: () => import('@/features/auth/views/CambiarContrasenaView.vue'),
      meta: { requiresAuth: true },
    },
    {
      // "Olvidé mi contraseña": solicitud del enlace por código de usuario.
      path: '/recuperar-contrasena',
      name: 'recuperar-contrasena',
      component: () => import('@/features/auth/views/RecuperarContrasenaView.vue'),
    },
    {
      // "Olvidé mi código de usuario": envío de los códigos por correo.
      path: '/recuperar-codigo',
      name: 'recuperar-codigo',
      component: () => import('@/features/auth/views/RecuperarCodigoView.vue'),
    },
    {
      // Restablecimiento con el token del correo (?token=...).
      path: '/restablecer-contrasena',
      name: 'restablecer-contrasena',
      component: () => import('@/features/auth/views/RestablecerContrasenaView.vue'),
    },
    {
      path: '/dashboard',
      component: () => import('@/features/dashboard/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/features/dashboard/views/HomeView.vue'),
        },
        {
          path: 'agenda',
          name: 'agenda',
          component: () => import('@/features/agenda/views/AgendaView.vue'),
          meta: { permission: PERMISSIONS.APPOINTMENT_READ },
        },
        {
          path: 'consulta/nueva',
          name: 'consulta-nueva',
          component: () =>
            import('@/features/dashboard/views/consulta/nueva/NuevaView.vue'),
          meta: { fullBleed: true, hideTopbar: true, permission: PERMISSIONS.CONSULTATION_CREATE },
        },
        {
          path: 'consulta/nueva/exito',
          name: 'consulta-nueva-exito',
          component: () =>
            import(
              '@/features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue'
            ),
          meta: { fullBleed: true, hideTopbar: true, permission: PERMISSIONS.CONSULTATION_CREATE },
        },
        {
          path: 'consulta/historial',
          component: () =>
            import('@/features/historia-clinica/views/HistoriaClinicaView.vue'),
          meta: { fullBleed: true, hideTopbar: true },
          children: [
            {
              path: '',
              name: 'consulta-historial',
              component: () =>
                import('@/features/historia-clinica/views/OwnerStep.vue'),
            },
            {
              path: ':ownerId/mascotas',
              name: 'consulta-historial-pet',
              component: () =>
                import('@/features/historia-clinica/views/PetStep.vue'),
              props: true,
            },
            {
              path: ':ownerId/mascotas/:petId',
              name: 'consulta-historial-detail',
              component: () =>
                import('@/features/historia-clinica/views/HistoryStep.vue'),
              props: true,
            },
          ],
        },
        {
          path: 'consulta/vacunacion',
          name: 'consulta-vacunacion',
          component: () => import('@/features/dashboard/views/consulta/VacunacionView.vue'),
          meta: { permission: PERMISSIONS.VACCINATION_CREATE },
        },
        {
          path: 'consulta/hospital',
          name: 'consulta-hospital',
          component: () => import('@/features/dashboard/views/consulta/HospitalView.vue'),
          meta: { permission: PERMISSIONS.HOSPITALIZATION_CREATE },
        },
        {
          path: 'acciones/laboratorio',
          name: 'acciones-laboratorio',
          component: () => import('@/features/acciones/views/LabListView.vue'),
          meta: { permission: PERMISSIONS.LABORATORY_TEST_CREATE },
        },
        {
          path: 'acciones/imagen',
          name: 'acciones-imagen',
          component: () => import('@/features/acciones/views/ImagingListView.vue'),
          meta: { permission: PERMISSIONS.DIAGNOSTIC_IMAGING_CREATE },
        },
        {
          path: 'acciones/vacunacion',
          name: 'acciones-vacunacion',
          component: () => import('@/features/acciones/views/VaccineListView.vue'),
          meta: { permission: PERMISSIONS.VACCINATION_CREATE },
        },
        {
          path: 'acciones/hospitalizacion',
          name: 'acciones-hospitalizacion',
          component: () => import('@/features/acciones/views/HospListView.vue'),
          meta: { permission: PERMISSIONS.HOSPITALIZATION_CREATE },
        },
        {
          path: 'acciones/desparasitacion',
          name: 'acciones-desparasitacion',
          component: () => import('@/features/acciones/views/DewormListView.vue'),
          meta: { permission: PERMISSIONS.DEWORMING_CREATE },
        },
        {
          path: 'acciones/cirugia',
          name: 'acciones-cirugia',
          component: () => import('@/features/acciones/views/SurgeryListView.vue'),
          meta: { permission: PERMISSIONS.SURGERY_CREATE },
        },
        {
          path: 'acciones/spa',
          name: 'acciones-spa',
          component: () => import('@/features/acciones/views/SpaListView.vue'),
          meta: { permission: PERMISSIONS.SPA_CREATE },
        },
        {
          path: 'laboratorio',
          name: 'laboratorio-interno',
          component: () => import('@/features/laboratorio/views/LaboratorioView.vue'),
          meta: { permission: PERMISSIONS.LABORATORY_TEST_READ },
        },
        {
          path: 'hospital',
          name: 'hospital-ward',
          component: () =>
            import('@/features/hospitalizacion/views/HospitalizacionView.vue'),
          meta: { permission: PERMISSIONS.HOSPITALIZATION_READ },
        },
        {
          path: 'tienda',
          name: 'tienda-pos',
          component: () => import('@/features/tienda/views/POSView.vue'),
          meta: { permission: PERMISSIONS.PRODUCT_READ },
        },
        {
          path: 'tienda/inventario',
          name: 'tienda-inventario',
          component: () => import('@/features/tienda/views/InventarioView.vue'),
          meta: { permission: PERMISSIONS.PRODUCT_READ },
        },
        {
          path: 'tienda/servicios',
          name: 'tienda-servicios',
          component: () => import('@/features/tienda/views/ServiciosView.vue'),
          meta: { permission: PERMISSIONS.SERVICE_READ },
        },
        {
          path: 'tienda/promociones',
          name: 'tienda-promociones',
          component: () => import('@/features/tienda/views/PromocionesView.vue'),
          meta: { permission: PERMISSIONS.PROMOTION_READ },
        },
        {
          path: 'tienda/impuestos',
          name: 'tienda-impuestos',
          component: () => import('@/features/tienda/views/ImpuestosView.vue'),
          meta: { permission: PERMISSIONS.TAX_READ },
        },
        {
          path: 'caja',
          name: 'caja',
          component: () => import('@/features/caja/views/CajaView.vue'),
          meta: { permission: PERMISSIONS.CASHREGISTER_READ },
        },
        {
          path: 'compras/proveedores',
          name: 'compras-proveedores',
          component: () => import('@/features/compras/views/ProveedoresView.vue'),
          meta: { permission: PERMISSIONS.SUPPLIER_READ },
        },
        {
          path: 'compras/ordenes',
          name: 'compras-ordenes',
          component: () => import('@/features/compras/views/OrdenesRecepcionesView.vue'),
          meta: { permissionsAny: [PERMISSIONS.PURCHASE_ORDER_READ, PERMISSIONS.GOODS_RECEIPT_READ] },
        },
        {
          path: 'compras/facturas',
          name: 'compras-facturas',
          component: () => import('@/features/compras/views/FacturasProveedorView.vue'),
          meta: { permission: PERMISSIONS.SUPPLIER_INVOICE_READ },
        },
        {
          path: 'compras/libro',
          name: 'compras-libro',
          component: () => import('@/features/compras/views/LibroComprasView.vue'),
          meta: { permission: PERMISSIONS.PURCHASE_REPORT_READ },
        },
        {
          path: 'cuentas',
          name: 'cuentas',
          component: () => import('@/features/cuentas/views/CuentasView.vue'),
          meta: { permission: PERMISSIONS.OPEN_ACCOUNT_READ },
        },
        {
          path: 'facturacion/documentos',
          name: 'facturacion-documentos',
          component: () => import('@/features/facturacion/views/DocumentosView.vue'),
          meta: { permission: PERMISSIONS.ELECTRONIC_BILLING_CREATE },
        },
        {
          path: 'facturacion/reportes',
          name: 'facturacion-reportes',
          component: () => import('@/features/facturacion/views/ReportesView.vue'),
          meta: { permission: PERMISSIONS.ELECTRONIC_BILLING_CREATE },
        },
        {
          path: 'facturacion/habilitacion',
          name: 'facturacion-habilitacion',
          component: () => import('@/features/facturacion/views/HabilitacionView.vue'),
          meta: { permission: PERMISSIONS.ELECTRONIC_BILLING_CREATE },
        },
        {
          path: 'empresa',
          name: 'empresa',
          component: () => import('@/features/empresa/views/EmpresaView.vue'),
          meta: {
            permissionsAny: [
              PERMISSIONS.COMPANY_READ,
              PERMISSIONS.BRANCH_CREATE,
              PERMISSIONS.BRANCH_UPDATE,
              PERMISSIONS.BRANCH_READ,
            ],
          },
        },
        {
          path: 'empleados',
          name: 'empleados',
          component: () => import('@/features/employees/views/EmpleadosView.vue'),
          meta: { permission: PERMISSIONS.EMPLOYEE_READ },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/features/roles/views/RolesView.vue'),
          meta: { permission: PERMISSIONS.ROLE_PERMISSIONS_READ },
        },
        {
          path: 'catalogos/medicamentos',
          name: 'medicamentos',
          component: () => import('@/features/medicamentos/views/MedicamentosView.vue'),
          meta: { permission: PERMISSIONS.PRESCRIPTION_CREATE },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'login' },
    },
  ],
})

router.beforeEach(async (to, from) => {
  const pushed = to.fullPath !== from.fullPath
  if (pushed) pushLoader()

  // Cuando el guard REDIRIGE, Vue Router aborta esta navegación y `afterEach` (que
  // hace popLoader) no dispara para ella → el push de arriba quedaría huérfano y el
  // loader global se queda pegado. Balanceamos el push de ESTA invocación antes de
  // redirigir; la navegación redirigida vuelve a pasar por beforeEach/afterEach normal.
  const redirect = (loc: { name: string }) => {
    if (pushed) popLoader()
    return loc
  }

  const { isAuthenticated, isExpired, session, clearSession, refreshMe, me } = useAuth()

  // Access token vencido y SIN refresh token → no se puede renovar: limpiamos y avisamos.
  // Si hay refresh token, dejamos pasar: el `/auth/me` de refreshMe disparará el 401 →
  // el interceptor lo refresca y reintenta de forma transparente.
  if (isAuthenticated.value && isExpired.value && !session.value?.refreshToken) {
    clearSession()
    useToast().warn('Sesión expirada', 'Por seguridad, vuelve a iniciar sesión.')
    return to.name === 'login' ? true : redirect({ name: 'login' })
  }

  if (isAuthenticated.value) {
    await refreshMe()
  }

  // Primer login del staff invitado: con contraseña temporal, no puede hacer nada salvo cambiarla (o salir).
  const mustChangePassword = isAuthenticated.value && me.value?.mustChangePassword === true
  if (mustChangePassword && to.name !== 'cambiar-contrasena') {
    return redirect({ name: 'cambiar-contrasena' })
  }
  if (!mustChangePassword && to.name === 'cambiar-contrasena') {
    return redirect({ name: isAuthenticated.value ? 'home' : 'login' })
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return redirect({ name: 'login' })
  }
  if (to.meta.guestOnly && isAuthenticated.value) {
    return redirect({ name: 'home' })
  }

  const { permissions, isAdmin } = useAuthorization()
  const required = to.meta.permission as string | undefined
  const requiredAny = to.meta.permissionsAny as string[] | undefined

  if (required && !isAdmin.value && !permissions.value.includes(required)) {
    return redirect({ name: 'home' })
  }
  if (
    requiredAny &&
    !isAdmin.value &&
    !requiredAny.some((p) => permissions.value.includes(p))
  ) {
    return redirect({ name: 'home' })
  }
  return true
})

router.afterEach(() => {
  popLoader()
})

router.onError(() => {
  popLoader()
})

export default router
