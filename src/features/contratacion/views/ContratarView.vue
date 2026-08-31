<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import LegalConsentCheckbox from '@/features/legal/components/LegalConsentCheckbox.vue'
import PlanesConfigurador from '@/features/landing/components/PlanesConfigurador.vue'
import ConfirmarBloqueadoNotice from '../components/ConfirmarBloqueadoNotice.vue'
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

const itemsResumenError = computed(() =>
  errorTerminos.value ? [{ id: idTerminos, text: errorTerminos.value }] : [],
)

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
    <h1 ref="h1" class="ds-display ds-display--sm" tabindex="-1">Confirma tu plan</h1>

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
        <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y la rehacemos contigo.
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
      <p class="ds-subtitle">
        Estás contratando para <strong>{{ resumen.empresaNombre }}</strong
        ><span v-if="resumen.empresaIdentificador"> (NIT {{ resumen.empresaIdentificador }})</span>.
      </p>

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
        No pudimos comprobar si tu clínica ya tiene un plan contratado. Si crees que ya lo tiene,
        escríbenos a <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> antes de
        confirmar.
      </p>

      <!-- El ORDEN decide qué se cree, y estaba al revés. Primero qué se paga hoy —nada, y
           hasta cuándo, por módulo—, y solo después el importe del ciclo, que es lo que se
           cobrará cuando la prueba termine. Antes la pantalla abría con «Total del primer mes:
           $105.910» y lo desmentía dos bloques más abajo, en el momento exacto en que alguien
           decide una compra: tres afirmaciones incompatibles y ninguna jerarquía. -->
      <TrialLinesTable :lineas="resumen.lineasPrueba" />

      <ContratarResumenTabla :resumen="resumen" />

      <DemoModeNotice />

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

        <LetraPequenaPaso6 :con-casilla="puedeConfirmar" />

        <div class="ct-actions">
          <!-- Ausente, no deshabilitado: ver `puedeContratar`. «Ahora no» se queda en los dos
               casos — quien no puede contratar tiene que poder salir del embudo. -->
          <button
            v-if="puedeConfirmar"
            type="button"
            class="ds-btn ds-btn--primary ds-btn--lg"
            :disabled="enviando"
            @click="confirmar"
          >
            <PawLoader v-if="enviando" :size="18" :glow="false" :speed="900" />
            {{ enviando ? 'Confirmando…' : 'Confirmar mi plan' }}
          </button>
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="enviando" @click="ahoraNo">
            Ahora no
          </button>
        </div>

        <p v-if="tardando" class="ds-meta" aria-live="polite">
          Seguimos registrando tu contratación. No cierres esta ventana.
        </p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.ct {
  max-width: 780px;

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

/* La pila la pone `.ds-stack` desde `primitives.css`. */
.ct-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
