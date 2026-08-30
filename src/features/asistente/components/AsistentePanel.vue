<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import CicloFieldset from '../../landing/components/CicloFieldset.vue'
import { useAsistente } from '../composables/useAsistente'
import { useCatalogoComercial } from '../composables/useCatalogoComercial'
import AsistenteEntrada from './AsistenteEntrada.vue'
import AsistenteEspera from './AsistenteEspera.vue'
import AsistenteFueraDeDominio from './AsistenteFueraDeDominio.vue'
import CatalogoManual from './CatalogoManual.vue'
import ComparadorPaquete from './ComparadorPaquete.vue'
import PropuestaCapacidades from './PropuestaCapacidades.vue'
import PropuestaRecomendados from './PropuestaRecomendados.vue'
import PropuestaRestaurables from './PropuestaRestaurables.vue'
import PropuestaTabla from './PropuestaTabla.vue'
import PropuestaTotales from './PropuestaTotales.vue'
import RefinarCuadro from './RefinarCuadro.vue'

/**
 * El panel del asistente: la máquina de estados hecha pantalla.
 *
 * ── Una ruta, dos superficies ───────────────────────────────────────────────
 * Vive dentro de `/planes` y **no en una ruta nueva**. Una ruta aparte partiría
 * la entrada del embudo en dos URLs, obligaría a mantener dos pantallas de
 * precio y haría ilegible la analítica del paso 2.
 *
 * ── El orden del DOM del estado con propuesta, que va contra la costumbre ───
 * El botón de continuar va **antes** del refinamiento y del catálogo. Es
 * deliberado: la propuesta lista es un resultado completo y accionable, y quien
 * ya está convencido no debe tener que atravesar dos bloques de edición opcional
 * para llegar al botón. Quien quiere afinar, sigue bajando.
 *
 * <p>El orden es literal en el marcado y las dos columnas de escritorio se hacen
 * con `grid-template-areas`, **sin reordenar el DOM**: el orden visual y el de
 * lectura tienen que coincidir (§1.3.2).
 *
 * ── El foco, con dos ramas y una excepción ──────────────────────────────────
 * Tras la **primera propuesta** y tras un **refinamiento**, el foco va al `<h2>`
 * «Tu propuesta»: el contenido principal cambió y sin el salto el foco se queda
 * en el botón y el lector no encuentra el resultado. Tras **añadir o quitar una
 * línea a mano, el foco NO se mueve** — el usuario está en medio de una serie de
 * ediciones, y moverle el foco al total tras cada clic hace imposible marcar dos
 * casillas seguidas (§3.2.2). Ese cambio se comunica por `aria-live`, que es
 * exactamente para lo que existe §4.1.3.
 */
// Se desestructura para que la plantilla desenvuelva los `ref` sola. Con el
// objeto entero habría que escribir `.value` en cada interpolación, y un `.value`
// olvidado en un `v-if` no falla: pinta la rama contraria en silencio.
const {
  estado,
  propuesta,
  texto,
  email,
  ciclo,
  sedes,
  usuarios,
  retirados,
  sugerenciasDescartadas,
  guardando,
  traceId,
  nuevos,
  lineasSugeridas,
  lineasManuales,
  codigosEnCarrito,
  sinAjustes,
  avisoAjustes,
  anuncioDelta,
  generar,
  reintentar,
  refinar,
  quitar,
  anadir,
  cambiarAPaquete,
  descartarSugerencia,
  cambiarCiclo,
  fijarCapacidades,
  cancelar,
  nuevaLlave,
} = useAsistente()

const {
  grupos,
  catalogo,
  loading: cargandoCatalogo,
  error: errorCatalogo,
} = useCatalogoComercial(ciclo)

const encabezado = ref<HTMLElement | null>(null)

// La llave de idempotencia se genera al ENTRAR en la pantalla, no al pulsar:
// es lo que hace que un doble clic —o el reintento tras cancelar— no pague dos
// invocaciones ni cree dos propuestas huérfanas que consumen cupo.
onMounted(() => nuevaLlave())

const esperando = computed(() => estado.value === 'CARGANDO' || estado.value === 'REFINANDO')
const conPropuesta = computed(
  () => estado.value === 'PROPUESTA_LISTA' || estado.value === 'NO_ENTENDIDO',
)

/**
 * Con un paquete en el carrito, el catálogo manual se bloquea: paquete y
 * componente del paquete no se compran juntos.
 *
 * <p>Se comprueba contra los códigos que publica el catálogo, **no por el
 * prefijo del código**: `PACK_` es una convención de la semilla, no una garantía
 * del contrato, y un paquete futuro que no la siguiera dejaría este bloqueo
 * inerte sin que nada fallara.
 */
