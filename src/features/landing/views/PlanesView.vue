<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import { useAsistente } from '@/features/asistente/composables/useAsistente'
import PlanesConfigurador from '../components/PlanesConfigurador.vue'
import { usePlanes } from '../composables/usePlanes'
import { MONEDA_DE_FACTURACION } from '../composables/planPricing'
import type { Ciclo } from '../types/plans.types'

/**
 * Paso 2 del embudo — `/planes`.
 *
 * Lleva `guestOnly` **con la excepción `allowClientWithoutPlan`**: quien ya
 * contrató va al tablero —su plan se gestiona desde dentro, no desde el
 * escaparate—, pero el cliente con sesión que todavía NO ha contratado entra.
 * Sin esa excepción, quien llegaba al paso vinculante y quería cambiar lo que
 * iba a contratar no tenía forma de volver aquí. El motivo largo está en la
 * ruta y en el guard (`router/index.ts`).
 *
 * <p>Por eso esta pantalla tiene dos públicos, y se nota en dos sitios: el
 * enlace de la esquina (iniciar sesión / volver al tablero) y a dónde lleva
 * «continuar» (`destinoTrasElegir`).
 *
 * La selección se siembra, en este orden: lo que traiga la URL (un enlace
 * compartido o el CTA de una tarjeta), lo que hubiera en la intención guardada,
 * y por último los mínimos. La URL manda porque es lo que el usuario acaba de
 * pulsar.
 *
 * ── Dos superficies, UNA ruta ───────────────────────────────────────────────
 * Desde el asistente de propuesta a medida, esta ruta tiene dos contenidos: el
 * cuadro de texto libre arriba, como contenido principal, y los tres paquetes
 * debajo, en una `<section>` con su `<h2>`. **No hay ruta nueva**, y es una
 * decisión: una `/planes/asistente` partiría la entrada del embudo en dos URLs,
 * obligaría a mantener dos pantallas de precio y haría ilegible la analítica del
 * paso 2.
 *
 * <p>Los paquetes estuvieron dentro de un `<details open>` y ya no: el atributo
 * era estático porque «abierto en escritorio y cerrado en móvil» no se puede
 * expresar así, y el resultado era un control de divulgación que solo podía
 * empeorar la página —cerrarlo destruye el ancla de precio, y quien lo cierra
 * sin querer pierde los precios sin saber cómo volver—, con un `<summary>` de
 * 16 px en negrita que **no es un encabezado** haciendo de rótulo del contenido
 * secundario. Con un `<h2>` de verdad, la jerarquía la hacen el orden, el tipo y
 * el lenguaje, y quien navega por encabezados encuentra por fin el contenido
 * principal de esta pantalla en el esquema del documento (§1.3.1).
 *
 * <p>Y los paquetes **no desaparecen**, por conversión y no por comodidad: son
 * el ancla de precio. El flujo a medida pide escribir un párrafo y esperar unos
 * segundos **antes de ver una sola cifra**; si al final del túnel sale un importe
 * fuera de presupuesto, quien no llegaba se va habiendo trabajado gratis. Con
 * los tres paquetes a mano se autoselecciona en dos segundos. Es el mismo
 * criterio que `LandingPlans` ya dejó escrito para no quitar los precios ni
 * cuando la petición falla.
 */
const route = useRoute()
const router = useRouter()
const { plans, loading, error, loaded, refresh } = usePlanes()
const { vigente, elegir, destinoTrasElegir } = useContratacion()
const { isAuthenticated } = useAuth()
// Se renombra: esta vista ya tiene su propio `texto()`, el lector de la query.
const { texto: textoLibre } = useAsistente()

const h1 = useTemplateRef<HTMLElement>('h1')

/**
 * Si el prospecto llega con el texto ya escrito desde la caja del hero.
 *
 * <p>Se lee **una vez, al montar**, y no es un `computed`: si siguiera al campo,
 * el subtítulo cambiaría bajo el cursor en cuanto el usuario escribiera aquí la
 * primera letra. Lo que describe es de dónde vino, no qué hay en la caja ahora.
 */
