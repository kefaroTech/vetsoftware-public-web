<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import LegalConsentCheckbox from '@/features/legal/components/LegalConsentCheckbox.vue'
import PasosEmbudo from '@/features/landing/components/PasosEmbudo.vue'
import PlanesConfigurador from '@/features/landing/components/PlanesConfigurador.vue'
import ConfirmarBloqueadoNotice from '../components/ConfirmarBloqueadoNotice.vue'
import ContratarResumenAside from '../components/ContratarResumenAside.vue'
import ContratarResumenTabla from '../components/ContratarResumenTabla.vue'
import DemoModeNotice from '../components/DemoModeNotice.vue'
import LetraPequenaPaso6 from '../components/LetraPequenaPaso6.vue'
import PriceDriftNotice from '../components/PriceDriftNotice.vue'
import TrialLinesTable from '../components/TrialLinesTable.vue'
import { usePasoContratar } from '../composables/usePasoContratar'
import type { Enfocable } from '../composables/usePasoContratar'

/**
 * Paso 6 — el paso VINCULANTE.
 *
 * Va dentro de `/dashboard` pero sin barra lateral (`fullBleed`, `hideTopbar`),
 * con el patrón que ya usa `consulta/nueva`. Es un embudo, y un menú de treinta
 * entradas al lado de un embudo es una invitación a abandonarlo.
 *
 * ── Dos formas de entrada, un solo paso vinculante ─────────────────────────
 * Esta pantalla sirve **un plan del catálogo o una propuesta a medida del
 * asistente**, y no sabe cuál hasta que lee la intención. Lo que decide es
 * `resumen.origen`; el resto del marcado —la prueba, los importes, la casilla,
 * el botón, la letra pequeña— es idéntico para las dos, y tiene que serlo: es el
 * mismo acto jurídico.
 *
 * <p>La lógica —qué se carga, en qué orden, y qué se hace con cada fallo— vive
 * en `usePasoContratar`, no aquí. El motivo está escrito en su cabecera, y no es
 * de estilo: el techo de 500 líneas por SFC lo comprueba `npm run quality`.
 *
 * ── WCAG §3.3.4 Error Prevention (Legal, Financial, Data), AA ──────────────
 * Se cumple por la vía «Confirmed»: hay un mecanismo para revisar, confirmar y
 * corregir antes de finalizar. Los «Cambiar» del resumen son la parte de
 * corregir; la casilla y el botón separado, la de confirmar.
 *
 * La vía «Reversible» **no** se puede reclamar hoy y la pantalla no la promete:
 * el front del tenant no tiene ninguna superficie de suscripción, así que no
 * hay «cancela cuando quieras». Lo que dice es lo que es verdad: escríbenos.
 */
/**
 * Los nodos que reciben el foco. Se declaran AQUÍ —la plantilla es su dueña— y
 * se le pasan al composable, que es quien decide cuándo enfocarlos. Con
 * `useTemplateRef` el enlace es por nombre y el compilador lo ve; declarados
 * dentro del composable y desestructurados, el enlace funcionaba pero
 * `noUnusedLocals` los daba por muertos.
 */
const h1 = useTemplateRef<HTMLElement>('h1')
const driftRef = useTemplateRef<Enfocable>('driftRef')
const errorRef = useTemplateRef<Enfocable>('errorRef')
const errorEnvioRef = useTemplateRef<HTMLElement>('errorEnvioRef')

const {
  plans,
  cargandoPlanes,
  resumen,
  catalogo,
  primerCobro,
  cargando,
  aceptaTerminos,
  terminosTocado,
  enviando,
  tardando,
  errorEnvio,
  traceId,
  drift,
  motivoSinPropuesta,
  puedeContratar,
  puedeConfirmar,
  errorTerminos,
  planCode,
  ciclo,
  sedes,
  usuarios,
  entrar,
  elegirAqui,
  confirmar,
  ahoraNo,
} = usePasoContratar({
  h1,
  drift: driftRef,
  error: errorRef,
  errorEnvio: errorEnvioRef,
})

/**
 * El `id` de la casilla, único por instancia: es el ancla del `ErrorSummary`, y
 * dos anclas con el mismo `id` en el documento dejan al enlace del resumen
 * saltando a la casilla equivocada.
 */
