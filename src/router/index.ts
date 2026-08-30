import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import { useScrollMemoryStore } from '@/stores/scrollMemory.store'
import { PERMISSIONS } from '@/constants/permissions'
import { useContratacionStore } from '@/features/contratacion/stores/contratacion.store'

/**
 * El contenedor real de scroll. **No es la ventana**: es el `<main>` de
 * `AppLayout.vue`, un div con `overflow: auto` dentro de un shell con
 * `overflow: hidden`. Por eso `scrollBehavior` no puede limitarse a devolver
 * `savedPosition`: el navegador no restaura el scroll de un div.
 */
function contentEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app-content')
}

/**
 * Intentos de restauración. La ruta destino es `lazy`: cuando `scrollBehavior`
 * corre, el componente todavía no ha pintado y `scrollHeight` es 0, así que
 * poner `scrollTop` no haría nada. Se reintenta un par de ticks, con cota: sin
 * ella, una ruta que nunca crece dejaría un bucle vivo.
 */
const RESTORE_ATTEMPTS = 3

/**
 * Las cinco sub-pantallas de «Mi suscripción», **en el orden de su sub-navegación**, con el
 * permiso que abre cada una.
 *
 * <p>Es la lista que hace que el armazón y el menú lateral prometan lo mismo que el guard
 * concede. Vive aquí, junto a las rutas, porque el orden ES el de la sub-navegación y separarlo
 * garantizaba que los dos se desincronizaran.
 */
const SUSCRIPCION_DESTINOS = [
  { name: 'suscripcion-plan', permission: PERMISSIONS.SUBSCRIPTION_READ },
  { name: 'suscripcion-cupos', permission: PERMISSIONS.ENTITLEMENT_READ },
  { name: 'suscripcion-cobros', permission: PERMISSIONS.SUBSCRIPTION_BILLING_READ },
  { name: 'suscripcion-medios-pago', permission: PERMISSIONS.SUBSCRIPTION_PAYMENT_METHOD_READ },
  { name: 'suscripcion-cotizaciones', permission: PERMISSIONS.QUOTE_READ },
] as const

/** Los cinco permisos, para el `permissionsAny` del armazón. */
const PERMISOS_SUSCRIPCION = SUSCRIPCION_DESTINOS.map((d) => d.permission)

/**
 * `/dashboard/suscripcion` sin sub-ruta: a la primera que el rol SÍ alcanza.
 *
 * <p>El destino fijo era `suscripcion-plan`, y a quien tiene `quote.read` sin `subscription.read`
 * el guard lo devolvía al tablero sin decir nada. El suelo es `suscripcion-plan`: si no alcanza
 * ninguna, el guard del armazón ya lo habrá parado antes por `permissionsAny`.
 */
