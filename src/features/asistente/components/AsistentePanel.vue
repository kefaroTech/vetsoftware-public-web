<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import CicloFieldset from '../../landing/components/CicloFieldset.vue'
import { useAsistente } from '../composables/useAsistente'
import { useCatalogoComercial } from '../composables/useCatalogoComercial'
import { useRecuperarPropuesta } from '../composables/useRecuperarPropuesta'
import AsistenteCaidoAviso from './AsistenteCaidoAviso.vue'
import AsistenteEntrada from './AsistenteEntrada.vue'
import AsistenteEspera from './AsistenteEspera.vue'
import AsistenteFueraDeDominio from './AsistenteFueraDeDominio.vue'
import CatalogoManual from './CatalogoManual.vue'
import ComparadorPaquete from './ComparadorPaquete.vue'
import PropuestaCapacidades from './PropuestaCapacidades.vue'
import PropuestaOrigenAviso from './PropuestaOrigenAviso.vue'
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
/**
 * No hay ni un paquete publicado. Baja desde `PlanesView`, que ya lo tiene
 * calculado con su `loaded`: los dos avisos de degradación ofrecen «uno de
 * nuestros paquetes, aquí abajo» y esa sección puede estar vacía desde que los
 * planes son un endpoint (`e48e9e0`). Sin este dato la ofrecerían igual.
 */
defineProps<{ sinPaquetes: boolean }>()

// Se desestructura para que la plantilla desenvuelva los `ref` sola. Con el
// objeto entero habría que escribir `.value` en cada interpolación, y un `.value`
// olvidado en un `v-if` no falla: pinta la rama contraria en silencio.
const {
  estado,
  propuesta,
  leyoElTexto,
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
  reiniciar,
  nuevaLlave,
} = useAsistente()

const {
  grupos,
  catalogo,
  vacio: catalogoVacio,
  loading: cargandoCatalogo,
  error: errorCatalogo,
} = useCatalogoComercial(ciclo)

const encabezado = ref<HTMLElement | null>(null)
/** El aviso de enlace caducado, para llevarle el foco: es TODO lo que hay que leer al llegar. */
const avisoCaducado = ref<HTMLElement | null>(null)

// La llave de idempotencia se genera al ENTRAR en la pantalla, no al pulsar:
// es lo que hace que un doble clic —o el reintento tras cancelar— no pague dos
// invocaciones ni cree dos propuestas huérfanas que consumen cupo.
onMounted(() => nuevaLlave())

/**
 * El enlace del correo, cuando la URL base apunta directamente a `/planes`.
 *
 * <p>Se llama también desde `LandingView` —el enlace que manda el backend hoy
 * apunta a la raíz—, y por eso `recuperarDeEnlace` es inocuo sin token: tras
 * limpiar la barra, la navegación monta este panel y vuelve a llamar aquí. Esa
 * segunda llamada no debe tocar el estado o borraría el `RECUPERANDO` que la
 * primera acaba de poner.
 */
const { recuperarDeEnlace } = useRecuperarPropuesta()
onMounted(() => {
  void recuperarDeEnlace()
})

const router = useRouter()
const { elegirPropuesta, destinoTrasElegir } = useContratacion()

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

/**
 * Lleva la propuesta al embudo de contratación.
 *
 * <p>Guarda **la referencia opaca y el subtotal que hay en pantalla**, y salta
 * al paso siguiente: el registro si es un prospecto, el paso vinculante si es un
 * cliente con sesión que aún no ha contratado (`destinoTrasElegir`). Empujar
 * fijo a `signup` mandaba a este último al tablero en silencio, porque `signup`
 * es `guestOnly`. Lo que NO hace, y es toda la decisión: no copia las líneas, no
 * copia el total y no calcula nada. El paso vinculante relee la propuesta del
 * servidor, así que si el prospecto vuelve dos días después —o la edita en otra
 * pestaña— lo que se le cotiza es lo que el servidor diga entonces, y la
 * diferencia contra este subtotal se le enseña como deriva de precio en vez de
 * cambiar el importe en silencio.
 *
 * <p>El ciclo que se guarda es **el de los totales** (`totales.ciclo`), no el
 * del conmutador: el asistente cotiza en mensual y ese conmutador mueve el
 * catálogo, no la propuesta. Guardar `ANUAL` junto a unos importes mensuales
 * rotularía como anual el resumen del paso vinculante.
 */