const idTerminos = `${useId()}-terminos`

const idMotivoConfirmar = `${useId()}-motivo-confirmar`

const itemsResumenError = computed(() =>
  errorTerminos.value ? [{ id: idTerminos, text: errorTerminos.value }] : [],
)

/**
 * El rótulo del **único control que compromete el dinero**.
 *
 * <p>Ramifica por `resumen.origen` con el mismo criterio que la pantalla de
 * éxito: esta pantalla sirve por igual un paquete del catálogo y una propuesta
 * a medida —el h1 dice «Confirma tu contratación» justo por eso—, y decir
 * «Confirmar mi plan» a quien acaba de describir su clínica con sus palabras le
 * nombra un paquete que **no eligió**. En el paso vinculante el botón tiene que
 * decir qué se está firmando; es lo último que se lee antes de firmarlo.
 *
 * <p>Se descartó un texto neutro («Confirmar la contratación»): es cierto en
 * las dos ramas y por eso mismo no nombra ninguna. Todo lo que hay encima del
 * botón —el resumen, las líneas, la letra pequeña— ya está redactado nombrando
 * lo elegido; el botón es donde esa concreción más vale, no donde sobra.
 *
 * <p>La rama del paquete es el suelo: el bloque de acciones vive tras
 * `v-if="resumen"`, así que con el resumen todavía a `null` esto no llega a
 * pintarse, y `PROPUESTA` es la rama que exige una propuesta cargada.
 */
const rotuloConfirmar = computed(() => {
  const r = resumen.value
  if (r?.origen === 'PROPUESTA') return 'Confirmar mi propuesta'
  // Sin paquete no hay ningún plan que nombrar, y llamarlo «mi plan» le pondría
  // nombre de paquete a una selección que el prospecto armó casilla a casilla.
  return r?.planCode ? 'Confirmar mi plan' : 'Confirmar mi selección'
})

/**
 * El título de la tabla de pruebas, con el conteo dentro.
 *
 * <p>El número sale de las propias filas y no de la selección guardada: es lo
 * que se está leyendo debajo, así que no puede discrepar de ello.
 */
const tituloModulos = computed(() => {
  const n = resumen.value?.lineasPrueba.length ?? 0
  const cuantos = n === 1 ? '1 módulo que activas' : `${n} módulos que activas`
  return `Los ${cuantos}, y cuándo empieza a costar cada uno`
})

/**
 * El subtítulo de la rama de recuperación, según **por qué** no hay propuesta.
 *
 * <p>Decía «Vamos a elegir el plan de tu clínica», y con `PERDIDA` eso se le
 * enseñaba a alguien que acababa de perder una propuesta a medida: había
 * escrito un párrafo sobre su negocio y esperado unos segundos, y la única
 * salida que la pantalla le ofrecía era el selector de paquetes. Las tres
 * redacciones nombran **primero** el camino a medida, que es el que se perdió.
 *
 * <p>Y ahora las tres son verdad: debajo hay un enlace real a `/planes`. Antes
 * el aviso de `PERDIDA` prometía «vuelve a armarla desde el mismo equipo» y eso
 * no se podía hacer ni tecleando la URL, porque `/planes` era `guestOnly` a
 * secas. Ver el comentario del enlace, en la plantilla.
 */
const subtituloRecuperacion = computed(() => {
  if (motivoSinPropuesta.value === 'PERDIDA') {
    return 'Puedes volver a contarnos qué necesitas desde este equipo, o elegir uno de nuestros paquetes.'
  }
  if (motivoSinPropuesta.value === 'NO_DISPONIBLE') {
    return 'Puedes volver a contarnos qué necesitas, o elegir uno de nuestros paquetes.'
  }
  return 'Cuéntanos qué necesitas y te lo armamos, o elige uno de nuestros paquetes.'
})

onMounted(entrar)
</script>

