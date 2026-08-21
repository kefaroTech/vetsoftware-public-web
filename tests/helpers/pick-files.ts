import type { DOMWrapper } from '@vue/test-utils'

/**
 * Adjuntar archivos a un `<input type="file">` desde una prueba.
 *
 * `jsdom` no implementa `DataTransfer`, así que no hay forma legítima de
 * construir un `FileList` ni de asignarlo: la propiedad `files` es de solo
 * lectura. Se sustituye por un array-like con `length` e índices, que es todo lo
 * que el código bajo prueba consume (`Array.from(list)`), y se declara
 * `configurable` para que cada caso pueda volver a definirla.
 *
 * Se dispara `change` de verdad —no se llama al manejador a mano— para que el
 * camino que se ejercita sea el mismo que recorre el usuario.
 */
export function fakeFile(name: string, type = 'application/pdf', contenido = 'x'): File {
  return new File([contenido], name, { type })
}

export async function adjuntarArchivos(
  input: DOMWrapper<Element>,
  files: readonly File[],
): Promise<void> {
  const lista: Record<number | string, unknown> = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
  }
  files.forEach((f, i) => (lista[i] = f))

  Object.defineProperty(input.element, 'files', {
    value: lista as unknown as FileList,
    configurable: true,
    writable: true,
  })
  await input.trigger('change')
}
