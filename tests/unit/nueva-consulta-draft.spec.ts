import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useNuevaConsultaDraftStore } from '@/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store'
import type { LaboratoryTest, Prescription } from '@/types/domain'

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

function laboratorio(over: Partial<LaboratoryTest> = {}): LaboratoryTest {
  return { date: '2026-08-08', ...over } as LaboratoryTest
}

beforeEach(() => {
  storage = memoryStorage()
  vi.stubGlobal('localStorage', storage)
  // El store lee `window.localStorage` directamente para persistir.
  vi.stubGlobal('window', { localStorage: storage })
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

    s[add](laboratorio())
    expect(s.hasPartialSave).toBe(false)

    s[mark](0, 500)
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
    expect(s.state.prescriptions[0].medicaments[0].savedId).toBe(99)
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

    expect(s.state.laboratoryTests[0].savedId).toBe(500)
    expect(s.state.laboratoryTests[0].date).toBe('2026-08-09')
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

    s[add](laboratorio())
    s[mark](0, 700)
    s[update](0, laboratorio({ date: '2026-09-09' }))

    expect(s.state[lista][0].savedId).toBe(700)
  })

  it('conserva el savedId de la receta y el de sus medicamentos', () => {
    const s = store()
    s.addPrescription(receta())
    s.markPrescriptionSaved(0, 10)
    s.markMedicamentSaved(0, 0, 99)

    s.updatePrescription(0, receta({ observations: 'Cambiado' }))

    expect(s.state.prescriptions[0].savedId).toBe(10)
    expect(s.state.prescriptions[0].medicaments[0].savedId).toBe(99)
    expect(s.state.prescriptions[0].observations).toBe('Cambiado')
  })

  it('editar un índice inexistente no crea un ítem fantasma', () => {
    const s = store()

    s.updateLaboratoryTest(5, laboratorio())

    expect(s.state.laboratoryTests).toHaveLength(0)
  })

  /**
   * Los savedId de los medicamentos se reasignan POR POSICIÓN
   * (`prev.medicaments[j]?.savedId`). Mientras la lista solo crezca por el final
   * eso es correcto; en cuanto se elimina o se reordena un medicamento, la
   * posición deja de identificar al mismo medicamento.
   */
  describe('los marcadores de medicamentos van por posición', () => {
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

      expect(s.state.prescriptions[0].medicaments[0].savedId).toBe(99)
      expect(s.state.prescriptions[0].medicaments[1].savedId).toBeUndefined()
    })

    it('DEFECTO: quitar el primer medicamento traslada su marcador al segundo', () => {
      // Guardado el medicamento 0 y NO el 1, el usuario borra el 0. Tras la
      // edición, el medicamento que queda —que nunca se guardó— hereda el
      // savedId del que se borró: en el reintento se da por guardado y NUNCA
      // llega al backend. La receta acaba con un medicamento de menos, sin
      // ningún error a la vista.
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

      const restante = s.state.prescriptions[0].medicaments[0]
      expect(restante.medicamentId).toBe(2)
      // Lo correcto sería `undefined`. Se fija el comportamiento actual para que
      // el día que se arregle —emparejando por `medicamentId` en vez de por
      // posición— esta prueba avise de que el contrato cambió.
      expect(restante.savedId).toBe(99)
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
    expect(s.state.laboratoryTests[0].date).toBe('2026-02-02')
    expect(s.state.laboratoryTests[0].savedId).toBe(222)
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

  it('borra también el borrador persistido', async () => {
    const s = store()
    s.markConsultationCreated(77)
    await nextTick()
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()

    s.reset()

    expect(storage.getItem(STORAGE_KEY)).toBeNull()
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
    await nextTick()

    const guardado = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    expect(guardado.consultation.anamnesis).toBe('Vómito')
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
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ consultation: { anamnesis: 'Viejo', typeId: '3' } }),
    )
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
    storage.setItem(STORAGE_KEY, JSON.stringify({ step: guardado }))
    setActivePinia(createPinia())

    expect(store().state.step).toBe(esperado)
  })

  it('un borrador guardado con marcadores los recupera al recargar la página', () => {
    // Es el escenario real del fallo a medias: se cae la red, el usuario recarga
    // y tiene que poder reintentar SIN duplicar lo ya creado.
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        consultationCreatedId: 77,
        laboratoryTests: [{ date: '2026-08-08', savedId: 500 }],
      }),
    )
    setActivePinia(createPinia())

    const s = store()

    expect(s.state.consultationCreatedId).toBe(77)
    expect(s.state.laboratoryTests[0].savedId).toBe(500)
    expect(s.hasPartialSave).toBe(true)
  })
})
