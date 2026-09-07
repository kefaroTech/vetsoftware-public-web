<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AlertTriangle, Info } from 'lucide-vue-next'
import { useSuscripcion } from '../composables/useSuscripcion'
import { VER_PLAN } from '../composables/estadoSuscripcion'

/**
 * `load()` sin `force`: el componente vive montado en `AppLayout` y no se remonta al
 * navegar, así que forzar repetiría la misma petición sin ganar nada.
 *
 * <p>El nodo con `role="status"` está SIEMPRE montado y solo conmuta su contenido — mismo
 * motivo que `SuscripcionEstadoBanner.vue`: si naciera a la vez que el aviso, muchos
 * lectores de pantalla no lo anunciarían.
 */
const { estado, load } = useSuscripcion()
const route = useRoute()

onMounted(() => void load())

const visible = computed(() => estado.value != null && estado.value.tono !== 'none')
const claseTono = computed(() =>
  estado.value?.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)
const icono = computed(() => (estado.value?.tono === 'error' ? AlertTriangle : Info))
const mostrarEnlace = computed(() => route.name !== VER_PLAN.routeName)
</script>

<template>
  <div role="status">
    <div v-if="visible && estado" class="ds-banner ds-banner--sm aviso" :class="claseTono">
      <component
        :is="icono"
        :size="15"
        :stroke-width="2"
        class="ds-banner-icon"
        aria-hidden="true"
      />
      <span class="ds-flex-fill">
        <strong>{{ estado.fuerte }}</strong>
      </span>
      <RouterLink
        v-if="mostrarEnlace"
        :to="{ name: VER_PLAN.routeName }"
        class="ds-btn ds-btn--neutral ds-btn--snug enlace"
      >
        {{ VER_PLAN.label }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.aviso {
  margin: var(--space-16) var(--space-28) 0;
}

.enlace {
  flex-shrink: 0;
  text-decoration: none;
}

@media (width <= 1024px) {
  .aviso {
    margin: var(--space-12) var(--space-18) 0;
  }
}
</style>
