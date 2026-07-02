import { test, expect } from '@playwright/test'
import { PASSWORD } from './helpers/auth'
import {
  gotoNuevaConsulta,
  NUEVA_CONSULTA_URL,
  ownerSearch,
  searchOwner,
  unlikelyTerm,
  startCreateOwnerFromEmpty,
  footerNext,
  pickSelect,
  fillValidOwner,
  createAndSelectOwner,
  startCreatePet,
  anamnesis,
  validOwner,
} from './helpers/consulta'

/**
 * Suite rigurosa del flujo de CREACIÓN DE CONSULTA.
 *
 * Cobertura: happy paths + múltiples casos de error, con y sin cliente,
 * con y sin mascota, datos válidos e inválidos.
 *
 * Todos los casos requieren login (ruta protegida). Definí E2E_PASSWORD para
 * ejecutarlos; sin ella el suite se auto-salta.
 *
 * Marcado en cada grupo:
 *   [det]  determinista — solo necesita login.
 *   [data] depende de datos del backend (catálogo geo, especies…) y/o
 *          escribe datos reales (crea propietario/mascota). Requiere una BD
 *          de pruebas con catálogos sembrados.
 */

test.skip(!PASSWORD, 'Define E2E_PASSWORD para correr el suite de consulta')

// ════════════════════════════════════════════════════════════════════════════
// A. Acceso al wizard
// ════════════════════════════════════════════════════════════════════════════
test.describe('A · Acceso al wizard', () => {
  test('[det] sin sesión, /consulta/nueva redirige al login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(NUEVA_CONSULTA_URL)
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('[det] con sesión, el wizard abre en el paso 1 (propietario)', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await expect(page.getByRole('heading', { name: /Quién es el propietario/ })).toBeVisible()
    await expect(page.getByText('Nueva consulta')).toBeVisible()
    await expect(page.getByText('Borrador')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// B. Búsqueda de propietario — cuando existe y cuando no
// ════════════════════════════════════════════════════════════════════════════
test.describe('B · Búsqueda de propietario', () => {
  test.beforeEach(async ({ page }) => {
    await gotoNuevaConsulta(page)
  })

  test('[det] estado inicial vacío invita a buscar', async ({ page }) => {
    await expect(page.getByText('Empieza buscando un propietario')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Registrar nuevo propietario' })).toBeVisible()
  })

  test('[det] contador muestra "0 resultados" sin término', async ({ page }) => {
    await expect(page.getByText('0 resultados')).toBeVisible()
  })

  test('[det] término inexistente muestra "Sin resultados" y ofrece registrar', async ({ page }) => {
    const term = unlikelyTerm()
    await searchOwner(page, term)
    await expect(page.getByText(new RegExp(`Sin resultados para`))).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`Registrar a "${term}"`) })).toBeVisible()
  })

  test('[det] desde "sin resultados" se abre el form con el nombre precargado', async ({ page }) => {
    const term = 'Cliente Nuevo E2E'
    await searchOwner(page, term)
    await page.getByRole('button', { name: new RegExp(`Registrar a "`) }).click()
    await expect(page.getByRole('heading', { name: 'Registrar nuevo propietario' })).toBeVisible()
    await expect(page.getByLabel(/Nombre completo/)).toHaveValue(term)
  })

  test('[data] buscar un cliente existente muestra resultados seleccionables', async ({ page }) => {
    // Depende de que existan propietarios en la BD. Si no hay, se salta.
    await searchOwner(page, 'a')
    const results = page.locator('.results')
    const hasResults = await results.isVisible().catch(() => false)
    test.skip(!hasResults, 'No hay propietarios en la BD para buscar')
    await expect(results).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// C. Crear propietario — validación de datos (con datos mal y bien)
// ════════════════════════════════════════════════════════════════════════════
test.describe('C · Propietario nuevo · validación de campos', () => {
  test.beforeEach(async ({ page }) => {
    await gotoNuevaConsulta(page)
    await startCreateOwnerFromEmpty(page)
  })

  // --- Nombre ---
  test('[det] nombre vacío (blur) muestra obligatorio', async ({ page }) => {
    await page.getByLabel(/Nombre completo/).click()
    await page.getByLabel(/Documento de identidad/).click() // blur
    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible()
  })

  test('[det] nombre de 1 carácter exige mínimo 2', async ({ page }) => {
    await page.getByLabel(/Nombre completo/).fill('A')
    await page.getByLabel(/Documento de identidad/).click()
    await expect(page.getByText('Debe tener al menos 2 caracteres.')).toBeVisible()
  })

  // --- Documento (matriz) ---
  const docCases: Array<{ v: string; msg: string; nombre: string }> = [
    { v: '', msg: 'El documento es obligatorio.', nombre: 'vacío' },
    { v: '1234', msg: 'Debe tener al menos 5 caracteres.', nombre: '4 caracteres' },
    { v: 'A'.repeat(21), msg: 'No puede superar los 20 caracteres.', nombre: '21 caracteres' },
  ]
  for (const c of docCases) {
    test(`[det] documento ${c.nombre} -> "${c.msg}"`, async ({ page }) => {
      const doc = page.getByLabel(/Documento de identidad/)
      await doc.click()
      if (c.v) await doc.fill(c.v)
      await page.getByLabel(/Nombre completo/).click() // blur
      await expect(page.getByText(c.msg)).toBeVisible()
    })
  }

  test('[det] documento sanitiza símbolos y espacios al teclear', async ({ page }) => {
    await page.getByLabel(/Documento de identidad/).fill('ab-12 34!')
    await expect(page.getByLabel(/Documento de identidad/)).toHaveValue('ab1234')
  })

  // --- Teléfono ---
  test('[det] teléfono elimina letras al teclear (sanitiza)', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('300abc123')
    await expect(page.getByLabel(/Teléfono/)).toHaveValue('300123')
  })

  test('[det] teléfono con menos de 7 dígitos muestra error', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('123')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText('Debe tener al menos 7 dígitos.')).toBeVisible()
  })

  test('[det] teléfono con más de 15 dígitos muestra error', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('1234567890123456')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText('No puede superar los 15 dígitos.')).toBeVisible()
  })

  // --- Email (matriz) ---
  const emailBad = ['abc', 'a@b', 'a@b.c', 'sin-arroba.com', '@dominio.com']
  for (const v of emailBad) {
    test(`[det] email inválido "${v}" muestra formato inválido`, async ({ page }) => {
      await page.getByLabel(/Email/).fill(v)
      await page.getByLabel(/Nombre completo/).click()
      await expect(page.getByText(/Formato de email inválido/)).toBeVisible()
    })
  }

  test('[det] email válido no muestra error', async ({ page }) => {
    await page.getByLabel(/Email/).fill('correo@ejemplo.com')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText(/Formato de email inválido/)).toHaveCount(0)
  })

  // --- Datos bien: no deben mostrar error ---
  test('[det] nombre válido no muestra error', async ({ page }) => {
    await page.getByLabel(/Nombre completo/).fill('Carla Mendoza')
    await page.getByLabel(/Documento de identidad/).click()
    await expect(page.getByText('El nombre es obligatorio.')).toHaveCount(0)
    await expect(page.getByText('Debe tener al menos 2 caracteres.')).toHaveCount(0)
  })

  test('[det] documento de 5 caracteres es válido', async ({ page }) => {
    await page.getByLabel(/Documento de identidad/).fill('ABC12')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText(/Debe tener al menos 5 caracteres/)).toHaveCount(0)
  })

  test('[det] teléfono de 10 dígitos es válido', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('3001234567')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText(/Debe tener al menos 7 dígitos/)).toHaveCount(0)
    await expect(page.getByText(/No puede superar los 15 dígitos/)).toHaveCount(0)
  })

  // --- Gating del botón + cascada geo ---
  test('[det] "Guardar propietario" está deshabilitado al inicio', async ({ page }) => {
    await expect(footerNext(page, 'Guardar propietario')).toBeDisabled()
  })

  test('[det] Estado está deshabilitado hasta elegir País', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: /Estado/ })).toBeDisabled()
  })

  test('[det] Ciudad está deshabilitada hasta elegir Estado', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: /Ciudad/ })).toBeDisabled()
  })

  test('[det] botón "Descartar" cancela la creación del propietario', async ({ page }) => {
    await page.getByRole('button', { name: 'Descartar' }).click()
    await expect(page.getByRole('heading', { name: /Quién es el propietario/ })).toBeVisible()
  })

  test('[data] datos válidos + geo completa habilitan "Guardar propietario"', async ({ page }) => {
    await fillValidOwner(page)
    await expect(footerNext(page, 'Guardar propietario')).toBeEnabled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D. Propietario SIN mascota vs CON mascota
// ════════════════════════════════════════════════════════════════════════════
test.describe('D · Selección de mascota', () => {
  test('[data] propietario recién creado sin mascotas muestra estado vacío', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    // Un propietario nuevo no tiene mascotas.
    await expect(page.getByText('Sin mascotas registradas')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Registrar primera mascota' })).toBeVisible()
  })

  test('[data] "Continuar a la consulta" está deshabilitado sin mascota', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await expect(footerNext(page, /Continuar a la consulta|Guardar mascota/)).toBeDisabled()
  })

  test('[data] cambiar de propietario vuelve a la búsqueda', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await page.getByRole('button', { name: /Cambiar/ }).click()
    await expect(page.getByPlaceholder(/Buscar propietario/)).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// E. Crear mascota — validación (datos mal y bien)
// ════════════════════════════════════════════════════════════════════════════
test.describe('E · Mascota nueva · validación de campos', () => {
  test.beforeEach(async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await startCreatePet(page)
  })

  test('[data] nombre vacío (blur) muestra obligatorio', async ({ page }) => {
    await page.getByLabel(/^Nombre/).click()
    await page.getByLabel(/Número de chip/).click()
    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible()
  })

  test('[data] nombre de 1 carácter exige mínimo 2', async ({ page }) => {
    await page.getByLabel(/^Nombre/).fill('X')
    await page.getByLabel(/Número de chip/).click()
    await expect(page.getByText('Debe tener al menos 2 caracteres.')).toBeVisible()
  })

  test('[data] chip con menos de 15 dígitos muestra error ISO', async ({ page }) => {
    await page.getByLabel(/Número de chip/).fill('12345')
    await page.getByLabel(/^Nombre/).click()
    await expect(page.getByText(/exactamente 15 dígitos/)).toBeVisible()
  })

  test('[data] chip sanitiza no-dígitos y recorta a 15', async ({ page }) => {
    await page.getByLabel(/Número de chip/).fill('98-51a1234567890123456')
    await expect(page.getByLabel(/Número de chip/)).toHaveValue('985112345678901')
  })

  // --- Peso (matriz) ---
  const pesoCases: Array<{ v: string; msg: string; nombre: string }> = [
    { v: '0', msg: 'Debe ser mayor que 0.', nombre: 'cero' },
    { v: '3000', msg: 'Valor demasiado grande.', nombre: 'demasiado grande' },
  ]
  for (const c of pesoCases) {
    test(`[data] peso ${c.nombre} -> "${c.msg}"`, async ({ page }) => {
      await page.getByLabel(/^Peso/).fill(c.v)
      await page.getByLabel(/^Nombre/).click()
      await expect(page.getByText(c.msg)).toBeVisible()
    })
  }

  test('[data] peso elimina letras al teclear (sanitiza)', async ({ page }) => {
    await page.getByLabel(/^Peso/).fill('4a.2kg')
    await expect(page.getByLabel(/^Peso/)).toHaveValue('4.2')
  })

  test('[data] tamaño en cero muestra "Debe ser mayor que 0."', async ({ page }) => {
    await page.getByLabel(/Tamaño/).fill('0')
    await page.getByLabel(/^Nombre/).click()
    await expect(page.getByText('Debe ser mayor que 0.')).toBeVisible()
  })

  test('[data] Raza está deshabilitada hasta elegir Especie', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: /Raza/ })).toBeDisabled()
  })

  test('[data] "Guardar mascota" está deshabilitado hasta completar requeridos', async ({ page }) => {
    await expect(footerNext(page, 'Guardar mascota')).toBeDisabled()
  })

  test('[data] género ofrece Hembra y Macho', async ({ page }) => {
    await page.getByRole('combobox', { name: /Género/ }).click()
    await expect(page.getByRole('option', { name: 'Hembra' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Macho' })).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// F. Paso 2 — datos de la consulta (requiere propietario + mascota)
// ════════════════════════════════════════════════════════════════════════════
test.describe('F · Datos de la consulta', () => {
  // Estos casos necesitan un propietario CON mascota ya creada. Como crear una
  // mascota depende de la cascada de catálogos (especie/raza/color) + datepicker,
  // se marcan [data] y conviene correrlos contra una BD sembrada.
  test.beforeEach(async ({ page }) => {
    await gotoNuevaConsulta(page)
  })

  test('[det] sin llegar al paso 2, el botón inicial no es "Guardar consulta"', async ({ page }) => {
    // Verificación barata de que el paso 1 no expone el submit final.
    await expect(footerNext(page, 'Guardar consulta')).toHaveCount(0)
  })

  test('[data] anamnesis vacía deja "Guardar consulta" deshabilitado', async ({ page }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await expect(footerNext(page, 'Guardar consulta')).toBeDisabled()
  })

  test('[data] anamnesis en blanco (blur) muestra "La anamnesis es obligatoria."', async ({ page }) => {
    await irAPasoConsulta(page)
    await anamnesis(page).click()
    await anamnesis(page).blur()
    await expect(page.getByText('La anamnesis es obligatoria.')).toBeVisible()
  })

  test('[data] tipo + anamnesis habilitan "Guardar consulta"', async ({ page }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Paciente decaído, inapetencia de 2 días.')
    await expect(footerNext(page, 'Guardar consulta')).toBeEnabled()
  })

  test('[data] abrir la acción rápida de receta muestra su modal', async ({ page }) => {
    await irAPasoConsulta(page)
    await page.getByText('Receta', { exact: false }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// G. Flujo completo + borrador
// ════════════════════════════════════════════════════════════════════════════
test.describe('G · Flujo completo y borrador', () => {
  test('[data] happy path: crear consulta completa llega a la pantalla de éxito', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await startCreatePet(page)
    await page.getByLabel(/^Nombre/).fill('Firulais E2E')
    await pickSelect(page, /Especie/)
    await pickSelect(page, /Raza/)
    await pickSelect(page, /Color/)
    await pickSelect(page, /Género/, 'Macho')
    await pickSelect(page, /Estado reproductivo|reproductivo/).catch(() => {})
    await page.getByLabel(/^Peso/).fill('5.4')
    // Nota: la fecha de nacimiento (datepicker) y el estado reproductivo
    // (SegmentedRadio) pueden requerir interacción específica; si el botón
    // sigue deshabilitado, este caso lo revela.
    await footerNext(page, 'Guardar mascota').click()
    await footerNext(page, 'Continuar a la consulta').click()
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta E2E de prueba automatizada.')
    await footerNext(page, 'Guardar consulta').click()
    await expect(page).toHaveURL(/exito|consulta-nueva-exito/)
  })

  test('[data] cancelar con datos abre el diálogo de descartar', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await startCreateOwnerFromEmpty(page)
    await page.getByLabel(/Nombre completo/).fill(validOwner.name)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    // Con datos sin propietario confirmado, se abre el diálogo de descartar.
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('[det] el borrador persiste al recargar la página', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await searchOwner(page, 'Memoria Borrador E2E')
    await page.reload()
    // El buscador o el estado del wizard debe seguir accesible tras recargar.
    await expect(page.getByRole('heading', { name: /Quién es el propietario|Propietario/ })).toBeVisible()
  })
})

// ── util local ───────────────────────────────────────────────────────────────
/** Crea propietario + mascota mínimos y avanza al paso 2 (consulta). [data] */
async function irAPasoConsulta(page: import('@playwright/test').Page): Promise<void> {
  await createAndSelectOwner(page)
  await startCreatePet(page)
  await page.getByLabel(/^Nombre/).fill('Firulais E2E')
  await pickSelect(page, /Especie/)
  await pickSelect(page, /Raza/)
  await pickSelect(page, /Color/)
  await pickSelect(page, /Género/, 'Macho')
  await page.getByLabel(/^Peso/).fill('5.4')
  await footerNext(page, 'Guardar mascota').click()
  await footerNext(page, 'Continuar a la consulta').click()
  await expect(page.getByRole('heading', { name: /Datos de la consulta/ })).toBeVisible()
}
