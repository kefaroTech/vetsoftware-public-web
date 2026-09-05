<script setup lang="ts">
import { computed } from 'vue'
import type { EsperaLimite } from '../types/asistente.types'

/**
 * `LIMITE_ALCANZADO` — se agotó el cupo de propuestas, y se dice con su nombre.
 *
 * ── El defecto que cierra ───────────────────────────────────────────────────
 * Un 429 caía en el `catch` genérico de `generar` y la pantalla contaba lo del
 * asistente caído: «El asistente no está disponible ahora mismo, y todavía no
 * hay módulos publicados… Puedes empezar por uno de nuestros paquetes». Al
 * visitante se le hablaba de **módulos** cuando lo que había pasado era que
 * agotó su **cupo**, y de paso se le acusaba a la casa de una avería que no
 * hubo. Peor todavía: aquel camino **sumaba a `fallos`**, así que dos límites
 * seguidos degradaban la pantalla de verdad. Eso se arregla en el store; esto
 * es la mitad que se lee.
 *
 * ── Por qué el tono es aviso y no error ─────────────────────────────────────
 * `--warning` y no `--error`, igual que `ENLACE_CADUCADO`: no ha fallado nada.
 * El límite existe a propósito, el asistente funciona, y lo único que cambió es
 * que este visitante ya no tiene turnos ahora mismo.
 *
 * ── «No es un fallo» va primero, y no es cortesía ───────────────────────────
 * Sin esa frase el visitante asume que el problema era **su texto** y lo
 * reescribe: trabajo perdido, y encima gastando otro intento que ya no tiene.
 * Es el mismo razonamiento que la frase «Fue un problema nuestro, no de lo que
 * escribiste» sostiene en `ERROR_MODELO`, en la dirección contraria.
 *
 * ── Sin botón de reintentar, y es deliberado ────────────────────────────────
 * Un botón que va a fallar de forma determinista es el peor caso de todos:
 * invita a gastar un intento que el servidor va a rechazar y confirma la
 * sensación de avería. El cuadro de texto sigue montado justo encima —lo dice
 * el propio aviso—, así que quien quiera reintentar puede; lo que no hacemos es
 * invitarle.
 *
 * ── `status`, no `alert`, y sin robar el foco ───────────────────────────────
 * Mismo criterio que `AsistenteCaidoAviso`: no hay nada que atender de
 * inmediato, y mover el foco tras un envío fallido le arrebataría al visitante
 * el sitio donde estaba escribiendo.
 *
 * ── Por qué es un componente y no un `v-if` más en el panel ─────────────────
 * `AsistentePanel.vue` es la máquina de estados de toda la feature y está a
 * pocas decenas de líneas del techo de 500 que `npm run css:budget` comprueba
 * con cero infractores tolerados. En el panel entran el `import`, la etiqueta y
 * sus props; el porqué vive aquí. Es el criterio que `PropuestaOrigenAviso`,
 * `AsistenteFueraDeDominio` y `AsistenteCaidoAviso` ya dejaron escrito.
 *
 * <p>Las clases del cuerpo se replican en vez de reusar las del panel
 * (`apan-aviso-t` / `apan-aviso-p`) porque aquel bloque `<style>` es `scoped`:
 * sus nombres no cruzan la frontera del componente. La pieza visual es la misma
 * que la de `ENLACE_CADUCADO`, a propósito. **Lo que eso cuesta está medido y
 * anotado junto al `<style>` de abajo: este es el tercer y último banner que
 * puede copiar esos dos cuerpos antes de que `css:budget` corte.**
 *
 * ── La frase sin paquetes NO afirma qué hay publicado, y es deliberado ──────
 * `AsistenteCaidoAviso` tuvo que corregir la suya porque decía «no hay nada
 * publicado con precio», que es falso cuando hay módulos y lo que falta son los
 * paquetes. Aquí no aplica: la variante sin paquetes no describe el catálogo,
 * solo ofrece la única salida que queda —una persona—, y eso es cierto en las
 * dos combinaciones. Revisado a propósito, no por omisión.
 */
const props = defineProps<{
  /**
   * No hay ni un paquete publicado con precio (`PlanesView.sinPaquetes`).
   *
   * <p>Es `false` mientras la petición de `GET /plans` está en vuelo, igual que
   * `catalogoVacio`: hasta que la respuesta no vuelve no se puede afirmar que no
   * haya nada, y adelantarlo sería la misma mentira en la otra dirección.
   */
  sinPaquetes: boolean
  /** Lo que dijo `Retry-After`, si el navegador pudo leerlo. Ver {@link EsperaLimite}. */
  espera: EsperaLimite
}>()

/**
 * El plazo, en palabras.
 *
 * <p>«más tarde» es el caso por defecto y **no es vaguedad**: hay tres límites
 * simultáneos —5/h por IP, 3/día por correo, N/día por IP— y desde el navegador
 * no se sabe cuál saltó. «En una hora» sería mentira en dos de los tres casos, y
 * una mentira que además invita a volver a fallar.
 */
const cuando = computed(() =>
  props.espera === 'HORA' ? 'dentro de una hora' : props.espera === 'DIA' ? 'mañana' : 'más tarde',
)
</script>

<template>
  <div class="ds-banner ds-banner--warning alim" role="status" data-testid="asistente-limite">
    <p class="alim-t">Has alcanzado el límite de propuestas</p>
    <!-- Sin paquetes no se ofrece «aquí abajo» nada, porque aquí abajo no hay
         nada: la salida honesta es una persona. Ofrecer el catálogo manual
         tampoco vale — sin propuesta, marcar una casilla no hace nada (ver el
         comentario de `AsistenteCaidoAviso`). -->
    <p v-if="sinPaquetes" class="alim-p">
      No es un fallo: limitamos cuántas propuestas se piden desde un mismo sitio. Lo que escribiste
      sigue ahí arriba, tal como lo dejaste. Escríbenos a
      <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y te armamos el plan a mano.
    </p>
    <p v-else class="alim-p">
      No es un fallo: limitamos cuántas propuestas se piden desde un mismo sitio. Lo que escribiste
      sigue ahí arriba, tal como lo dejaste. Puedes volver a intentarlo {{ cuando }}, o armar tu
      plan con los módulos de arriba.
    </p>
  </div>
</template>

<style scoped>
/* ⚠️ TECHO ALCANZADO — lee esto antes de copiar estas reglas a un banner nuevo.
   `css:budget` falla cuando un mismo cuerpo normalizado aparece en MÁS de 3
   componentes (`maxDuplicateBodies: 3`, `maxDuplicateGroups: 0`, y los techos
   son un trinquete que solo baja). Estos dos cuerpos van ya por tres:

     · `.alim`   = `.acai` (AsistenteCaidoAviso) + `.apan-aviso` (AsistentePanel)
     · `.alim-t` = `.apan-aviso-t` (AsistentePanel) + `.pl-state-title` (PlanesView)

   El cuarto banner que los copie pone la cadena en rojo, y la salida NO es subir
   el número: es que esa pieza suba a `primitives.css` como primitiva propia —lo
   que la regla `vetsoftware/no-duplicate-primitive` viene diciendo desde el
   momento de escribirla—. `.alim-p` es de una sola declaración y no cuenta. */
.alim {
  margin-block: 12px;
  font-size: 13px;
  line-height: 1.55;
}

.alim-t {
  margin: 0;
  font-weight: 700;
}

.alim-p {
  margin: 4px 0 0;
}
</style>
