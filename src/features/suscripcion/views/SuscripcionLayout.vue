<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
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
</script>

<template>
  <div class="ds-page ds-page--stack">
    <nav class="sub-nav" aria-label="Secciones de mi suscripción">
      <RouterLink :to="{ name: 'suscripcion-plan' }" class="ds-btn ds-btn--plain enlace">
        Mi plan
      </RouterLink>
      <RouterLink :to="{ name: 'suscripcion-cupos' }" class="ds-btn ds-btn--plain enlace">
        Cupos y consumo
      </RouterLink>
      <RouterLink :to="{ name: 'suscripcion-cobros' }" class="ds-btn ds-btn--plain enlace">
        Mis cuentas de cobro
      </RouterLink>
      <RouterLink :to="{ name: 'suscripcion-medios-pago' }" class="ds-btn ds-btn--plain enlace">
        Medios de pago
      </RouterLink>
      <RouterLink :to="{ name: 'suscripcion-cotizaciones' }" class="ds-btn ds-btn--plain enlace">
        Cotizaciones
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
