<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { irAAncla } from '../composables/anclaConFoco'

/**
 * Barra superior de la landing: marca + navegación.
 *
 * La marca es un enlace a `/` y **solo envuelve la marca**. Nada de tarjetas ni
 * bloques enteros dentro de un `<a>`: el nombre accesible de un enlace es la
 * concatenación de todo lo que lleva dentro, y así es como un lector de pantalla
 * acaba anunciando un párrafo completo como si fuera el rótulo del botón — que
 * es justo el defecto que traía la landing anterior.
 *
 * <p>Los dos primeros enlaces son anclas de ESTA página, no rutas: sus dos
 * destinos están debajo, y hacerlos navegar costaría una carga entera para
 * llegar a una sección que el visitante ya tiene delante.
 */
</script>

<template>
  <header class="land-topbar">
    <RouterLink :to="{ name: 'landing' }" class="land-brand" aria-label="Lumbre, inicio">
      <span class="land-brand-word">Lumbre</span>
    </RouterLink>

    <nav class="land-nav" aria-label="Principal">
      <a href="#planes" class="land-nav-link" @click="irAAncla('planes', $event)">Paquetes</a>
      <a href="#preguntas" class="land-nav-link" @click="irAAncla('preguntas', $event)">
        Preguntas
      </a>
      <RouterLink :to="{ name: 'login' }" class="land-nav-link">Iniciar sesión</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.land-topbar {
  position: relative;
  z-index: 2;
  padding: 22px clamp(20px, 5vw, 44px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* §2.5.8 Target Size (Minimum): sin el cuadro del isotipo el enlace mide lo
   que mide su línea de texto, por debajo del suelo de 24×24 px CSS. */
.land-brand {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  text-decoration: none;
  color: var(--pub-ink-900);
}

.land-brand-word {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.land-nav {
  display: flex;
  align-items: center;
  gap: clamp(10px, 2vw, 22px);
}

/* §2.5.8 Target Size (Minimum): 24×24 px CSS es el suelo de todo control. */
.land-nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
  color: var(--pub-ink-700);
}

.land-nav-link:hover {
  color: var(--pub-ame-700);
}
</style>
