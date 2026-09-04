<script setup lang="ts">
/**
 * Lo que el texto del visitante propuso, y la única región viva de la tarjeta.
 *
 * <p>Vive en su propio componente porque es el sitio del `aria-live`: aislado,
 * nadie le añade una segunda región al lado sin darse cuenta, y dos locuciones
 * por un mismo gesto se pisan (§4.1.3).
 *
 * <p>La región está SIEMPRE en el documento aunque no diga nada: un `aria-live`
 * que se inserta junto con su contenido no lo anuncia en varios lectores.
 */
defineProps<{
  /** Cuántos módulos reconoció el texto ya reposado. */
  cantidad: number
  /** Sin texto no se afirma ni que hay propuesta ni que no la hay. */
  tieneTexto: boolean
}>()
</script>

<template>
  <div class="lpd" role="status" aria-live="polite" aria-atomic="true">
    <template v-if="tieneTexto">
      <p class="lpd-t">
        <template v-if="cantidad > 0">
          Con eso te proponemos <strong>{{ cantidad }}</strong>
          {{ cantidad === 1 ? 'módulo' : 'módulos' }}
        </template>
        <template v-else>No reconocimos ningún módulo en tu texto</template>
      </p>
      <p class="lpd-a">
        {{
          cantidad > 0
            ? 'Marcados abajo. Quita lo que no uses o abre otra área para añadir.'
            : 'Abre el área que te interese y marca lo que uses.'
        }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.lpd:empty {
  display: none;
}

.lpd-t {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.lpd-a {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-500);
}
</style>
