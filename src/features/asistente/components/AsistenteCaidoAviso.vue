<script setup lang="ts">
/**
 * `ASISTENTE_CAIDO` — el aviso que dice a dónde ir cuando el asistente no está.
 *
 * ── El defecto que cierra ───────────────────────────────────────────────────
 * El texto era uno solo y ofrecía **dos salidas**: «armar tu plan tú mismo aquí
 * abajo» y «elegir uno de nuestros paquetes». La primera es el catálogo manual,
 * y cuando `GET /catalog` responde 200 con todo vacío —no hay lista de precios
 * publicada, que es un estado NORMAL del negocio y no una avería— ahí abajo no
 * queda ni una casilla que marcar. El visitante lee una instrucción que la
 * pantalla no puede cumplir, en el paso donde decide la compra, y lo que
 * concluye es que la web está rota.
 *
 * ── ⚠️ Y «armar tu plan» tampoco funcionaba con el catálogo LLENO ───────────
 * El aviso decía la primera salida en las dos ramas, y no es cierta en ninguna:
 * **sin propuesta no hay nada que armar**. Con `propuesta === null`, marcar una
 * casilla del catálogo emite `anadir` → `empujarCarrito`, que sale en su primera
 * línea por `if (!actual || ...) return`; la casilla es controlada contra un
 * carrito que sigue vacío y no hay ningún botón de continuar. En la degradación
 * ese catálogo **es una lista de precios, no un configurador**, y el texto tiene
 * que decir eso y no otra cosa.
 *
 * ── El comentario que había aquí y por qué era falso ────────────────────────
 * Decía que la salida de los paquetes «se sirve de `PLANS_CONTENT` —contenido
 * local del front— y sigue llena con el catálogo comercial vacío». **Dejó de ser
 * cierto en `e48e9e0`**: los planes vienen de `GET /plans` y pueden llegar
 * vacíos, exactamente igual que los módulos. Mientras el comentario siguió ahí,
 * este aviso podía decir «empieza por uno de nuestros paquetes, aquí abajo»
 * sobre una sección que decía «Todavía no hay paquetes publicados» — el mismo
 * defecto que este componente existe para cerrar, entrando por la puerta de al
 * lado. Por eso {@link sinPaquetes} es una prop y no una suposición.
 *
 * ── Por qué es un componente y no un `v-if` más en el panel ─────────────────
 * `AsistentePanel.vue` es la máquina de estados de toda la feature y está a
 * pocas decenas de líneas del techo de 500 que `npm run css:budget` comprueba
 * con cero infractores tolerados. Es el criterio que `PropuestaOrigenAviso` y
 * `AsistenteFueraDeDominio` ya dejaron escrito: en el panel entran el `import`,
 * la etiqueta y sus props, y el porqué vive aquí.
 *
 * ── `status`, no `alert`, y sin robar el foco ───────────────────────────────
 * No hay nada que atender de inmediato: la pantalla sigue siendo comprable por
 * el otro camino. Y el foco no se mueve porque el cuadro de texto sigue montado
 * justo encima — quitárselo tras un envío fallido le arrebataría al visitante
 * el sitio donde estaba escribiendo.
 */
defineProps<{
  /**
   * El catálogo llegó **y vino sin un solo artículo vendible**.
   *
   * <p>Es `false` mientras la petición está en vuelo, y eso es deliberado:
   * hasta que la respuesta no vuelve no se puede afirmar que no haya nada, y
   * adelantarlo pintaría «no hay módulos» sobre un catálogo que llega medio
   * segundo después. La misma mentira, en la otra dirección.
   */
  catalogoVacio: boolean
  /**
   * `GET /plans` llegó **y no trajo ni un paquete publicable**
   * (`PlanesView.sinPaquetes`, que ya lo tiene calculado con su `loaded`).
   *
   * <p>Manda sobre {@link catalogoVacio} en el orden de las ramas porque es la
   * salida que el texto **ofrece**: prometer paquetes que no existen es el
   * defecto; no poder ofrecer módulos es solo una salida menos.
   *
   * <p>⚠️ **Y una sola rama cubre las dos combinaciones, a propósito.** El caso
   * «sin paquetes pero con módulos publicados» es alcanzable —`plans.source.ts`
   * descarta entero (`publicable`) el paquete tarifado en un solo ciclo, así que
   * puede haber tarifa con módulos y sin paquetes—, y por eso la frase habla de
   * **lo que el visitante puede contratar** y no de lo que hay publicado. Decir
   * «no hay nada publicado con precio» sería falso con módulos abajo; decir «no
   * hay ningún paquete que puedas contratar por aquí» es cierto en las dos,
   * porque en la degradación esos módulos **no se pueden contratar solos**: sin
   * propuesta el catálogo es una lista de precios (ver el bloque de arriba). La
   * salida real es la misma en los dos casos —soporte—, así que una cuarta
   * variante solo añadiría una frase que decir mal.
   */
  sinPaquetes: boolean
}>()
</script>

<template>
  <div class="ds-banner ds-banner--warning acai" role="status" data-testid="asistente-caido">
    <template v-if="sinPaquetes">
      El asistente no está disponible ahora mismo y todavía no hay ningún paquete que puedas
      contratar por aquí. Escríbenos a
      <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y te decimos qué podemos montarte
      hoy.
    </template>
    <template v-else-if="catalogoVacio">
      El asistente no está disponible ahora mismo, y todavía no hay módulos publicados para que
      armes tu plan pieza a pieza. Escríbenos a
      <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y te decimos qué podemos montarte
      hoy.
    </template>
    <template v-else>
      El asistente no está disponible ahora mismo. Arriba tienes los módulos con su precio: puedes
      armar tu plan tú mismo.
    </template>
  </div>
</template>

<style scoped>
.acai {
  margin-block: 12px;
  font-size: 13px;
  line-height: 1.55;
}
</style>
