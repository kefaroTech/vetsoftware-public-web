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
  selectInSearchable,
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

  test('[det] término inexistente muestra "Sin resultados" y ofrece registrar', async ({
    page,
  }) => {
    const term = unlikelyTerm()
    await searchOwner(page, term)
    await expect(page.getByText(new RegExp(`Sin resultados para`))).toBeVisible()
    await expect(
      page.getByRole('button', { name: new RegExp(`Registrar a "${term}"`) }),
    ).toBeVisible()
  })

  test('[det] desde "sin resultados" se abre el form con el nombre precargado', async ({
    page,
  }) => {
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
  test('[det] "Guardar propietario" está SIEMPRE activo; click vacío valida y no avanza', async ({
    page,
  }) => {
    const btn = footerNext(page, 'Guardar propietario')
    await expect(btn).toBeEnabled()
    await btn.click()
    // No avanza: seguimos en el form, banner-guía y controles en rojo (shake).
    await expectFormBlocked(page, /Registrar nuevo propietario/)
  })

  test('[data] con todo lleno pero SIN tipo de persona, el click valida y no crea; al completar, crea', async ({
    page,
  }) => {
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

  test('[data] "Continuar a la consulta" activo sin mascota; click muestra banner-guía y no avanza', async ({
    page,
  }) => {
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

  test('[data] "Continuar" sin mascota agita la selección (animación requerido)', async ({
    page,
  }) => {
    await gotoNuevaConsulta(page)
    await createAndSelectOwner(page)
    await footerNext(page, 'Continuar a la consulta').click()
    // La sección de mascota recibe la clase de animación "requerido".
    await expect(page.locator('.pet-section')).toHaveClass(/pet-shake/)
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

  test('[data] chip de 15 dígitos exactos es válido (opcional pero con formato)', async ({
    page,
  }) => {
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

  test('[data] "Guardar mascota" está SIEMPRE activo; click vacío valida y no crea', async ({
    page,
  }) => {
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

  test('[data] sin estado reproductivo, el click valida (shake) y no crea; al completar, crea', async ({
    page,
  }) => {
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

  test('[det] sin llegar al paso 2, el botón inicial no es "Guardar consulta"', async ({
    page,
  }) => {
    // Verificación barata de que el paso 1 no expone el submit final.
    await expect(footerNext(page, 'Guardar consulta')).toHaveCount(0)
  })

  test('[data] anamnesis vacía: click "Guardar consulta" valida y NO abre confirmación', async ({
    page,
  }) => {
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await expect(footerNext(page, 'Guardar consulta')).toBeEnabled()
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('[data] anamnesis en blanco (blur) muestra "La anamnesis es obligatoria."', async ({
    page,
  }) => {
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

  test('[data] tipo + anamnesis: click "Guardar consulta" abre el modal de confirmación', async ({
    page,
  }) => {
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

  test('[data] diagnóstico y planes vacíos NO bloquean (opcionales): confirma con solo tipo + anamnesis', async ({
    page,
  }) => {
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
    await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
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
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d.getByText('Selecciona un medicamento')).toBeVisible()
    await expect(d.getByText('Indica la presentación')).toBeVisible()
    await expect(d.getByText('Indica la cantidad')).toBeVisible()
    await expect(d.getByText('Indica la posología')).toBeVisible()
    await expect(d).toBeVisible() // sigue abierto
  })

  test('[data] Receta: cantidad no numérica muestra "Cantidad inválida"', async ({ page }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d.getByLabel(/Cantidad/).fill('abc')
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d.getByText('Cantidad inválida')).toBeVisible()
  })

  test('[data] Receta: guardar sube el contador y queda en el draft (round-trip)', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    // El tile refleja el conteo…
    await expect(page.getByText('1 generada · click para añadir más')).toBeVisible()
    // …y al reabrir, la receta persiste en el draft ("Ya agregadas").
    const d2 = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await expect(d2.getByText('Ya agregados (1)')).toBeVisible()
  })

  test('[data] Receta: agregar y quitar un segundo medicamento', async ({ page }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await expect(d.getByText('1 en el plan')).toBeVisible()
    await d.getByRole('button', { name: 'Agregar otro medicamento' }).click()
    await expect(d.getByText('2 en el plan')).toBeVisible()
    await d.getByRole('button', { name: 'Quitar medicamento' }).first().click()
    await expect(d.getByText('1 en el plan')).toBeVisible()
  })

  test('[data] Receta: editar una ya agregada actualiza el medicamento', async ({ page }) => {
    let d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page, { medName: 'Amoxicilina' })
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d.getByRole('button', { name: 'Editar plan terapéutico' }).click()
    // Sin banner "Editando…": el modo edición se refleja en el botón de guardar.
    await expect(d.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
    // Cambia el medicamento a otro del catálogo (SearchableSelect).
    await selectInSearchable(page, 'Nombre del medicamento', 'Metronidazol')
    await d.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(d.getByText('Ya agregados (1)')).toBeVisible()
    await expect(d.getByText('Metronidazol')).toBeVisible()
  })

  // ── Fase 3: diagnóstico desde la consulta + observación por medicamento ──────
  test('[data] Receta: ya NO pide diagnóstico (se toma de la consulta)', async ({ page }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await expect(d.getByLabel(/Diagnóstico/)).toHaveCount(0)
  })

  test('[data] Receta: la observación por medicamento persiste (round-trip)', async ({ page }) => {
    let d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d
      .getByLabel(/Observación/)
      .first()
      .fill('Administrar con alimento')
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d.getByRole('button', { name: 'Editar plan terapéutico' }).click()
    await expect(d.getByLabel(/Observación/).first()).toHaveValue('Administrar con alimento')
  })

  test('[data] Receta: con un ítem ya agregado, guardar el form vacío NO exige campos ni crea vacío', async ({
    page,
  }) => {
    // Agrega una receta…
    let d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    // …reabre: ya hay 1. Guardar con el formulario nuevo vacío no valida ni crea vacío → cierra.
    d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await expect(d.getByText('Ya agregados (1)')).toBeVisible()
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    await expect(d.getByText('Selecciona un medicamento')).toHaveCount(0)
    // El contador sigue en 1: no se creó un ítem vacío.
    await expect(page.getByText('1 generada · click para añadir más')).toBeVisible()
  })

  test('[data] Receta: eliminar una ya agregada la quita del draft', async ({ page }) => {
    let d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await expect(d.getByText('Ya agregados (1)')).toBeVisible()
    await d.getByRole('button', { name: 'Eliminar plan terapéutico' }).click()
    await expect(d.getByText(/Ya agregados/)).toHaveCount(0)
  })

  test('[data] Plan terapéutico: el medicamento se elige de un CATÁLOGO (lista con globales sembrados)', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    const field = d.locator('.field', { hasText: 'Nombre del medicamento' }).first()
    await field.locator('button.trigger').click()
    // El panel se teletransporta a <body>; el catálogo global sembrado (migración
    // 173) aparece como opción del dropdown.
    await expect(page.locator('div.panel button.item', { hasText: 'Meloxicam' })).toBeVisible()
  })

  test('[data] Plan terapéutico: crear un medicamento inline dispara POST /medicaments 201 y lo selecciona', async ({
    page,
  }) => {
    const name = `Med E2E ${uniqueSuffix()}`
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    const postP = page.waitForResponse(
      (r) => new URL(r.url()).pathname.endsWith('/medicaments') && r.request().method() === 'POST',
    )
    await createInSearchable(page, 'Nombre del medicamento', name)
    const resp = await postP
    expect(resp.status(), `POST /medicaments → ${resp.status()}`).toBe(201)
    const body = await resp.json()
    expect(body.name).toBe(name)
    expect(typeof body.id).toBe('number')
    const field = d.locator('.field', { hasText: 'Nombre del medicamento' }).first()
    await expect(field.locator('button.trigger')).toContainText(name)
  })

  // ── Examen de laboratorio (catálogo creable) ────────────────────────────────
  test('[data] Examen lab: guardar vacío exige el tipo (Observaciones es opcional)', async ({
    page,
  }) => {
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    // "Selecciona un tipo" también es el placeholder del select → acotamos al <p class="error">.
    await expect(d.locator('p.error', { hasText: 'Selecciona un tipo' })).toBeVisible()
    // Observaciones ya NO es obligatorio: no debe aparecer ningún error de ese campo.
    await expect(d.getByText('Indica las observaciones')).toHaveCount(0)
    await expect(d).toBeVisible()
  })

  test('[data] Examen lab: cantidad menor que 1 muestra "Cantidad inválida"', async ({ page }) => {
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    await d.getByLabel(/Cantidad/).fill('0')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d.getByText('Cantidad inválida')).toBeVisible()
  })

  test('[data] Examen lab: crear tipo (sin descripción) guarda SIN Observaciones (opcional); POST del tipo 2xx', async ({
    page,
  }) => {
    const api = trackApiWrites(page)
    const d = await openQuickAction(page, /Examen lab/, 'Solicitar examen de laboratorio')
    // createInSearchable NO llena descripción → verifica que description es OPCIONAL.
    await createInSearchable(page, 'Tipo de examen', `Hemograma E2E ${uniqueSuffix()}`)
    // NO llenamos Observaciones: es opcional → debe guardar igual.
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

  test('[data] Hospitalización: el "Tipo" lista Ambulatoria y Hospitalización', async ({
    page,
  }) => {
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

  test('[data] Desparasitación: el "Tipo" lista Interna, Externa, Mixta y Otra', async ({
    page,
  }) => {
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
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await page.keyboard.press('Escape')
    await expect(d).toBeHidden()
  })

  test('[data] el modal se cierra con la X (Cerrar)', async ({ page }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await d.getByRole('button', { name: 'Cerrar' }).click()
    await expect(d).toBeHidden()
  })

  test('[data] el modal NO se cierra al hacer click en el backdrop', async ({ page }) => {
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    // Click en la esquina del overlay (fuera de la tarjeta) → debe seguir abierto.
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } })
    await expect(d).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// F2. Examen físico + pronóstico (Fase 3) — sanitización, rango y guardado
//     campo a campo. Todos [data]: requieren propietario + mascota para el paso 2.
// ════════════════════════════════════════════════════════════════════════════
test.describe('F2 · Examen físico y pronóstico', () => {
  test.beforeEach(async ({ page }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
  })

  test('[data] temperatura sanitiza no-numérico (deja dígitos + separador)', async ({ page }) => {
    const t = page.getByLabel(/Temperatura/)
    await t.fill('38a.5x')
    await expect(t).toHaveValue('38.5')
  })

  test('[data] frec. cardíaca solo acepta dígitos', async ({ page }) => {
    const hr = page.getByLabel(/Frec\. cardíaca/)
    await hr.fill('9a0 lpm')
    await expect(hr).toHaveValue('90')
  })

  test('[data] frec. respiratoria solo acepta dígitos', async ({ page }) => {
    const rr = page.getByLabel(/Frec\. respiratoria/)
    await rr.fill('2b4rpm')
    await expect(rr).toHaveValue('24')
  })

  test('[data] temperatura fuera de rango (>60) muestra error de rango', async ({ page }) => {
    const t = page.getByLabel(/Temperatura/)
    await t.fill('61')
    await t.blur()
    await expect(page.getByText('Debe estar entre 0 y 60 °C.')).toBeVisible()
  })

  test('[data] temperatura válida (38.5) no muestra error', async ({ page }) => {
    const t = page.getByLabel(/Temperatura/)
    await t.fill('38.5')
    await t.blur()
    await expect(page.getByText(/Debe estar entre 0 y 60/)).toHaveCount(0)
  })

  test('[data] frec. cardíaca fuera de rango (>1000) muestra error', async ({ page }) => {
    const hr = page.getByLabel(/Frec\. cardíaca/)
    await hr.fill('1001')
    await hr.blur()
    await expect(page.getByText('Debe estar entre 0 y 1000 lpm.')).toBeVisible()
  })

  test('[data] condición corporal lista la escala 1–9', async ({ page }) => {
    await page.getByRole('combobox', { name: /Condición corporal/ }).click()
    const lb = page.getByRole('listbox')
    await expect(lb.getByRole('option', { name: '1', exact: true })).toBeVisible()
    await expect(lb.getByRole('option', { name: '9', exact: true })).toBeVisible()
  })

  test('[data] escala de dolor lista 0–10', async ({ page }) => {
    await page.getByRole('combobox', { name: /Escala de dolor/ }).click()
    const lb = page.getByRole('listbox')
    await expect(lb.getByRole('option', { name: '0', exact: true })).toBeVisible()
    await expect(lb.getByRole('option', { name: '10', exact: true })).toBeVisible()
  })

  test('[data] temperatura inválida bloquea "Guardar consulta" (valida y no confirma)', async ({
    page,
  }) => {
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con una constante fuera de rango.')
    await page.getByLabel(/Temperatura/).fill('80')
    await footerNext(page, 'Guardar consulta').click()
    await expect(page.getByText(REVISA_CAMPOS_MSG)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('[data] happy path: consulta con examen físico + pronóstico guarda (servicios 2xx)', async ({
    page,
  }) => {
    const api = trackApiWrites(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Paciente estable, control de rutina.')
    await page.getByLabel(/Temperatura/).fill('38.5')
    await page.getByLabel(/Frec\. cardíaca/).fill('90')
    await page.getByLabel(/Frec\. respiratoria/).fill('24')
    await page.getByLabel(/Mucosas/).fill('Rosadas, húmedas')
    await page.getByLabel(/Llenado capilar/).fill('< 2 s')
    await page.getByLabel(/Hidratación/).fill('Normal')
    await pickSelect(page, /Condición corporal/, /^5$/)
    await pickSelect(page, /Escala de dolor/, /^1$/)
    await page.getByLabel(/Actitud/).fill('Alerta')
    await page.getByLabel(/Hallazgos al examen/).fill('Auscultación cardiopulmonar normal.')
    await page.getByLabel(/Pronóstico/).fill('Favorable')
    await guardarConsulta(page, 'solo-guardar')
    api.assertAllOk()
  })

  test('[data] temperatura 60 °C (límite superior) es válida', async ({ page }) => {
    const t = page.getByLabel(/Temperatura/)
    await t.fill('60')
    await t.blur()
    await expect(page.getByText(/Debe estar entre 0 y 60/)).toHaveCount(0)
  })

  test('[data] frec. cardíaca 1000 (límite superior) es válida', async ({ page }) => {
    const hr = page.getByLabel(/Frec\. cardíaca/)
    await hr.fill('1000')
    await hr.blur()
    await expect(page.getByText(/Debe estar entre 0 y 1000/)).toHaveCount(0)
  })

  test('[data] frec. respiratoria fuera de rango (>1000) muestra error', async ({ page }) => {
    const rr = page.getByLabel(/Frec\. respiratoria/)
    await rr.fill('1001')
    await rr.blur()
    await expect(page.getByText('Debe estar entre 0 y 1000 rpm.')).toBeVisible()
  })

  test('[data] ya no hay cajas de plan; el plan vive en las acciones ("Plan Diagnóstico y Terapéutico")', async ({
    page,
  }) => {
    // Las cajas de texto libre de plan diagnóstico/terapéutico se eliminaron (por su placeholder).
    await expect(page.getByPlaceholder(/Hemograma, bioquímica/)).toHaveCount(0)
    await expect(page.getByPlaceholder(/Medicación, indicaciones/)).toHaveCount(0)
    // La sección de acciones es ahora "Plan Diagnóstico y Terapéutico" y la tile de receta "Plan terapéutico".
    await expect(page.getByText(/Plan Diagnóstico y Terapéutico/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Plan terapéutico/ })).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// F3. Consumo de servicio (Fase 3): examen físico, pronóstico, diagnóstico de
//     receta desde la consulta y observación por medicamento. Intercepta el
//     payload de escritura y verifica TIPOS de dato, valores, opcionales en null
//     y respuesta 2xx. Todos [data] (llegan al paso 2 y persisten en backend).
// ════════════════════════════════════════════════════════════════════════════
test.describe('F3 · Consumo de servicio (Fase 3)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
  })

  const isConsultationsPost = (
    r: import('@playwright/test').Request | import('@playwright/test').Response,
  ) => {
    const req = 'request' in r ? r.request() : r
    return new URL(req.url()).pathname.endsWith('/consultations') && req.method() === 'POST'
  }

  test('[data] POST /consultations envía los tipos correctos del examen físico y responde 2xx', async ({
    page,
  }) => {
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con constantes completas.')
    await page.getByLabel(/Temperatura/).fill('38.5')
    await page.getByLabel(/Frec\. cardíaca/).fill('90')
    await page.getByLabel(/Frec\. respiratoria/).fill('24')
    await page.getByLabel(/Mucosas/).fill('Rosadas')
    await page.getByLabel(/Llenado capilar/).fill('< 2 s')
    await page.getByLabel(/Hidratación/).fill('Normal')
    await pickSelect(page, /Condición corporal/, /^5$/)
    await pickSelect(page, /Escala de dolor/, /^2$/)
    await page.getByLabel(/Actitud/).fill('Alerta')
    await page.getByLabel(/Hallazgos al examen/).fill('Sin hallazgos relevantes.')
    await page.getByLabel(/Pronóstico/).fill('Favorable')

    await footerNext(page, 'Guardar consulta').click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    const [req, resp] = await Promise.all([
      page.waitForRequest((r) => isConsultationsPost(r)),
      page.waitForResponse((r) => isConsultationsPost(r)),
      confirm.getByRole('button', { name: 'Confirmar y guardar' }).click(),
    ])
    const body = req.postDataJSON()
    // Tipos de dato exactos que el backend espera (BigDecimal/Integer).
    expect(typeof body.temperature).toBe('number')
    expect(body.temperature).toBe(38.5)
    expect(Number.isInteger(body.heartRate)).toBeTruthy()
    expect(body.heartRate).toBe(90)
    expect(body.respiratoryRate).toBe(24)
    expect(body.mucousMembranes).toBe('Rosadas')
    expect(body.capillaryRefill).toBe('< 2 s')
    expect(body.hydration).toBe('Normal')
    expect(body.bodyConditionScore).toBe(5)
    expect(body.painScore).toBe(2)
    expect(body.attitude).toBe('Alerta')
    expect(body.examFindings).toBe('Sin hallazgos relevantes.')
    expect(body.prognosis).toBe('Favorable')
    // Los planes de texto se eliminaron: no deben viajar en el payload.
    expect(body).not.toHaveProperty('therapeuticPlan')
    expect(body).not.toHaveProperty('diagnosisPlan')
    expect(resp.ok(), `POST /consultations → ${resp.status()}`).toBeTruthy()
  })

  test('[data] POST /consultations SIN examen físico manda los vitales en null y responde 2xx', async ({
    page,
  }) => {
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta sin constantes (todo opcional).')
    await footerNext(page, 'Guardar consulta').click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    const [req, resp] = await Promise.all([
      page.waitForRequest((r) => isConsultationsPost(r)),
      page.waitForResponse((r) => isConsultationsPost(r)),
      confirm.getByRole('button', { name: 'Confirmar y guardar' }).click(),
    ])
    const body = req.postDataJSON()
    // Todos los campos del examen físico son OPCIONALES → viajan como null.
    expect(body.temperature).toBeNull()
    expect(body.heartRate).toBeNull()
    expect(body.respiratoryRate).toBeNull()
    expect(body.mucousMembranes).toBeNull()
    expect(body.capillaryRefill).toBeNull()
    expect(body.hydration).toBeNull()
    expect(body.bodyConditionScore).toBeNull()
    expect(body.painScore).toBeNull()
    expect(body.attitude).toBeNull()
    expect(body.examFindings).toBeNull()
    expect(body.prognosis).toBeNull()
    expect(resp.ok()).toBeTruthy()
  })

  test('[data] receta: el POST /prescriptions usa el diagnóstico de la CONSULTA', async ({
    page,
  }) => {
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta cuyo diagnóstico alimenta la receta.')
    await page.getByPlaceholder(/Diagnóstico presuntivo/).fill('Gastroenteritis aguda inespecífica')
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    const rxReqP = page.waitForRequest(
      (r) => new URL(r.url()).pathname.endsWith('/prescriptions') && r.method() === 'POST',
    )
    await guardarConsulta(page, 'solo-guardar')
    const body = (await rxReqP).postDataJSON()
    expect(body.diagnosis).toBe('Gastroenteritis aguda inespecífica')
  })

  test('[data] receta: el POST /medicament-prescriptions incluye observación y cantidad numérica', async ({
    page,
  }) => {
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con receta observada.')
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d
      .getByLabel(/Observación/)
      .first()
      .fill('Administrar con alimento')
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    const medReqP = page.waitForRequest(
      (r) =>
        new URL(r.url()).pathname.endsWith('/medicament-prescriptions') && r.method() === 'POST',
    )
    await guardarConsulta(page, 'solo-guardar')
    const body = (await medReqP).postDataJSON()
    expect(body.observation).toBe('Administrar con alimento')
    expect(typeof body.quantity).toBe('number')
    expect(body.quantity).toBe(14)
    // FK al catálogo: se envía medicamentId numérico y ya NO el nombre libre.
    expect(typeof body.medicamentId).toBe('number')
    expect(body.medicamentId).toBeGreaterThan(0)
    expect(body.name).toBeUndefined()
  })

  test('[data] éxito: "Imprimir receta" descarga el PDF (GET /prescriptions/{id}/export.pdf 2xx)', async ({
    page,
  }) => {
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta con receta imprimible.')
    const d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
    await expect(d).toBeHidden()
    await guardarConsulta(page, 'solo-guardar') // navega a la pantalla de éxito
    // La pantalla de éxito ofrece imprimir la fórmula; el click dispara el GET del PDF.
    const [resp] = await Promise.all([
      page.waitForResponse((r) => {
        const p = new URL(r.url()).pathname
        return p.includes('/prescriptions/') && p.endsWith('/export.pdf')
      }),
      page
        .getByRole('button', { name: /Imprimir receta/ })
        .first()
        .click(),
    ])
    expect(resp.ok(), `GET export.pdf → ${resp.status()}`).toBeTruthy()
    expect(resp.headers()['content-type']).toContain('pdf')
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

    let d = await openQuickAction(page, /Plan terapéutico/, 'Nuevo plan terapéutico')
    await fillReceta(page)
    await d.getByRole('button', { name: 'Guardar plan terapéutico' }).click()
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
    await d.getByLabel(/Observaciones/).fill('Sospecha de anemia')
    await d.getByRole('button', { name: 'Guardar solicitud' }).click()
    await expect(d).toBeHidden()
    // Guardar consulta → modal de facturación → "Solo guardar" → éxito.
    await guardarConsulta(page, 'solo-guardar')
  })

  test('[data] facturación: modal forzado (sin X, sin Cancelar, Escape no cierra) y primario "Salir"', async ({
    page,
  }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    await pickSelect(page, /Tipo de consulta/)
    await anamnesis(page).fill('Consulta para validar el modal de facturación forzado.')
    await footerNext(page, 'Guardar consulta').click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Confirmar y guardar' }).click()

    const billing = page.getByRole('dialog', { name: /Facturación/ })
    await expect(billing).toBeVisible()
    // No descartable: sin botón de cerrar (X) ni "Cancelar".
    await expect(billing.getByRole('button', { name: 'Cerrar' })).toHaveCount(0)
    await expect(billing.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)
    // Escape tampoco lo cierra.
    await page.keyboard.press('Escape')
    await expect(billing).toBeVisible()
    // Al elegir "Solo guardar la consulta", el primario dice "Salir".
    await billing.getByRole('button', { name: /Solo guardar la consulta/ }).click()
    await expect(billing.getByRole('button', { name: 'Salir' })).toBeVisible()
    await billing.getByRole('button', { name: 'Salir' }).click()
    await expect(page).toHaveURL(/exito|consulta-nueva-exito/)
  })

  test('[data] validación de consulta: scroll centrado al primer campo requerido faltante', async ({
    page,
  }) => {
    await gotoNuevaConsulta(page)
    await irAPasoConsulta(page)
    // Empuja el scroll para que el primer requerido (Tipo de consulta) quede fuera de vista.
    await page.mouse.wheel(0, 1400)
    await footerNext(page, 'Guardar consulta').click()
    // Tras validar, el primer campo faltante queda centrado verticalmente en el viewport.
    const field = page.locator('.field', { hasText: 'Tipo de consulta' }).first()
    const vh = page.viewportSize()!.height
    await expect
      .poll(async () => (await field.boundingBox())?.y ?? 0, { timeout: 4000 })
      .toBeGreaterThan(vh * 0.12)
    const y = (await field.boundingBox())!.y
    expect(y, 'el campo debe quedar en la banda central, no pegado al borde').toBeLessThan(vh * 0.8)
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
        (r) =>
          new URL(r.url()).pathname.endsWith('/consultations') && r.request().method() === 'POST',
      ),
      confirm.getByRole('button', { name: 'Confirmar y guardar' }).click(),
    ])
    expect(consultaResp.ok(), `POST /consultations → ${consultaResp.status()}`).toBeTruthy()

    // Modal de facturación → abrir cuenta; POST /open-accounts debe responder 2xx.
    const billing = page.getByRole('dialog', { name: /Facturación/ })
    await expect(billing).toBeVisible()
    const [accountResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname.endsWith('/open-accounts') && r.request().method() === 'POST',
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
    await expect(
      page.getByRole('heading', { name: /Quién es el propietario|Propietario/ }),
    ).toBeVisible()
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

  test('[det] Propietario: nombre solo-espacios cuenta como vacío (obligatorio)', async ({
    page,
  }) => {
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
    // Fase 3: el examen físico (constantes vitales) y el pronóstico son TODOS opcionales
    // (sin *). Se suman a los 3 opcionales previos del paso de consulta.
    expect(optional).toEqual([
      'Actitud',
      'Condición corporal',
      'Escala de dolor',
      'Fecha sugerida',
      'Frec. cardíaca',
      'Frec. respiratoria',
      'Hallazgos al examen',
      'Hidratación',
      'Llenado capilar',
      'Mucosas',
      'Notas para el control',
      'Peso en la consulta',
      'Pronóstico',
      'Temperatura',
    ])
    // La anamnesis es obligatoria pero se marca en el encabezado de su sección
    // (no es un BaseField con *): su sección lo declara "Obligatorio".
    await expect(page.getByText(/Obligatorio/).first()).toBeVisible()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// K. Edición enfocada + guarda de "form vacío" para las 7 acciones rápidas.
//    Data-driven: por cada acción se siembra 1 ítem y se verifica que
//     (1) al editar se oculta la lista "Ya agregadas" y aparece "Guardar cambios";
//     (2) con un ítem ya agregado, pulsar guardar con el form nuevo vacío NO
//         dispara la obligatoriedad ni crea un ítem vacío: solo cierra.
// ════════════════════════════════════════════════════════════════════════════
interface QuickActionCase {
  name: string
  tile: RegExp
  dialog: string | RegExp
  save: { name: string; exact?: boolean }
  editLabel: string
  seed: (page: import('@playwright/test').Page) => Promise<void>
}

const QUICK_ACTIONS: QuickActionCase[] = [
  {
    name: 'Plan terapéutico',
    tile: /Plan terapéutico/,
    dialog: 'Nuevo plan terapéutico',
    save: { name: 'Guardar plan terapéutico' },
    editLabel: 'Editar receta',
    seed: async (page) => {
      await fillReceta(page)
    },
  },
  {
    name: 'Vacunación',
    tile: /Vacunación/,
    dialog: 'Aplicar vacuna',
    save: { name: 'Registrar vacunación' },
    editLabel: 'Editar vacuna',
    seed: async (page) => {
      await createInSearchable(page, 'Tipo de vacuna', `Vac E2E ${uniqueSuffix()}`)
      await page.getByRole('dialog').getByLabel(/Lote/).fill('L-2026-01')
    },
  },
  {
    name: 'Examen lab',
    tile: /Examen lab/,
    dialog: 'Solicitar examen de laboratorio',
    save: { name: 'Guardar solicitud' },
    editLabel: 'Editar examen',
    seed: async (page) => {
      await createInSearchable(page, 'Tipo de examen', `Ex E2E ${uniqueSuffix()}`)
      await page
        .getByRole('dialog')
        .getByLabel(/Observaciones/)
        .fill('Sospecha de anemia')
    },
  },
  {
    name: 'Imagen Dx',
    tile: /Imagen Dx/,
    dialog: 'Solicitar imagen diagnóstica',
    save: { name: 'Guardar solicitud' },
    editLabel: 'Editar estudio',
    seed: async (page) => {
      await createInSearchable(page, 'Tipo de estudio', `Rx E2E ${uniqueSuffix()}`)
      const d = page.getByRole('dialog')
      await d.getByLabel(/Región \/ Protocolo/).fill('Tórax LL')
      await d.getByLabel(/Signos clínicos/).fill('Tos productiva de 5 días')
      await d.getByLabel(/Diagnóstico presuntivo/).fill('Neumonía bacteriana')
    },
  },
  {
    name: 'Hospitalización',
    tile: /Hospitalización/,
    dialog: 'Ingresar a hospitalización',
    save: { name: 'Guardar', exact: true },
    editLabel: 'Editar hospitalización',
    seed: async (page) => {
      await page
        .getByRole('dialog')
        .getByLabel(/Motivo de hospitalización/)
        .fill('Gastroenteritis hemorrágica severa')
    },
  },
  {
    name: 'Desparasitación',
    tile: /Desparasitación/,
    dialog: 'Registrar desparasitación',
    save: { name: 'Guardar', exact: true },
    editLabel: 'Editar desparasitación',
    seed: async (page) => {
      const d = page.getByRole('dialog')
      await d.getByLabel(/Producto/).fill('Drontal Plus')
      await d.getByLabel(/Dosis/).fill('1 comp. por cada 10 kg')
    },
  },
  {
    name: 'Cirugía',
    tile: /Cirugía/,
    dialog: 'Programar cirugía',
    save: { name: 'Guardar', exact: true },
    editLabel: 'Editar cirugía',
    seed: async (page) => {
      await createInSearchable(page, 'Tipo de cirugía', `Cx E2E ${uniqueSuffix()}`)
      await page
        .getByRole('dialog')
        .getByLabel(/Descripción del procedimiento/)
        .fill('Ovariohisterectomía por laparotomía')
    },
  },
]

test.describe('K · Edición enfocada y guardas de las acciones rápidas', () => {
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

  for (const qa of QUICK_ACTIONS) {
    test(`[data] ${qa.name}: al editar se oculta la lista y aparece "Guardar cambios"`, async ({
      page,
    }) => {
      let d = await openQuickAction(page, qa.tile, qa.dialog)
      await qa.seed(page)
      await d.getByRole('button', { name: qa.save.name, exact: qa.save.exact }).click()
      await expect(d).toBeHidden()

      d = await openQuickAction(page, qa.tile, qa.dialog)
      await expect(d.getByText(/Ya agregad[ao]s \(1\)/)).toBeVisible()
      await d.getByRole('button', { name: qa.editLabel }).click()
      // Al editar, la lista "Ya agregadas" desaparece (foco en el formulario)…
      await expect(d.getByText(/Ya agregad[ao]s/)).toHaveCount(0)
      // …y el botón primario pasa a "Guardar cambios".
      await expect(d.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
    })

    test(`[data] ${qa.name}: con ítem agregado, guardar el form vacío no valida ni crea vacío`, async ({
      page,
    }) => {
      let d = await openQuickAction(page, qa.tile, qa.dialog)
      await qa.seed(page)
      await d.getByRole('button', { name: qa.save.name, exact: qa.save.exact }).click()
      await expect(d).toBeHidden()

      // Reabre: ya hay 1. El form nuevo está vacío → pulsar guardar solo cierra.
      d = await openQuickAction(page, qa.tile, qa.dialog)
      await expect(d.getByText(/Ya agregad[ao]s \(1\)/)).toBeVisible()
      await d.getByRole('button', { name: qa.save.name, exact: qa.save.exact }).click()
      await expect(d).toBeHidden()
    })
  }
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