<template>
  <!-- `data-testid` y no el rol `main`: bajo `AppLayout` esta pantalla queda
       ANIDADA dentro del `<main class="app-content">` del armazón, así que
       `getByRole('main')` casa con dos elementos y ninguna prueba podría
       apuntar a este sin ambigüedad. Mismo patrón que ya trae
       `consulta/nueva`. -->
  <main class="ds-page ds-page--contained ds-stack ds-stack--16 ct" data-testid="paso-contratar">
    <!-- «Contratación» y no «plan»: esta pantalla sirve por igual a un paquete
         del catálogo y a una propuesta a medida, y la palabra «plan» como unidad
         de compra es justo la que el resto del embudo dejó de usar. El `<h1>`
         recibe el foco al montar, así que es lo primero que se anuncia. -->
    <!-- Los mismos CUATRO pasos que `/planes`, en el último: la verificación de
         correo es un paso propio porque el alta y la confirmación no se
         fusionan. `.pub-scope` porque el indicador se pinta con los tokens
         `--pub-*`, que solo existen bajo esa clase; su tipografía sí se
         devuelve a la de la app, que es donde vive esta pantalla. -->
    <div class="pub-scope ct-pasos"><PasosEmbudo :actual="4" /></div>

    <h1 ref="h1" class="ds-display ds-display--sm" tabindex="-1">Confirma tu contratación</h1>

    <template v-if="cargando || cargandoPlanes">
      <p class="ds-meta">Cargando tu resumen…</p>
    </template>

    <!-- §5, caso 2: la intención no está (otro dispositivo, o borró el
         almacenamiento). Un usuario que perdió un borrador no cometió ningún
         fallo, y tratarlo como si lo hubiera cometido es la forma más rápida de
         que se vaya. Así que aquí NO hay error: hay selector. -->
    <template v-else-if="!resumen">
      <!-- La intención SÍ estaba, y apuntaba a una propuesta que no se puede
           pintar. Se dice cuál de las dos cosas pasó, porque las salidas son
           distintas: una se arregla volviendo a armarla en este dispositivo y la
           otra no. `status` y no `alert`: no ha fallado la aplicación, y el
           selector de abajo sigue siendo un camino entero. -->
      <p
        v-if="motivoSinPropuesta === 'PERDIDA'"
        class="ds-banner ds-banner--warning"
        role="status"
        data-testid="propuesta-perdida"
      >
        Tu propuesta a medida se armó en otro dispositivo o navegador, así que aquí no podemos
        recuperarla. Puedes volver a contárnoslo y te la armamos de nuevo, o elegir uno de nuestros
        paquetes aquí abajo.
      </p>
      <p
        v-else-if="motivoSinPropuesta === 'NO_DISPONIBLE'"
        class="ds-banner ds-banner--warning"
        role="status"
        data-testid="propuesta-no-disponible"
      >
        Tu propuesta a medida ya no está disponible. Puedes elegir uno de nuestros paquetes aquí
        abajo, o escribirnos a
        <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y la rehacemos contigo.
      </p>

      <p class="ds-subtitle">{{ subtituloRecuperacion }}</p>

      <!-- El enlace que los tres subtítulos prometen, y que hasta ahora NO
           existía: no por descuido, sino porque no podía funcionar. Esta
           pantalla cuelga de `/dashboard` (`requiresAuth`), así que quien la ve
           está autenticado, y `/planes` era `guestOnly` a secas: el guard lo
           habría devuelto al tablero sin decir nada, igual que hacía al teclear
           la URL a mano. Con `allowClientWithoutPlan` en la ruta, el cliente que
           todavía no ha contratado —que es exactamente quien puede estar
           mirando esta pantalla— sí entra, así que la promesa ya es verdad.

           Va en los tres casos de la rama de recuperación: los tres subtítulos
           ofrecen volver a contarlo. Lo que `NO_DISPONIBLE` no promete es
           recuperar LA propuesta perdida, y eso lo dice su propio aviso; armar
           una nueva sí se puede siempre. -->
      <RouterLink
        :to="{ name: 'planes' }"
        class="ds-btn ds-btn--ghost ct-volver"
        data-testid="volver-planes"
      >
        Volver a contarnos qué necesitas
      </RouterLink>

      <div class="pub-scope ct-picker">
        <PlanesConfigurador
          v-model:plan-code="planCode"
          v-model:ciclo="ciclo"
          v-model:sedes="sedes"
          v-model:usuarios="usuarios"
          :plans="plans"
          @continuar="elegirAqui"
        />
      </div>
    </template>

    <template v-else>
      <section class="ds-card" aria-labelledby="negocio-h2">
        <h2 id="negocio-h2" class="ds-title">Tu negocio</h2>
        <p class="ds-subtitle">
          Estás contratando para <strong>{{ resumen.empresaNombre }}</strong
          ><span v-if="resumen.empresaIdentificador"> (NIT {{ resumen.empresaIdentificador }})</span
          >.
        </p>
      </section>

      <!-- En la rama del plan la deriva es de la lista de precio; en la de la
           propuesta es la propuesta misma, editada o repreciada desde que se
           trajo al embudo. El aviso es el mismo porque la pregunta del usuario
           es la misma: ¿por qué ya no cuesta lo que me dijisteis? -->
      <PriceDriftNotice
        v-if="drift"
        ref="driftRef"
        :antes="drift.antes"
        :ahora="drift.ahora"
        sufijo="al mes"
      />

      <!-- No se pudo leer la suscripción (403 del rol sin `subscription.read`, o un fallo del
           servidor). No se echa al usuario del embudo, pero tampoco se le deja creer que se
           comprobó: si su clínica ya tuviera plan, contratar otro es un problema caro. -->
      <p
        v-if="resumen.estadoPlanActual === 'DESCONOCIDO'"
        class="ds-banner ds-banner--warning"
        role="status"
      >
        No pudimos comprobar si tu negocio ya tiene un plan contratado. Si crees que ya lo tiene,
        escríbenos a <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> antes de
        confirmar.
      </p>

      <!-- El ORDEN decide qué se cree, y estaba al revés. Primero qué se paga hoy —nada, y
           hasta cuándo, por módulo—, y solo después el importe del ciclo, que es lo que se
           cobrará cuando la prueba termine. Antes la pantalla abría con «Total del primer mes:
           $105.910» y lo desmentía dos bloques más abajo, en el momento exacto en que alguien
           decide una compra: tres afirmaciones incompatibles y ninguna jerarquía. -->
      <div class="ct-grid">
        <div class="ct-col ds-stack ds-stack--16">
          <section class="ds-stack ds-stack--10" aria-labelledby="modulos-h2">
            <h2 id="modulos-h2" class="ds-title">{{ tituloModulos }}</h2>
            <TrialLinesTable :lineas="resumen.lineasPrueba" />
          </section>

          <ContratarResumenTabla :resumen="resumen" />

          <DemoModeNotice />
        </div>

        <!-- Después del contenido en el DOM y no antes: en pantalla estrecha la
             rejilla se apila y el orden de lectura es el mismo que el visual, sin
             ningún `order` que los separe (§1.3.2, §2.4.3). -->
        <ContratarResumenAside
          class="ct-aside"
          :resumen="resumen"
          :catalogo="catalogo"
          :primer-cobro="primerCobro"
        />
      </div>

      <ErrorSummary v-if="itemsResumenError.length > 0" ref="errorRef" :items="itemsResumenError" />

      <div
        v-if="errorEnvio"
        ref="errorEnvioRef"
        class="ds-banner ds-banner--error ct-error"
        role="alert"
        tabindex="-1"
      >
        <p class="ct-error-text">
          {{ errorEnvio }}
          <code v-if="traceId" class="ct-trace">{{ traceId }}</code>
        </p>
      </div>

      <div class="ds-stack ds-stack--10">
        <!-- Sin `quote.request` no hay nada que aceptar: la casilla de términos existe para
             habilitar un botón que no se va a pintar, y pedir que se acepten unos términos para
             después no dejar continuar es la peor forma de comunicar una falta de permiso.

             Los dos documentos se NOMBRABAN en negrita y no se enlazaban, porque las páginas no
             existían. Ya existen, y la casilla las enlaza: una casilla que dice «he leído» algo
             que no se puede leer recoge un clic, no el consentimiento informado que exige el
             artículo 9 de la Ley 1581 de 2012. `LegalConsentCheckbox` añade además la versión
             aceptada, que es lo que convierte «aceptó la política» en una afirmación con
             referente. -->
        <LegalConsentCheckbox
          v-if="puedeConfirmar"
          :id="idTerminos"
          v-model="aceptaTerminos"
          :documentos="['TERMS_OF_SERVICE', 'PRIVACY_POLICY']"
          :invalid="!!errorTerminos"
          @blur="terminosTocado = true"
        />

        <ConfirmarBloqueadoNotice
          v-else
          :motivo="puedeContratar ? 'SIN_PRECIO' : 'PERMISO'"
          :sin-precio="resumen.sinPrecio"
          :ciclo="resumen.ciclo"
        />

        <LetraPequenaPaso6 :con-casilla="puedeConfirmar" :modulos="resumen.lineasPrueba.length" />

        <div class="ct-actions">
          <!-- Ausente, no deshabilitado: ver `puedeContratar`. «Ahora no» se queda en los dos
               casos — quien no puede contratar tiene que poder salir del embudo. -->
          <button
            v-if="puedeConfirmar"
            type="button"
            class="ds-btn ds-btn--primary ds-btn--lg"
            :disabled="enviando"
            :aria-disabled="aceptaTerminos ? undefined : 'true'"
            :aria-describedby="aceptaTerminos ? undefined : idMotivoConfirmar"
            @click="confirmar"
          >
            <PawLoader v-if="enviando" :size="18" :glow="false" :speed="900" />
            {{ enviando ? 'Confirmando…' : rotuloConfirmar }}
          </button>
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="enviando" @click="ahoraNo">
            Ahora no
          </button>
        </div>

        <!-- `aria-disabled` y no `disabled`, y solo aquí: este bloqueo lo levanta el propio
             usuario marcando la casilla, y sacar el botón del orden de tabulación deja al
             teclado en un vacío sin decirle qué falta. El motivo es visible, no solo leído. -->
        <p v-if="puedeConfirmar && !aceptaTerminos" :id="idMotivoConfirmar" class="ds-meta">
          Marca la casilla de arriba para poder confirmar.
        </p>

        <p v-if="tardando" class="ds-meta" aria-live="polite">
          Seguimos registrando tu contratación. No cierres esta ventana.
        </p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.ct {
  max-width: 1080px;

  /* Bajo `fullBleed` el contenedor de la app es `overflow: hidden` y una
     columna flexible: quien rueda tiene que ser esta pantalla. */
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ct-error:focus {
  outline-offset: 2px;
}

.ct h1:focus,
.ct-picker :focus-visible {
  outline-offset: 2px;
}

/* `.pub-scope` está en el marcado porque el configurador se pinta ENTERO con los tokens
   `--pub-*`, que solo existen bajo esa clase: quitarla lo deja sin un solo color. Lo que sí se
   quita es su tipografía —`.pub-scope` fija Inter, y esta pantalla la repetía—, porque dentro del
   producto autenticado eso se lee como otra aplicación. Y esta rama no es rara: se ejecuta cada
   vez que alguien verificó su correo desde el móvil y vuelve sin la intención. */
.ct-picker {
  font-family: var(--font-sans);
  color: var(--warm-900);
}

/* `.ds-btn` está escrito para `<button>` y esto es un `<a>`: hereda el subrayado
   del enlace, y dentro de `.ds-stack` (columna flex, `align-items: stretch`) se
   estiraría a todo el ancho. Los dos ajustes van aquí y NO en `primitives.css`,
   que es un fichero gemelo de los dos fronts. */
.ct-volver {
  align-self: flex-start;
  text-decoration: none;
}

.ct-pasos {
  font-family: var(--font-sans);
  color: var(--warm-900);
}

.ct-grid {
  display: grid;
  gap: var(--space-20);
  align-items: start;
}

.ct-col,
.ct-aside {
  min-inline-size: 0;
}

@media (width >= 901px) {
  .ct-grid {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}

/* La pila la pone `.ds-stack` desde `primitives.css`. */
.ct-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* El rótulo del botón apagado sube a `--warm-600` sobre `--amatista-100`: el gris del
   botón activo sobre ese fondo se queda en 4,23:1 y no llega al 4,5:1 de §1.4.3. */
.ct-actions .ds-btn--primary[aria-disabled='true'] {
  background: var(--amatista-100);
  color: var(--warm-600);
  cursor: default;
}

.ct-error-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.ct-trace {
  display: block;
  margin-top: 6px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11.5px;
}
</style>
