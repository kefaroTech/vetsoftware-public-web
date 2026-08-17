<!--
  Acción en texto dentro de una celda de tabla ("Ver caja", "CSV", "PDF").

  El `.link` del panel de historial y el del de cajas abiertas eran la misma
  regla byte a byte. No es un `.ds-btn--plain`: ése lleva caja, fondo al pasar
  el ratón y color apagado; éste es un enlace amatista que se subraya.

  Los atributos (`title`, `aria-label`) y el `@click` caen por herencia al
  `<button>`.
-->
<template>
  <button type="button" class="cash-link"><slot /></button>
</template>

<style scoped>
.cash-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: var(--space-2) var(--space-6);
  border: none;
  background: none;
  color: var(--amatista-700);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  cursor: pointer;
}

.cash-link:hover {
  text-decoration: underline;
}
</style>
