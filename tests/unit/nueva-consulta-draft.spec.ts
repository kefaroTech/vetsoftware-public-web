import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useNuevaConsultaDraftStore } from '@/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { LaboratoryTest, MedicamentPrescription, Prescription } from '@/types/domain'
import { elemento, exigir } from '../helpers/exigir'

/**
 * El borrador de "Nueva consulta" es la única defensa contra la duplicación
 * clínica del sistema. Guardar una consulta es una cascada de POST sin
 * transacción que los cubra: consulta → recetas → medicamentos → laboratorios →
 * imágenes → vacunas → hospitalizaciones → desparasitaciones → cirugías. Si uno
 * falla a mitad, el usuario reintenta, y lo único que impide volver a crear lo
 * ya creado son estos marcadores: `consultationCreatedId` en la raíz y un
 * `savedId` por cada ítem y cada medicamento.
 *
 * Un marcador que se pierde duplica un registro clínico. Un marcador que se
 * hereda equivocadamente hace que algo NUNCA se guarde, en silencio. Las dos
 * cosas son peores que el error original, y ninguna se ve en pantalla.
 */

const STORAGE_KEY = 'vetrina:nueva-consulta-draft'
const AUTH_STORAGE_KEY = 'vetsoft.auth'

/** JWT sin firmar con el payload dado, en base64url como los del backend. */
function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(new TextEncoder().encode(JSON.stringify(value)))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma-no-verificada`
}

/** Deja en el storage la sesión de un empleado, como la dejaría un login. */
function seedSession(subjectId: number, companyId: number | null = 1) {
  storage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: jwt({ sub: String(subjectId), type: 'EMPLOYEE', companyId, iat: 0, exp: 0 }),
      type: 'EMPLOYEE',
    }),
  )
}

/** Deja un borrador guardado y sellado por el dueño indicado (por defecto, el de la sesión). */
function seedDraft(draft: Record<string, unknown>, sealedBy = { companyId: 1, subjectId: 1 }) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ sealedBy, draft }))
}

/** El borrador tal y como quedó en disco, sin el sello. */
function readPersisted(): { sealedBy?: unknown; draft?: { consultation: { anamnesis: string } } } {
  return JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') ?? {}
}

/** localStorage en memoria: el entorno de estas pruebas es node, sin DOM. */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage
}

let storage: Storage

function store() {
  return useNuevaConsultaDraftStore()
}

type Borrador = ReturnType<typeof store>

/**
 * Accesos exigidos al borrador. Con `noUncheckedIndexedAccess`, `prescriptions[0]`
 * es `Prescription | undefined`: taparlo con `!` volvería a dejar sin comprobar
 * justo lo que estas pruebas existen para comprobar —que el marcador está donde
 * toca—, y el fallo llegaría como un «cannot read properties of undefined» sin
 * decir qué lista salió vacía.
 */
const recetaN = (s: Borrador, i = 0) =>
  elemento(s.state.prescriptions, i, 'las recetas del borrador')
const medicamentoN = (s: Borrador, receta = 0, i = 0) =>
  elemento(recetaN(s, receta).medicaments, i, 'los medicamentos de la receta')
const laboratorioN = (s: Borrador, i = 0) =>
  elemento(s.state.laboratoryTests, i, 'los laboratorios del borrador')

/** Un método del store buscado por nombre, en las pruebas de tabla. */
type MetodoBorrador = (...args: unknown[]) => void
const metodo = (s: Record<string, MetodoBorrador>, nombre: string): MetodoBorrador =>
  exigir(s[nombre], `el método \`${nombre}\` del borrador`)

function receta(over: Partial<Prescription> = {}): Prescription {
  return {
    date: '2026-08-08',
    observations: 'Tomar con comida',
    medicaments: [
      {
        medicamentId: 1,
        name: 'Amoxicilina',
        presentation: '500mg',
        quantity: 1,
        posology: 'c/8h',
      },
    ],
    ...over,
  }
}

function amoxicilina(over: Partial<MedicamentPrescription> = {}): MedicamentPrescription {
  return {
    medicamentId: 1,
    name: 'Amoxicilina',
    presentation: '500mg',
    quantity: 1,
    posology: 'c/8h',
    ...over,
  }
}

function meloxicam(over: Partial<MedicamentPrescription> = {}): MedicamentPrescription {
  return {
    medicamentId: 2,
    name: 'Meloxicam',
    presentation: '2mg',
    quantity: 1,
    posology: 'c/24h',
    ...over,
  }
}

