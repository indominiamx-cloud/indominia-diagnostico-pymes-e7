import { describe, expect, it } from "vitest";
import {
  QUESTIONS,
  actionsFor,
  assess,
  completeDraft,
  diagnosisSchema,
  exampleDiagnosis,
  newDraft,
  schedule,
  simulate,
  type Answer,
} from "./model";

const answers = (value: Answer) => Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));
describe("rúbrica operativa: datos, incertidumbre y seguimiento", () => {
  it("conserva extremos verificables y no genera mejoras ficticias", () => {
    const all = completeDraft({ ...newDraft(), answers: answers(3) });
    expect(assess(all.answers)).toMatchObject({
      score: 100,
      coverage: 100,
      stage: "Base consistente",
    });
    expect(actionsFor(all)).toEqual([]);
    expect(assess(answers(0))).toMatchObject({ score: 0, coverage: 100, stage: "Requiere orden" });
  });
  it("calcula por peso y excluye las preguntas desconocidas", () => {
    const a = { ...answers("unknown"), "caja-1": 0 as const, "caja-3": 3 as const };
    expect(assess(a)).toMatchObject({
      score: 40,
      known: 2,
      total: 18,
      coverage: 11,
      stage: "Por verificar",
    });
    expect(assess(a).areas[0]).toMatchObject({ score: 40, coverage: 67 });
  });
  it("no inventa un indicador cuando no hay respuestas conocidas", () => {
    const d = completeDraft({ ...newDraft(), answers: answers("unknown") });
    expect(assess(d.answers)).toMatchObject({ score: null, coverage: 0, known: 0 });
    expect(actionsFor(d)).toHaveLength(18);
    expect(
      actionsFor(d).every((a) => a.verification && a.effort === 1 && a.dependsOn.length === 0),
    ).toBe(true);
  });
  it("rechaza una medición incompleta, respuestas no válidas e identificadores ajenos", () => {
    expect(() => completeDraft(newDraft())).toThrow();
    const d = exampleDiagnosis("taller");
    expect(diagnosisSchema.safeParse({ ...d, answers: { ...d.answers, secreta: 2 } }).success).toBe(
      false,
    );
    expect(
      diagnosisSchema.safeParse({ ...d, answers: { ...d.answers, "caja-1": 4 } }).success,
    ).toBe(false);
    expect(
      diagnosisSchema.safeParse({
        ...d,
        updates: { desconocida: { status: "done", effort: 1, owner: "Dirección", note: "" } },
      }).success,
    ).toBe(false);
  });
  it("la capacidad y el avance no cambian respuestas ni el indicador original", () => {
    const original = exampleDiagnosis("taller");
    const before = JSON.stringify(original.answers);
    const changed = {
      ...original,
      capacity: 2,
      updates: {
        "caja-1": {
          status: "done" as const,
          effort: 2,
          owner: "Dirección" as const,
          note: "Prueba",
        },
      },
    };
    expect(assess(changed.answers)).toEqual(assess(original.answers));
    expect(JSON.stringify(original.answers)).toBe(before);
    expect(actionsFor(changed).find((a) => a.id === "caja-1")?.status).toBe("done");
  });
  it("simula sin persistir y no convierte desconocidos en confirmados", () => {
    const d = exampleDiagnosis("estudio");
    const before = JSON.stringify(d);
    const result = simulate(d, ["caja-2", "tecnologia-2"]);
    expect(result.score).toBeGreaterThan(assess(d.answers).score!);
    expect(result.coverage).toBe(assess(d.answers).coverage);
    expect(JSON.stringify(d)).toBe(before);
  });
});
describe("planificación bajo capacidad y dependencias", () => {
  it("no sobreasigna horas y programa los prerrequisitos antes", () => {
    const d = exampleDiagnosis("taller");
    const plan = schedule(actionsFor(d), 6);
    expect(plan.used.every((hours) => hours <= 6)).toBe(true);
    expect(plan.scheduled + plan.pending).toBe(actionsFor(d).length);
    for (const item of plan.entries)
      if (item.week !== null)
        for (const dep of item.action.dependsOn) {
          const parent = plan.entries.find((e) => e.action.id === dep);
          if (parent) {
            expect(parent.week).not.toBeNull();
            expect(parent.week!).toBeLessThanOrEqual(item.week);
            expect(plan.entries.indexOf(parent)).toBeLessThan(plan.entries.indexOf(item));
          }
        }
  });
  it("detecta una acción que necesita fraccionarse y bloquea dependientes", () => {
    const a = actionsFor(exampleDiagnosis("taller"));
    const oversized = a.map((x) => (x.id === "procesos-1" ? { ...x, effort: 16 } : x));
    const plan = schedule(oversized, 2);
    expect(plan.entries.find((p) => p.action.id === "procesos-1")).toMatchObject({
      week: null,
      reason: expect.stringContaining("dividir"),
    });
    expect(plan.entries.find((p) => p.action.id === "procesos-2")).toMatchObject({
      week: null,
      reason: expect.stringContaining("depende"),
    });
  });
  it("excluye las tareas hechas del consumo sin perderlas del historial", () => {
    const d = exampleDiagnosis("taller");
    const a = actionsFor(d).map((x) => ({ ...x, status: "done" as const }));
    expect(schedule(a, 4)).toMatchObject({
      scheduled: 0,
      pending: 0,
      hours: 0,
      used: [0, 0, 0, 0],
    });
    expect(() => schedule(a, 0)).toThrow();
  });
});
