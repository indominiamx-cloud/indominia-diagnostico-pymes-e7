import { describe, expect, it } from "vitest";
import { EMPTY_STORE, exampleDiagnosis, type DiagnosticStore } from "./model";
import {
  DAMAGED_KEY,
  PREVIOUS_KEY,
  STORAGE_KEY,
  exportBackup,
  loadStore,
  mergeBackup,
  parseBackup,
  recoverPrevious,
  saveStore,
} from "./storage";
import { csvCell, planCsv, reportHtml } from "./exports";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}
const filled = (): DiagnosticStore => ({ ...EMPTY_STORE, diagnoses: [exampleDiagnosis("taller")] });
describe("persistencia y recuperación sin pérdida silenciosa", () => {
  it("guarda, comprueba lectura y conserva la versión anterior", () => {
    const storage = memoryStorage();
    const first = saveStore(storage, 0, filled());
    expect(first.revision).toBe(1);
    expect(loadStore(storage).store).toEqual(first);
    const second = saveStore(storage, 1, { ...first, diagnoses: [] });
    expect(second.revision).toBe(2);
    expect(JSON.parse(storage.getItem(PREVIOUS_KEY)!)).toEqual(first);
    storage.map.set(STORAGE_KEY, "dañado");
    expect(loadStore(storage).status).toBe("recoverable");
    expect(recoverPrevious(storage).diagnoses).toEqual(first.diagnoses);
    expect(storage.getItem(DAMAGED_KEY)).toBe("dañado");
  });
  it("rechaza una escritura sobre una revisión cambiada", () => {
    const storage = memoryStorage();
    saveStore(storage, 0, filled());
    const raw = storage.getItem(STORAGE_KEY);
    expect(() => saveStore(storage, 0, filled())).toThrow(/Otra pestaña/);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it("no borra un archivo corrupto sin copia ni anuncia éxito por falta de espacio", () => {
    const storage = memoryStorage();
    storage.map.set(STORAGE_KEY, "corrupto");
    expect(loadStore(storage)).toMatchObject({ status: "corrupt", store: EMPTY_STORE });
    expect(() => saveStore(storage, 0, filled())).toThrow(/no se pueden leer/);
    expect(storage.getItem(STORAGE_KEY)).toBe("corrupto");
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveStore(full, 0, filled())).toThrow(/No se pudo guardar/);
  });
  it("detecta que un navegador no devolvió el valor recién guardado", () => {
    const storage = { getItem: () => null, setItem: () => {} };
    expect(() => saveStore(storage, 0, filled())).toThrow(/comprobación/);
  });
});
describe("importación, exportación y archivos no confiables", () => {
  it("recupera todas las mediciones desde un respaldo y omite duplicados", () => {
    const current = filled();
    const restored = parseBackup(exportBackup(current));
    expect(restored).toEqual(current);
    expect(mergeBackup(current, restored)).toMatchObject({ added: 0, duplicates: 1 });
    expect(mergeBackup(EMPTY_STORE, restored)).toMatchObject({ added: 1, duplicates: 0 });
  });
  it("rechaza esquemas ajenos, exceso de tamaño, claves extra e identificadores repetidos", () => {
    expect(() => parseBackup('{"version":1}')).toThrow(/válido/);
    expect(() => parseBackup("x".repeat(2_000_001))).toThrow(/2 MB/);
    const d = filled();
    const exported = JSON.parse(exportBackup(d));
    exported.data.admin = true;
    expect(() => parseBackup(JSON.stringify(exported))).toThrow(/válido/);
    exported.data = { ...d, diagnoses: [d.diagnoses[0], d.diagnoses[0]] };
    expect(() => parseBackup(JSON.stringify(exported))).toThrow(/válido/);
  });
  it("conserva el borrador al combinar y no supera el límite de 40", () => {
    const full = {
      ...EMPTY_STORE,
      diagnoses: Array.from({ length: 40 }, () => exampleDiagnosis("taller")),
    };
    expect(() => mergeBackup(full, filled())).toThrow(/40/);
  });
  it("escapa HTML y previene fórmulas CSV en texto introducido", () => {
    const d = filled().diagnoses[0]!;
    d.alias = '<img src=x onerror="alert(1)">';
    expect(reportHtml(d)).toContain("&lt;img");
    expect(reportHtml(d)).not.toContain("<img src=x");
    for (const value of ["=HYPERLINK(1)", "+SUM(1)", "-1+2", "@cmd", "  =1+1", "\t=1"])
      expect(csvCell(value)).toMatch(/^"'/);
    d.alias = "=1+1";
    expect(planCsv(d)).toContain('"\'=1+1"');
  });
});
