<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AlertTriangle, Info } from 'lucide-vue-next'
import type { BannerModulo } from '../composables/useModuloEstado'

/**
 * Banner transversal, uno por pantalla, que no se puede cerrar: no es un aviso efímero, es una
 * condición de la cuenta (mismo criterio que `SuscripcionEstadoBanner`: `role="status"`, nunca
 * `alert`; contenedor siempre montado, solo conmuta el texto).
 */
const props = defineProps<{
  banner: BannerModulo | null
}>()

const route = useRoute()

const visible = computed(() => props.banner !== null)

const claseTono = computed(() =>
  props.banner?.tono === 'error' ? 'ds-banner--error' : 'ds-banner--warning',
)

const icono = computed(() => (props.banner?.tono === 'error' ? AlertTriangle : Info))

/** Sin salida no hay botón: en la propia pantalla de «Tus módulos» el enlace no se pinta. */
const mostrarCta = computed(() => route.name !== 'suscripcion-modulos')
</script>

<template>
  <div class="zona" role="status" data-testid="modulo-degradado">
    <div v-if="visible && banner" class="ds-banner" :class="claseTono">
      <component
        :is="icono"
        :size="16"
        :stroke-width="2"
        class="ds-banner-icon"
        aria-hidden="true"
      />
      <span class="ds-flex-fill">{{ banner.texto }}</span>
      <RouterLink
        v-if="mostrarCta"
        :to="{ name: 'suscripcion-modulos' }"
        class="ds-btn ds-btn--neutral ds-btn--snug enlace"
      >
        Ver tus módulos
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* Solo geometría: el color entero lo ponen `.ds-banner--warning` / `--error` desde el marcado. */
.enlace {
  flex-shrink: 0;
  text-decoration: none;
}
</style>
