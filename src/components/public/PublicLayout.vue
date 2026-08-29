<script setup lang="ts">
/**
 * Marco compartido de la zona pública/auth (handoff §5): fondo amatista + blobs
 * estáticos + topbar (marca → landing + link contextual) + footer + contenido centrado.
 */
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
        background: radial-gradient(circle, rgb(192 132 252 / 24%), transparent 60%);
      "
    />
    <div
      class="pub-blob"
      style="
        bottom: -160px;
        left: -140px;
        width: 460px;
        height: 460px;
        background: radial-gradient(circle, rgb(168 85 247 / 16%), transparent 62%);
      "
    />

    <header class="pub-topbar">
      <RouterLink :to="{ name: 'landing' }" class="pub-brand">
        <span class="pub-brand-mark"><v-icon size="16">mdi-paw</v-icon></span>
        <span class="pub-brand-word">VetSoftware</span>
      </RouterLink>
      <div class="pub-topbar-right">
        <slot name="topRight" />
      </div>
    </header>

    <main id="contenido" class="pub-main" tabindex="-1">
      <slot />
    </main>

    <footer class="pub-footer" :class="{ 'pub-footer-center': footerCenter }">
      <span>© 2026 VetSoftware · Colombia</span>
      <RouterLink v-if="!footerCenter" :to="{ name: 'landing' }" class="pub-footer-back">
        <v-icon size="13">mdi-arrow-left</v-icon> Volver al inicio
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

.pub-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--pub-ink-900);
}

.pub-brand-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #a855f7, #581c87);
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 2px 6px -1px rgb(126 34 206 / 40%);
}

.pub-brand-word {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
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

  /* `--pub-ink-400` mide 4,05:1 sobre blanco y 3,43:1 sobre el fondo de la
     zona pública: falla §1.4.3 AA para texto normal, y este pie es de 12 px.
     `--pub-ink-500` mide 6,12:1 y 5,18:1. */
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
