import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { branchApi } from '../api/branch.api'
import type { BranchResponse, SaveBranchRequest } from '../types/branch.types'
import { getProblemDetailMessage, setBranchResolver } from '@/services/http/http.client'
import { SELECTED_BRANCH_KEY } from '@/constants/storageKeys'
import { useAuthStore } from '@/features/auth/stores/auth.store'

function loadSelected(): number | null {
  const raw = localStorage.getItem(SELECTED_BRANCH_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export const useBranchStore = defineStore('branch', () => {
  const branches = ref<BranchResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)
  // Sede seleccionada, persistida entre sesiones. null = sin sede resuelta todavía.
  const selectedBranchId = ref<number | null>(loadSelected())
  // El alcance del empleado (`me.branchIds`) es parte de la resolución de la sede activa, así
  // que el store de sesión se lee aquí arriba y no solo en el watcher del final.
  const auth = useAuthStore()

  // Promesa in-flight para deduplicar fetches concurrentes (patrón de catálogo).
  let inFlight: Promise<void> | null = null

  async function fetchAll(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (inFlight) return inFlight
    loading.value = true
    error.value = null
    inFlight = branchApi
      .listAll()
      .then((list) => {
        branches.value = list
        loaded.value = true
        // Con el listado en la mano se resuelve la sede activa: la persistida si sigue
        // siendo operable, y si no la primera que lo sea.
        resolveSelectedBranch()
      })
      .catch((e) => {
        // Sin permiso de lectura de sucursales u otro error: el selector simplemente no se mostrará.
        error.value = getProblemDetailMessage(e, 'No se pudieron cargar las sucursales')
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  /**
   * Sedes sobre las que este usuario puede operar: activas ∩ asignadas explícitamente en
   * `/auth/me`. Es el mismo conjunto que pinta el selector (`useBranches.visibleBranches`),
   * declarado aquí porque la regla es del dato, no de la pantalla.
   */
  function operableBranchIds(): number[] {
    const assigned = auth.me?.branchIds ?? []
    return branches.value.filter((b) => b.active && assigned.includes(b.id)).map((b) => b.id)
  }

  /**
   * Resuelve la sede activa: si la seleccionada sigue siendo operable se queda, y si no
   * (nunca hubo, se desactivó, se retiró la asignación) cae a la primera operable.
   *
   * Vivía en el `watch` de `useBranches` (issue #201), es decir en un COMPONENTE: hasta que
   * el selector no se montaba, `selectedBranchId` era null de verdad y toda escritura salía
   * sin sede — `withBranchBody` la omite cuando es null y el backend responde 400
   * `branchId is required` a quien tiene dos o más sedes. La garantía tiene que estar donde
   * vive el dato, y por eso también la dispara el arranque de sesión de más abajo: ya no
   * depende de que una pantalla concreta se haya montado.
   */
  function resolveSelectedBranch(): void {
    // Sin listado no hay nada que resolver: la selección persistida se respeta hasta que llegue.
    // Y sin perfil tampoco se decide: `me.branchIds` es la mitad del criterio, así que resolver
    // antes de que llegue descartaría una sede persistida perfectamente válida y le cambiaría
    // la sucursal al usuario por debajo. El watcher de `me` vuelve a intentarlo cuando llega.
    if (!loaded.value || auth.me == null) return
    const ids = operableBranchIds()
    if (selectedBranchId.value != null && ids.includes(selectedBranchId.value)) return
    // Sin sedes operables no se inventa ninguna: se limpia lo que hubiera persistido, que ya
    // no corresponde a una sede sobre la que se pueda operar.
    setSelectedBranch(ids[0] ?? null)
  }

  /**
   * Sede activa garantizada: carga el listado si aún no está y resuelve la selección antes de
   * responder. Punto al que debe acudir cualquier flujo que NECESITE la sede y no pueda
   * asumir que ya se resolvió (la resolución arranca con la sesión, pero es una petición y
   * puede no haber vuelto todavía).
   */
  async function ensureSelectedBranch(): Promise<number | null> {
    // Las dos mitades del criterio, esperadas de verdad: el perfil (alcance del empleado) y el
    // listado de sedes. `refreshMe()` respeta su propia ventana de frescura y deduplica, así
    // que en la práctica no añade una petición; sin él, un arranque en frío resolvería con
    // `me` a null y respondería «no hay sede» habiéndola.
    //
    // Y esperadas A LA VEZ: son independientes entre sí (ninguna necesita el
    // resultado de la otra) y son justo las dos peticiones que el interceptor de
    // sede excluye por construcción, así que lanzarlas juntas no puede hacer que
    // se esperen a sí mismas. En serie, esto costaba la suma de las dos (#254).
    // `fetchAll()` no rechaza nunca (traga su error en `error`), así que el único
    // rechazo posible sigue siendo el de `refreshMe()`, igual que antes.
    await Promise.all([auth.refreshMe(), fetchAll()])
    resolveSelectedBranch()
    return selectedBranchId.value
  }

  /** Inserta/actualiza una sede en la cache local (mantiene el selector en sync tras un alta/edición). */
  function upsert(saved: BranchResponse): void {
    const idx = branches.value.findIndex((b) => b.id === saved.id)
    if (idx >= 0) branches.value.splice(idx, 1, saved)
    else branches.value.push(saved)
  }

  async function createBranch(payload: SaveBranchRequest): Promise<BranchResponse> {
    const saved = await branchApi.create(payload)
    upsert(saved)
    return saved
  }

  async function updateBranch(id: number, payload: SaveBranchRequest): Promise<BranchResponse> {
    const saved = await branchApi.update(id, payload)
    upsert(saved)
    return saved
  }

  async function setBranchActive(id: number, active: boolean): Promise<BranchResponse> {
    const saved = active ? await branchApi.activate(id) : await branchApi.deactivate(id)
    upsert(saved)
    // Si se desactivó la sede que estaba seleccionada como contexto, se resuelve otra: dejarla
    // en null volvería a abrir la ventana sin sede en la que las escrituras salen sin `branchId`.
    if (!saved.active && selectedBranchId.value === id) {
      setSelectedBranch(null)
      resolveSelectedBranch()
    }
    return saved
  }

  function setSelectedBranch(id: number | null): void {
    selectedBranchId.value = id
    if (id == null) localStorage.removeItem(SELECTED_BRANCH_KEY)
    else localStorage.setItem(SELECTED_BRANCH_KEY, String(id))
  }

  /**
   * Limpia TODO el contexto de sede: la cache, la selección en memoria y la clave
   * persistida.
   *
   * Antes solo vaciaba la cache —pese a que su comentario decía «usar al cerrar
   * sesión»— y encima no la llamaba nadie. Las dos mitades del defecto: la sede
   * elegida por el turno anterior sobrevivía en `localStorage`, y también en
   * memoria, así que el siguiente usuario empezaba a facturar y a descontar stock
   * en una sucursal que no había elegido.
   */
  function clear(): void {
    branches.value = []
    loaded.value = false
    error.value = null
    setSelectedBranch(null)
  }

  // La sede es contexto de SESIÓN, no del dispositivo, así que muere con ella.
  // Hace falta el watcher además del borrado de la clave volátil porque hay un
  // camino de salida que NO recarga la página: `refreshMe()` falla, el store de
  // auth limpia la sesión y el guard del router hace `push` a /login dentro de la
  // misma pestaña. Ahí `localStorage` ya está limpio pero el `ref` seguiría en
  // memoria, y quien entre después heredaría la sucursal del anterior.
  watch(
    () => auth.isAuthenticated,
    (authenticated) => {
      if (!authenticated) clear()
      // Y con sesión nueva el contexto se carga y se resuelve SOLO. Antes esto lo disparaba
      // el `onMounted` de `useBranches`, así que entre el login y el montaje del selector la
      // sede no existía y las escrituras de esa ventana salían sin `branchId` (issue #201).
      else void fetchAll(true)
    },
  )

  // El watcher solo ve transiciones y el store suele crearse con la sesión YA abierta
  // (navegación normal, F5, o la primera llamada a `getSelectedBranchId()` desde la capa api).
  if (auth.isAuthenticated) void fetchAll()

  // El perfil puede llegar DESPUÉS del listado (el guard del router lo refresca en paralelo):
  // cuando cambia el alcance de sedes del empleado, la selección se revisa otra vez.
  watch(
    () => auth.me?.branchIds,
    () => resolveSelectedBranch(),
  )

  // Issue #215 · le da a `http.client.ts` una forma de esperar a que la sede
  // esté resuelta sin que el interceptor tenga que importar este store (evita
  // el ciclo store → http.client → store, mismo motivo que `refreshHandler`).
  setBranchResolver(ensureSelectedBranch)

  return {
    branches,
    loading,
    error,
    loaded,
    selectedBranchId,
    fetchAll,
    ensureSelectedBranch,
    setSelectedBranch,
    createBranch,
    updateBranch,
    setBranchActive,
    clear,
  }
})

/**
 * Accesor NO reactivo de la sede seleccionada, para la capa api (fuera de componentes).
 * Espeja el patrón de `getCurrentCompanyId()`: llama al store dentro de la función (Pinia ya activo).
 */
export function getSelectedBranchId(): number | null {
  return useBranchStore().selectedBranchId
}
