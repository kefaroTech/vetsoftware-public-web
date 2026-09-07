<script setup lang="ts">
import { onMounted } from 'vue'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import { useRecuperarPropuesta } from '@/features/asistente/composables/useRecuperarPropuesta'
import LandingDayFlow from '../components/LandingDayFlow.vue'
import LandingFaq from '../components/LandingFaq.vue'
import LandingFinalCta from '../components/LandingFinalCta.vue'
import LandingFooter from '../components/LandingFooter.vue'
import LandingCotizador from '../components/LandingCotizador.vue'
import LandingHero from '../components/LandingHero.vue'
import LandingPlans from '../components/LandingPlans.vue'
import LandingTopbar from '../components/LandingTopbar.vue'
import LandingValueGrid from '../components/LandingValueGrid.vue'
import { irAAncla } from '../composables/anclaConFoco'
import { useCotizador } from '../composables/useCotizador'
import { usePlanes } from '../composables/usePlanes'
import type { Ciclo, PublicPlan } from '../types/plans.types'

/**
 * La landing comercial.
 *
 * ── Por qué esta vista es tan corta ────────────────────────────────────────
 * La versión anterior eran 468 líneas con 317 de CSS contra 28 de script, y ese
 * es exactamente el perfil que revienta `maxStyleMinusScript: 0` del presupuesto
 * de CSS — un techo de trinquete que se pone rojo **para todo el repo**. Una
 * landing es tentación pura de CSS nuevo, así que se parte en componentes desde
 * el primer commit, no «cuando crezca». Aquí solo queda composición y estados.
 *
 * ── Lo que se eliminó y por qué ────────────────────────────────────────────
 * El `@mousemove` que recomputaba un `radial-gradient` en cada píxel. Era el
 * mayor coste de INP de la página —y la landing es donde el INP se mide— y la
 * guarda global de `prefers-reduced-motion` **no lo apagaba**: esa guarda actúa
 * sobre `animation`/`transition`, y aquello era un `:style` reactivo que la
 * regla no ve.
 *
 * Y las dos tarjetas-enlace de la página de decisión. Un `RouterLink` que
 * envuelve icono, kicker, título, descripción y CTA tiene como nombre accesible
 * la concatenación de los cinco textos: el lector anunciaba un párrafo entero
 * como si fuera el rótulo del botón. Sus dos acciones viven ahora en el CTA del
 * hero y en la barra superior, que es donde las busca quien llega de una
 * búsqueda.
 */
const { plans, loading, error, loaded, refresh } = usePlanes()
const { vigente, elegir } = useContratacion()
const { recuperarDeEnlace } = useRecuperarPropuesta()

/**
 * El cotizador es de la VISTA, y por eso vive aquí y no en Pinia: nace con la
 * portada y muere con ella. Vive aquí y no dentro de su tarjeta porque las
 * tarjetas de combinación —que están en otra sección— siembran su selección, y
 * el estado tiene que ser el mismo para las dos.
 *
 * <p>`conPrecio: false` **no significa sin precio**: significa sin red. La
 * portada sí enseña su total, sumado en el navegador con el catálogo ya
 * descargado; lo que no hace es pedirlo. `POST /quotes/preview` tiene cupo por
 * IP y gastarlo casilla a casilla aquí dejaría al prospecto limitado al llegar a
 * `/planes`, que es donde el importe se decide y sí lo calcula el servidor.
 */
const cotizador = useCotizador({ conPrecio: false })

/**
 * Aquí aterriza el enlace del correo de la propuesta.
 *
 * <p>El backend arma `<link-base-url>/?token=<43 caracteres>`, o sea la raíz, o
 * sea esta vista — y hasta ahora nadie leía ese parámetro: el prospecto pulsaba,
 * llegaba a la landing y la landing no sabía que traía una propuesta encima. El
 * composable hidrata la propuesta, se lleva al prospecto a `/planes` y **quita
 * el token de la barra sustituyendo la entrada del historial**.
 *
 * <p>Sin token no hace nada, que es el caso de prácticamente todas las visitas.
 */
onMounted(() => {
  void recuperarDeEnlace()
})

/**
 * Elegir desde una tarjeta guarda la intención con las cantidades que ya
 * hubiera (o los mínimos), y el propio enlace de la tarjeta lleva a `/planes`,
 * donde se ajustan. Guardar aquí y no allí es lo que hace que la elección
 * sobreviva a cerrar el navegador antes de llegar al configurador.
 */
function onElegir(plan: PublicPlan, ciclo: Ciclo) {
  const previa = vigente.value
  // Sin `modulos`: la tarjeta ofrece el paquete cerrado, no casillas. Quien dice
  // qué lleva dentro es el propio paquete. Ver `IntencionPlan.modulos`.
  elegir({ plan, ciclo, sedes: previa?.sedes ?? 1, usuarios: previa?.usuarios ?? 1 })
}

/**
 * Una combinación marca sus módulos en el cotizador del hero **y se lleva el
 * foco hasta allí**. Sin el salto, el atajo cambia unas casillas que están fuera
 * de la pantalla y desde donde se pulsó no ocurre nada visible.
 *
 * <p>El evento es sintético porque quien dispara esto es el botón de una
 * tarjeta, no un ancla: `irAAncla` solo lo usa para cancelar la navegación por
 * `href`, y aquí no hay ninguna que cancelar.
 */
function onSembrar(modulos: string[], ciclo: Ciclo) {
  cotizador.sembrarModulos(modulos)
  cotizador.ciclo.value = ciclo
  irAAncla('cotizador', new Event('sembrar'))
}
</script>

<template>
  <div class="pub-scope land-stage">
    <a class="pub-skip" href="#contenido">Saltar al contenido</a>

    <LandingTopbar />

    <main id="contenido" class="land-main" tabindex="-1">
      <LandingHero />
      <LandingCotizador :cotizador="cotizador" />
      <LandingValueGrid />
      <LandingDayFlow />
      <LandingPlans
        :plans="plans"
        :loading="loading"
        :error="error"
        :loaded="loaded"
        @elegir="onElegir"
        @sembrar="onSembrar"
        @reintentar="refresh"
      />
      <LandingFaq />
      <LandingFinalCta />
    </main>

    <LandingFooter />
  </div>
</template>

<style scoped>
.land-stage {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--pub-tint-50);
  color: var(--pub-ink-900);
}

.land-main {
  position: relative;
  z-index: 1;
}

.land-main:focus {
  outline: none;
}
</style>