const esPaquete = computed(() => {
  const codigos = new Set(catalogo.value?.paquetes.map((p) => p.code) ?? [])
  return codigosEnCarrito.value.some((c) => codigos.has(c))
})

async function enfocarResultado(): Promise<void> {
  await nextTick()
  encabezado.value?.focus()
}

watch(estado, async (nuevo, anterior) => {
  // Solo al LLEGAR a un resultado desde una espera. Un `watch` sobre la
  // propuesta entera dispararía también en cada edición manual, que es
  // justamente donde el foco no se debe mover.
  if ((anterior === 'CARGANDO' || anterior === 'REFINANDO') && nuevo === 'PROPUESTA_LISTA') {
    await enfocarResultado()
  }
})
</script>

<template>
  <div class="apan">
    <!-- ENTRADA. Se mantiene montada mientras no haya propuesta para que el
         texto del prospecto no dependa de un remontaje. -->
    <AsistenteEntrada
      v-if="estado === 'INICIAL' || estado === 'ERROR_MODELO' || estado === 'ASISTENTE_CAIDO'"
      v-model:texto="texto"
      v-model:email="email"
      :ocupado="esperando"
      @enviar="generar"
    />

    <!-- ERROR PUNTUAL. «Fue un problema nuestro, no de lo que escribiste» no es
         amabilidad decorativa: sin esa frase el usuario asume que su texto era
         el problema y lo reescribe — trabajo perdido por una causa falsa. -->
    <div
      v-if="estado === 'ERROR_MODELO'"
      class="ds-banner ds-banner--error apan-aviso"
      role="alert"
      tabindex="-1"
    >
      <p class="apan-aviso-t">No pudimos armar tu propuesta</p>
      <p class="apan-aviso-p">
        Fue un problema nuestro, no de lo que escribiste. Tu texto sigue ahí arriba, tal como lo
        dejaste.
      </p>
      <p v-if="traceId" class="apan-traza">Referencia: {{ traceId }}</p>
      <button type="button" class="ds-btn ds-btn--ghost apan-boton" @click="reintentar">
        Volver a intentarlo
      </button>
    </div>

    <!-- DEGRADACIÓN. La pantalla cambia de forma, no de mensaje: el catálogo
         manual pasa a ser el contenido principal. La ausencia del asistente
         nunca puede impedir comprar. -->
    <div
      v-if="estado === 'ASISTENTE_CAIDO'"
      class="ds-banner ds-banner--warning apan-aviso"
      role="status"
    >
      El asistente no está disponible ahora mismo. Puedes armar tu plan tú mismo aquí abajo, o
      elegir uno de nuestros paquetes.
    </div>

    <AsistenteEspera v-if="esperando" :refinando="estado === 'REFINANDO'" @cancelar="cancelar" />

    <AsistenteFueraDeDominio
      v-if="estado === 'FUERA_DE_DOMINIO'"
      v-model:texto="texto"
      @reintentar="reintentar"
    />

    <!-- RESULTADO -->
    <section v-if="conPropuesta && propuesta" class="apan-resultado" aria-labelledby="prop-h2">
      <h2 id="prop-h2" ref="encabezado" tabindex="-1" class="apan-h2">Tu propuesta</h2>

      <p
        v-if="estado === 'NO_ENTENDIDO'"
        class="ds-banner ds-banner--warning apan-aviso"
        role="status"
      >
        No conseguimos entender bien lo que nos contaste. Te dejamos un punto de partida y el
        catálogo completo para que lo armes tú, o cuéntanoslo de otra forma.
        <strong>Punto de partida, no una recomendación. Quita lo que no uses.</strong>
      </p>

      <p class="ds-sr-only" role="status" aria-live="polite">{{ anuncioDelta }}</p>

      <!-- ⚠️ `propuesta.totales.ciclo` y NO el `ciclo` del conmutador. Los tres
           bloques que pintan dinero DE LA PROPUESTA —esta tabla, el comparador
           y los recomendados— llevan el ciclo con el que el servidor cotizó, no
           el que el usuario tenga marcado. El contrato del asistente no acepta
           ciclo, así que cotiza en mensual; rotular «al año» unos importes
           mensuales porque el conmutador esté en anual es una mentira de una
           sola palabra en la pantalla que decide una compra. El catálogo de
           abajo sí usa el `ciclo` del conmutador, porque `GET /catalog` sí trae
           los dos precios. -->
      <PropuestaTabla
        :sugeridas="lineasSugeridas"
        :manuales="lineasManuales"
        :ciclo="propuesta.totales.ciclo"
        :nuevos="nuevos"
        @quitar="quitar"
      />

      <p v-if="propuesta.descartadas > 0" class="apan-descartadas">
        No todo lo que propusimos se puede contratar por aquí; dejamos fuera
        {{ propuesta.descartadas }} línea(s). Escríbenos si necesitas algo más.
      </p>

      <PropuestaTotales :totales="propuesta.totales" />

      <PropuestaCapacidades
        :capacidades="propuesta.capacidades"
        :sedes="sedes"
        :usuarios="usuarios"
        @cambiar="fijarCapacidades"
      />

      <CicloFieldset :model-value="ciclo" @update:model-value="cambiarCiclo" />

      <ComparadorPaquete
        v-if="propuesta.oferta"
        :oferta="propuesta.oferta"
        :ciclo="propuesta.totales.ciclo"
        @cambiar="cambiarAPaquete"
      />

      <!-- ⚠️ AQUÍ VA «Continuar con esta propuesta», y hoy NO ESTÁ. No es un
           olvido: el embudo de contratación asume que una selección es UN plan
           (`IntencionContratacion.planCode`), y una propuesta a medida son N
           líneas. Mientras esa unión discriminada no exista, el botón llevaría
           al prospecto al registro y su carrito se perdería al hidratar, en
           silencio — que es exactamente el fallo que esta feature no puede
           permitirse. Un botón que promete algo que no pasa es peor que la
           ausencia del botón.

           En su lugar, la salida honesta: el camino que SÍ funciona hoy. -->
      <p class="ds-banner apan-aviso apan-salida">
        ¿Quieres contratar ya? Por ahora la contratación va por nuestros tres paquetes, aquí abajo.
        Si prefieres esta propuesta a medida, escríbenos a
        <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> con lo que armaste y la
        cerramos contigo.
      </p>

      <PropuestaRecomendados
        :recomendados="propuesta.recomendados"
        :ciclo="propuesta.totales.ciclo"
        @anadir="anadir"
      />

      <PropuestaRestaurables :retirados="retirados" @restaurar="anadir" />

      <RefinarCuadro
        :aviso="avisoAjustes"
        :sin-ajustes="sinAjustes"
        :ocupado="guardando"
        @ajustar="refinar"
      />
    </section>

    <!-- El catálogo manual acompaña a la propuesta y sostiene la degradación.
         Nunca aparece en FUERA_DE_DOMINIO: ni una línea de catálogo. -->
    <p v-if="errorCatalogo" class="ds-banner ds-banner--error apan-aviso" role="alert">
      No pudimos cargar el catálogo de módulos. Puedes seguir con lo que ya tienes, o volver a
      cargar la página.
    </p>
    <p v-else-if="cargandoCatalogo" class="apan-cargando">Cargando el catálogo…</p>

    <CatalogoManual
      v-if="estado !== 'FUERA_DE_DOMINIO' && estado !== 'INICIAL'"
      :grupos="grupos"
      :catalogo="catalogo"
      :seleccionados="codigosEnCarrito"
      :sugerencias-descartadas="sugerenciasDescartadas"
      :ciclo="ciclo"
      :bloqueado="esPaquete"
      @anadir="anadir"
      @quitar="quitar"
      @descartar-sugerencia="descartarSugerencia"
    />

    <p class="apan-letra">
      Es un cálculo orientativo con los precios de lista. El precio exacto de tu clínica lo ves
      antes de confirmar, sin compromiso. · Prueba gratis. Sin tarjeta.
    </p>
  </div>
</template>

<style scoped>
.apan {
  display: grid;
  gap: 4px;
}

.apan-h2 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.apan-h2:focus-visible {
  outline: 3px solid var(--pub-ame-600);
  outline-offset: 3px;
}

.apan-aviso {
  margin-block: 12px;
  font-size: 13px;
  line-height: 1.55;
}

.apan-aviso-t {
  margin: 0;
  font-weight: 700;
}

.apan-aviso-p {
  margin: 4px 0 0;
}

.apan-traza {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.85;
}

.apan-boton {
  margin-block-start: 12px;
  min-block-size: 44px;
}

.apan-salida {
  font-weight: 600;
}

.apan-resultado {
  display: grid;
  gap: 14px;
}

.apan-descartadas,
.apan-cargando,
.apan-letra {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

.apan-letra {
  margin-block-start: 22px;
}
</style>