function primeraSuscripcionPermitida(): { name: string } {
  const { permissions } = useAuthorization()
  const destino = SUSCRIPCION_DESTINOS.find((d) => permissions.value.includes(d.permission))
  return { name: destino?.name ?? 'suscripcion-plan' }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // El tipo de retorno va ANOTADO, y no inferido: sin anotacion, el `return
  // false` de una funcion `async` se ensancha a `Promise<boolean>` (el
  // contexto `Awaitable<false | void | ScrollPosition>` es una union con
  // `Promise<...>` dentro y no llega a fijar el literal), y `true` no es un
  // valor que `RouterScrollBehavior` acepte. Todas las salidas devuelven
  // `false`: quien mueve el scroll es `.app-content`, nunca el router.
  async scrollBehavior(to, from, savedPosition): Promise<false> {
    // Mismo camino, otra query: es un cambio de filtro (`useQuerySync`) o el
    // `popstate` de la entrada de historial de un modal (`useModalHistory`, que
    // hace `pushState` SIN cambiar la URL). Ninguno de los dos es una
    // navegación de pantalla: mover el scroll aquí arrancaría la lista de
    // debajo del dedo mientras se teclea en el buscador.
    if (to.path === from.path) return false

    if (!savedPosition) {
      // Pantalla nueva: arriba del todo, y del contenedor que de verdad rueda.
      contentEl()?.scrollTo({ top: 0, behavior: 'auto' })
      return false
    }

    const top = useScrollMemoryStore().recall(to.fullPath)
    for (let i = 0; i < RESTORE_ATTEMPTS; i++) {
      await nextTick()
      const el = contentEl()
      if (el && el.scrollHeight > el.clientHeight) {
        // Instantáneo a propósito: un desplazamiento suave de 4.000 px al pulsar
        // «atrás» desorienta más que ayudar. Como nunca anima, no depende de
        // `prefers-reduced-motion`.
        el.scrollTo({ top, behavior: 'auto' })
        break
      }
    }
    // El router no debe mover además la ventana: quien rueda es `.app-content`.
    return false
  },
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/features/landing/views/LandingView.vue'),
      meta: {
        guestOnly: true,
        title: 'VetSoftware — Software para clínicas veterinarias en Colombia',
      },
    },
    {
      // Paso 2 del embudo comercial. `guestOnly` como el resto de la zona
      // pública: un cliente con sesión que entra aquí va al tablero, porque su
      // plan se gestiona desde dentro y no desde el escaparate.
      path: '/planes',
      name: 'planes',
      component: () => import('@/features/landing/views/PlanesView.vue'),
      meta: { guestOnly: true, title: 'Planes y precios — VetSoftware' },
    },
    {
      // Los dos textos legales. **Sin `guestOnly`**, a diferencia de todo lo
      // demás que cuelga de la zona pública, y no es un olvido: quien ya
      // contrató tiene MÁS motivo que un prospecto para releer lo que aceptó, y
      // `guestOnly` lo devolvería al tablero. El derecho a conocer del artículo
      // 8 de la Ley 1581 de 2012 no se pierde al iniciar sesión.
      //
      // Tampoco llevan `requiresAuth` ni permiso: son públicas por obligación
      // legal. La casilla de consentimiento las enlaza en pestaña nueva, así
      // que un guard que redirigiera aquí rompería el consentimiento informado
      // justo en el instante en que se está recogiendo.
      path: '/legal/privacidad',
      name: 'legal-privacidad',
      component: () => import('@/features/legal/views/PoliticaPrivacidadView.vue'),
      meta: { title: 'Política de Tratamiento de Datos Personales — VetSoftware' },
    },
    {
      path: '/legal/terminos',
      name: 'legal-terminos',
      component: () => import('@/features/legal/views/TerminosView.vue'),
      meta: { title: 'Términos del Servicio — VetSoftware' },
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
      component: () => import('@/components/layout/AppLayout.vue'),
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
          component: () => import('@/features/dashboard/views/consulta/nueva/NuevaView.vue'),
          meta: { fullBleed: true, hideTopbar: true, permission: PERMISSIONS.CONSULTATION_CREATE },
        },
        {
          path: 'consulta/nueva/exito',
          name: 'consulta-nueva-exito',
          component: () =>
            import('@/features/dashboard/views/consulta/nueva/exito/ConsultaGuardada.vue'),
          meta: { fullBleed: true, hideTopbar: true, permission: PERMISSIONS.CONSULTATION_CREATE },
        },
        {
          // Pasos 6 y 7 del embudo comercial. `fullBleed` + `hideTopbar` es el
          // patrón que ya usan `consulta/nueva` y su pantalla de éxito: es un
          // embudo, y un menú de treinta entradas al lado de un embudo es una
          // invitación a abandonarlo. NO llevan `permission`: contratar el plan
          // de la propia clínica no es una acción de catálogo, y hoy la
          // confirmación no viaja al servidor, así que no hay ninguna llamada
          // que un permiso pudiera cubrir. (El comentario anterior decía que el
          // front del tenant «no declara ningún permiso `quote.*` ni
          // `subscription.*`»: declara dieciocho, en `constants/permissions.ts`,
          // y las cinco sub-pantallas de «Mi suscripción» los usan.)
          // Tampoco entran en el menú lateral: no son destinos de navegación,
          // se llega a ellos por el flujo.
          path: 'contratar',
          name: 'contratar',
          component: () => import('@/features/contratacion/views/ContratarView.vue'),
          meta: { fullBleed: true, hideTopbar: true, title: 'Confirma tu plan — VetSoftware' },
        },
        {
          path: 'contratar/exito',
          name: 'contratar-exito',
          component: () => import('@/features/contratacion/views/ContratarExitoView.vue'),
          // El título repetía la mentira del `<h1>`. Va con la misma palabra que
          // la pantalla: reservado, que es lo que de verdad ocurrió.
          meta: {
            fullBleed: true,
            hideTopbar: true,
            title: 'Tu plan está reservado — VetSoftware',
          },
        },
        {
          path: 'consulta/historial',
          component: () => import('@/features/historia-clinica/views/HistoriaClinicaView.vue'),
          meta: { fullBleed: true, hideTopbar: true },
          children: [
            {
              path: '',
              name: 'consulta-historial',
              component: () => import('@/features/historia-clinica/views/OwnerStep.vue'),
            },
            {
              path: ':ownerId/mascotas',
              name: 'consulta-historial-pet',
              component: () => import('@/features/historia-clinica/views/PetStep.vue'),
              props: true,
            },
            {
              path: ':ownerId/mascotas/:petId',
              name: 'consulta-historial-detail',
              component: () => import('@/features/historia-clinica/views/HistoryStep.vue'),
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
          component: () => import('@/features/hospitalizacion/views/HospitalizacionView.vue'),
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
          meta: {
            permissionsAny: [PERMISSIONS.PURCHASE_ORDER_READ, PERMISSIONS.GOODS_RECEIPT_READ],
          },
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
          // Maestro-detalle en la RUTA, no en un `ref` de la vista (EST-08).
          // Antes la cuenta seleccionada vivía en `selected`, así que «atrás» no
          // volvía al listado: salía de Cuentas entero, F5 en mitad de un cobro
          // devolvía al tablero y el enlace no se podía pasar a un compañero.
          // Copia del patrón de `consulta/historial` (:88-111), que ya lo hace
          // bien. `meta` se hereda: `to.meta` fusiona los registros coincidentes.
          path: 'cuentas',
          component: () => import('@/features/cuentas/views/CuentasView.vue'),
          meta: { permission: PERMISSIONS.OPEN_ACCOUNT_READ },
          children: [
            {
              path: '',
              name: 'cuentas',
              component: () => import('@/features/cuentas/views/CuentasListaView.vue'),
            },
            {
              path: ':accountId',
              name: 'cuentas-detalle',
              component: () => import('@/features/cuentas/views/CuentasDetalleView.vue'),
              props: true,
            },
          ],
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
          // «Mi suscripción»: un armazón con cinco sub-pantallas como RUTAS HIJAS, no como
          // pestañas. Una pestaña con estado local no es enlazable, y «mándame el enlace de lo
          // que ves» tiene que funcionar cuando la auxiliar llama a soporte.
          //
          // Cada hija lleva SU permiso: la 377 documenta que varios de estos se sembraron y
          // nunca se asignaron, así que hay empresas cuyo ADMIN no tiene alguno.
          //
          // El armazón NO exige `subscription.read`, y ese era el fallo: el menú enseñaba «Mi
          // suscripción» con cualquiera de cuatro permisos, apuntaba a `suscripcion-plan`, y a
          // quien tenía `quote.read` sin `subscription.read` —el escenario exacto de la 377— el
          // guard lo devolvía al tablero EN SILENCIO. Se arregla por la vía buena: el armazón
          // admite a cualquiera que pueda ver alguna de sus cinco pantallas, y la entrada sin
          // sub-ruta REDIRIGE a la primera que su rol sí alcanza. Alinear el menú con
          // `subscription.read` habría sido lo otro: correcto y peor: escondería sus cuentas de
          // cobro a quien sí puede verlas.
          //
          // `meta` se fusiona entre los registros coincidentes, así que `suscripcion-plan`
          // declara ahora su propio `subscription.read` en vez de heredarlo del padre.
          path: 'suscripcion',
          component: () => import('@/features/suscripcion/views/SuscripcionLayout.vue'),
          meta: { permissionsAny: [...PERMISOS_SUSCRIPCION] },
          children: [
            { path: '', name: 'suscripcion', redirect: primeraSuscripcionPermitida },
            {
              path: 'plan',
              name: 'suscripcion-plan',
              component: () => import('@/features/suscripcion/views/MiPlanView.vue'),
              meta: { permission: PERMISSIONS.SUBSCRIPTION_READ },
            },
            {
              path: 'cupos',
              name: 'suscripcion-cupos',
              component: () => import('@/features/suscripcion/views/CuposView.vue'),
              meta: { permission: PERMISSIONS.ENTITLEMENT_READ },
            },
            {
              path: 'cobros',
              name: 'suscripcion-cobros',
              component: () => import('@/features/suscripcion/views/CuentasCobroView.vue'),
              meta: { permission: PERMISSIONS.SUBSCRIPTION_BILLING_READ },
            },
            {
              path: 'cobros/:id',
              name: 'suscripcion-cobro',
              component: () => import('@/features/suscripcion/views/CuentaCobroDetalleView.vue'),
              props: true,
              meta: { permission: PERMISSIONS.SUBSCRIPTION_BILLING_READ },
            },
            {
              path: 'medios-pago',
              name: 'suscripcion-medios-pago',
              component: () => import('@/features/suscripcion/views/MediosPagoView.vue'),
              meta: { permission: PERMISSIONS.SUBSCRIPTION_PAYMENT_METHOD_READ },
            },
            {
              path: 'cotizaciones',
              name: 'suscripcion-cotizaciones',
              component: () => import('@/features/suscripcion/views/CotizacionesView.vue'),
              meta: { permission: PERMISSIONS.QUOTE_READ },
            },
            {
              path: 'cotizaciones/:id',
              name: 'suscripcion-cotizacion',
              component: () => import('@/features/suscripcion/views/CotizacionDetalleView.vue'),
              props: true,
              meta: { permission: PERMISSIONS.QUOTE_READ },
            },
          ],
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

  // Se anota la posición de la pantalla que se abandona, para poder devolverla
  // al pulsar «atrás». Va aquí y no en `afterEach` porque para entonces el
  // componente saliente ya se desmontó y `scrollTop` vale 0.
  if (from.name && to.path !== from.path) {
    const el = contentEl()
    if (el) useScrollMemoryStore().remember(from.fullPath, el.scrollTop)
  }

  // Cuando el guard REDIRIGE, Vue Router aborta esta navegación y `afterEach` (que
  // hace popLoader) no dispara para ella → el push de arriba quedaría huérfano y el
  // loader global se queda pegado. Balanceamos el push de ESTA invocación antes de
  // redirigir; la navegación redirigida vuelve a pasar por beforeEach/afterEach normal.
  const redirect = (loc: { name: string; query?: Record<string, string> }) => {
    if (pushed) popLoader()
    return loc
  }

  const { isAuthenticated, refreshMe, me } = useAuth()

  // Con el access vencido se deja pasar igualmente. El refresh token vive en una
  // cookie HttpOnly y este código no puede comprobar si existe: el `/auth/me` de
  // refreshMe provoca el 401, el interceptor lo refresca y reintenta de forma
  // transparente, y si no hay cookie el backend responde 401 otra vez y el
  // interceptor manda a login.
  //
  // Antes esta decisión se tomaba leyendo el refresh token de localStorage. Ese
  // era exactamente el valor que un XSS podía llevarse, y duraba 30 días.
  //
  // El `await` se queda: la línea de abajo lee `me.value?.mustChangePassword`, así que
  // sin esperar, en la primera navegación tras recargar la página `me` sería null, la
  // bandera saldría `false` y un empleado con contraseña temporal entraría al
  // dashboard. Lo que dejó de ser caro es la llamada, no la espera: `refreshMe()` tiene
  // TTL (ver `auth.store.ts`) y en la inmensa mayoría de las navegaciones no toca red.
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
    // Conserva el destino para volver ahí tras autenticar, en vez de mandar
    // siempre al home. `to` nunca es la propia ruta de login: `login` no lleva
    // `requiresAuth`, así que `fullPath` siempre es la ruta protegida a la que
    // el usuario quería llegar, nunca un `/login` anidado.
    return redirect({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guestOnly && isAuthenticated.value) {
    return redirect({ name: 'home' })
  }

  // ── Paso 5 del embudo comercial: el enganche del login ────────────────────
  //
  // Quien eligió un plan antes de registrarse pasa por un salto de verificación
  // por correo que puede durar días y cambiar de dispositivo. Cuando por fin
  // entra, mandarlo al tablero le hace buscar por su cuenta dónde estaba lo que
  // ya había elegido — y ahí es donde se pierde la conversión.
  //
  // Dos cautelas, que son las que evitan que esto se convierta en una jaula:
  //
  //  1. Solo en la PRIMERA navegación tras autenticar, nunca en cada `push`. La
  //     señal es `from.name === 'login'` y `to.name === 'home'`, así que si el
  //     usuario sale de `/dashboard/contratar` a mano no vuelve a caer ahí.
  //  2. Solo si la intención sigue VIGENTE. Pulsar «Ahora no» la marca como
  //     descartada y este redirect deja de dispararse para siempre.
  if (isAuthenticated.value && to.name === 'home' && from.name === 'login') {
    const contratacion = useContratacionStore()
    contratacion.hidratar()
    // `marcarContratada()` descarta la intención, así que una activación reciente
    // ya deja de ser vigente. La bandera `contratada` que se comprobaba aquí era
    // memoria de una sola pestaña y se ha eliminado del store: la única fuente de
    // «esta clínica ya tiene plan» es el servidor.
    if (contratacion.hayIntencionVigente) {
      return redirect({ name: 'contratar' })
    }
  }

  const { permissions } = useAuthorization()
  const required = to.meta.permission as string | undefined
  const requiredAny = to.meta.permissionsAny as string[] | undefined

  if (required && !permissions.value.includes(required)) {
    return redirect({ name: 'home' })
  }
  if (requiredAny && !requiredAny.some((p) => permissions.value.includes(p))) {
    return redirect({ name: 'home' })
  }
  return true
})

/**
 * §2.4.2 Page Titled (A). Sin esto, todas las pantallas de la SPA comparten el
 * `<title>` de `index.html`: quien tiene ocho pestañas abiertas no distingue
 * ninguna, y quien usa lector de pantalla oye el mismo nombre en cada
 * navegación. El valor por defecto vuelve a poner el título del documento
 * cuando la ruta destino no declara el suyo — si no, el título de la pantalla
 * anterior se quedaría pegado, que es el defecto clásico de este arreglo.
 */
const TITULO_POR_DEFECTO = 'VetSoftware'

router.afterEach((to) => {
  const titulo = to.meta.title
  document.title = typeof titulo === 'string' && titulo ? titulo : TITULO_POR_DEFECTO
  popLoader()
})

router.onError(() => {
  popLoader()
})

export default router
