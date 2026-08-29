<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'

const route = useRoute()
const fullBleed = computed(() => Boolean(route.meta.fullBleed))
</script>

<template>
  <div class="app-shell">
    <!-- §2.4.1 Bypass Blocks (A). Primer elemento focalizable del documento, antes del menú
         lateral: sin él, quien navega con teclado tabula las ~30 entradas del menú en CADA
         pantalla. La zona pública de este front lo tenía (`PublicLayout`, `LandingView`) y la
         app autenticada no, y son 45+ rutas — incluidas `contratar` y `contratar/exito`, que
         son justo las que §8.1 pedía cubrir.

         La clase, el id y el texto son los del armazón de la CONSOLA
         (`VetSoftwareFront/src/components/layout/AppLayout.vue:14`), que ya lo tenía: este
         fichero no es gemelo TR-02 —los dos armazones divergen desde antes— pero llamar a lo
         mismo de la misma forma es lo que evita que dentro de un año haya tres patrones de
         enlace de salto en dos repositorios. No reutiliza `.pub-skip` porque esa clase se pinta
         entera con tokens `--pub-*`, que solo existen bajo `.pub-scope`: aquí no resolverían y
         el enlace saldría transparente. -->
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <AppSidebar />
    <div class="ds-stack ds-flex-fill">
      <!-- `tabindex="-1"`: el destino del salto no es focalizable por naturaleza, y sin esto el
           hash mueve el scroll pero deja el foco en el `<body>` — la siguiente tabulación
           vuelve al menú y el bloque no se ha saltado. Mismo motivo que en `PublicLayout`. -->
      <main id="contenido" class="app-content" :class="{ fullbleed: fullBleed }" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  background: var(--warm-100);
  color: var(--warm-900);
  font-family: var(--font-sans);
  overflow: hidden;
}

/* Se mueve con `transform` y NO con `.ds-sr-only`, por el mismo motivo que en la consola: esa
   primitiva oculta con `clip-path` y no se «desoculta» limpiamente al enfocar. Nada de
   `display: none`, que lo sacaría del orden de tabulación y lo haría inalcanzable. */
.skip-link {
  position: absolute;
  inset-inline-start: var(--space-8);
  inset-block-start: var(--space-8);
  z-index: var(--z-toast);
  padding: var(--space-8) var(--space-14);
  border-radius: var(--radius-md);
  background: var(--warm-900);
  color: var(--warm-50);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus-visible {
  transform: none;
  box-shadow: var(--ring);
}

/* El destino del salto lleva `tabindex="-1"` para poder recibir el foco; el anillo se quita
   porque no es un control, solo el punto de aterrizaje. */
.app-content:focus {
  outline: none;
}

.app-content {
  flex: 1;
  padding: 24px 28px;
  overflow: auto;
}

.app-content.fullbleed {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (width <= 1024px) {
  .app-content {
    padding: 18px;
  }

  .app-content.fullbleed {
    padding: 0;
  }
}
</style>