function continuarConPropuesta(): void {
  const actual = propuesta.value
  if (!actual) return
  elegirPropuesta(
    actual.id,
    { ciclo: actual.totales.ciclo, sedes: sedes.value, usuarios: usuarios.value },
    actual.totales.subtotal,
  )
  void router.push({ name: destinoTrasElegir.value })
}

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
  // Quien llega por el enlace del correo viene a ver una propuesta y se
  // encuentra otra cosa. Sin llevar el foco al aviso, un lector de pantalla
  // anuncia la pantalla de `/planes` desde arriba y el motivo real —lo único
  // que explica por qué no está su propuesta— queda enterrado.
  if (nuevo === 'ENLACE_CADUCADO' && (anterior === 'RECUPERANDO' || anterior === 'INICIAL')) {
    await nextTick()
    avisoCaducado.value?.focus()
  }
})
</script>

<template>
  <div class="apan">
    <!-- ENTRADA. Se mantiene montada mientras no haya propuesta para que el
         texto del prospecto no dependa de un remontaje. -->
    <AsistenteEntrada
      v-if="
        estado === 'INICIAL' ||
        estado === 'ERROR_MODELO' ||
        estado === 'ASISTENTE_CAIDO' ||
        estado === 'ENLACE_CADUCADO'
      "
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
         nunca puede impedir comprar — pero tampoco puede mandar a un sitio
         vacío, y por eso el aviso sabe si hay catálogo (ver el componente). -->
    <AsistenteCaidoAviso
      v-if="estado === 'ASISTENTE_CAIDO'"
      :catalogo-vacio="catalogoVacio"
      :sin-paquetes="sinPaquetes"
    />

    <!-- RECUPERANDO. Es una relectura, no una invocación al modelo: ni las
         frases escalonadas de la espera ni el botón de cancelar tienen sentido
         aquí. Una sola región viva con la verdad de lo que está pasando. -->
    <p v-if="estado === 'RECUPERANDO'" class="apan-cargando" role="status" aria-live="polite">
      Estamos recuperando tu propuesta…
    </p>

    <!-- ENLACE CADUCADO. **No es un error del sistema y no se pinta como tal**:
         el enlace tenía fecha de caducidad y el correo la decía por escrito. Es
         `--warning` y no `--error`, dice qué pasó sin acusar a nadie, y la
         salida está justo debajo — el cuadro de texto ya está montado, así que
         «Empezar de nuevo» solo tiene que retirar el aviso. -->
    <div
      v-if="estado === 'ENLACE_CADUCADO'"
      ref="avisoCaducado"
      class="ds-banner ds-banner--warning apan-aviso"
      role="status"
      tabindex="-1"
      data-testid="propuesta-enlace-caducado"
    >
      <p class="apan-aviso-t">Este enlace ya no sirve</p>
      <p class="apan-aviso-p">
        Los enlaces de propuesta caducan. Cuéntanos otra vez a qué se dedica tu clínica aquí abajo y
        te armamos una nueva en unos segundos.
      </p>
      <button type="button" class="ds-btn ds-btn--ghost apan-boton" @click="reiniciar">
        Empezar de nuevo
      </button>
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
      <PropuestaOrigenAviso :leyo-el-texto="leyoElTexto" />

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

      <!-- «Continuar con esta propuesta». Lo que se lleva al embudo es **la
           referencia de la propuesta y el importe que hay ahora mismo en
           pantalla**, no el carrito: el paso vinculante vuelve a pedirle las
           líneas y los totales al servidor, y si esta propuesta cambia entre
           medias lo que se cotiza es la versión de entonces. El importe viaja
           solo para poder decir «cuando lo elegiste valía X, ahora vale Y» si se
           movió; nunca para pintarlo como precio. -->
      <div class="apan-salida">
        <button
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg"
          @click="continuarConPropuesta"
        >
          Continuar con esta propuesta
        </button>
        <p class="ds-meta apan-salida-nota">
          Te pedimos los datos de tu clínica. Sin tarjeta, y todavía no contratas nada.
        </p>
      </div>

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
  display: grid;
  gap: 8px;
  justify-items: start;
}

.apan-salida-nota {
  margin: 0;
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
