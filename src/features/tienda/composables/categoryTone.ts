// Tonos por categoría alineados al handoff (VET_SHOP_CAT_TONE / VET_SHOP_SVC_TONE).
// Las categorías del backend son dinámicas, así que mapeamos por nombre conocido y,
// para categorías personalizadas, caemos a una paleta determinística por id.

export interface CategoryTone {
  bg: string
  fg: string
}

const PRODUCT_TONES: Record<string, CategoryTone> = {
  alimento: { bg: 'var(--warning-50)', fg: 'var(--warning-900)' },
  accesorio: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  higiene: { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  medicamento: { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  juguete: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
}

const SERVICE_TONES: Record<string, CategoryTone> = {
  consulta: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
  laboratorio: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  imagen: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
  procedimiento: { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  estetica: { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  hospital: { bg: 'var(--warning-50)', fg: 'var(--warning-900)' },
}

// Tupla no-vacía, no `CategoryTone[]`: el reparto por módulo depende de que haya
// al menos un tono, y así esa condición la sostiene el tipo y no un comentario.
const FALLBACK: [CategoryTone, ...CategoryTone[]] = [
  { bg: 'var(--warning-50)', fg: 'var(--warning-900)' },
  { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
  { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
]

const DIACRITICS = /[̀-ͯ]/g

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
}

function matchTone(name: string, map: Record<string, CategoryTone>): CategoryTone | null {
  const n = normalize(name)
  // `entries` en vez de `keys` + indexado: la clave y su valor vienen juntos, así
  // que no hay que volver a buscar algo que ya se tenía.
  for (const [key, tone] of Object.entries(map)) {
    if (n.includes(key)) return tone
  }
  return null
}

/** El módulo siempre cae dentro del array, así que `FALLBACK[0]` es inalcanzable
 *  y está solo para que el tipo lo refleje — ver el tipo no-vacío de `FALLBACK`. */
function fallbackTone(id: number): CategoryTone {
  return FALLBACK[Math.abs(id) % FALLBACK.length] ?? FALLBACK[0]
}

export function productCategoryTone(cat: { id: number; name: string }): CategoryTone {
  return matchTone(cat.name, PRODUCT_TONES) ?? fallbackTone(cat.id)
}

export function serviceCategoryTone(cat: { id: number; name: string }): CategoryTone {
  return matchTone(cat.name, SERVICE_TONES) ?? fallbackTone(cat.id)
}
