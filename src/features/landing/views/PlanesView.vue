<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PublicLayout from '@/components/public/PublicLayout.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import {
  lineasDePruebaDeSeleccion,
  sumarDias,
} from '@/features/contratacion/api/contratacion.source'
import TrialLinesTable from '@/features/contratacion/components/TrialLinesTable.vue'
import { useContratacion } from '@/features/contratacion/composables/useContratacion'
import type { LineaPrueba } from '@/features/contratacion/types/contratacion.types'
import AsistentePanel from '@/features/asistente/components/AsistentePanel.vue'
import { useAsistente } from '@/features/asistente/composables/useAsistente'
import PasosEmbudo from '../components/PasosEmbudo.vue'
import PlanesCombinaciones from '../components/PlanesCombinaciones.vue'
import PlanesResumenAside from '../components/PlanesResumenAside.vue'
import PlanesTarjetaModulos from '../components/PlanesTarjetaModulos.vue'
import { modulosDelPaquete } from '../composables/cotizadorLineas'
import { usePlanes } from '../composables/usePlanes'
import { useCotizador } from '../composables/useCotizador'
import { MONEDA_DE_FACTURACION } from '../composables/planPricing'
import type { Ciclo } from '../types/plans.types'

/**
 * Paso 2 del embudo — `/planes`.
 *
 * Es **un paso, no una bifurcación**: una sola columna de decisiones a la
 * izquierda y el importe a la derecha, siempre visible. Ningún camino de esta
 * pantalla puede exigir elegir por dónde entrar antes de enseñar una cifra.
 *
 * <p>Lleva `guestOnly` **con la excepción `allowClientWithoutPlan`**: quien ya
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
 * <p>Los paquetes **no desaparecen**, por conversión y no por comodidad: son el
 * ancla de precio. Lo que cambia es que dejan de ser una lista de tarjetas
 * grandes y pasan a ser tres opciones compactas de una tarjeta más, porque la
 * unidad de compra es el módulo y el paquete es sólo un atajo de selección.
 */
const route = useRoute()
const router = useRouter()
const { plans, loading, error, loaded, refresh } = usePlanes()
const { vigente, elegir, destinoTrasElegir } = useContratacion()
const { isAuthenticated } = useAuth()
// Se renombra: esta vista ya tiene su propio `texto()`, el lector de la query.
const { texto: textoLibre } = useAsistente()

const {
  ciclo,
  modulos,
  sedes,
  usuarios,
  catalogo,
  cotizacion,
  estado,
  importe,
  mensajeDeFallo,
  regionViva,
  paquete,
  saltoDePaquete,
  alternarModulo,
  sembrarModulos,
  volverAlPaquete,
} = useCotizador()

const h1 = useTemplateRef<HTMLElement>('h1')

/**
 * Si el prospecto llega con el texto ya escrito desde la caja del hero.
 *
 * <p>Se lee **una vez, al montar**: lo que describe es de dónde vino, no qué
 * hay en la caja ahora.
 */
const llegoSembrado = textoLibre.value.trim().length > 0

/**
 * Con texto sembrado, el foco va al `<h1>`, **no al campo**.
 *
 * <p>Llevarlo al `<textarea>` —o peor, al correo— saltaría el encabezado y el
 * lector de pantalla no sabría en qué pantalla acaba de aterrizar. Es la misma
 * convención del paso vinculante.
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

ciclo.value =
  route.query.ciclo === 'ANUAL' || route.query.ciclo === 'MENSUAL'
    ? (route.query.ciclo as Ciclo)
    : (vigente.value?.ciclo ?? 'MENSUAL')
sedes.value = entero(route.query.sedes, vigente.value?.sedes ?? 1)
usuarios.value = entero(route.query.usuarios, vigente.value?.usuarios ?? 1)

/**
 * La primera selección se siembra desde el paquete con el que el visitante
 * llegó, y **sólo una vez**: recargar el catálogo al cambiar de ciclo no puede
 * deshacer lo que el usuario acabe de marcar.
 *
 * <p>Manda la URL porque es lo que se acaba de pulsar; luego la intención
 * guardada, y por último el paquete que el negocio destaca.
 */
let sembrado = false
watch(
  [catalogo, plans],
  ([cat, lista]) => {
    if (sembrado || !cat || cat.paquetes.length === 0) return
    const preferido =
      texto(route.query.plan) ??
      planDeLaIntencion ??
      lista.find((p) => p.recommended)?.code ??
      lista[0]?.code
    const elegido =
      cat.paquetes.find((p) => p.code === preferido) ??
      cat.paquetes.find((p) => p.recommended) ??
      cat.paquetes[0]
    if (!elegido) return
    sembrado = true
    sembrarModulos(modulosDelPaquete(elegido, cat))
  },
  { immediate: true },
)

/**
 * Cuándo deja de ser gratis cada módulo, **ordenado por fecha de fin
 * ascendente**: lo primero que hay que ver es lo primero que se acaba, y de ese
 * orden depende el primer cobro que se anuncia abajo.
 *
 * <p>`precioDespues` queda en `null` a propósito: la columna que lo pinta
 * rotula «al mes», y en el ciclo anual esa frase sería falsa.
 */
