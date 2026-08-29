<script setup lang="ts">
import { PawPrint } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

/**
 * Barra superior de la landing: marca + navegación.
 *
 * La marca es un enlace a `/` y **solo envuelve la marca**. Nada de tarjetas ni
 * bloques enteros dentro de un `<a>`: el nombre accesible de un enlace es la
 * concatenación de todo lo que lleva dentro, y así es como un lector de pantalla
 * acaba anunciando un párrafo completo como si fuera el rótulo del botón — que
 * es justo el defecto que traía la landing anterior.
 */
</script>

<template>
  <header class="land-topbar">
    <RouterLink :to="{ name: 'landing' }" class="land-brand" aria-label="VetSoftware, inicio">
      <span class="land-brand-mark">
        <PawPrint :size="17" :stroke-width="1.8" aria-hidden="true" />
      </span>
      <span class="land-brand-word">VetSoftware</span>
    </RouterLink>

    <nav class="land-nav" aria-label="Principal">
      <RouterLink :to="{ name: 'planes' }" class="land-nav-link">Planes</RouterLink>
      <RouterLink :to="{ name: 'login' }" class="land-nav-link">Iniciar sesión</RouterLink>
      <RouterLink :to="{ name: 'signup' }" class="land-nav-cta">Crear cuenta</RouterLink>
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

.land-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  color: var(--pub-ink-900);
}

.land-brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--pub-ame-500), var(--pub-ame-900));
  display: grid;
  place-items: center;
  color: var(--pub-surface);
  box-shadow: 0 4px 10px -2px rgb(126 34 206 / 45%);
}

.land-brand-word {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.land-nav {
  display: flex;
  align-items: center;
  gap: clamp(10px, 2vw, 22px);
}

/* §2.5.8 Target Size (Minimum): 24×24 px CSS es el suelo de todo control. */
.land-nav-link,
.land-nav-cta {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
}

.land-nav-link {
  color: var(--pub-ink-700);
}

.land-nav-link:hover {
  color: var(--pub-ame-700);
}

.land-nav-cta {
  color: var(--pub-surface);
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  box-shadow: var(--pub-btn-shadow);
}
</style>
