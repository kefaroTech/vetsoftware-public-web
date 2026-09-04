<script setup lang="ts">
/**
 * Marco compartido de la zona pública/auth (handoff §5): fondo amatista + blobs
 * estáticos + topbar (marca → landing + link contextual) + footer + contenido centrado.
 */
import { ArrowLeft } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    footerCenter?: boolean
  }>(),
  { footerCenter: false },
)
</script>

<template>
  <div class="pub-scope pub-shell">
    <!-- §2.4.1 Bypass Blocks (A). Primer elemento focalizable del documento:
         antes de la marca, antes del enlace contextual de la barra. Cubre las
         siete pantallas públicas de una vez, que es justo por lo que vive aquí
         y no en cada vista. -->
    <a class="pub-skip" href="#contenido">Saltar al contenido</a>
    <div
      class="pub-blob"
      style="
        top: -160px;
        right: -140px;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgb(150 152 255 / 24%), transparent 60%);
      "
    />
    <div
      class="pub-blob"
      style="
        bottom: -160px;
        left: -140px;
        width: 460px;
        height: 460px;
        background: radial-gradient(circle, rgb(119 112 255 / 16%), transparent 62%);
      "
    />

    <header class="pub-topbar">
      <RouterLink :to="{ name: 'landing' }" class="pub-brand">Lumbre</RouterLink>
      <div class="pub-topbar-right">
        <slot name="topRight" />
      </div>
    </header>

    <main id="contenido" class="pub-main" tabindex="-1">
      <slot />
    </main>

    <footer class="pub-footer" :class="{ 'pub-footer-center': footerCenter }">
      <span>© 2026 Lumbre · Colombia</span>
      <RouterLink v-if="!footerCenter" :to="{ name: 'landing' }" class="pub-footer-back">
        <ArrowLeft :size="13" aria-hidden="true" /> Volver al inicio
      </RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.pub-topbar {
  position: relative;
  padding: 22px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

/* Sin isotipo: por debajo de 48 px la ilustración de marca es una mancha sin
   figura reconocible, así que en este tramo la identidad la carga el nombre.
   Y sin el cuadro del isotipo el enlace mide lo que mide su línea de texto,
   por debajo del suelo de 24×24 px CSS de §2.5.8 Target Size (Minimum). */
.pub-brand {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: var(--pub-ink-900);
}

.pub-topbar-right {
  font-size: 13px;
  color: var(--pub-ink-500);
}

/* El destino del salto no es focalizable por naturaleza: sin `tabindex="-1"`
   el hash mueve el scroll pero deja el foco en el `<body>`, y la siguiente
   tabulación vuelve a la barra de navegación — el bloque no se ha saltado. */
.pub-main:focus {
  outline: none;
}

.pub-topbar-right :deep(a) {
  color: var(--pub-ame-700);
  font-weight: 600;
  text-decoration: none;
}

.pub-topbar-right :deep(a:hover) {
  color: var(--pub-ame-800);
}

.pub-main {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 24px 12px;
  min-height: 0;
}

.pub-footer {
  position: relative;
  padding: 16px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;

  /* `--pub-ink-400` mide 3,94:1 sobre blanco y 3,37:1 sobre el fondo de la
     zona pública: falla §1.4.3 AA para texto normal, y este pie es de 12 px.
     `--pub-ink-500` mide 5,96:1 y 5,09:1. */
  color: var(--pub-ink-500);
  flex-shrink: 0;
}

.pub-footer-center {
  justify-content: center;
}

.pub-footer-back {
  color: var(--pub-ink-500);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pub-footer-back:hover {
  color: var(--pub-ink-700);
}
</style>
