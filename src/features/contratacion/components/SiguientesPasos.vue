<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, Users, Wallet } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'

/**
 * «Tres cosas que hacer ahora» — el bloque que convierte una compra en un uso.
 *
 * Es el paso que peor se resuelve siempre: se pone un «¡Gracias por tu compra!»
 * y se deja al usuario delante de una pantalla vacía. Un tablero vacío es la
 * peor primera pantalla posible después de contratar.
 *
 * Están en el orden en que una clínica arranca de verdad, y cada tarjeta es un
 * `<article>` con `<h3>` y **un solo** enlace, cuyo texto es la acción completa
 * («Invita a tu equipo»), no «Ir». Lo que NO va aquí: confeti, un contador de
 * días de prueba, y un botón «Ir al tablero» como única acción.
 */
const { hasPermission } = useAuthorization()

const TODOS = [
  {
    icon: Users,
    titulo: 'Invita a tu equipo',
    texto: 'Para que cada persona entre con su usuario',
    ruta: 'empleados',
    permiso: PERMISSIONS.EMPLOYEE_READ,
  },
  {
    icon: CalendarDays,
    titulo: 'Crea tu primera cita',
    texto: 'La agenda del día empieza aquí',
    ruta: 'agenda',
    permiso: PERMISSIONS.APPOINTMENT_READ,
  },
  {
    icon: Wallet,
    titulo: 'Configura tu caja',
    texto: 'Antes del primer cobro del mostrador',
    ruta: 'caja',
    permiso: PERMISSIONS.CASHREGISTER_READ,
  },
] as const

/**
 * Cada tarjeta lleva SU permiso, y la que el rol no alcanza no se pinta.
 *
 * <p>Las tres rutas están protegidas por el guard: sin el permiso, pulsar devolvía al tablero en
 * silencio. Y esta pantalla es la primera que ve alguien que acaba de contratar — «tres cosas
 * que hacer ahora» que no se pueden hacer es la peor primera impresión posible. Una recepcionista
 * sin `employee.read` es el caso normal, no el borde.
 */
const pasos = computed(() => TODOS.filter((p) => hasPermission(p.permiso)))
</script>

<template>
  <!-- Sin ninguna tarjeta alcanzable no se pinta una rejilla vacía: se dice qué pasa. -->
  <p v-if="pasos.length === 0" class="ds-meta">
    Tu usuario no tiene acceso a la configuración inicial. Quien administre los permisos de tu
    clínica puede invitar al equipo, abrir la agenda y configurar la caja.
  </p>
  <div v-else class="pasos">
    <article v-for="p in pasos" :key="p.titulo" class="ds-card pasos-card">
      <component :is="p.icon" :size="20" :stroke-width="1.7" aria-hidden="true" />
      <h3 class="pasos-title">{{ p.titulo }}</h3>
      <p class="ds-meta pasos-text">{{ p.texto }}</p>
      <RouterLink :to="{ name: p.ruta }" class="ds-btn ds-btn--ghost pasos-cta">
        {{ p.titulo }}
      </RouterLink>
    </article>
  </div>
</template>

<style scoped>
.pasos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pasos-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.pasos-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.pasos-text {
  margin: 0;
}

.pasos-cta {
  margin-top: 6px;
  text-decoration: none;
}

@media (width <= 860px) {
  .pasos {
    grid-template-columns: 1fr;
  }
}
</style>
