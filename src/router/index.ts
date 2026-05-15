import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'

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
          meta: { fullBleed: true, hideTopbar: true },
        },
        {
          path: 'consulta/nueva/exito',
          name: 'consulta-nueva-exito',
          component: () =>
            import(
              '@/features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue'
            ),
          meta: { fullBleed: true, hideTopbar: true },
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
        },
        {
          path: 'consulta/hospital',
          name: 'consulta-hospital',
          component: () => import('@/features/dashboard/views/consulta/HospitalView.vue'),
        },
        {
          path: 'empleados',
          name: 'empleados',
          component: () => import('@/features/employees/views/EmpleadosView.vue'),
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/features/roles/views/RolesView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'signup' },
    },
  ],
})

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login' }
  }
  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'home' }
  }
  return true
})

export default router
