<script setup lang="ts">
defineProps<{
  appName: string
  /**
   * Opcional: hoy no hay ninguna fuente de sesión que entregue el nombre de la
   * empresa sin gastar un permiso que la mayoría de empleados no tiene, así que
   * la línea se omite en vez de rellenarse con un dato inventado (EST-12).
   */
  clinic?: string
}>()
</script>

<template>
  <div class="brand">
    <!-- El isotipo vive solo en el raíl (≤1024px), que es donde el nombre se
         oculta: es una ilustración de cuatro niveles de detalle y por debajo de
         48px deja de leerse como figura, así que fuera del raíl la identidad la
         carga el texto. El `ds-sr-only` va dentro de este mismo contenedor para
         que se oculte con él y el nombre no se anuncie dos veces. -->
    <span class="rail-mark">
      <picture>
        <source srcset="/brand/lumbre-logo-only-transparent-128.webp" type="image/webp" />
        <img
          class="ds-brand-mark"
          src="/brand/lumbre-logo-only-transparent-64.png"
          alt=""
          width="32"
          height="32"
          decoding="async"
          loading="eager"
        />
      </picture>
      <span class="ds-sr-only">{{ appName }}</span>
    </span>

    <div class="text ds-stack">
      <div class="name">{{ appName }}</div>
      <div v-if="clinic" class="clinic">{{ clinic }}</div>
    </div>
  </div>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px 22px;
}

.rail-mark {
  display: none;
}

.text {
  line-height: 1.1;
}

.name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: oklch(96% 0.02 var(--hue));
}

.clinic {
  font-size: 11.5px;
  color: oklch(80% 0.04 var(--hue) / 70%);
  margin-top: 2px;
}

@media (width <= 1024px) {
  .brand {
    justify-content: center;
    padding: 8px 0 18px;
  }

  .rail-mark {
    display: block;
  }

  .text {
    display: none;
  }
}
</style>