const lineasPrueba = computed<LineaPrueba[]>(() => {
  const cat = catalogo.value
  return cat ? lineasDePruebaDeSeleccion(modulos.value, cat) : []
})

/** El día siguiente al final de la prueba que termina antes, como en el paso 6. */
const primerCobro = computed(() => {
  const primera = lineasPrueba.value[0]
  return primera ? sumarDias(primera.trialEndDate, 1) : null
})

/**
 * El catálogo **llegó** y no trae ni un paquete publicable.
 *
 * <p>Exige `loaded` porque el catálogo se pide en un `onMounted`, que corre
 * DESPUÉS del primer render: sin eso, «todavía no hay paquetes publicados»
 * parpadea sobre una lista que llega medio segundo más tarde. Y descuenta el
 * error porque son dos frases distintas; «no pudimos cargarlo» ya tiene su
 * bloque con su reintento.
 */
const sinPaquetes = computed(() => loaded.value && !error.value && plans.value.length === 0)

/**
 * El paquete publicado que la selección reproduce ahora mismo, o `null` cuando
 * no reproduce ninguno.
 *
 * <p>Ya no es la condición para continuar: la intención sabe transportar la
 * lista de módulos y la autocontratación sabe cotizarla. Lo que decide es qué
 * línea viaja en la oferta — el paquete con su descuento, o `CORE` más cada
 * módulo marcado— y esa decisión la toma `lineasDeContratacion` con este mismo
 * criterio.
 */
const planElegido = computed(() => plans.value.find((p) => p.code === paquete.value?.code) ?? null)

/**
 * Lo único que hace falta es el catálogo, porque sin él no hay ni códigos de
 * módulo que guardar. El importe NO entra en la condición: si `/quotes/preview`
 * falló, la intención se guarda sin cifra vista —que apaga la comparación de
 * deriva, no el camino— y el paso vinculante vuelve a cotizar.
 */
const puedeContinuar = computed(() => catalogo.value !== null)

/**
 * Guarda la intención y salta al paso siguiente, que **no es el mismo para
 * todos**: el registro para un prospecto, el paso vinculante para un cliente
 * que ya tiene sesión y todavía no ha contratado (ver `destinoTrasElegir`).
 *
 * <p>La query solo viaja en la rama del registro: es lo que alimenta el carril
 * «Tu selección» y hace el enlace compartible. El paso vinculante no la lee.
 */
