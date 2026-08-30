/**
 * Los topes y los textos que TIENEN que estar en un solo sitio porque algo los
 * comprueba.
 *
 * <p>No es un fichero de literales por gusto de centralizar: lo que está aquí es
 * lo que una prueba afirma, o lo que dos componentes tienen que decir con las
 * mismas palabras. El copy que solo usa un componente vive en su plantilla,
 * donde se lee al lado del marcado que lo pinta.
 */

/**
 * Mínimo del texto de entrada. **15, y el backend comparte el número.**
 *
 * <p>La v2 del plan declaraba `@Size(min=30)` en el DTO contra estos 15. Un
 * formulario que el front deja pasar y el servidor rechaza con un 400 se lee
 * como «la aplicación está rota», y el usuario no tiene forma de saber que le
 * faltaban quince caracteres.
 *
 * <p>Y no sube a 40 «para forzar detalle»: «Clínica de barrio, consulta general
 * y vacunas» son 38 caracteres y bastan para proponer Historia clínica,
 * Vacunación y Agenda. Un umbral de 40 castiga a quien escribe bien y corto, que
 * es exactamente el usuario con prisa que este producto tiene. El texto corto
 * pero pobre no lo bloquea el tope: lo resuelve el modelo con `understood =
 * false`, que es una pantalla útil en vez de un error.
 */
export const MIN_DESCRIPCION = 15

/** Máximo del texto de entrada. Espeja el `maxlength` del `<textarea>`. */
export const MAX_DESCRIPCION = 1000

/**
 * Mínimo de un refinamiento. **10, no 15.**
 *
 * <p>Es un añadido sobre una descripción que ya existe, no una descripción. Y
 * tiene una consecuencia medible: los botones de relleno rápido de abajo miden
 * 17, 26 y 30 caracteres, así que con cualquier mínimo por encima de 17 la
 * propia interfaz ofrece un botón que el servidor rechaza. Eso es el peor fallo
 * que puede tener un formulario — el usuario hizo literalmente lo que se le
 * indicó y el mensaje le habla de una longitud que él no eligió.
 */
export const MIN_REFINAMIENTO = 10

/** Máximo de un refinamiento. Espeja el `maxlength` del `<textarea>` corto. */
export const MAX_REFINAMIENTO = 400

/**
 * Cuántos refinamientos caben.
 *
 * <p>**Por qué hay tope:** cada uno es una llamada a un modelo con coste real en
 * un endpoint público y anónimo. Sin tope, la pantalla es una factura abierta a
 * cualquiera con `curl`. **Por qué tres y no uno:** el primero es el previsible
 * («se me olvidó la peluquería»), el segundo el legítimo («y tenemos dos
 * sedes»). **Por qué no diez:** a partir del tercero el patrón no es afinar, es
 * probar suerte, y la respuesta correcta a eso no es un cuarto intento.
 */
export const MAX_REFINAMIENTOS = 3

/**
 * Los tres rellenos rápidos del cuadro de refinamiento.
 *
 * <p>**Rellenan el campo, no envían.** Un botón que dispara una llamada de pago
 * con un texto que el usuario no ha leído es un gasto que él no autorizó.
 *
 * <p>`asistente-copy.spec.ts` afirma que ninguno mide menos que
 * {@link MIN_REFINAMIENTO}. Son cuatro líneas de prueba y se caen el día que
 * alguien acorte un botón o suba el mínimo. Sin ellas esto vuelve, y vuelve en
 * producción: en desarrollo nadie pulsa los botones de relleno.
 */
export const RELLENOS_RAPIDOS: readonly string[] = [
  'Tenemos dos sedes',
  'También hacemos peluquería',
  'Vendemos alimento y accesorios',
]

/**
 * Las frases de la espera, con el segundo en que entra cada una.
 *
 * <p>Van las tres a la MISMA región `aria-live`, sustituyendo su contenido: tres
 * regiones distintas producirían tres interrupciones apiladas. Y con
 * `role="status"`, no `alert`: no ha fallado nada.
 */
export const FRASES_ESPERA: readonly { desdeMs: number; texto: string }[] = [
  { desdeMs: 0, texto: 'Estamos leyendo lo que nos contaste.' },
  { desdeMs: 3000, texto: 'Seguimos armando tu propuesta. Suele tardar unos segundos.' },
  { desdeMs: 8000, texto: 'Está tardando más de lo normal. Puedes cancelar y elegir un paquete.' },
]

/** Cuándo aparece «Cancelar». Adelantado a propósito: aparecer en el umbral llega tarde. */
export const CANCELAR_DESDE_MS = 8000

/**
 * Techo duro del `AbortController`. **35 s, y nunca por debajo del servidor.**
 *
 * <p>El presupuesto de tiempo se declara de fuera hacia dentro: cliente del
 * modelo 25 s, petición HTTP del servidor por debajo del balanceador, y este por
 * encima de los dos. Con un techo más bajo que el del servidor, el navegador
 * aborta mientras el servidor sigue esperando: el prospecto ve un error, la
 * invocación se paga igual, y —peor— reintenta, lo que duplica el gasto por cada
 * espera larga.
 *
 * <p>⚠️ Cancelar en el navegador **no cancela la invocación ni devuelve el
 * gasto**. El botón devuelve el control al usuario; el copy no insinúa otra cosa.
 */
export const TIMEOUT_MS = 35_000
