<script setup lang="ts">
/**
 * §A — el hero, a dos columnas: la marca a la izquierda, la promesa a la derecha.
 *
 * <p>No hay capturas de producto, así que **no se pinta un tercer hueco**: un
 * rectángulo rayado con «captura: la agenda del día» en producción es peor que
 * no tener imagen.
 *
 * <p>El orden del DOM es lockup → `h1` → bajada, y al apilar en móvil se
 * mantiene: quien lee con lector oye la marca antes que la promesa, igual que
 * quien la ve (§1.3.2).
 *
 * <p>La acción principal no vive aquí: es la tarjeta del cotizador, que es una
 * sección hermana. Un hero con el formulario dentro obliga a que el primer
 * pliegue mida lo que mide el formulario.
 */
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
        sizes="(width <= 900px) 140px, 200px"
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

    <div class="land-hero-txt">
      <h1 class="land-h1">
        Paga solo los módulos que tu negocio usa.
        <span class="land-h1-em">Ni uno más.</span>
      </h1>

      <p class="land-sub">
        Agenda, historia clínica, hospitalización, inventario y facturación DIAN son módulos
        separados, cada uno con su precio. Si dejas de usar uno, lo apagas.
      </p>
    </div>
  </section>
</template>

<style scoped>
.land-hero {
  position: relative;
  z-index: 1;
  max-width: 1240px;
  margin: 0 auto;
  padding: 56px 24px 8px;
  display: flex;
  align-items: center;
  gap: 44px;
}

/* El lockup se posa sobre `--brand-canvas` y no sobre el lienzo de la landing,
   igual que `.pub-brand-lockup`: los PNG transparentes llevan ese lienzo quemado
   en su antialiasing y sobre cualquier otro fondo el isotipo queda con un halo
   lila alrededor. */
.land-lockup {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  padding: 18px 26px;
  border-radius: 20px;
  background: var(--brand-canvas);
}

/* Los `width`/`height` del marcado siguen ahí aunque aquí se fije otro ancho:
   el navegador los usa para reservar la caja por relación de aspecto antes de
   la descarga, y sin ellos el titular salta en el primer pintado. */
.land-lockup img {
  width: clamp(140px, 16vw, 200px);
  height: auto;
  display: block;
}

.land-hero-txt {
  flex: 1 1 440px;
  min-inline-size: 0;
}

.land-h1 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(34px, 5vw, 52px);
  line-height: 1.06;
  letter-spacing: -0.02em;
  max-width: 26ch;
  margin: 0;
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
  margin: 22px 0 0;
  color: var(--pub-ink-600);
  text-wrap: pretty;
}

@media (width <= 900px) {
  .land-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
}

@media (width <= 600px) {
  .land-hero {
    padding: 36px 16px 8px;
  }
}
</style>
