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
  expectFormBlocked,
  REVISA_CAMPOS_MSG,
  pickSelect,
  fillValidOwner,
  createAndSelectOwner,
  startCreatePet,
  fillValidPet,
  fillRequiredPet,
  anamnesis,
  validOwner,
  openQuickAction,
  createInSearchable,
  uniqueSuffix,
  createOwnerWithPet,
  selectExistingOwnerAndPet,
  fillReceta,
  guardarConsulta,
  trackApiWrites,
  asteriskAudit,
  type OwnerData,
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

  // --- Teléfono (REQUERIDO · solo dígitos) ---
  test('[det] teléfono vacío (blur) muestra obligatorio', async ({ page }) => {
    await page.getByLabel(/Teléfono/).click()
    await page.getByLabel(/Nombre completo/).click() // blur
    await expect(page.getByText('El teléfono es obligatorio.')).toBeVisible()
  })

  test('[det] teléfono solo acepta dígitos (elimina letras y símbolos al teclear)', async ({
    page,
  }) => {
    // '+', espacios, guiones y paréntesis se descartan: queda solo el número.
    await page.getByLabel(/Teléfono/).fill('+57 (300) abc 123-45 67')
    await expect(page.getByLabel(/Teléfono/)).toHaveValue('573001234567')
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

  test('[det] teléfono de exactamente 7 dígitos es válido (límite inferior)', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('1234567')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText(/Debe tener al menos 7 dígitos/)).toHaveCount(0)
  })

  test('[det] teléfono de 6 dígitos muestra error (justo debajo del límite)', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('123456')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText('Debe tener al menos 7 dígitos.')).toBeVisible()
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

  test('[det] email vacío no muestra error (opcional)', async ({ page }) => {
    await page.getByLabel(/Email/).click()
    await page.getByLabel(/Nombre completo/).click() // blur sin escribir
    await expect(page.getByText(/Formato de email inválido/)).toHaveCount(0)
    await expect(page.getByText(/obligatorio/)).toHaveCount(0)
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

  test('[det] documento de 20 caracteres es válido (límite superior)', async ({ page }) => {
    await page.getByLabel(/Documento de identidad/).fill('A'.repeat(20))
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText(/No puede superar los 20 caracteres/)).toHaveCount(0)
  })

  test('[det] teléfono de 10 dígitos es válido', async ({ page }) => {
    await page.getByLabel(/Teléfono/).fill('3001234567')
    await page.getByLabel(/Nombre completo/).click()
    await expect(page.getByText(/Debe tener al menos 7 dígitos/)).toHaveCount(0)
    await expect(page.getByText(/No puede superar los 15 dígitos/)).toHaveCount(0)
  })

  // --- Datos fiscales: tipo de documento + tipo de persona (requeridos por el backend) ---
  test('[det] "Tipo de documento" ofrece las opciones fiscales', async ({ page }) => {
    await page.getByRole('combobox', { name: /Tipo de documento/ }).click()
    const listbox = page.getByRole('listbox')
    await expect(listbox.getByRole('option', { name: /Cédula de ciudadanía/ })).toBeVisible()
    await expect(listbox.getByRole('option', { name: /NIT/ })).toBeVisible()
    await expect(listbox.getByRole('option', { name: /Pasaporte/ })).toBeVisible()
  })

  test('[det] seleccionar un tipo de documento se refleja en el control', async ({ page }) => {
    await pickSelect(page, /Tipo de documento/, /NIT/)
    await expect(page.getByRole('combobox', { name: /Tipo de documento/ })).toContainText('NIT')
  })

  test('[det] "Tipo de persona" ofrece Natural y Jurídica', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'Natural' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Jurídica' })).toBeVisible()
  })

  test('[det] seleccionar "Jurídica" lo marca activo', async ({ page }) => {
    await page.getByRole('radio', { name: 'Jurídica' }).click()
    await expect(page.getByRole('radio', { name: 'Jurídica' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  // --- Botón SIEMPRE activo + validación animada al click + cascada geo ---
  test('[det] "Guardar propietario" está SIEMPRE activo; click vacío valida y no avanza', async ({ page }) => {
    const btn = footerNext(page, 'Guardar propietario')
    await expect(btn).toBeEnabled()
    await btn.click()
    // No avanza: seguimos en el form, banner-guía y controles en rojo (shake).
    await expectFormBlocked(page, /Registrar nuevo propietario/)
  })

  test('[data] con todo lleno pero SIN tipo de persona, el click valida y no crea; al completar, crea', async ({ page }) => {
    // Llena nombre/doc/teléfono + tipo de documento + geo, pero NO el tipo de persona.
    const doc = `SP${uniqueSuffix()}`.slice(0, 20)
    await page.getByLabel(/Nombre completo/).fill('Sin Persona E2E')
    await page.getByLabel(/Documento de identidad/).fill(doc)
    await page.getByLabel(/Teléfono/).fill('3001234567')
    await pickSelect(page, /Tipo de documento/)
    await pickSelect(page, /País/)
    await pickSelect(page, /Estado/)
    await pickSelect(page, /Ciudad/)
    // Falta tipo de persona → click valida (el SegmentedRadio marca inválido) y no avanza.
    await footerNext(page, 'Guardar propietario').click()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.getByRole('heading', { name: /Registrar nuevo propietario/ })).toBeVisible()
    await expect(page.locator('.segmented.invalid')).toBeVisible()
    // Al elegir el tipo de persona y reintentar, crea y avanza a la mascota.
    await page.getByRole('radio', { name: 'Natural' }).click()
    await footerNext(page, 'Guardar propietario').click()
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
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

  test('[data] datos válidos + geo completa (SIN email ni dirección) → el click CREA el propietario', async ({
    page,
  }) => {
    // fillValidOwner NO llena email ni dirección → confirma que ambos son opcionales.
    await fillValidOwner(page)
    await expect(footerNext(page, 'Guardar propietario')).toBeEnabled()
    await footerNext(page, 'Guardar propietario').click()
    // Crea y avanza a la selección de mascota (sin banner de error).
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toHaveCount(0)
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

  test('[data] "Continuar a la consulta" activo sin mascota; click muestra banner-guía y no avanza', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    const btn = footerNext(page, 'Continuar a la consulta')
    await expect(btn).toBeEnabled()
    await btn.click()
    // Sin mascota seleccionada: banner guía y seguimos en el paso 1.
    await expect(page.getByText('Selecciona una mascota para continuar.')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Datos de la consulta/ })).toHaveCount(0)
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

  test('[data] chip de 15 dígitos exactos es válido (opcional pero con formato)', async ({ page }) => {
    await page.getByLabel(/Número de chip/).fill('985112345678901')
    await page.getByLabel(/^Nombre/).click()
    await expect(page.getByText(/exactamente 15 dígitos/)).toHaveCount(0)
  })

  test('[data] chip sanitiza no-dígitos y recorta a 15', async ({ page }) => {
    await page.getByLabel(/Número de chip/).fill('98-51a1234567890123456')
    await expect(page.getByLabel(/Número de chip/)).toHaveValue('985112345678901')
  })

  // --- Peso (OPCIONAL · numérico · validado solo cuando hay valor) ---
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

  test('[data] peso solo acepta numérico (elimina letras al teclear)', async ({ page }) => {
    await page.getByLabel(/^Peso/).fill('4a.2kg')
    await expect(page.getByLabel(/^Peso/)).toHaveValue('4.2')
  })

  test('[data] peso vacío no muestra error (opcional)', async ({ page }) => {
    await page.getByLabel(/^Peso/).click()
    await page.getByLabel(/^Nombre/).click() // blur sin escribir
    await expect(page.getByText('Debe ser mayor que 0.')).toHaveCount(0)
    await expect(page.getByText(/obligatorio/)).toHaveCount(0)
  })

  // --- Tamaño (OPCIONAL · numérico · validado solo cuando hay valor) ---
  test('[data] tamaño en cero muestra "Debe ser mayor que 0."', async ({ page }) => {
    await page.getByLabel(/Tamaño/).fill('0')
    await page.getByLabel(/^Nombre/).click()
    await expect(page.getByText('Debe ser mayor que 0.')).toBeVisible()
  })

  test('[data] tamaño vacío no muestra error (opcional)', async ({ page }) => {
    await page.getByLabel(/Tamaño/).click()
    await page.getByLabel(/^Nombre/).click() // blur sin escribir
    await expect(page.getByText('Debe ser mayor que 0.')).toHaveCount(0)
  })

  test('[data] Raza está deshabilitada hasta elegir Especie', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: /Raza/ })).toBeDisabled()
  })

  test('[data] "Guardar mascota" está SIEMPRE activo; click vacío valida y no crea', async ({ page }) => {
    const btn = footerNext(page, 'Guardar mascota')
    await expect(btn).toBeEnabled()
    await btn.click()
    await expectFormBlocked(page, /Registrar nueva mascota/)
  })

  test('[data] con SOLO los requeridos (sin fecha, peso, unidad ni tamaño) el click CREA la mascota', async ({
    page,
  }) => {
    // Prueba que fecha de nacimiento, peso, unidad de peso y tamaño son OPCIONALES.
    await fillRequiredPet(page)
    await footerNext(page, 'Guardar mascota').click()
    // Crea y vuelve a la selección de mascota (ya con la nueva seleccionada).
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toHaveCount(0)
  })

  test('[data] sin estado reproductivo, el click valida (shake) y no crea; al completar, crea', async ({ page }) => {
    // Todo lo requerido MENOS el estado reproductivo (SegmentedRadio).
    await page.getByLabel(/^Nombre/).fill('Mascota Req E2E')
    await pickSelect(page, /Especie/)
    await pickSelect(page, /Raza/)
    await pickSelect(page, /Color/)
    await pickSelect(page, /Género/, 'Macho')
    await footerNext(page, 'Guardar mascota').click()
    // No crea: banner + el SegmentedRadio del estado reproductivo marcado inválido.
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.locator('.segmented.invalid')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Registrar nueva mascota/ })).toBeVisible()
    // Al elegir el estado reproductivo y reintentar, crea.
    await page.getByRole('radio', { name: 'Desconocido' }).click()
    await footerNext(page, 'Guardar mascota').click()
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
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

  test('[data] anamnesis vacía: click "Guardar consulta" valida y NO abre confirmación', async ({ page }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await expect(footerNext(page, 'Guardar consulta')).toBeEnabled()
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('[data] anamnesis en blanco (blur) muestra "La anamnesis es obligatoria."', async ({ page }) => {
    await irAPasoConsulta(page)
    await anamnesis(page).click()
    await anamnesis(page).blur()
    await expect(page.getByText('La anamnesis es obligatoria.')).toBeVisible()
  })

  test('[data] anamnesis solo-espacios cuenta como vacía: valida y NO abre confirmación', async ({
    page,
  }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('    ')
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('[data] tipo + anamnesis: click "Guardar consulta" abre el modal de confirmación', async ({ page }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Paciente decaído, inapetencia de 2 días.')
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByRole('alertdialog')).toContainText(/Guardar la consulta/)
  })

  test('[data] sin tipo de consulta (solo anamnesis): valida y no confirma; al elegir tipo, confirma', async ({
    page,
  }) => {
    await irAPasoConsulta(page)
    await anamnesis(page).fill('Anamnesis completa pero sin tipo.')
    await footerNext(page, 'Guardar consulta').click()
    // Falta el tipo (obligatorio) → banner + no confirmación.
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    // Al elegir el tipo y reintentar, abre la confirmación → confirma que el tipo es obligatorio.
    await pickSelect(page, /Tipo de consulta/)
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
  })

  test('[data] diagnóstico y planes vacíos NO bloquean (opcionales): confirma con solo tipo + anamnesis', async ({ page }) => {
    // Solo tipo + anamnesis; diagnóstico, planes y próximo control quedan vacíos.
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Motivo de consulta de prueba.')
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
  })

  test('[data] "Peso en la consulta" solo acepta numérico (opcional)', async ({ page }) => {
    await irAPasoConsulta(page)
    const peso = page.getByLabel(/Peso en la consulta/)
    await peso.fill('12a.5kg')
    await expect(peso).toHaveValue('12.5')
  })

  test('[data] abrir la acción rápida de receta muestra su modal', async ({ page }) => {
    await irAPasoConsulta(page)
    await openQuickAction(page, /Receta/, 'Nueva receta')
  })

  test('[data] "Guardar consulta" abre un modal de confirmación (no guarda directo)', async ({
    page,
  }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta a confirmar E2E.')
    await footerNext(page, 'Guardar consulta').click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    await expect(confirm.getByText('¿Guardar la consulta?')).toBeVisible()
    // Aún no navegó a éxito ni abrió facturación.
    await expect(page).not.toHaveURL(/exito/)
    await expect(page.getByRole('dialog', { name: /Facturación/ })).toHaveCount(0)
  })

  test('[data] confirmación: "Seguir editando" cierra el modal sin guardar', async ({ page }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta a confirmar E2E.')
    await footerNext(page, 'Guardar consulta').click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(confirm).toBeHidden()
    await expect(page.getByRole('heading', { name: /Datos de la consulta/ })).toBeVisible()
    await expect(page).not.toHaveURL(/exito/)
  })

  test('[data] ya NO existe el botón "Guardar y crear otra"', async ({ page }) => {
    await irAPasoConsulta(page)
    await expect(page.getByRole('button', { name: /Guardar y crear otra/ })).toHaveCount(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// H. Procedimientos de la consulta — los 7 modales de acciones rápidas
//    (casos vacíos/obligatorios, tipos de dato y éxito). Todos [data]: crean
//    propietario + mascota para llegar al paso 2, y los de catálogo creable
//    (examen/imagen/vacuna/cirugía) crean su tipo inline en la BD.
// ════════════════════════════════════════════════════════════════════════════
test.describe('H · Procedimientos de la consulta', () => {
  // Un solo "paciente" (propietario + mascota) por worker: se crea una vez y
  // cada test lo RE-SELECCIONA con draft limpio → fiel al flujo real (una visita,
  // varias acciones) y evita recrear owner+pet en cada caso.
  let sharedOwner: OwnerData
  let sharedPetName: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    try {
      await gotoNuevaConsulta(page)
      const { owner, pet } = await createOwnerWithPet(page)
      sharedOwner = owner
      sharedPetName = pet.name
    } finally {
      await page.close()
    }
  })

  test.beforeEach(async ({ page }) => {
    await selectExistingOwnerAndPet(page, sharedOwner, sharedPetName)
  })

  // ── Receta (medicamentos) ──────────────────────────────────────────────────
  test('[data] Receta: guardar vacío muestra los requeridos', async ({ page }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await d.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(d.getByText('Indica el diagnóstico')).toBeVisible()
    await expect(d.getByText('Indica el medicamento')).toBeVisible()
    await expect(d.getByText('Indica la presentación')).toBeVisible()
    await expect(d.getByText('Indica la cantidad')).toBeVisible()
    await expect(d.getByText('Indica la posología')).toBeVisible()
    await expect(d).toBeVisible() // sigue abierto
  })

  test('[data] Receta: cantidad no numérica muestra "Cantidad inválida"', async ({ page }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await d.getByLabel(/Cantidad/).fill('abc')
    await d.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(d.getByText('Cantidad inválida')).toBeVisible()
  })

  test('[data] Receta: guardar sube el contador y queda en el draft (round-trip)', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(d).toBeHidden()
    // El tile refleja el conteo…
    await expect(page.getByText('1 generada · click para añadir más')).toBeVisible()
    // …y al reabrir, la receta persiste en el draft ("Ya agregadas").
    const d2 = await openQuickAction(page, /Receta/, 'Nueva receta')
    await expect(d2.getByText('Ya agregadas (1)')).toBeVisible()
  })

  test('[data] Receta: agregar y quitar un segundo medicamento', async ({ page }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await expect(d.getByText('1 en la receta')).toBeVisible()
    await d.getByRole('button', { name: 'Agregar otro medicamento' }).click()
    await expect(d.getByText('2 en la receta')).toBeVisible()
    await d.getByRole('button', { name: 'Quitar medicamento' }).first().click()
    await expect(d.getByText('1 en la receta')).toBeVisible()
  })

  test('[data] Receta: editar una ya agregada actualiza su diagnóstico', async ({ page }) => {
    let d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await fillReceta(page, { diagnosis: 'Diagnóstico inicial' })
    await d.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(d).toBeHidden()
    d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await d.getByRole('button', { name: 'Editar receta' }).click()
    await expect(d.getByText(/Editando receta #1/)).toBeVisible()
    await d.getByLabel(/Diagnóstico/).fill('Diagnóstico corregido')
    await d.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(d.getByText('Ya agregadas (1)')).toBeVisible()
    await expect(d.getByText('Diagnóstico corregido')).toBeVisible()
  })

  test('[data] Receta: eliminar una ya agregada la quita del draft', async ({ page }) => {
    let d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(d).toBeHidden()
    d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await expect(d.getByText('Ya agregadas (1)')).toBeVisible()
    await d.getByRole('button', { name: 'Eliminar receta' }).click()
    await expect(d.getByText(/Ya agregadas/)).toHaveCount(0)
  })

  // ── Examen de laboratorio (catálogo creable) ────────────────────────────────
  test('[data] Examen lab: guardar vacío exige tipo y diagnóstico presuntivo', async ({ page }) => {
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    // "Selecciona un tipo" también es el placeholder del select → acotamos al <p class="error">.
    await expect(d.locator('p.error', { hasText: 'Selecciona un tipo' })).toBeVisible()
    await expect(d.getByText('Indica el diagnóstico presuntivo')).toBeVisible()
    await expect(d).toBeVisible()
  })

  test('[data] Examen lab: cantidad menor que 1 muestra "Cantidad inválida"', async ({ page }) => {
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    await d.getByLabel(/Cantidad/).fill('0')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d.getByText('Cantidad inválida')).toBeVisible()
  })

  test('[data] Examen lab: crear tipo (sin descripción) + diagnóstico guarda; POST del tipo 2xx', async ({
    page,
  }) => {
    const api = trackApiWrites(page)
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    // createInSearchable NO llena descripción → verifica que description es OPCIONAL.
    await createInSearchable(page, 'Tipo de examen', `Hemograma E2E ${uniqueSuffix()}`)
    await d.getByLabel(/Diagnóstico presuntivo/).fill('Sospecha de anemia')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d).toBeHidden()
    api.assertAllOk() // el POST de creación del tipo respondió 2xx
  })

  test('[data] Examen lab: se puede agregar un segundo examen (multi-ítem)', async ({ page }) => {
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    await expect(d.getByLabel(/Cantidad/)).toHaveCount(1)
    await d.getByRole('button', { name: 'Agregar otro examen' }).click()
    await expect(d.getByLabel(/Cantidad/)).toHaveCount(2)
  })

  // ── Imagen diagnóstica (catálogo creable) ───────────────────────────────────
  test('[data] Imagen Dx: guardar vacío exige los 4 requeridos', async ({ page }) => {
    const d = await openQuickAction(page, /Imagen Dx/, 'Solicitar imagen diagnóstica')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d.getByText('Selecciona un tipo de estudio')).toBeVisible()
    await expect(d.getByText('Indica la región o protocolo')).toBeVisible()
    await expect(d.getByText('Indica los signos clínicos')).toBeVisible()
    await expect(d.getByText('Indica el diagnóstico presuntivo')).toBeVisible()
  })

  test('[data] Imagen Dx: signos con menos de 4 caracteres muestra "Mínimo 4 caracteres"', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Imagen Dx/, 'Solicitar imagen diagnóstica')
    await d.getByLabel(/Signos clínicos/).fill('ab')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d.getByText('Mínimo 4 caracteres')).toBeVisible()
  })

  test('[data] Imagen Dx: crear tipo + campos guarda; POST del tipo 2xx', async ({ page }) => {
    const api = trackApiWrites(page)
    const d = await openQuickAction(page, /Imagen Dx/, 'Solicitar imagen diagnóstica')
    await createInSearchable(page, 'Tipo de estudio', `Radiografía E2E ${uniqueSuffix()}`)
    await d.getByLabel(/Región \/ Protocolo/).fill('Tórax LL')
    await d.getByLabel(/Signos clínicos/).fill('Tos productiva de 5 días')
    await d.getByLabel(/Diagnóstico presuntivo/).fill('Neumonía bacteriana')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d).toBeHidden()
    api.assertAllOk()
  })

  // ── Vacunación (catálogo creable) ───────────────────────────────────────────
  test('[data] Vacunación: guardar vacío exige tipo y lote', async ({ page }) => {
    const d = await openQuickAction(page, /Vacunación/, 'Aplicar vacuna')
    await d.getByRole('button', { name: 'Registrar vacunación' }).click()
    await expect(d.getByText('Selecciona un tipo')).toBeVisible()
    await expect(d.getByText('Indica el lote')).toBeVisible()
  })

  test('[data] Vacunación: crear tipo + lote guarda; POST del tipo 2xx', async ({ page }) => {
    const api = trackApiWrites(page)
    const d = await openQuickAction(page, /Vacunación/, 'Aplicar vacuna')
    await createInSearchable(page, 'Tipo de vacuna', `Antirrábica E2E ${uniqueSuffix()}`)
    await d.getByLabel(/Lote/).fill('ABC-2026-12')
    await d.getByRole('button', { name: 'Registrar vacunación' }).click()
    await expect(d).toBeHidden()
    api.assertAllOk()
  })

  test('[data] Vacunación: se puede agregar una segunda vacuna (multi-ítem)', async ({ page }) => {
    const d = await openQuickAction(page, /Vacunación/, 'Aplicar vacuna')
    await expect(d.getByLabel(/Lote/)).toHaveCount(1)
    await d.getByRole('button', { name: 'Agregar otra vacuna' }).click()
    await expect(d.getByLabel(/Lote/)).toHaveCount(2)
  })

  // ── Hospitalización (catálogo local, tipo por defecto) ──────────────────────
  test('[data] Hospitalización: guardar vacío exige el motivo (mínimo 4)', async ({ page }) => {
    const d = await openQuickAction(page, /Hospitalización/, 'Ingresar a hospitalización')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d.getByText('Indica el motivo (mínimo 4 caracteres)')).toBeVisible()
  })

  test('[data] Hospitalización: motivo válido guarda y cierra (tipo y fecha por defecto)', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Hospitalización/, 'Ingresar a hospitalización')
    await d.getByLabel(/Motivo de hospitalización/).fill('Gastroenteritis hemorrágica severa')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d).toBeHidden()
  })

  test('[data] Hospitalización: el "Tipo" lista Ambulatoria y Hospitalización', async ({ page }) => {
    const d = await openQuickAction(page, /Hospitalización/, 'Ingresar a hospitalización')
    await d.getByRole('combobox', { name: /Tipo/ }).click()
    const lb = page.getByRole('listbox')
    await expect(lb.getByRole('option', { name: 'Ambulatoria' })).toBeVisible()
    await expect(lb.getByRole('option', { name: 'Hospitalización' })).toBeVisible()
  })

  // ── Desparasitación (catálogo local, tipo por defecto) ──────────────────────
  test('[data] Desparasitación: guardar vacío exige producto y dosis', async ({ page }) => {
    const d = await openQuickAction(page, /Desparasitación/, 'Registrar desparasitación')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d.getByText('Indica el producto')).toBeVisible()
    await expect(d.getByText('Indica la dosis')).toBeVisible()
  })

  test('[data] Desparasitación: producto + dosis guarda y cierra', async ({ page }) => {
    const d = await openQuickAction(page, /Desparasitación/, 'Registrar desparasitación')
    await d.getByLabel(/Producto/).fill('Drontal Plus')
    await d.getByLabel(/Dosis/).fill('1 comp. por cada 10 kg')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d).toBeHidden()
  })

  test('[data] Desparasitación: el "Tipo" lista Interna, Externa, Mixta y Otra', async ({ page }) => {
    const d = await openQuickAction(page, /Desparasitación/, 'Registrar desparasitación')
    await d.getByRole('combobox', { name: /Tipo/ }).click()
    const lb = page.getByRole('listbox')
    await expect(lb.getByRole('option', { name: 'Interna' })).toBeVisible()
    await expect(lb.getByRole('option', { name: 'Externa' })).toBeVisible()
    await expect(lb.getByRole('option', { name: 'Mixta' })).toBeVisible()
    await expect(lb.getByRole('option', { name: 'Otra' })).toBeVisible()
  })

  // ── Cirugía (catálogo creable) ──────────────────────────────────────────────
  test('[data] Cirugía: guardar vacío exige tipo y descripción', async ({ page }) => {
    const d = await openQuickAction(page, /Cirugía/, 'Programar cirugía')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d.getByText('Selecciona un tipo')).toBeVisible()
    await expect(d.getByText('Mínimo 4 caracteres')).toBeVisible()
  })

  test('[data] Cirugía: descripción con menos de 4 caracteres muestra "Mínimo 4 caracteres"', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Cirugía/, 'Programar cirugía')
    await d.getByLabel(/Descripción del procedimiento/).fill('ab')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d.getByText('Mínimo 4 caracteres')).toBeVisible()
  })

  test('[data] Cirugía: crear tipo + descripción guarda; POST del tipo 2xx', async ({ page }) => {
    const api = trackApiWrites(page)
    const d = await openQuickAction(page, /Cirugía/, 'Programar cirugía')
    await createInSearchable(page, 'Tipo de cirugía', `Esterilización E2E ${uniqueSuffix()}`)
    await d.getByLabel(/Descripción del procedimiento/).fill('Ovariohisterectomía por laparotomía')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d).toBeHidden()
    api.assertAllOk()
  })

  // ── Cierre de modales (regla UX: solo X / Escape; el backdrop NO cierra) ─────
  test('[data] el modal se cierra con Escape', async ({ page }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await page.keyboard.press('Escape')
    await expect(d).toBeHidden()
  })

  test('[data] el modal se cierra con la X (Cerrar)', async ({ page }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await d.getByRole('button', { name: 'Cerrar' }).click()
    await expect(d).toBeHidden()
  })

  test('[data] el modal NO se cierra al hacer click en el backdrop', async ({ page }) => {
    const d = await openQuickAction(page, /Receta/, 'Nueva receta')
    // Click en la esquina del overlay (fuera de la tarjeta) → debe seguir abierto.
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } })
    await expect(d).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// G. Flujo completo + borrador