const llegoSembrado = textoLibre.value.trim().length > 0

/**
 * Con texto sembrado, el foco va al `<h1>`, **no al campo**.
 *
 * <p>Llevarlo al `<textarea>` —o peor, al correo— saltaría el encabezado y el
 * lector de pantalla no sabría en qué pantalla acaba de aterrizar. Es la misma
 * convención del paso vinculante. Sin texto sembrado no se mueve nada: la
 * navegación normal ya deja el foco donde toca.
 */
onMounted(() => {
  if (llegoSembrado) h1.value?.focus()
})

function texto(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null
}
function entero(v: unknown, porDefecto: number): number {
  const n = Math.trunc(Number(texto(v)))
  return Number.isFinite(n) && n >= 1 ? n : porDefecto
}

/** El paquete que la intención trae, o nada si lo que trae es una propuesta. */
const planDeLaIntencion = vigente.value?.origen === 'PLAN' ? vigente.value.planCode : undefined

const planCode = ref(texto(route.query.plan) ?? planDeLaIntencion ?? '')
const ciclo = ref<Ciclo>(
  route.query.ciclo === 'ANUAL' || route.query.ciclo === 'MENSUAL'
    ? route.query.ciclo
    : (vigente.value?.ciclo ?? 'MENSUAL'),
)
const sedes = ref(entero(route.query.sedes, vigente.value?.sedes ?? 1))
const usuarios = ref(entero(route.query.usuarios, vigente.value?.usuarios ?? 1))

// El catálogo llega después del primer render: si la URL no traía plan, o traía
// uno que ya no existe, se cae al recomendado en cuanto hay lista.
watch(
  plans,
  (lista) => {
    if (lista.length === 0) return
    if (!lista.some((p) => p.code === planCode.value)) {
      const porDefecto = lista.find((p) => p.recommended) ?? lista[0]
      if (porDefecto) planCode.value = porDefecto.code
    }
  },
  { immediate: true },
)

const planElegido = computed(() => plans.value.find((p) => p.code === planCode.value) ?? null)

/**
 * El catálogo **llegó** y no trae ni un paquete publicable.
 *
 * ── Esta rama acaba de nacer de verdad ──────────────────────────────────────
 * Existía un `v-else-if="plans.length === 0"` que **no podía dispararse nunca**:
 * los planes salían de `PLANS_CONTENT`, contenido local con tres paquetes
 * escritos a mano, y una constante no está vacía jamás. Nadie la vio funcionar.
 * Desde que `plans.source.ts` pide `GET /plans` sí ocurre, y es un estado NORMAL
 * del negocio: sin lista de precio vigente el servidor responde 200 con la lista
 * vacía a propósito, para que la portada siga cargando.
 *
 * ── Por qué exige `loaded` y la vieja no lo hacía ───────────────────────────
 * `usePlanes()` pide el catálogo en su `onMounted`, que corre DESPUÉS del primer
 * render. En ese primer render `loading` todavía es `false` y `plans` está
 * vacío, así que la condición de antes se cumplía: con red detrás eso es un
 * parpadeo de «todavía no hay paquetes publicados» sobre un catálogo que llega
 * medio segundo después. Afirmar el vacío antes de que la respuesta vuelva es la
 * misma mentira que este cambio quita, en la otra dirección. Es el criterio que
 * `useCatalogoComercial.vacio` ya dejó escrito para el catálogo manual.
 *
 * <p>Y descuenta el error porque son dos frases distintas: «no pudimos
 * cargarlo» ya tiene su bloque con su reintento. Puede darse a la vez —una
 * recarga que falla sobre un catálogo vacío que sí cargó— y entonces manda el
 * error, que es el que ofrece hacer algo.
 */
const sinPaquetes = computed(() => loaded.value && !error.value && plans.value.length === 0)

