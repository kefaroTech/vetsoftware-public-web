<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AlertTriangle, Info } from 'lucide-vue-next'
import type { EstadoPlan } from '../composables/estadoSuscripcion'

/**
 * El estado del plan, presente en las cinco sub-pantallas.
 *
 * <p>Tres decisiones que no son de estilo:
 *
 * <p><b>1. `role="status"`, nunca `role="alert"`.</b> Esto es una condición permanente de la
 * cuenta, no un suceso. `alert` implica `aria-live="assertive"` y **corta la locución en
 * curso**: interrumpir a quien está leyendo la ficha de un paciente para decirle que debe
 * dinero le hace perder el punto de lectura. `assertive` es un presupuesto, no un adjetivo, y
 * esta feature no gasta ni uno.
 *
 * <p><b>2. El contenedor está SIEMPRE montado y lo que conmuta es su texto.</b> Si el nodo con
 * `role="status"` naciera a la vez que su contenido, muchos lectores no anunciarían nada.
 *
 * <p><b>3. El tono viaja como clase desde el marcado</b> (`.ds-banner--warning` /
 * `--error`), nunca desde el `<style scoped>`: una regla base scoped pesa (0,2,0) por el
 * `[data-v-…]` y le ganaría a la primitiva global, que pesa (0,1,0). En el `scoped` solo entra
 * geometría.
 *
 * <p>Y el icono es decorativo (`aria-hidden`): el significado va entero en el texto, porque un
 * fondo ámbar no se puede leer por teléfono.
 */
const props = defineProps<{ estado: EstadoPlan | null }>()

const route = useRoute()

const visible = computed(() => props.estado != null && props.estado.tono !== 'none')

const claseTono = computed(() =>
  props.estado?.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)

const icono = computed(() => (props.estado?.tono === 'error' ? AlertTriangle : Info))

/** Sin salida no hay botón: **no se pinta un control muerto**. Ni uno que lleve a esta misma pantalla. */
const accion = computed(() => {
  const a = props.estado?.accion
  if (!a || a.routeName === route.name) return null
  return a
})
</script>

<template>
  <!-- `data-testid` porque `role="status"` no identifica: la aplicación monta
       varios a la vez (la pila de avisos, la región del medio predeterminado, el
       propio `PawLoader`). El rol se afirma DESDE aquí, no se usa para localizar. -->
  <div class="zona" role="status" data-testid="suscripcion-estado">
    <div v-if="visible && estado" class="ds-banner" :class="claseTono">
      <component
        :is="icono"
        :size="16"
        :stroke-width="2"
        class="ds-banner-icon"
        aria-hidden="true"
      />
      <span class="ds-flex-fill">
        <strong>{{ estado.rotulo }}.</strong>
        {{ estado.frase }}
      </span>
      <RouterLink
        v-if="accion"
        :to="{ name: accion.routeName }"
        class="ds-btn ds-btn--neutral ds-btn--snug enlace"
      >
        {{ accion.label }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* Solo geometría: el color entero lo ponen `.ds-banner--warning` / `--error` desde el marcado.
   El hueco inferior lo trae ya `.ds-banner`, así que el contenedor vacío no deja ninguno
   cuando el plan está al día. */
.enlace {
  flex-shrink: 0;
  text-decoration: none;
}
</style>
