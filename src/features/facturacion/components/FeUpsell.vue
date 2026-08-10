<script setup lang="ts">
import { ShieldCheck, Check } from 'lucide-vue-next'

const benefits = [
  'Factura electrónica válida ante la DIAN',
  'Documento equivalente POS',
  'Notas crédito y débito',
  'Libro de ventas y conciliación',
]
</script>

<template>
  <div class="upsell">
    <div class="upsell-ic"><ShieldCheck :size="34" :stroke-width="1.6" /></div>
    <h1 class="upsell-title">La facturación electrónica está disponible en el plan Premium</h1>
    <p class="upsell-sub">
      Cumple con la DIAN y emite documentos fiscales válidos directamente desde tus ventas.
    </p>
    <div class="upsell-list">
      <div v-for="b in benefits" :key="b" class="upsell-item">
        <Check :size="15" :stroke-width="2.4" /> {{ b }}
      </div>
    </div>
    <button type="button" class="upsell-cta">Conocer Premium</button>
  </div>
</template>

<style scoped>
.upsell {
  max-width: 560px;
  margin: 40px auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upsell-ic {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.upsell-title {
  margin: 8px 0 0;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.15;
}

.upsell-sub {
  margin: 0;
  font-size: 14px;
  color: var(--warm-600);
  line-height: 1.5;
}

.upsell-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0;
  text-align: left;
}

.upsell-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--warm-800);
}

.upsell-item :deep(svg) {
  color: oklch(50% 0.13 150deg);
}

.upsell-cta {
  margin-top: 6px;
  padding: 11px 24px;
  border-radius: 10px;
  border: none;
  background: var(--gradient-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgb(50 20 80 / 8%),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 45%);
}
</style>