function continuar() {
  if (!puedeContinuar.value) return
  const plan = planElegido.value
  const capacidades = { ciclo: ciclo.value, sedes: sedes.value, usuarios: usuarios.value }

  elegir(
    plan
      ? { ...capacidades, plan, modulos: modulos.value }
      : {
          ...capacidades,
          plan: null,
          modulos: modulos.value,
          // El subtotal del SERVIDOR, y sólo cuando el ciclo ya es mensual:
          // dividir un importe anual entre doce para poder comparar sería
          // aritmética de dinero en el cliente sobre la cifra que dispara el
          // aviso de deriva. Sin las dos cifras no hay comparación, que es lo
          // correcto.
          importeVistoMensual:
            ciclo.value === 'MENSUAL' ? (cotizacion.value?.subtotal ?? null) : null,
        },
  )

  if (destinoTrasElegir.value === 'contratar') {
    void router.push({ name: 'contratar' })
    return
  }
  void router.push({
    name: 'signup',
    query: {
      // Sin paquete no viaja ningún `plan`: el carril «Tu selección» del alta
      // pinta el nombre del paquete, y mandar uno que la selección no reproduce
      // le enseñaría al prospecto una elección que no hizo.
      ...(plan ? { plan: plan.code } : {}),
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
         Inicia sesión» sería una frase falsa, y además le dejaría sin salida:
         `PublicLayout` no trae la navegación de la app. -->
    <template #topRight>
      <template v-if="isAuthenticated">
        <RouterLink :to="{ name: 'home' }">Volver a mi tablero</RouterLink>
      </template>
      <template v-else>
        ¿Ya tienes cuenta? <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
      </template>
    </template>

    <div class="pl-page">
      <PasosEmbudo :actual="1" class="pl-pasos" />

      <div class="pl-head">
        <!-- El `<h1>` vive AQUÍ y no dentro del asistente, y es deliberado: el
             panel monta y desmonta sus estados, así que un `<h1>` suyo
             desaparecería del documento en cuanto llegara la propuesta. -->
        <h1 ref="h1" class="pub-title" tabindex="-1">Esto es lo que te armamos</h1>
        <p class="pub-sub">
          Ajusta lo que quieras. El importe de la derecha se mueve contigo, y no te compromete a
          nada.
        </p>
        <!-- El indicador de moneda va AQUÍ, una vez por pantalla, y no pegado a
             cada cifra: ver `MONEDA_DE_FACTURACION`. -->
        <p class="pl-moneda">Todos los precios están en {{ MONEDA_DE_FACTURACION }}, sin IVA.</p>
      </div>

      <div v-if="error" class="pub-error" role="alert">
        <p class="pl-state-title">No pudimos cargar los planes</p>
        <p class="pl-state-text">
          Puedes crear tu cuenta igualmente y ver el precio exacto antes de confirmar.
        </p>
        <button type="button" class="pl-retry pub-focus-ring" @click="refresh">
          <RefreshCw :size="14" :stroke-width="1.8" aria-hidden="true" />
          Volver a intentarlo
        </button>
      </div>

      <p v-else-if="loading" class="pl-state-text">Cargando los planes…</p>

      <div class="pl-grid">
        <div class="pl-col">
          <!-- Tarjeta 1. El panel conserva su propio encabezado y su etiqueta de
               campo: lo único que cambia es dónde vive su cuadro de texto. -->
          <section class="pl-card">
            <AsistentePanel :sin-paquetes="sinPaquetes" />
          </section>

          <section class="pl-card" aria-labelledby="modulos-h2">
            <h2 id="modulos-h2" class="pub-card-t">Tus módulos</h2>
            <PlanesTarjetaModulos
              v-model:ciclo="ciclo"
              v-model:sedes="sedes"
              v-model:usuarios="usuarios"
              :catalogo="catalogo"
              :modulos="modulos"
              @alternar="(code, marcado) => void alternarModulo(code, marcado)"
            />

            <!-- El salto de precio al deshacer una combinación se EXPLICA. Sin
                 esto se lee como un error de cálculo: los paquetes llevan
                 descuento y los módulos sueltos no. -->
            <div v-if="saltoDePaquete" class="ds-banner ds-banner--warning pl-salto" role="status">
              <p class="pl-salto-tx">{{ saltoDePaquete.texto }}</p>
              <button type="button" class="pl-salto-btn pub-focus-ring" @click="volverAlPaquete">
                Volver a {{ saltoDePaquete.paquete.nombre }}
              </button>
            </div>
          </section>

          <section class="pl-card" aria-labelledby="pruebas-h2">
            <h2 id="pruebas-h2" class="pub-card-t">Cuándo empieza a costar</h2>
            <p class="pub-card-sub">Estas son las fechas si contratas hoy.</p>
            <TrialLinesTable :lineas="lineasPrueba" class="pl-pruebas" />
          </section>

          <!-- Tarjeta 4. El encabezado cambia con el estado, y no es cosmética:
               «O parte de una combinación conocida» encima de un hueco es una
               instrucción que la pantalla no puede cumplir. -->
          <section class="pl-card pl-paquetes" aria-labelledby="paquetes-h2">
            <h2 id="paquetes-h2" class="pub-card-t">
              {{
                sinPaquetes
                  ? 'Todavía no hay paquetes publicados'
                  : 'O parte de una combinación conocida'
              }}
            </h2>

            <!-- El vacío se ANUNCIA: es contenido, no la ausencia de contenido.
                 Sin `role="status"` quien navega con lector se queda esperando
                 una lista de precios que nunca va a llegar. -->
            <p v-if="sinPaquetes" class="pub-card-sub" role="status" data-testid="planes-vacio">
              Todavía no hay paquetes con precio publicado. Escríbenos a
              <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y te decimos qué
              podemos montarte hoy.
            </p>
            <PlanesCombinaciones
              v-else
              :plans="plans"
              :catalogo="catalogo"
              :ciclo="ciclo"
              :paquete-actual="paquete"
              @sembrar="sembrarModulos"
            />
          </section>
        </div>

        <PlanesResumenAside
          :catalogo="catalogo"
          :modulos="modulos"
          :ciclo="ciclo"
          :estado="estado"
          :importe="importe"
          :cotizacion="cotizacion"
          :primer-cobro="primerCobro"
          :mensaje-de-fallo="mensajeDeFallo"
          :region-viva="regionViva"
          :puede-continuar="puedeContinuar"
          @continuar="continuar"
        />
      </div>
    </div>
  </PublicLayout>
</template>

<style scoped>
.pl-page {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 0 0;
}

.pl-pasos {
  margin-bottom: 36px;
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

.pl-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 32px;
  align-items: start;
}

.pl-col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pl-card {
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--pub-line-strong);
  background: var(--pub-surface);
}

/* Solo separación y disposición: el aspecto lo pone `.ds-banner--warning`. */
.pl-salto {
  margin-block-start: 16px;
}

.pl-salto-tx {
  margin: 0;
}

.pl-salto-btn {
  margin-block-start: 10px;
  min-block-size: 40px;
  padding-inline: 14px;
  border-radius: 9px;
  border: 1px solid var(--pub-ame-600);
  background: var(--pub-surface);
  color: var(--pub-ame-700);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.pl-pruebas {
  margin-block-start: 14px;
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

@media (width <= 900px) {
  .pl-grid {
    grid-template-columns: 1fr;
  }
}
</style>
