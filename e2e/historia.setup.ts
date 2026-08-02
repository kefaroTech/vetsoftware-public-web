import { test as setup } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { PASSWORD } from './helpers/auth'
import { seedPatientWithHistory, seedEmptyOwner, PATIENT_FIXTURE_PATH } from './helpers/historia'

/**
 * Proyecto de SEMBRADO de la historia clínica (dependencia del proyecto
 * `chromium`, ver playwright.config.ts). Corre UNA sola vez antes de los casos:
 * crea el paciente con historia (propietario + mascota + consulta con receta y
 * vacunación) y un propietario sin mascotas, y los persiste a un JSON que lee
 * historia.spec.ts. Usa el fixture `browser` (contexto managed) porque el login
 * del wizard solo dispara ahí; con un browser lanzado a mano el submit del
 * v-form de Vuetify no se activa.
 *
 * Sembrar una vez (en vez de por-worker) evita que 14 workers re-siembren en
 * paralelo y saturen el backend.
 */

/** ¿El run actual incluye la spec de historia? Evita sembrar en runs de otras
 *  specs (p. ej. `playwright test consulta.spec.ts`). Ante la duda, siembra. */
function historiaInRun(): boolean {
  const tokens = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const specTokens = tokens.filter((t) => t.includes('.ts') || t.includes('.spec'))
  if (specTokens.length === 0) return true // run completo (sin filtro de archivo)
  return specTokens.some((t) => t.toLowerCase().includes('historia'))
}

setup.skip(!PASSWORD || !historiaInRun(), 'Historia no incluida en el run (o sin E2E_PASSWORD)')

setup('sembrar historia clínica', async ({ browser }) => {
  setup.setTimeout(120_000)

  // Cada sembrado en su propia sesión (browser.newPage crea un contexto fresco):
  // no se puede re-loguear en la misma sesión porque `/` redirige a home.
  // `robustLogin` resiste el arranque en frío (reintenta el submit hasta navegar).
  const p1 = await browser.newPage()
  let patient
  try {
    patient = await seedPatientWithHistory(p1)
  } finally {
    await p1.close()
  }

  const p2 = await browser.newPage()
  let emptyOwnerDoc = ''
  try {
    emptyOwnerDoc = await seedEmptyOwner(p2)
  } finally {
    await p2.close()
  }

  mkdirSync(dirname(PATIENT_FIXTURE_PATH), { recursive: true })
  writeFileSync(PATIENT_FIXTURE_PATH, JSON.stringify({ patient, emptyOwnerDoc }, null, 2))
})
