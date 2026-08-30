import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import {
  conocePropuesta,
  esPropuestaNoEncontrada,
  recuperarPorToken,
  releerPropuesta,
} from '../api/asistente.source'
import { usePropuestaStore } from '../stores/propuesta.store'

/**
 * EL ENLACE DEL CORREO, CONECTADO.
 *
 * ── El hueco que esto cierra ────────────────────────────────────────────────
 * El backend le manda al prospecto anónimo un correo con
 * `<base>/?token=<43 caracteres>`. Hasta ahora **nadie leía ese parámetro**: los
 * dos únicos sitios del front que sacaban un token de la URL eran restablecer
 * contraseña y verificar correo, y ninguno está en esta feature. El prospecto
 * pulsaba, aterrizaba en la landing, y la landing no sabía que traía una
 * propuesta encima.
 *
 * ── Por qué el token vive aquí y no en el store ─────────────────────────────
 * Es la única frontera de seguridad de toda la feature: sin cuenta, sin sesión y
 * sin empresa, lo único que separa la propuesta de un prospecto de la de otro es
 * que esos 43 caracteres sean imposibles de adivinar. La cabecera de
 * `asistente.source.ts` prohíbe por escrito dos cosas —el token en un segmento
 * de ruta y el token dentro de un store de Pinia— y las dos siguen sin ocurrir:
 * el token entra por la cadena de consulta, se lo pasa este composable **al
 * seam** y nunca cruza el borde del store. Lo que el store recibe es el
 * resultado ya mapeado, que lleva el identificador opaco y ninguna credencial.
 *
 * <p>Y no viaja como argumento de una acción de Pinia a propósito: las devtools
 * registran los argumentos de cada acción en su línea de tiempo, así que
 * `store.recuperar(token)` lo publicaría en el mismo sitio del que se sacó al
 * moverlo fuera de la ruta.
 *
 * ── Por qué la URL se limpia, y por qué con `replace` ───────────────────────
 * No es cosmético. `RequestLoggingContextFilter` mete `getRequestURI()` en el
 * contexto de log de toda petición y ningún patrón del redactor casa con 43
 * caracteres de base64url: por eso el backend puso el token en `?token=` y no en
 * la ruta. Del lado del navegador queda la otra mitad del problema — la barra de
 * direcciones, el historial y cualquier captura de pantalla de esa pestaña—, y
 * se cierra sustituyendo la entrada del historial en vez de añadir una. Con un
 * `push`, «atrás» devolvería al prospecto a la URL con el token dentro y la
 * entrada seguiría en el historial del navegador para siempre.
 */
export function useRecuperarPropuesta() {
  const route = useRoute()
  const router = useRouter()
  const store = usePropuestaStore()
  const toast = useToast()

  /**
   * La forma del token: 32 bytes en base64url sin relleno, **43 caracteres**.
   *
   * <p>Se comprueba antes de gastar un viaje, y sobre todo porque los clientes
   * de correo cortan y envuelven URLs largas: un enlace truncado produce un
   * token de 39 caracteres que el servidor contestaría con el mismo 404. Para el
   * usuario los dos casos son la misma frase —«este enlace ya no sirve»— y así
   * el endpoint público no recibe la petición de un token que no puede existir.
   */
  const FORMA_TOKEN = /^[A-Za-z0-9_-]{43}$/

  /** El `?token=` de la URL, o `null` si esta visita no trae ninguno. */
  function tokenDeLaUrl(): string | null {
    const crudo = route.query.token
    const valor = Array.isArray(crudo) ? crudo[0] : crudo
    return typeof valor === 'string' && valor.length > 0 ? valor : null
  }

  /**
   * Lleva al panel **quitando el token de la barra**, con `replace`.
   *
   * <p>El destino es siempre `/planes`: es donde vive el panel del asistente, y
   * el enlace del correo apunta a la raíz (`link-base-url` + `/?token=`), donde
   * no hay ninguna propuesta que pintar. El resto de la cadena de consulta se
   * conserva —un `?ciclo=ANUAL` que venga con el enlace sigue valiendo—; lo
   * único que se descarta es el token.
   */
  async function irAlPanelSinToken(): Promise<void> {
    const { token: _token, ...resto } = route.query
    await router.replace({ name: 'planes', query: resto })
  }

  /**
   * El camino del correo: hidrata la propuesta que trae el enlace.
   *
   * <p>Sin token no hace absolutamente nada —ni toca el estado— porque lo llaman
   * dos pantallas y la inmensa mayoría de las visitas llegan sin enlace. En
   * particular, tras limpiar la URL la navegación monta el panel, que vuelve a
   * llamar aquí: esa segunda llamada tiene que ser inocua o borraría el
   * `RECUPERANDO` que la primera acaba de poner.
   */
  async function recuperarDeEnlace(): Promise<void> {
    const token = tokenDeLaUrl()
    if (token === null) return

    // El estado se pone ANTES de navegar: el panel tiene que montar ya
    // recuperando, o enseñaría el cuadro de texto vacío mientras llega la
    // propuesta y el prospecto escribiría encima de lo que está en camino.
    store.comenzarRecuperacion()
    await irAlPanelSinToken()

    if (!FORMA_TOKEN.test(token)) {
      store.marcarEnlaceCaducado()
      return
    }

    try {
      store.adoptarRecuperada(await recuperarPorToken(token))
    } catch (e) {
      // 404 = no existe **o** caducó, colapsados a propósito por el servidor
      // para no ser un oráculo. Para el usuario es una sola cosa y no es una
      // avería: el enlace tenía fecha y el correo se la dijo.
      if (esPropuestaNoEncontrada(e)) {
        store.marcarEnlaceCaducado()
        return
      }
      // Cualquier otra cosa sí es un fallo nuestro. El texto del error no se
      // escribe a mano: `errorFrom` saca el mensaje del ProblemDetail y el
      // X-Trace-Id, que es lo que soporte necesita para correlacionar.
      toast.errorFrom('No pudimos recuperar tu propuesta', e)
      store.marcarRecuperacionFallida()
    }
  }

  /**
   * El otro camino: la banda de «sigue donde lo dejaste» de la landing, cuando
   * lo pendiente es una propuesta y no un paquete.
   *
   * <p>Entra el identificador **opaco** y no el token: quien llama a esto no
   * sostiene ninguna credencial, solo le pide al seam que relea con la que él ya
   * tiene guardada. Devuelve si había con qué, para que la banda no prometa
   * retomar algo que este dispositivo ya no puede recuperar.
   */
  async function recuperarGuardada(propuestaId: string): Promise<boolean> {
    if (!conocePropuesta(propuestaId)) return false

    store.comenzarRecuperacion()
    try {
      store.adoptarRecuperada(await releerPropuesta(propuestaId))
    } catch (e) {
      if (esPropuestaNoEncontrada(e)) {
        store.marcarEnlaceCaducado()
        return true
      }
      toast.errorFrom('No pudimos recuperar tu propuesta', e)
      store.marcarRecuperacionFallida()
    }
    return true
  }

  return { recuperarDeEnlace, recuperarGuardada, conocePropuesta }
}