/**
 * Guarda la intención y salta al paso siguiente, que **no es el mismo para
 * todos**: el registro para un prospecto, el paso vinculante para un cliente que
 * ya tiene sesión y todavía no ha contratado (ver `destinoTrasElegir`). Empujar
 * fijo a `signup` mandaba a este último al tablero en silencio, porque `signup`
 * es `guestOnly`.
 *
 * La query solo viaja en la rama del registro: es lo que alimenta el carril «Tu
 * selección» y hace el enlace compartible. El paso vinculante no la lee —se
 * sirve de la intención que `elegir()` acaba de guardar— y arrastrarla ahí solo
 * pondría la elección en la barra de direcciones sin que nadie la use.
 */
function continuar() {
  const plan = planElegido.value
  if (!plan) return
  elegir(plan, ciclo.value, sedes.value, usuarios.value)
  if (destinoTrasElegir.value === 'contratar') {
    void router.push({ name: 'contratar' })
    return
  }
  void router.push({
    name: 'signup',
    query: {
      plan: plan.code,
      ciclo: ciclo.value,
      sedes: String(sedes.value),
      usuarios: String(usuarios.value),
    },
  })
}
</script>

<template>
  <PublicLayout>
    <!-- Esta pantalla ya no es solo del visitante: también entra aquí el cliente
         con sesión que todavía no ha contratado. Ofrecerle «¿Ya tienes cuenta?
         Inicia sesión» sería la tercera frase falsa del embudo, y además le
         dejaría sin salida: `PublicLayout` no trae la navegación de la app, así
         que sin este enlace la única vuelta al tablero es el botón «atrás». -->
    <template #topRight>
      <template v-if="isAuthenticated">
        <RouterLink :to="{ name: 'home' }">Volver a mi tablero</RouterLink>
      </template>
      <template v-else>
        ¿Ya tienes cuenta? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
      </template>
    </template>

    <div class="pl-page">
      <div class="pl-head">
        <!-- El `<h1>` vive AQUÍ y no dentro del asistente, y es deliberado: el
             panel monta y desmonta sus estados, así que un `<h1>` suyo
             desaparecería del documento en cuanto llegara la propuesta y la
             página se quedaría sin encabezado de nivel 1. -->
        <h1 ref="h1" class="pub-title" tabindex="-1">Armemos lo que tu clínica necesita</h1>
        <!-- Dos subtítulos, uno por procedencia. Quien llega con su párrafo ya
             escrito necesita que la pantalla reconozca lo que trae —si no, la
             caja llena se lee como «otro sitio donde escribir lo mismo»— y que
             nombre lo único que falta. -->
        <p v-if="llegoSembrado" class="pub-sub">
          Ya tenemos lo que nos contaste. Revísalo, déjanos un correo y te armamos la propuesta. No
          te compromete a nada y no pedimos tarjeta.
        </p>
        <p v-else class="pub-sub">
          Cuéntanos con tus palabras a qué se dedica tu veterinaria. Te proponemos los módulos que
          te sirven, con su precio. No te compromete a nada y no pedimos tarjeta.
        </p>
        <!-- El indicador de moneda va AQUÍ, una vez por pantalla, y no pegado a cada cifra: ver
             `MONEDA_DE_FACTURACION`. Sin él, «$ 149.000» en una web que se lee desde cualquier
             país es una cifra sin unidad en la pantalla donde alguien decide comprar. -->
        <p class="pl-moneda">Todos los precios están en {{ MONEDA_DE_FACTURACION }}, sin IVA.</p>
      </div>

      <div v-if="error" class="pub-error" role="alert">
        <p class="pl-state-title">No pudimos cargar los planes</p>
        <p class="pl-state-text">
          Puedes crear tu cuenta igualmente y ver el precio exacto antes de confirmar.
        </p>
        <button type="button" class="pl-retry" @click="refresh">
          <RefreshCw :size="14" :stroke-width="1.8" aria-hidden="true" />
          Volver a intentarlo
        </button>
      </div>

      <p v-else-if="loading" class="pl-state-text">Cargando los planes…</p>

      <!-- El vacío ya NO se anuncia aquí arriba. Vivía suelto entre la carga y el
           asistente, a media pantalla del hueco que describía, mientras la
           sección de abajo seguía prometiendo «tres combinaciones cerradas, con
           su precio» sobre la nada. Ahora está donde está el hueco. -->

      <!-- Contenido principal: la propuesta a medida. -->
      <AsistentePanel :sin-paquetes="sinPaquetes" />

      <!-- Y los tres paquetes, siempre visibles: son el ancla de precio, y el
           camino a medida no enseña una cifra hasta el final. Lo que los pone en
           segundo lugar es el orden, el peso del encabezado y el lenguaje, no el
           ocultamiento. -->
      <section class="pl-paquetes" aria-labelledby="paquetes-h2">
        <!-- El encabezado cambia con el estado, y no es cosmética: «O empieza por
             un paquete ya armado» encima de un hueco es una instrucción que la
             pantalla no puede cumplir, dicha en negrita y a mayor tamaño. Es el
             mismo criterio que `CatalogoManual` dejó escrito para su vacío. -->
        <h2 id="paquetes-h2" class="pl-paquetes-h2">
          {{
            sinPaquetes
              ? 'Todavía no hay paquetes publicados'
              : 'O empieza por un paquete ya armado'
          }}
        </h2>

        <!-- El vacío se ANUNCIA: es contenido, no la ausencia de contenido. Sin
             `role="status"` quien navega con lector se queda esperando una lista
             de precios que nunca va a llegar, porque nada le dijo que no venía
             (§4.1.3). No roba el foco: el asistente de arriba sigue montado y es
             la compra que en ese momento sí se puede intentar. -->
        <p v-if="sinPaquetes" class="pl-paquetes-sub" role="status" data-testid="planes-vacio">
          Todavía no hay paquetes con precio publicado. Escríbenos a
          <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y te decimos qué
          podemos montarte hoy.
        </p>
        <!-- «Combinaciones», ya no «Tres»: cuántos hay lo dice el servidor desde
             que los paquetes vienen de `GET /plans`, y clavar el número aquí era
             la última afirmación local sobre datos que ya no son locales. -->
        <p v-else class="pl-paquetes-sub">
          Combinaciones cerradas, con su precio. Puedes ajustarlas antes de contratar.
        </p>

        <PlanesConfigurador
          v-if="plans.length > 0"
          v-model:plan-code="planCode"
          v-model:ciclo="ciclo"
          v-model:sedes="sedes"
          v-model:usuarios="usuarios"
          :plans="plans"
          @continuar="continuar"
        />
      </section>
    </div>
  </PublicLayout>
</template>

<style scoped>
.pl-page {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 0;
}

.pl-head {
  margin-bottom: 26px;
}

.pl-moneda {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--pub-ink-600);
}

.pl-state-title {
  margin: 0;
  font-weight: 700;
}

.pl-state-text {
  margin: 6px 0 0;
  font-size: 13.5px;
  color: var(--pub-ink-600);
}

.pl-paquetes {
  margin-block-start: 30px;
  padding-block-start: 18px;
  border-block-start: 1px solid var(--pub-line-strong);
}

/* 17 px contra los 20 px del `<h2>` de la entrada: el rótulo del contenido
   secundario nunca pesa más que el del principal. Antes eran 16 px en negrita
   contra los 13 px del `<label>` de la caja de texto. */
.pl-paquetes-h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.pl-paquetes-sub {
  margin: 6px 0 16px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--pub-ink-600);
}

/* El `<h1>` solo recibe el foco por programa, al llegar con texto sembrado.
   Nunca por teclado, así que aquí `outline: none` no esconde nada. */
.pub-title:focus {
  outline: none;
}

.pl-retry {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid var(--pub-err-bd);
  background: var(--pub-surface);
  color: var(--pub-err-tx-2);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
