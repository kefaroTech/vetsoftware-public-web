<script setup lang="ts">
/**
 * El carril derecho de la tarjeta del cotizador: qué va a pasar y el botón.
 *
 * <p>No es un `<aside>`: aquí dentro está la acción principal de la portada, y
 * un botón primario dentro de un punto de referencia «complementario» se anuncia
 * como algo accesorio.
 *
 * <p>El botón es `type="submit"` del formulario que lo envuelve, no un `emit`:
 * así Enter dentro del campo también avanza, que es lo que hace un formulario.
 */
defineProps<{
  /** Módulos marcados ahora mismo. */
  nModulos: number
  /** Sin texto no hay nada que resumir todavía. */
  tieneTexto: boolean
}>()
</script>

<template>
  <div class="ds-rail lcc">
    <p class="lcc-eyebrow">Cómo funciona</p>

    <ol class="ds-steps lcc-pasos">
      <li>Nos cuentas qué hace tu negocio.</li>
      <li>Marcamos los módulos que encajan y tú los ajustas.</li>
      <li>En la pantalla siguiente ves el precio y las fechas de prueba.</li>
    </ol>

    <!-- Eco visual de la propuesta, que ya se anuncia sola: sin región viva
         propia, porque dos locuciones por un gesto se pisan (§4.1.3). -->
    <p v-if="tieneTexto" class="lcc-listo pub-tinted">
      <strong>
        Listo: {{ nModulos }} {{ nModulos === 1 ? 'módulo marcado' : 'módulos marcados' }}.
      </strong>
      Sigue y te mostramos qué cuesta.
    </p>

    <button type="submit" class="ds-btn ds-btn--primary lcc-cta">Ver propuesta</button>

    <p class="lcc-pie">Prueba gratis y sin tarjeta. No te compromete a nada.</p>
  </div>
</template>

<style scoped>
.lcc-eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pub-ink-500);
}

.lcc-pasos {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.lcc-listo {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.lcc-listo strong {
  color: var(--pub-ink-900);
}

.lcc-cta {
  inline-size: 100%;
  margin-block-start: 18px;
  min-block-size: 52px;
  font-size: 15.5px;
}

.lcc-pie {
  margin: 11px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-500);
  text-align: center;
}
</style>
