import { z } from "zod";
import { EMPTY_STORE, storeSchema, type DiagnosticStore } from "./model";

export const STORAGE_KEY = "indominia.diagnostico.v1";
export const PREVIOUS_KEY = `${STORAGE_KEY}.previous`;
export const DAMAGED_KEY = `${STORAGE_KEY}.damaged`;
export const MAX_IMPORT_BYTES = 2_000_000;
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export type LoadResult = {
  store: DiagnosticStore;
  status: "ok" | "empty" | "recoverable" | "corrupt" | "unavailable";
  message: string;
};
function decode(raw: string): DiagnosticStore {
  return storeSchema.parse(JSON.parse(raw));
}
export function loadStore(storage: StoragePort): LoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { store: structuredClone(EMPTY_STORE), status: "empty", message: "" };
    try {
      return { store: decode(raw), status: "ok", message: "" };
    } catch {
      const previous = storage.getItem(PREVIOUS_KEY);
      if (previous) {
        try {
          return {
            store: decode(previous),
            status: "recoverable",
            message:
              "La última copia no se pudo leer. Hay una copia anterior disponible; recupérala antes de continuar.",
          };
        } catch {
          /* Preserve both versions. */
        }
      }
      return {
        store: structuredClone(EMPTY_STORE),
        status: "corrupt",
        message:
          "No pudimos leer el almacenamiento. No se ha borrado. Descarga la copia para revisión o importa un respaldo en otro navegador.",
      };
    }
  } catch {
    return {
      store: structuredClone(EMPTY_STORE),
      status: "unavailable",
      message:
        "El navegador impide guardar. Habilita el almacenamiento o utiliza otro navegador antes de empezar.",
    };
  }
}
export class StorageConflict extends Error {
  constructor() {
    super("Otra pestaña cambió los datos. Recarga para conservar esa versión antes de continuar.");
    this.name = "StorageConflict";
  }
}
export function saveStore(
  storage: StoragePort,
  expectedRevision: number,
  next: DiagnosticStore,
): DiagnosticStore {
  const raw = storage.getItem(STORAGE_KEY);
  let current: DiagnosticStore;
  try {
    current = raw === null ? structuredClone(EMPTY_STORE) : decode(raw);
  } catch {
    throw new Error(
      "El almacenamiento contiene datos que no se pueden leer. Recupera la copia anterior antes de guardar.",
    );
  }
  if (current.revision !== expectedRevision) throw new StorageConflict();
  const updated = storeSchema.parse({ ...next, revision: expectedRevision + 1 });
  const serialized = JSON.stringify(updated);
  try {
    storage.setItem(PREVIOUS_KEY, raw ?? JSON.stringify(EMPTY_STORE));
    // A second read detects changes that occurred while preparing the write.
    if (storage.getItem(STORAGE_KEY) !== raw) throw new StorageConflict();
    storage.setItem(STORAGE_KEY, serialized);
    if (storage.getItem(STORAGE_KEY) !== serialized)
      throw new Error(
        "La comprobación de guardado no coincide. Recarga antes de volver a intentarlo.",
      );
    return updated;
  } catch (error) {
    if (error instanceof StorageConflict) throw error;
    if (error instanceof Error && error.message.startsWith("La comprobación")) throw error;
    throw new Error(
      "No se pudo guardar. Puede faltar espacio o permiso del navegador. Conserva un respaldo antes de cerrar esta página.",
    );
  }
}
export function recoverPrevious(storage: StoragePort): DiagnosticStore {
  const old = storage.getItem(PREVIOUS_KEY);
  if (!old) throw new Error("No hay copia anterior.");
  const recovered = decode(old);
  const raw = storage.getItem(STORAGE_KEY);
  const restored = { ...recovered, revision: recovered.revision + 1 };
  const serialized = JSON.stringify(restored);
  if (raw !== null) storage.setItem(DAMAGED_KEY, raw);
  storage.setItem(STORAGE_KEY, serialized);
  if (storage.getItem(STORAGE_KEY) !== serialized)
    throw new Error("No se pudo comprobar la recuperación.");
  return restored;
}
const backupSchema = z
  .object({
    format: z.literal("INDOMINIA_DIAGNOSTICO"),
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    data: storeSchema,
  })
  .strict();
export function exportBackup(store: DiagnosticStore): string {
  return JSON.stringify(
    {
      format: "INDOMINIA_DIAGNOSTICO",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: storeSchema.parse(store),
    },
    null,
    2,
  );
}
export function parseBackup(text: string): DiagnosticStore {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new Error("El respaldo supera el límite de 2 MB.");
  try {
    return backupSchema.parse(JSON.parse(text)).data;
  } catch {
    throw new Error(
      "El archivo no es un respaldo válido de esta versión. No se ha importado ningún dato.",
    );
  }
}
export function mergeBackup(
  current: DiagnosticStore,
  incoming: DiagnosticStore,
): { store: DiagnosticStore; added: number; duplicates: number } {
  const ids = new Set(current.diagnoses.map((d) => d.id));
  const additions = incoming.diagnoses.filter((d) => !ids.has(d.id));
  if (current.diagnoses.length + additions.length > 40)
    throw new Error(
      "El límite es de 40 diagnósticos por navegador. Exporta y conserva un respaldo antes de eliminar registros.",
    );
  return {
    store: storeSchema.parse({ ...current, diagnoses: [...additions, ...current.diagnoses] }),
    added: additions.length,
    duplicates: incoming.diagnoses.length - additions.length,
  };
}
