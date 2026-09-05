/**
 * Con qué llega armada la tarjeta de la portada: el relato de ejemplo del campo
 * y las casillas que ya vienen marcadas.
 *
 * ── Por qué la portada llega premarcada ─────────────────────────────────────
 * El efecto de los valores por defecto es la intervención conductual mejor
 * medida que aplica aquí: el metaanálisis de Jachimowicz, Duncan, Weber &
 * Johnson (2019, Behavioural Public Policy) reúne 58 estudios y N = 73.675 y
 * mide d = 0,68, muy por encima de otros empujones comparables.
 *
 * ── Las dos condiciones que lo separan de un patrón oscuro ──────────────────
 * La literatura sobre defaults éticos exige SALIDA SIN COSTE y DIVULGACIÓN
 * PROACTIVA, y aquí eso significa dos cosas concretas: desmarcar es un clic sin
 * confirmación, aviso ni nada que penalice quitar; y el conteo de lo marcado
 * junto con «no pagas los otros N módulos» están en pantalla desde el primer
 * momento, no al final del embudo. Quien quite cualquiera de las dos deja el
 * premarcado sin defensa, y entonces esta lista hay que vaciarla.
 *
 * <p>Vaciarla es el único gesto necesario para volver al estado anterior: sin
 * códigos no se marca nada, el rótulo de prueba social desaparece y la portada
 * queda como estaba.
 *
 * <p>`ELECTRONIC_INVOICING` queda fuera a propósito: es el único módulo sin
 * prueba gratis —se cobra desde el primer día— y premarcarlo sería cobrarle al
 * visitante por sorpresa.
 */
export const SELECCION_POR_DEFECTO: readonly string[] = [
  'SCHEDULING',
  'CLINICAL_HISTORY',
  'VACCINATION_DEWORMING',
  'CASH_REGISTER',
]

/**
 * El relato que se enseña junto al campo, como muestra de qué se espera ahí.
 *
 * <p>Va emparejado con {@link SELECCION_POR_DEFECTO}: describe exactamente el
 * negocio que esas cuatro casillas reproducen —la combinación «Consulta de
 * barrio»—. Cambiar uno de los dos sin revisar el otro deja la pantalla
 * contando un negocio y marcando otro.
 */
export const EJEMPLO_DE_NEGOCIO =
  'Somos una clínica veterinaria de barrio: atendemos con cita previa, llevamos la historia de ' +
  'cada paciente, aplicamos vacunas y desparasitación, y cobramos en el mostrador.'
