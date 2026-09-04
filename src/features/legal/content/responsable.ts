/**
 * EL RESPONSABLE DEL TRATAMIENTO — Y LO QUE TODAVÍA NO EXISTE.
 *
 * ── Por qué este fichero está a medias A PROPÓSITO ─────────────────────────
 * Una política de tratamiento de datos SIN responsable identificado no es una
 * política incompleta: es una política nula. El artículo 2.2.2.25.3.1 del
 * Decreto 1074 de 2015 abre la lista de contenidos mínimos con «nombre o razón
 * social, domicilio, dirección, correo electrónico y teléfono del Responsable»,
 * y el artículo 12 de la Ley 1581 de 2012 obliga a informar quién es ANTES de
 * pedir la autorización. Si no se sabe a quién se autoriza, no hay autorización.
 *
 * La sociedad todavía no está constituida: no hay razón social ni NIT. La salida
 * correcta NO es escribir un nombre verosímil y cambiarlo luego —eso produce un
 * documento que parece válido, se publica, y nadie vuelve a mirarlo—. La salida
 * es un marcador que **no se puede confundir con un dato real** y que arrastra
 * consecuencias visibles:
 *
 *   1. Se ve en pantalla, en mayúsculas y entre flechas, dentro del propio texto
 *      legal. Un revisor no puede leerse la página y no verlo.
 *   2. Marca los dos documentos como BORRADOR (`esBorrador`), lo que pinta un
 *      recuadro rojo permanente en la cabecera de cada uno.
 *   3. `tests/unit/legal-documents.spec.ts` fija la equivalencia entre «queda
 *      algún marcador» y «el documento es borrador», así que rellenar la mitad
 *      de los campos no apaga el aviso.
 *
 * ── Qué hay que hacer para cerrarlo ────────────────────────────────────────
 * Sustituir cada `pendiente(...)` por el dato real de la sociedad constituida y
 * volver a publicar la versión en el backend (`POST /legal-documents`). Al
 * desaparecer el último marcador, `esBorrador` pasa a `false` y el recuadro rojo
 * se apaga solo. No hay ningún interruptor que tocar.
 */

/**
 * La marca. Es un prefijo y no un valor completo para que una búsqueda de texto
 * la encuentre entera en cualquier campo, y para que `tienePendientes` no
 * dependa de conocer la lista de campos.
 */
export const MARCA_PENDIENTE = '>>> FALTA POR DEFINIR:'

/** Construye un marcador imposible de leer como un dato. */
export function pendiente(que: string): string {
  return `${MARCA_PENDIENTE} ${que.toUpperCase()} <<<`
}

/**
 * Los datos del responsable.
 *
 * <p>`canalCorreo` NO es un marcador porque es la única dirección que este
 * producto ya publica (el pie de la portada la usa desde antes que este
 * documento existiera), y un canal de ejercicio de derechos que no recibe correo
 * incumple el artículo 17 igual que uno que no se nombra. Sigue siendo una
 * decisión a confirmar: lo habitual es un buzón dedicado de habeas data.
 */
export const RESPONSABLE = {
  razonSocial: pendiente('razón social del responsable del tratamiento'),
  nit: pendiente('NIT del responsable del tratamiento'),
  domicilio: pendiente('domicilio y dirección física del responsable'),
  telefono: pendiente('teléfono de contacto del responsable'),
  canalCorreo: 'soporte@kefaro.tech',
  areaResponsable: 'Área de Protección de Datos Personales',
} as const

/** `true` si el texto arrastra algún marcador sin resolver. */
export function tienePendientes(texto: string): boolean {
  return texto.includes(MARCA_PENDIENTE)
}
