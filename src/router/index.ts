import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'signup',
      component: () => import('@/features/registration/views/SignupView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/views/LoginView.vue'),
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
          name: 'consulta-historial',
          component: () => import('@/features/dashboard/views/consulta/HistorialView.vue'),
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
      redirect: { name: 'signup' },
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
