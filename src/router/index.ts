import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('@/features/auth/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/features/registration/views/SignupView.vue'),
      meta: { guestOnly: true },
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
          path: 'cuentas',
          name: 'cuentas',
          component: () => import('@/features/cuentas/views/CuentasView.vue'),
          meta: { permission: PERMISSIONS.OPEN_ACCOUNT_READ },
        },
        {
          path: 'facturacion/documentos',
          name: 'facturacion-documentos',
          component: () => import('@/features/facturacion/views/DocumentosView.vue'),
          meta: {
            permissionsAny: [
              PERMISSIONS.ELECTRONIC_DOCUMENT_READ,
              PERMISSIONS.ELECTRONIC_DOCUMENT_EMIT,
            ],
          },
        },
        {
          path: 'facturacion/reportes',
          name: 'facturacion-reportes',
          component: () => import('@/features/facturacion/views/ReportesView.vue'),
          meta: { permission: PERMISSIONS.SALES_REPORT_READ },
        },
        {
          path: 'facturacion/configuracion',
          name: 'facturacion-configuracion',
          component: () => import('@/features/facturacion/views/ConfiguracionView.vue'),
          meta: {
            permissionsAny: [
              PERMISSIONS.DIAN_PROVIDER_CONFIG_MANAGE,
              PERMISSIONS.DIAN_PROVIDER_CONFIG_READ,
              PERMISSIONS.NUMBERING_RESOLUTION_READ,
              PERMISSIONS.WITHHOLDING_CONFIG_MANAGE,
              PERMISSIONS.WITHHOLDING_CONFIG_READ,
              PERMISSIONS.COMPANY_TAX_PROFILE_MANAGE,
              PERMISSIONS.COMPANY_TAX_PROFILE_READ,
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
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'login' },
    },
  ],
})

router.beforeEach(async (to) => {
  const { isAuthenticated, refreshMe } = useAuth()
  if (isAuthenticated.value) {
    await refreshMe()
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login' }
  }
  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'home' }
  }

  const { permissions, isAdmin } = useAuthorization()
  const required = to.meta.permission as string | undefined
  const requiredAny = to.meta.permissionsAny as string[] | undefined

  if (required && !isAdmin.value && !permissions.value.includes(required)) {
    return { name: 'home' }
  }
  if (
    requiredAny &&
    !isAdmin.value &&
    !requiredAny.some((p) => permissions.value.includes(p))
  ) {
    return { name: 'home' }
  }
  return true
})

export default router
