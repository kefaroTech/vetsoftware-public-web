// Tonos por categoría alineados al handoff (VET_SHOP_CAT_TONE / VET_SHOP_SVC_TONE).
// Las categorías del backend son dinámicas, así que mapeamos por nombre conocido y,
// para categorías personalizadas, caemos a una paleta determinística por id.

export interface CategoryTone {
  bg: string
  fg: string
}

const PRODUCT_TONES: Record<string, CategoryTone> = {
  alimento: { bg: 'oklch(94% 0.06 80)', fg: 'oklch(45% 0.13 70)' },
  accesorio: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  higiene: { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  medicamento: { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  juguete: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
}

const SERVICE_TONES: Record<string, CategoryTone> = {
  consulta: { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
  laboratorio: { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  imagen: { bg: 'oklch(94% 0.05 280)', fg: 'oklch(45% 0.16 280)' },
  procedimiento: { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  estetica: { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  hospital: { bg: 'oklch(94% 0.07 80)', fg: 'oklch(45% 0.13 70)' },
}

const FALLBACK: CategoryTone[] = [
  { bg: 'oklch(94% 0.06 80)', fg: 'oklch(45% 0.13 70)' },
  { bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  { bg: 'oklch(94% 0.05 200)', fg: 'oklch(42% 0.12 200)' },
  { bg: 'oklch(94% 0.05 340)', fg: 'oklch(42% 0.15 340)' },
  { bg: 'oklch(94% 0.05 280)', fg: 'oklch(45% 0.16 280)' },
  { bg: 'var(--amatista-100)', fg: 'var(--amatista-700)' },
]

const DIACRITICS = /[̀-ͯ]/g

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
}

function matchTone(name: string, map: Record<string, CategoryTone>): CategoryTone | null {
  const n = normalize(name)
  for (const key of Object.keys(map)) {
    if (n.includes(key)) return map[key]
  }
  return null
}

export function productCategoryTone(cat: { id: number; name: string }): CategoryTone {
  return matchTone(cat.name, PRODUCT_TONES) ?? FALLBACK[Math.abs(cat.id) % FALLBACK.length]
}

export function serviceCategoryTone(cat: { id: number; name: string }): CategoryTone {
  return matchTone(cat.name, SERVICE_TONES) ?? FALLBACK[Math.abs(cat.id) % FALLBACK.length]
}
