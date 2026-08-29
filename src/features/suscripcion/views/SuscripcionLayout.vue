<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import SuscripcionEstadoBanner from '../components/SuscripcionEstadoBanner.vue'
import { useSuscripcion } from '../composables/useSuscripcion'

/**
 * Armazón de «Mi suscripción»: la sub-navegación y el banner de estado que viven las cinco
 * sub-pantallas.
 *
 * <p><b>Rutas hijas y no pestañas, y el motivo importa:</b> una pestaña con estado local **no
 * es enlazable**. Cuando la auxiliar llama a soporte, «mándame el enlace de lo que ves» tiene
 * que funcionar.
 *
 * <p><b>Y `<nav>` con `RouterLink`, no `role="tablist"`.</b> Esto es accesibilidad, no estilo:
 * el patrón *Tabs* del APG exige que activar una pestaña muestre un panel del mismo documento,
 * con `aria-controls` apuntando a un `role="tabpanel"` presente en el DOM. Con `RouterLink` no
 * hay tal panel. Marcarlo como `tablist` es la forma más común de romper el patrón.
 * `BaseTabs.vue` se queda para lo que sí lo es (Caja, Cuentas, Reportes).
 *
 * <p>`RouterLink` ya pone `aria-current="page"` en la ruta activa por defecto y **no se
 * desactiva** (WCAG 2.2 §4.1.2). El estado activo tampoco se comunica solo por color: sube el
 * peso tipográfico y añade el raíl inferior (§1.4.1). Y no se usa `.ds-btn--sm`, que no siempre
 * llega a los 24×24 px de §2.5.8.
 */
const { estado, load } = useSuscripcion()

// Regla obligatoria del repositorio: recargar SIEMPRE al abrir la pantalla, sin caché vieja.
onMounted(() => void load(true))

/**
 * Los cinco enlaces, cada uno con SU permiso.
 *
 * <p>Enseñaban los cinco a todo el mundo, y el guard de cada destino devolvía al tablero en
 * silencio a quien no lo tenía — el mismo fallo que la entrada del menú lateral, repetido aquí
 * cinco veces. Un enlace que no lleva a ninguna parte es peor que un enlace ausente: el que
 * falta se nota una vez, el que engaña se prueba tres.
 *
 * <p>El orden es el de `SUSCRIPCION_DESTINOS` en `router/index.ts`, que es el que usa la
 * redirección del armazón.
 */
const { hasPermission } = useAuthorization()

const TODOS = [
  { name: 'suscripcion-plan', label: 'Mi plan', permiso: PERMISSIONS.SUBSCRIPTION_READ },
  { name: 'suscripcion-cupos', label: 'Cupos y consumo', permiso: PERMISSIONS.ENTITLEMENT_READ },
  {
    name: 'suscripcion-cobros',
    label: 'Mis cuentas de cobro',
    permiso: PERMISSIONS.SUBSCRIPTION_BILLING_READ,
  },
  {
    name: 'suscripcion-medios-pago',
    label: 'Medios de pago',
    permiso: PERMISSIONS.SUBSCRIPTION_PAYMENT_METHOD_READ,
  },
  { name: 'suscripcion-cotizaciones', label: 'Cotizaciones', permiso: PERMISSIONS.QUOTE_READ },
] as const

const enlaces = computed(() => TODOS.filter((e) => hasPermission(e.permiso)))
</script>

<template>
  <div class="ds-page ds-page--stack">
    <nav class="sub-nav" aria-label="Secciones de mi suscripción">
      <RouterLink
        v-for="e in enlaces"
        :key="e.name"
        :to="{ name: e.name }"
        class="ds-btn ds-btn--plain enlace"
      >
        {{ e.label }}
      </RouterLink>
    </nav>

    <!-- Montado SIEMPRE: lo que conmuta es su texto, no su existencia. Un nodo con
         `role="status"` que nace junto a su contenido no se anuncia en muchos lectores. -->
    <SuscripcionEstadoBanner :estado="estado" />

    <!-- Sin props: cada sub-vista lee del mismo store por su composable, que es la fuente
         única. Pasarlo por prop crearía una segunda. -->
    <RouterView />
  </div>
</template>

<style scoped>
.sub-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin-bottom: var(--space-18);
  border-bottom: 1px solid var(--border);
}

.enlace {
  text-decoration: none;
  border-radius: 0;
}

/* El activo NO se distingue solo por color: peso tipográfico + raíl inferior. */
.enlace.router-link-active {
  font-weight: var(--weight-semibold);
  box-shadow: inset 0 -2px 0 0 var(--amatista-700);
}
</style>
