<script setup lang="ts">
import LandingCotizador from './LandingCotizador.vue'
import type { useCotizador } from '../composables/useCotizador'

/**
 * §A — el hero, a una columna centrada.
 *
 * <p>No hay capturas de producto, así que **no se pinta la columna derecha**: un
 * rectángulo rayado con «captura: la agenda del día» en producción es peor que
 * no tener imagen, y un hueco vacío con su `sticky` es peor todavía.
 *
 * <p>La acción principal es la tarjeta del cotizador y no un botón hacia los
 * paquetes: mientras el CTA más prominente diga «ver los planes», cualquier caja
 * añadida arriba es decoración. El camino a las combinaciones sigue existiendo en
 * la barra superior y en la sección `#planes`.
 *
 * <p>El titular sube a 26ch y la bajada baja a 52ch porque el texto centrado
 * tolera menos medida que el alineado a la izquierda; la tarjeta, en cambio, va
 * alineada a la izquierda por dentro.
 */
defineProps<{ cotizador: ReturnType<typeof useCotizador> }>()

const CONFIANZA = [
  'Enciendes y apagas módulos cuando quieras',
  'Sin plan mínimo ni módulos atados',
  'Tus datos en Colombia, cifrados',
]
</script>

<template>
  <section class="land-hero">
    <picture class="land-lockup">
      <source
        type="image/webp"
        srcset="
          /brand/lumbre-lockup-transparent-480.webp   480w,
          /brand/lumbre-lockup-transparent-768.webp   768w,
          /brand/lumbre-lockup-transparent-1024.webp 1024w
        "
        sizes="(width <= 768px) 200px, 320px"
      />
      <img
        class="ds-brand-mark"
        src="/brand/lumbre-lockup-transparent-480.png"
        alt="Lumbre — Gestiona lo que cuidas"
        width="320"
        height="320"
        decoding="async"
        loading="eager"
        fetchpriority="high"
      />
    </picture>

    <h1 class="land-h1">
      Paga solo los módulos que tu clínica usa.
      <span class="land-h1-em">Ni uno más.</span>
    </h1>

    <p class="land-sub">
      Agenda, historia clínica, hospitalización, inventario y facturación DIAN son módulos
      separados, cada uno con su precio. Marca los que uses y verás el total ahora mismo. Si dejas
      de usar uno, lo apagas.
    </p>

    <LandingCotizador :cotizador="cotizador" />

    <ul class="land-trust">
      <li v-for="punto in CONFIANZA" :key="punto" class="land-trust-item">{{ punto }}</li>
    </ul>
  </section>
</template>

<style scoped>
.land-hero {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 24px 8px;
  text-align: center;
}

/* Los `width`/`height` del marcado siguen ahí aunque aquí se fije otro ancho:
   el navegador los usa para reservar la caja por relación de aspecto antes de
   la descarga, y sin ellos el titular salta en el primer pintado. */
.land-lockup img {
  width: clamp(200px, 26vw, 320px);
  height: auto;
  margin: 0 auto 22px;
}

.land-h1 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(34px, 5vw, 52px);
  line-height: 1.06;
  letter-spacing: -0.02em;
  max-width: 26ch;
  margin: 0 auto;
  text-wrap: balance;
  color: var(--pub-ink-900);
}

.land-h1-em {
  font-weight: 700;
  color: var(--pub-ame-700);
}

.land-sub {
  font-size: 17px;
  line-height: 1.55;
  max-width: 52ch;
  margin: 22px auto 0;
  color: var(--pub-ink-600);
  text-wrap: pretty;
}

.land-trust {
  list-style: none;
  margin: 26px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 28px;
  font-size: 13px;
  color: var(--pub-ink-600);
}

.land-trust-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.land-trust-item::before {
  content: '';
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--pub-ame-600);
}

@media (width <= 600px) {
  .land-hero {
    padding: 36px 16px 8px;
  }
}
</style>