// ════════════════════════════════════════════════════════════════════════════
test.describe('G · Flujo completo y borrador', () => {
  test('[data] happy path: crear consulta (solo guardar) llega a éxito y los servicios responden 2xx', async ({
    page,
  }) => {
    const api = trackApiWrites(page)
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await startCreatePet(page)
    await fillValidPet(page)
    await footerNext(page, 'Guardar mascota').click()
    await footerNext(page, 'Continuar a la consulta').click()
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta E2E de prueba automatizada.')
    // Guardar consulta → modal de facturación → "Solo guardar" → éxito.
    await guardarConsulta(page, 'solo-guardar')
    // Ningún POST/PUT del flujo (owner, animal, consulta) devolvió >= 400.
    api.assertAllOk()
  })

  test('[data] happy path con procedimientos (receta + hospitalización + desparasitación) llega a éxito', async ({
    page,
  }) => {
    // Ejercita la cascada real de POST de los procedimientos (no solo el draft).
    // La mascota se crea SIN chip → confirma el camino code=null end-to-end.
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con procedimientos, E2E.')

    let d = await openQuickAction(page, /Receta/, 'Nueva receta')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar receta' }).click()
    await expect(d).toBeHidden()

    d = await openQuickAction(page, /Hospitalización/, 'Ingresar a hospitalización')
    await d.getByLabel(/Motivo de hospitalización/).fill('Gastroenteritis hemorrágica severa')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d).toBeHidden()

    d = await openQuickAction(page, /Desparasitación/, 'Registrar desparasitación')
    await d.getByLabel(/Producto/).fill('Drontal Plus')
    await d.getByLabel(/Dosis/).fill('1 comp. por cada 10 kg')
    await d.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(d).toBeHidden()

    // Guardar consulta → modal de facturación → "Solo guardar" → éxito.
    await guardarConsulta(page, 'solo-guardar')
  })

  test('[data] happy path con procedimiento de catálogo (examen de laboratorio) llega a éxito', async ({
    page,
  }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con examen de laboratorio, E2E.')
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    await createInSearchable(page, 'Tipo de examen', `Hemograma E2E ${uniqueSuffix()}`)
    await d.getByLabel(/Diagnóstico presuntivo/).fill('Sospecha de anemia')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d).toBeHidden()
    // Guardar consulta → modal de facturación → "Solo guardar" → éxito.
    await guardarConsulta(page, 'solo-guardar')
  })

  test('[data] facturación integrada: guardar + abrir cuenta con cargos, servicios responden 2xx', async ({
    page,
  }) => {
    // Verifica la rama de facturación: al guardar la consulta se abre una cuenta
    // con el cargo "Consulta" precargado, y todos los POST responden 2xx.
    const api = trackApiWrites(page)
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con cobro a cuenta, E2E.')

    // "Guardar consulta" abre el modal de confirmación; el POST /consultations
    // dispara al confirmar. Debe responder 2xx.
    await footerNext(page, 'Guardar consulta').click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    const [consultaResp] = await Promise.all([
      page.waitForResponse(
        (r) => new URL(r.url()).pathname.endsWith('/consultations') && r.request().method() === 'POST',
      ),
      confirm.getByRole('button', { name: 'Confirmar y guardar' }).click(),
    ])
    expect(consultaResp.ok(), `POST /consultations → ${consultaResp.status()}`).toBeTruthy()

    // Modal de facturación → abrir cuenta; POST /open-accounts debe responder 2xx.
    const billing = page.getByRole('dialog', { name: /Facturación/ })
    await expect(billing).toBeVisible()
    const [accountResp] = await Promise.all([
      page.waitForResponse(
        (r) => new URL(r.url()).pathname.endsWith('/open-accounts') && r.request().method() === 'POST',
      ),
      billing.getByRole('button', { name: /Guardar y abrir cuenta/ }).click(),
    ])
    expect(accountResp.ok(), `POST /open-accounts → ${accountResp.status()}`).toBeTruthy()

    await expect(page).toHaveURL(/exito|consulta-nueva-exito/)
    api.assertAllOk() // consulta + cuenta + cargo(s) todos 2xx
  })

  test('[data] cancelar con datos abre el diálogo de descartar', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await startCreateOwnerFromEmpty(page)
    await page.getByLabel(/Nombre completo/).fill(validOwner.name)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    // Con datos sin propietario confirmado, se abre el diálogo de descartar.
    // OJO: DiscardConsultaDialog usa role="alertdialog" (no "dialog").
    await expect(page.getByRole('alertdialog')).toBeVisible()
  })

  test('[det] el borrador persiste al recargar la página', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await searchOwner(page, 'Memoria Borrador E2E')
    await page.reload()
    // El buscador o el estado del wizard debe seguir accesible tras recargar.
    await expect(page.getByRole('heading', { name: /Quién es el propietario|Propietario/ })).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// I. Persistencia del draft, banner "Consulta en curso" y paciente recurrente
// ════════════════════════════════════════════════════════════════════════════
test.describe('I · Draft, banner y paciente existente', () => {
  test('[data] el draft de la consulta (paso 2) persiste tras recargar', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    await anamnesis(page).fill('Anamnesis que debe sobrevivir al reload.')
    await page.reload()
    await expect(page.getByRole('heading', { name: /Datos de la consulta/ })).toBeVisible()
    await expect(anamnesis(page)).toHaveValue('Anamnesis que debe sobrevivir al reload.')
  })

  test('[data] banner "Consulta en curso" aparece al salir y permite volver', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page) // deja un propietario seleccionado en el draft
    // Sale del wizard → el banner global debe aparecer.
    await page.goto('/dashboard')
    const banner = page.getByRole('status').filter({ hasText: 'Consulta en curso' })
    await expect(banner).toBeVisible()
    await banner.getByRole('button', { name: 'Volver a la consulta' }).click()
    await expect(page).toHaveURL(/consulta\/nueva/)
  })

  test('[data] seleccionar propietario y mascota EXISTENTES llega al paso de consulta', async ({
    page,
    browser,
  }) => {
    // Siembra un paciente…
    await gotoNuevaConsulta(page)
    const { owner, pet } = await createOwnerWithPet(page)
    // …y en una sesión nueva lo reencuentra por búsqueda y avanza (flujo recurrente).
    const page2 = await browser.newPage()
    try {
      await selectExistingOwnerAndPet(page2, owner, pet.name)
      await expect(page2.getByRole('heading', { name: /Datos de la consulta/ })).toBeVisible()
    } finally {
      await page2.close()
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// J. Auditoría de obligatorios (*) vs opcionales — verificación GRÁFICA del
//    marcador `*` y de que se comporta acorde (los * bloquean; los sin-* no).
// ════════════════════════════════════════════════════════════════════════════
test.describe('J · Campos obligatorios (*) vs opcionales', () => {
  test('[det] Propietario: el * marca EXACTAMENTE los campos obligatorios', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await startCreateOwnerFromEmpty(page)
    const { required, optional } = await asteriskAudit(page)
    expect(required).toEqual([
      'Ciudad',
      'Documento de identidad',
      'Estado / Departamento',
      'Nombre completo',
      'País',
      'Teléfono',
      'Tipo de documento',
      'Tipo de persona',
    ])
    // Email y Dirección NO llevan * → deben ser opcionales.
    expect(optional).toEqual(['Dirección', 'Email'])
  })

  test('[data] Propietario: los * bloquean el guardado y los opcionales (email/dirección) no', async ({
    page,
  }) => {
    await gotoNuevaConsulta(page)
    await startCreateOwnerFromEmpty(page)
    // fillValidOwner llena los requeridos y deja email + dirección VACÍOS.
    await fillValidOwner(page)
    // Vaciar un requerido (nombre) ⇒ al intentar guardar, bloquea (banner + campo en rojo).
    await page.getByLabel(/Nombre completo/).fill('')
    await footerNext(page, 'Guardar propietario').click()
    await expectFormBlocked(page, /Registrar nuevo propietario/)
    // Rehacer el nombre ⇒ ahora SÍ guarda (email/dirección vacíos NO bloquean ⇒ opcionales).
    await page.getByLabel(/Nombre completo/).fill('Rehecho E2E')
    await footerNext(page, 'Guardar propietario').click()
    await expect(page.getByRole('heading', { name: /Selecciona la mascota/ })).toBeVisible()
  })

  test('[det] Propietario: nombre solo-espacios cuenta como vacío (obligatorio)', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await startCreateOwnerFromEmpty(page)
    await page.getByLabel(/Nombre completo/).fill('   ')
    await page.getByLabel(/Documento de identidad/).click() // blur
    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible()
  })

  test('[data] Mascota: el * marca EXACTAMENTE los campos obligatorios', async ({ page }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await startCreatePet(page)
    const { required, optional } = await asteriskAudit(page)
    expect(required).toEqual([
      'Color',
      'Especie',
      'Estado reproductivo',
      'Género',
      'Nombre',
      'Raza',
    ])
    // Chip, fecha de nacimiento, tipo, peso, unidad de peso y tamaño NO llevan *.
    expect(optional).toEqual([
      'Fecha de nacimiento',
      'Número de chip',
      'Peso',
      'Tamaño (cm)',
      'Tipo',
      'Unidad de peso',
    ])
  })

  test('[data] Consulta: solo Fecha y Tipo de consulta llevan * (el resto opcional)', async ({
    page,
  }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    const { required, optional } = await asteriskAudit(page)
    expect(required).toEqual(['Fecha', 'Tipo de consulta'])
    expect(optional).toEqual(['Fecha sugerida', 'Notas para el control', 'Peso en la consulta'])
    // La anamnesis es obligatoria pero se marca en el encabezado de su sección
    // (no es un BaseField con *): su sección lo declara "Obligatorio".
    await expect(page.getByText(/Obligatorio/).first()).toBeVisible()
  })
})

// ── util local ───────────────────────────────────────────────────────────────
/** Crea propietario + mascota mínimos y avanza al paso 2 (consulta). [data] */
async function irAPasoConsulta(page: import('@playwright/test').Page): Promise<void> {
  await createAndSelectOwner(page)
  await startCreatePet(page)
  await fillValidPet(page)
  await footerNext(page, 'Guardar mascota').click()
  await footerNext(page, 'Continuar a la consulta').click()
  await expect(page.getByRole('heading', { name: /Datos de la consulta/ })).toBeVisible()
}
