/**
 * LA TRANSFERENCIA INTERNACIONAL, Y LA LISTA QUE TIENE DOS LECTORES.
 *
 * ── El compromiso que este fichero mantiene desde este lado ────────────────
 * `environments/dev/locals.tf` del repositorio de infraestructura declara
 * `bedrock_routing_regions = ["us-east-1", "us-east-2", "us-west-2"]` y deja
 * escrito, en el comentario que la acompaña, que esa lista **tiene dos lectores
 * y ninguno de los dos puede adivinarla**: la política de IAM, que necesita el
 * modelo base de las tres regiones o produce un `AccessDeniedException`
 * intermitente; y el texto legal, porque lo que el consentimiento del prospecto
 * tiene que nombrar es exactamente esta lista. Ampliarla —o pasar al perfil de
 * inferencia global, que enruta a todas las regiones soportadas— obliga a
 * cambiar la política de privacidad ANTES, no después.
 *
 * Este módulo es ese segundo lector. La lista se escribe aquí una sola vez, la
 * pinta la política, la nombra la casilla de consentimiento y la fija una prueba
 * unitaria. No se deriva de ninguna variable de entorno a propósito: una lista
 * de regiones que cambia sola al desplegar es exactamente el fallo que el
 * comentario del Terraform quiere impedir, porque el texto aceptado por el
 * prospecto dejaría de corresponder al destino real sin que nadie lo firmara.
 *
 * ── Qué dice la ley colombiana sobre esto ──────────────────────────────────
 * El artículo 26 de la Ley 1581 de 2012 prohíbe transferir datos a países sin
 * nivel adecuado de protección, y su primera excepción es la autorización
 * expresa e inequívoca del Titular. Los Estados Unidos de América figuran en la
 * lista de países con nivel adecuado del numeral 3.2 de la Circular Externa 005
 * de 2017 de la Superintendencia de Industria y Comercio, así que la
 * transferencia no depende únicamente de esa excepción; pero el deber de
 * informar del artículo 12 no desaparece por ello, y la autorización expresa se
 * pide igual. Es la opción que sigue siendo válida si la SIC modifica su lista.
 */

/** Las tres regiones a las que el perfil de inferencia puede enrutar. */
export const REGIONES_BEDROCK = ['us-east-1', 'us-east-2', 'us-west-2'] as const

/** El destino, en la forma en que se nombra dentro del texto legal. */
export const DESTINO_TRANSFERENCIA = {
  encargado: 'Amazon Web Services, Inc.',
  servicio: 'Amazon Bedrock',
  pais: 'Estados Unidos de América',
} as const

/** «us-east-1, us-east-2 y us-west-2», para incrustar en una frase. */
export function regionesEnFrase(): string {
  const regiones = [...REGIONES_BEDROCK]
  const ultima = regiones.pop()
  return `${regiones.join(', ')} y ${ultima}`
}