function laboratorio(over: Partial<LaboratoryTest> = {}): LaboratoryTest {
  return { date: '2026-08-08', ...over } as LaboratoryTest
}

/**
 * La persistencia va con retardo (FE-17), así que un `nextTick` ya no basta:
 * espera al watcher Y al temporizador. El margen sobre los 400 ms del store es
 * a propósito, para que la prueba no dependa de coincidir al milisegundo.
 */
const PERSIST_DELAY_MS = 400
async function flushPersist() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, PERSIST_DELAY_MS + 50))
  await nextTick()
}

beforeEach(() => {
  storage = memoryStorage()
  vi.stubGlobal('localStorage', storage)
  // El store lee `window.localStorage` directamente para persistir.
  vi.stubGlobal('window', { localStorage: storage })
  // Hay sesión: el borrador solo se lee y se escribe sellado con su dueño, así que
  // sin esto ninguna prueba de persistencia probaría lo que dice probar.
  seedSession(1)
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('marcadores de guardado parcial', () => {
  it('un borrador nuevo no tiene guardado parcial', () => {
    expect(store().hasPartialSave).toBe(false)
  })

  it('detecta la consulta ya creada', () => {
    const s = store()

    s.markConsultationCreated(77)

    expect(s.state.consultationCreatedId).toBe(77)
    expect(s.hasPartialSave).toBe(true)
  })

  it.each([
    ['un laboratorio', 'addLaboratoryTest', 'markLaboratoryTestSaved'],
    ['una imagen diagnóstica', 'addDiagnosticImaging', 'markDiagnosticImagingSaved'],
    ['una vacunación', 'addVaccination', 'markVaccinationSaved'],
    ['una hospitalización', 'addHospitalization', 'markHospitalizationSaved'],
    ['una desparasitación', 'addDeworming', 'markDewormingSaved'],
    ['una cirugía', 'addSurgery', 'markSurgerySaved'],
  ] as const)('detecta %s ya guardada', (_caso, add, mark) => {
    // Las siete listas cuentan. Si `hasPartialSave` olvidara una, el aviso de
    // reintento no aparecería y el usuario volvería a mandarlo todo.
    const s = store() as unknown as Record<string, (...args: unknown[]) => void> & {
      hasPartialSave: boolean
    }

    metodo(s, add)(laboratorio())
    expect(s.hasPartialSave).toBe(false)

    metodo(s, mark)(0, 500)
    expect(s.hasPartialSave).toBe(true)
  })

  it('detecta una receta guardada', () => {
    const s = store()
    s.addPrescription(receta())

    s.markPrescriptionSaved(0, 10)

    expect(s.hasPartialSave).toBe(true)
  })

  it('detecta un medicamento guardado aunque su receta no lo esté', () => {
    // La receta es una cascada interna: POST /prescriptions y luego un POST por
    // medicamento. Puede fallar entre medio de los medicamentos.
    const s = store()
    s.addPrescription(receta())

    s.markMedicamentSaved(0, 0, 99)

    expect(s.hasPartialSave).toBe(true)
    expect(medicamentoN(s).savedId).toBe(99)
  })

  it('marcar sobre un índice inexistente no revienta', () => {
    // La cascada recorre índices; si una lista se vació entre el intento y el
    // reintento, marcar no debe tirar la pantalla entera.
    const s = store()

    expect(() => s.markPrescriptionSaved(9, 1)).not.toThrow()
    expect(() => s.markMedicamentSaved(9, 9, 1)).not.toThrow()
    expect(() => s.markLaboratoryTestSaved(9, 1)).not.toThrow()
    expect(s.hasPartialSave).toBe(false)
  })
})

describe('editar un ítem no debe reenviarlo', () => {
  it('conserva el savedId del laboratorio al editarlo', () => {
    // Es la garantía central: si editar borrara el marcador, el reintento
    // crearía un segundo laboratorio para la misma consulta.
    const s = store()
    s.addLaboratoryTest(laboratorio())
    s.markLaboratoryTestSaved(0, 500)

    s.updateLaboratoryTest(0, laboratorio({ date: '2026-08-09' }))

    expect(laboratorioN(s).savedId).toBe(500)
    expect(laboratorioN(s).date).toBe('2026-08-09')
  })

  it.each([
    [
      'imagen diagnóstica',
      'addDiagnosticImaging',
      'markDiagnosticImagingSaved',
      'updateDiagnosticImaging',
      'diagnosticImagings',
    ],
    ['vacunación', 'addVaccination', 'markVaccinationSaved', 'updateVaccination', 'vaccinations'],
    [
      'hospitalización',
      'addHospitalization',
      'markHospitalizationSaved',
      'updateHospitalization',
      'hospitalizations',
    ],
    ['desparasitación', 'addDeworming', 'markDewormingSaved', 'updateDeworming', 'dewormings'],
    ['cirugía', 'addSurgery', 'markSurgerySaved', 'updateSurgery', 'surgeries'],
  ] as const)('conserva el savedId de %s al editarla', (_caso, add, mark, update, lista) => {
    const s = store() as unknown as Record<string, (...a: unknown[]) => void> & {
      state: Record<string, { savedId?: number }[]>
    }

    metodo(s, add)(laboratorio())
    metodo(s, mark)(0, 700)
    metodo(s, update)(0, laboratorio({ date: '2026-09-09' }))

    expect(elemento(exigir(s.state[lista], `la lista \`${lista}\``), 0, lista).savedId).toBe(700)
  })

  it('conserva el savedId de la receta y el de sus medicamentos', () => {
    const s = store()
    s.addPrescription(receta())
    s.markPrescriptionSaved(0, 10)
    s.markMedicamentSaved(0, 0, 99)

    s.updatePrescription(0, receta({ observations: 'Cambiado' }))

    expect(recetaN(s).savedId).toBe(10)
    expect(medicamentoN(s).savedId).toBe(99)
    expect(recetaN(s).observations).toBe('Cambiado')
  })

  it('editar un índice inexistente no crea un ítem fantasma', () => {
    const s = store()

    s.updateLaboratoryTest(5, laboratorio())

    expect(s.state.laboratoryTests).toHaveLength(0)
  })

  /**
   * Los savedId de los medicamentos se emparejan por `medicamentId`, no por
   * posición. Con emparejamiento por índice, borrar o reordenar un medicamento
   * trasladaba el marcador a otro distinto: el que quedaba se daba por guardado
   * y no llegaba nunca al backend.
   */
  describe('los marcadores de medicamentos van por medicamentId', () => {
    it('un medicamento añadido al final no hereda ningún marcador', () => {
      const s = store()
      s.addPrescription(receta())
      s.markMedicamentSaved(0, 0, 99)

      s.updatePrescription(
        0,
        receta({
          medicaments: [
            {
              medicamentId: 1,
              name: 'Amoxicilina',
              presentation: '500mg',
              quantity: 1,
              posology: 'c/8h',
            },
            {
              medicamentId: 2,
              name: 'Meloxicam',
              presentation: '2mg',
              quantity: 1,
              posology: 'c/24h',
            },
          ],
        }),
      )

      expect(medicamentoN(s).savedId).toBe(99)
      expect(medicamentoN(s, 0, 1).savedId).toBeUndefined()
    })

    it('quitar el primer medicamento no traslada su marcador al segundo', () => {
      // Guardado el medicamento 0 y NO el 1, el usuario borra el 0. El que
      // queda nunca se guardó, así que debe seguir sin marcador: si heredase el
      // del borrado, el reintento lo daría por guardado y no llegaría nunca al
      // backend — receta incompleta y sin ningún error a la vista.
      const s = store()
      s.addPrescription(
        receta({
          medicaments: [
            {
              medicamentId: 1,
              name: 'Amoxicilina',
              presentation: '500mg',
              quantity: 1,
              posology: 'c/8h',
            },
            {
              medicamentId: 2,
              name: 'Meloxicam',
              presentation: '2mg',
              quantity: 1,
              posology: 'c/24h',
            },
          ],
        }),
      )
      s.markMedicamentSaved(0, 0, 99)

      s.updatePrescription(
        0,
        receta({
          medicaments: [
            {
              medicamentId: 2,
              name: 'Meloxicam',
              presentation: '2mg',
              quantity: 1,
              posology: 'c/24h',
            },
          ],
        }),
      )

      const restante = medicamentoN(s)
      expect(restante.medicamentId).toBe(2)
      expect(restante.savedId).toBeUndefined()
    })

    it('reordenar los medicamentos mantiene cada marcador con el suyo', () => {
      const s = store()
      s.addPrescription(receta({ medicaments: [amoxicilina(), meloxicam()] }))
      s.markMedicamentSaved(0, 0, 99)
      s.markMedicamentSaved(0, 1, 100)

      // El usuario invierte el orden: cada marcador debe viajar con su
      // medicamento, no quedarse en su antigua posición.
      s.updatePrescription(0, receta({ medicaments: [meloxicam(), amoxicilina()] }))

      const [primero, segundo] = [medicamentoN(s, 0, 0), medicamentoN(s, 0, 1)]
      expect(primero.medicamentId).toBe(2)
      expect(primero.savedId).toBe(100)
      expect(segundo.medicamentId).toBe(1)
      expect(segundo.savedId).toBe(99)
    })

    it('con el mismo medicamento repetido, cada marcador se consume una vez', () => {
      // Misma molécula en dos líneas (distinta posología). Emparejar por
      // `medicamentId` a secas le daría el mismo savedId a las dos.
      const s = store()
      s.addPrescription(
        receta({ medicaments: [amoxicilina(), amoxicilina({ posology: 'c/12h' })] }),
      )
      s.markMedicamentSaved(0, 0, 99)

      s.updatePrescription(
        0,
        receta({ medicaments: [amoxicilina(), amoxicilina({ posology: 'c/12h' })] }),
      )

      const [primero, segundo] = [medicamentoN(s, 0, 0), medicamentoN(s, 0, 1)]
      expect(primero.savedId).toBe(99)
      expect(segundo.savedId).toBeUndefined()
    })
  })
})

describe('borrar ítems', () => {
  it('el marcador viaja con el objeto, no con la posición', () => {
    // `removeX` usa splice, así que los savedId siguen a su ítem. Si en su lugar
    // se guardaran en un mapa por índice, borrar el primero desalinearía todo.
    const s = store()
    s.addLaboratoryTest(laboratorio({ date: '2026-01-01' }))
    s.addLaboratoryTest(laboratorio({ date: '2026-02-02' }))
    s.markLaboratoryTestSaved(1, 222)

    s.removeLaboratoryTest(0)

    expect(s.state.laboratoryTests).toHaveLength(1)
    expect(laboratorioN(s).date).toBe('2026-02-02')
    expect(laboratorioN(s).savedId).toBe(222)
  })
})

describe('reset', () => {
  it('borra los marcadores: lo siguiente que se guarde es una consulta nueva', () => {
    // Si `reset` conservara `consultationCreatedId`, la siguiente consulta
    // colgaría sus recetas y laboratorios de la consulta ANTERIOR, de otro
    // paciente.
    const s = store()
    s.markConsultationCreated(77)
    s.addLaboratoryTest(laboratorio())
    s.markLaboratoryTestSaved(0, 500)

    s.reset()

    expect(s.state.consultationCreatedId).toBeUndefined()
    expect(s.state.laboratoryTests).toEqual([])
    expect(s.hasPartialSave).toBe(false)
  })

  it('borra también el borrador persistido, y NO reaparece después', async () => {
    const s = store()
    s.markConsultationCreated(77)
    await flushPersist()
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()

    s.reset()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()

    // Lo que de verdad protege esta prueba: `reset()` muta el estado, y esa
    // mutación despierta al watcher que persiste. Sin suspenderlo, el borrador
    // volvía a escribirse un tick después de haberse borrado.
    await flushPersist()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('tras un reset, lo que se escriba después sí vuelve a guardarse', async () => {
    // El contrapeso del caso anterior: suspender la persistencia durante el
    // reinicio no puede dejarla apagada para siempre.
    const s = store()
    s.reset()
    await flushPersist()

    s.state.consultation.anamnesis = 'Consulta nueva'
    await flushPersist()

    expect(readPersisted().draft?.consultation.anamnesis).toBe('Consulta nueva')
  })

  it('resetKeepingOwner conserva el propietario pero NO los marcadores', () => {
    // Atender a la segunda mascota del mismo dueño es una consulta distinta.
    const s = store()
    s.setOwner({ id: 5, name: 'Ana' } as never)
    s.markConsultationCreated(77)
    s.addSurgery(laboratorio() as never)
    s.markSurgerySaved(0, 900)

    s.resetKeepingOwner()

    expect(s.state.owner).toEqual({ id: 5, name: 'Ana' })
    expect(s.state.consultationCreatedId).toBeUndefined()
    expect(s.state.surgeries).toEqual([])
    expect(s.hasPartialSave).toBe(false)
    expect(s.state.step).toBe(1)
  })
})

describe('contadores y vacío', () => {
  it('cuenta las acciones de las siete listas', () => {
    const s = store()
    s.addPrescription(receta())
    s.addLaboratoryTest(laboratorio())
    s.addDiagnosticImaging(laboratorio() as never)
    s.addVaccination(laboratorio() as never)
    s.addHospitalization(laboratorio() as never)
    s.addDeworming(laboratorio() as never)
    s.addSurgery(laboratorio() as never)

    expect(s.actionsCount).toBe(7)
  })

  it('un borrador recién creado está vacío', () => {
    expect(store().isEmpty).toBe(true)
  })

  it.each([
    ['hay propietario', (s: ReturnType<typeof store>) => s.setOwner({ id: 1 } as never)],
    ['hay una acción', (s: ReturnType<typeof store>) => s.addLaboratoryTest(laboratorio())],
    [
      'hay anamnesis escrita',
      (s: ReturnType<typeof store>) => {
        s.state.consultation.anamnesis = 'Decaído desde ayer'
      },
    ],
  ])('deja de estar vacío cuando %s', (_caso, mutar) => {
    const s = store()

    mutar(s)

    expect(s.isEmpty).toBe(false)
  })

  it('el texto en blanco no cuenta como contenido', () => {
    // Si los espacios contaran, el banner de "consulta en curso" saldría solo.
    const s = store()

    s.state.consultation.anamnesis = '   '
    s.state.consultation.diagnosis = '\n\t '

    expect(s.isEmpty).toBe(true)
  })
})

describe('persistencia y borradores viejos', () => {
  it('guarda el borrador al cambiarlo', async () => {
    const s = store()

    s.state.consultation.anamnesis = 'Vómito'
    await flushPersist()

    expect(readPersisted().draft?.consultation.anamnesis).toBe('Vómito')
  })

  it('no serializa en cada pulsación: agrupa las escrituras', async () => {
    // El motivo del retardo (FE-17). Antes cada tecla disparaba un
    // `JSON.stringify` del borrador entero en el hilo principal, y la anamnesis
    // es el texto más largo del asistente.
    const s = store()
    const escrituras = vi.spyOn(storage, 'setItem')

    for (const texto of ['V', 'Vó', 'Vóm', 'Vómi', 'Vómit', 'Vómito']) {
      s.state.consultation.anamnesis = texto
      await nextTick()
    }
    expect(escrituras).not.toHaveBeenCalled()

    await flushPersist()
    expect(escrituras).toHaveBeenCalledTimes(1)

    expect(readPersisted().draft?.consultation.anamnesis).toBe('Vómito')
  })

  it('un borrador corrupto no impide abrir la pantalla', () => {
    // Un JSON roto en localStorage no puede dejar al veterinario sin poder
    // atender: se descarta y se empieza en blanco.
    storage.setItem(STORAGE_KEY, '{esto no es json')
    setActivePinia(createPinia())

    expect(() => store()).not.toThrow()
    expect(store().isEmpty).toBe(true)
  })

  it('completa los campos que un borrador antiguo no traía', () => {
    // Los borradores previos a la fase 3 no tienen examen físico. Sin relleno,
    // esos campos llegan `undefined` y rompen los v-model del formulario.
    seedDraft({ consultation: { anamnesis: 'Viejo', typeId: '3' } })
    setActivePinia(createPinia())

    const s = store()

    expect(s.state.consultation.anamnesis).toBe('Viejo')
    expect(s.state.consultation.typeId).toBe('3')
    expect(s.state.consultation.temperature).toBe('')
    expect(s.state.consultation.mucousMembranes).toBe('')
  })

  it.each([
    ['un borrador del paso 1 se queda en 1', 1, 1],
    ['un borrador del paso 2 se queda en 2', 2, 2],
    ['un borrador legado del paso 3 colapsa a 2', 3, 2],
    ['un borrador legado del paso 4 colapsa a 2', 4, 2],
    ['sin paso arranca en 1', undefined, 1],
  ])('%s', (_caso, guardado, esperado) => {
    seedDraft({ step: guardado })
    setActivePinia(createPinia())

    expect(store().state.step).toBe(esperado)
  })

  it('un borrador guardado con marcadores los recupera al recargar la página', () => {
    // Es el escenario real del fallo a medias: se cae la red, el usuario recarga
    // y tiene que poder reintentar SIN duplicar lo ya creado.
    seedDraft({
      consultationCreatedId: 77,
      laboratoryTests: [{ date: '2026-08-08', savedId: 500 }],
    })
    setActivePinia(createPinia())

    const s = store()

    expect(s.state.consultationCreatedId).toBe(77)
    expect(laboratorioN(s).savedId).toBe(500)
    expect(s.hasPartialSave).toBe(true)
  })
})

/**
 * El sello de dueño (issue #68). El escenario que cierra no es un ataque: es el
 * PC de la recepción de una clínica, compartido por todo el turno. La veterinaria
 * A empieza una consulta, no la guarda, cierra sesión; entra el auxiliar B y el
 * formulario le aparece con el paciente, el propietario y el examen físico de A.
 * Si B no se da cuenta y guarda, esos datos clínicos entran en la historia con SU
 * autoría, y nadie tiene forma de saber que ocurrió.
 *
 * Borrar la clave al cerrar sesión no basta por sí solo: depende de que todos los
 * caminos de salida se acuerden de hacerlo. El sello no depende de que nadie se
 * acuerde de nada — si el borrador no es tuyo, no se aplica.
 */
describe('sello de dueño del borrador', () => {
  it('el borrador propio se recupera igual que siempre', () => {
    seedDraft({ consultation: { anamnesis: 'Mío' } }, { companyId: 1, subjectId: 1 })
    setActivePinia(createPinia())

    expect(store().state.consultation.anamnesis).toBe('Mío')
  })

  it('el de otro usuario de la misma empresa no se aplica, y su clave se borra', () => {
    // El turno siguiente en el mismo mostrador.
    seedDraft(
      { consultation: { anamnesis: 'Datos clínicos de A' } },
      { companyId: 1, subjectId: 2 },
    )
    setActivePinia(createPinia())

    const s = store()

    expect(s.state.consultation.anamnesis).toBe('')
    expect(s.isEmpty).toBe(true)
    // Se borra, no solo se ignora: dejarlo ahí aplazaría la fuga al siguiente arranque.
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('el de otra empresa no se aplica aunque coincida el id de usuario', () => {
    // Dos tenants en el mismo equipo: los ids de empleado son independientes entre
    // empresas, así que comparar solo el sujeto los daría por la misma persona.
    seedDraft(
      { consultation: { anamnesis: 'Paciente de otro tenant' } },
      { companyId: 9, subjectId: 1 },
    )
    setActivePinia(createPinia())

    expect(store().isEmpty).toBe(true)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('un borrador sin sello se trata como ajeno', () => {
    // Los que ya existen en equipos reales, escritos antes de este arreglo. No se
    // puede saber de quién son, así que no son de nadie.
    storage.setItem(STORAGE_KEY, JSON.stringify({ consultation: { anamnesis: 'Legado' } }))
    setActivePinia(createPinia())

    expect(store().isEmpty).toBe(true)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('un sello con la forma equivocada también se trata como ajeno', () => {
    // El sello llega de `JSON.parse`, así que su forma no la garantiza el tipo.
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sealedBy: 'admin', draft: { consultation: { anamnesis: 'X' } } }),
    )
    setActivePinia(createPinia())

    expect(store().isEmpty).toBe(true)
  })

  it('lo que se guarda queda sellado con la sesión que lo escribió', async () => {
    const s = store()

    s.state.consultation.anamnesis = 'Decaído desde ayer'
    await flushPersist()

    expect(readPersisted().sealedBy).toEqual({ companyId: 1, subjectId: 1 })
  })

  it('al perder la sesión sin recargar la página, el borrador en memoria se vacía', async () => {
    // El sello cubre el disco; esto cubre la memoria. Cuando `/auth/me` falla, el
    // store de auth limpia la sesión y el guard del router hace `push` a /login sin
    // recargar: este store sobrevive con el paciente del turno anterior dentro, y el
    // siguiente usuario entra en esa misma pestaña.
    const s = store()
    s.setOwner({ id: 5, name: 'Ana' } as never)
    s.state.consultation.anamnesis = 'Decaído desde ayer'

    useAuthStore().clearSession()
    await nextTick()

    expect(s.isEmpty).toBe(true)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  describe('sin sesión', () => {
    it('no aplica el borrador guardado', () => {
      // La pantalla de login, o una pestaña a la que ya expulsó el interceptor.
      seedDraft({ consultation: { anamnesis: 'Datos clínicos de A' } })
      storage.removeItem(AUTH_STORAGE_KEY)
      setActivePinia(createPinia())

      expect(store().isEmpty).toBe(true)
    })

    it('no borra el borrador ajeno: puede ser del que está a punto de volver', async () => {
      // Expulsión por token expirado a mitad de una consulta. Borrarlo aquí sería
      // tirar el trabajo del veterinario que solo tiene que volver a entrar.
      seedDraft({ consultation: { anamnesis: 'A medio escribir' } })
      storage.removeItem(AUTH_STORAGE_KEY)
      setActivePinia(createPinia())

      const s = store()
      // Y el estado vacío que hay en memoria tampoco puede pisarlo: sin sesión no
      // hay sello, y sin sello no se escribe.
      s.state.consultation.anamnesis = 'Escrito sin sesión'
      await flushPersist()

      expect(readPersisted().draft?.consultation.anamnesis).toBe('A medio escribir')
    })
  })
})

/**
 * VUE-09 — el borrador se sella con `pagehide`, NUNCA con `beforeunload`.
 *
 * Registrar `beforeunload`, aunque sea sin `preventDefault` y aunque el
 * manejador no haga nada, **descalifica a la página entera del back/forward
 * cache** en Chrome y Firefox. Eso no es un detalle del wizard de consulta: es
 * cada «atrás» de toda la aplicación, que pasa de restaurar la pantalla al
 * instante a rehacer el arranque, la sesión y las peticiones. El coste lo paga
 * el producto completo y el beneficio era cero, porque `pagehide` se dispara en
 * la misma descarga y además cubre el caso que `beforeunload` NO cubre: en
 * móvil e iOS el navegador puede congelar la pestaña sin dispararlo jamás.
 *
 * Volver a añadirlo es una línea y no rompe nada visible. De ahí estas pruebas.
 */
describe('sellado al descargar la pestaña (VUE-09)', () => {
  let escuchas: string[]
  let manejadores: Map<string, () => void>

  beforeEach(() => {
    escuchas = []
    manejadores = new Map()
    // El espía se instala ANTES de instanciar el store: los `addEventListener`
    // ocurren en el cuerpo del setup store, en la primera llamada al composable.
    // Instalarlo después no vería ninguno.
    const addEventListener = vi.fn((tipo: string, manejador: () => void) => {
      escuchas.push(tipo)
      manejadores.set(tipo, manejador)
    })
    vi.stubGlobal('window', { localStorage: storage, addEventListener })
    setActivePinia(createPinia())
  })

  it('registra «pagehide»', () => {
    store()

    expect(escuchas).toContain('pagehide')
  })

  it('NO registra ningún «beforeunload»', () => {
    store()

    expect(escuchas).not.toContain('beforeunload')
  })

  it('el «pagehide» sella el borrador sin esperar al retardo de 400 ms', async () => {
    // Lo que el arreglo no debía romper. La persistencia normal va con retardo
    // (FE-17) para no escribir en cada tecla; el sellado de descarga tiene que
    // saltarse ese temporizador, porque cuando la pestaña se va no hay 400 ms
    // que esperar. Si `pagehide` llamara al camino con retardo en vez de a
    // `persistNow`, el borrador se perdería y nada más fallaría.
    const s = store()
    s.state.consultation.anamnesis = 'Decaído desde ayer, no come'
    await nextTick()

    // El temporizador está armado pero no ha vencido: en disco no hay nada.
    expect(storage.getItem(STORAGE_KEY)).toBeNull()

    exigir(manejadores.get('pagehide'), "manejadores.get('pagehide')")()

    expect(readPersisted().draft?.consultation.anamnesis).toBe('Decaído desde ayer, no come')
  })

  it('el borrador sellado en «pagehide» sigue llevando el sello de su dueño', async () => {
    // Sin sello no se lee de vuelta, así que un `persistNow` que escribiera el
    // borrador «pelado» equivaldría a perderlo — y peor: dejaría un borrador
    // anónimo que el siguiente usuario del equipo podría ver.
    const s = store()
    s.state.consultation.anamnesis = 'A medio escribir'
    await nextTick()

    exigir(manejadores.get('pagehide'), "manejadores.get('pagehide')")()

    expect(readPersisted().sealedBy).toEqual({ companyId: 1, subjectId: 1 })
  })
})
