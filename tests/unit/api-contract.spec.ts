import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * TR-01. `src/types/api.contract.ts` ata los tipos de este repositorio al contrato del backend,
 * pero solo los que alguien haya escrito allí. Una lista mantenida a mano envejece: se añade un
 * tipo nuevo, nadie lo ata, y el contrato deja de cubrirlo sin que nada falle.
 *
 * <p>Esta prueba es lo que impide ese deterioro: si un tipo de este repositorio tiene un esquema
 * del mismo nombre en el contrato, tiene que estar atado. Comprueba la cobertura, no la forma —de
 * la forma se encarga el compilador con las aserciones.
 */
const root = resolve(__dirname, '..', '..')

function typeNamesInSource(): Set<string> {
  const names = new Set<string>()
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
        const source = readFileSync(path, 'utf8')
        for (const match of source.matchAll(/^export (?:interface|type) (\w+)/gm)) {
          names.add(match[1]!)
        }
      }
    }
  }
  walk(join(root, 'src'))
  return names
}

describe('la atadura al contrato de la API cubre todo lo que puede cubrir', () => {
  it('cada tipo con un esquema homónimo en el contrato está atado', () => {
    const spec = JSON.parse(readFileSync(join(root, 'api', 'openapi.json'), 'utf8')) as {
      components: { schemas: Record<string, unknown> }
    }
    const schemas = new Set(Object.keys(spec.components.schemas))
    const contract = readFileSync(join(root, 'src', 'types', 'api.contract.ts'), 'utf8')
    const bound = new Set([...contract.matchAll(/MatchesContract<\s*(\w+)\s*,/g)].map((m) => m[1]!))

    // `api.contract.ts` se excluye: los tipos que exporta son la maquinaria, no DTOs.
    const shouldBeBound = [...typeNamesInSource()].filter(
      (name) => schemas.has(name) && !['Schemas', 'MatchesContract'].includes(name),
    )
    const missing = shouldBeBound.filter((name) => !bound.has(name)).sort()

    expect(
      missing,
      `Estos tipos espejan un DTO del backend y nadie los ató al contrato.\n` +
        `Añade una línea por cada uno en src/types/api.contract.ts:\n` +
        missing.map((n) => `  Expect<MatchesContract<${n}, '${n}'>>,`).join('\n'),
    ).toEqual([])
  })

  it('no quedan ataduras a tipos que ya no existen en el contrato', () => {
    const spec = JSON.parse(readFileSync(join(root, 'api', 'openapi.json'), 'utf8')) as {
      components: { schemas: Record<string, unknown> }
    }
    const schemas = new Set(Object.keys(spec.components.schemas))
    const contract = readFileSync(join(root, 'src', 'types', 'api.contract.ts'), 'utf8')
    const boundSchemas = [...contract.matchAll(/MatchesContract<\s*\w+\s*,\s*'([^']+)'/g)].map(
      (m) => m[1]!,
    )

    expect(boundSchemas.filter((name) => !schemas.has(name)).sort()).toEqual([])
  })
})
