import { z } from "zod";

export const MODULE_TITLE = "Diagnóstico operativo para PyMEs";
export const RUBRIC_VERSION = "1.0";
export const AREA_IDS = [
  "caja",
  "procesos",
  "informacion",
  "equipo",
  "clientes",
  "tecnologia",
] as const;
export type AreaId = (typeof AREA_IDS)[number];
export const AREAS: {
  id: AreaId;
  title: string;
  short: string;
  color: string;
  description: string;
}[] = [
  {
    id: "caja",
    title: "Cobros y caja",
    short: "Caja",
    color: "turquoise",
    description: "Visibilidad de lo que entra, lo que sale y lo que sigue pendiente.",
  },
  {
    id: "procesos",
    title: "Procesos y entrega",
    short: "Procesos",
    color: "petroleum",
    description: "Una forma de trabajar que pueda repetirse y comprobarse.",
  },
  {
    id: "informacion",
    title: "Información y decisiones",
    short: "Información",
    color: "cobalt",
    description: "Datos localizables para decidir con una base verificable.",
  },
  {
    id: "equipo",
    title: "Equipo y continuidad",
    short: "Equipo",
    color: "terracotta",
    description: "Responsabilidades y continuidad cuando falta una persona clave.",
  },
  {
    id: "clientes",
    title: "Clientes y seguimiento",
    short: "Clientes",
    color: "marigold",
    description: "Solicitudes, acuerdos y oportunidades que reciben seguimiento.",
  },
  {
    id: "tecnologia",
    title: "Herramientas y datos",
    short: "Tecnología",
    color: "magenta",
    description: "Accesos, respaldos y herramientas al servicio de un proceso.",
  },
];
export const ANSWER_OPTIONS = [
  { value: 0, label: "No existe", detail: "Todavía no tenemos esta práctica." },
  { value: 1, label: "Informal", detail: "Depende de la memoria o de una persona." },
  { value: 2, label: "Parcial", detail: "Existe, pero no se aplica siempre." },
  { value: 3, label: "Consistente", detail: "Se aplica y podemos mostrar evidencia." },
  { value: "unknown", label: "No lo sé", detail: "Necesitamos comprobarlo." },
] as const;
export type Answer = (typeof ANSWER_OPTIONS)[number]["value"];
export const ROLES = [
  "Dirección",
  "Administración",
  "Operaciones",
  "Comercial",
  "Tecnología",
  "Por asignar",
] as const;
export type Role = (typeof ROLES)[number];
export const SECTORS = ["Servicios", "Comercio", "Producción", "Otro"] as const;
export const TEAM_SIZES = ["1 persona", "2 a 5", "6 a 20", "Más de 20"] as const;
export const GOALS = [
  "Ordenar la operación",
  "Mejorar el seguimiento",
  "Reducir dependencia personal",
  "Preparar la digitalización",
] as const;
export interface Question {
  id: string;
  area: AreaId;
  title: string;
  evidence: string;
  importance: number;
  effort: number;
  action: string;
  doneWhen: string;
  reason: string;
  role: Role;
  dependsOn: string[];
}
export const QUESTIONS: Question[] = [
  {
    id: "caja-1",
    area: "caja",
    title: "¿Registran lo cobrado y lo pendiente de cobrar en un mismo lugar?",
    evidence: "Una lista actualizada que permita distinguir ambos estados.",
    importance: 3,
    effort: 2,
    action: "Unificar el registro de cobros",
    doneWhen: "Un registro de prueba distingue cobrado, pendiente y fecha de seguimiento.",
    reason: "Sin un registro común es difícil saber qué cobros necesitan atención.",
    role: "Administración",
    dependsOn: [],
  },
  {
    id: "caja-2",
    area: "caja",
    title: "¿Revisan las entradas y salidas previstas de las próximas semanas?",
    evidence: "Una revisión periódica con fechas y supuestos identificados.",
    importance: 3,
    effort: 3,
    action: "Preparar una vista semanal de entradas y salidas",
    doneWhen: "La vista contiene cuatro semanas, fechas y supuestos pendientes de verificar.",
    reason: "Revisar con anticipación permite identificar fechas que requieren una decisión.",
    role: "Administración",
    dependsOn: ["caja-1"],
  },
  {
    id: "caja-3",
    area: "caja",
    title: "¿Cada cobro pendiente tiene una persona y una fecha de seguimiento?",
    evidence: "Un responsable funcional y una próxima acción visible.",
    importance: 2,
    effort: 1,
    action: "Asignar seguimiento a cada cobro pendiente",
    doneWhen: "Cada pendiente de prueba tiene un rol responsable y próxima revisión.",
    reason: "Un pendiente sin siguiente acción puede quedar olvidado.",
    role: "Administración",
    dependsOn: ["caja-1"],
  },
  {
    id: "procesos-1",
    area: "procesos",
    title: "¿Su servicio o entrega principal tiene pasos documentados?",
    evidence: "Una lista breve que otra persona pueda seguir.",
    importance: 3,
    effort: 3,
    action: "Documentar el proceso principal en una página",
    doneWhen: "Otra persona puede seguir la secuencia y reconocer sus entradas y salidas.",
    reason: "Una secuencia explícita reduce la dependencia de instrucciones improvisadas.",
    role: "Operaciones",
    dependsOn: [],
  },
  {
    id: "procesos-2",
    area: "procesos",
    title: "¿Comprueban la entrega con criterios de aceptación definidos?",
    evidence: "Un checklist que explique cuándo el trabajo está completo.",
    importance: 2,
    effort: 2,
    action: "Definir el checklist de aceptación de una entrega",
    doneWhen: "El checklist se aplica a un ejemplo y permite distinguir completo de pendiente.",
    reason: "Compartir un criterio de terminado ayuda a detectar omisiones antes de entregar.",
    role: "Operaciones",
    dependsOn: ["procesos-1"],
  },
  {
    id: "procesos-3",
    area: "procesos",
    title: "¿Registran incidencias y dan seguimiento a su solución?",
    evidence: "Un registro con situación, responsable, estado y cierre comprobado.",
    importance: 2,
    effort: 2,
    action: "Abrir un registro de incidencias y soluciones",
    doneWhen: "Una incidencia de prueba puede seguirse desde su registro hasta su verificación.",
    reason: "Registrar una solución permite comprobar su cierre y reconocer recurrencias.",
    role: "Operaciones",
    dependsOn: [],
  },
  {
    id: "informacion-1",
    area: "informacion",
    title: "¿Los documentos vigentes se encuentran en una ubicación identificada?",
    evidence: "Un índice que diferencie vigente, borrador y antecedente.",
    importance: 2,
    effort: 2,
    action: "Crear un índice de documentos vigentes",
    doneWhen: "El índice identifica ubicación, versión y estado sin duplicar los originales.",
    reason: "Distinguir versiones evita trabajar con información sustituida.",
    role: "Administración",
    dependsOn: [],
  },
  {
    id: "informacion-2",
    area: "informacion",
    title: "¿Revisan indicadores operativos con una frecuencia acordada?",
    evidence: "Una revisión con datos, fecha y una decisión o siguiente acción.",
    importance: 2,
    effort: 2,
    action: "Acordar una revisión operativa periódica",
    doneWhen: "La revisión de prueba contiene indicadores definidos y una acción con responsable.",
    reason: "La revisión sirve cuando conecta un dato con una acción concreta.",
    role: "Dirección",
    dependsOn: [],
  },
  {
    id: "informacion-3",
    area: "informacion",
    title: "¿Sus decisiones importantes conservan el motivo y la información utilizada?",
    evidence: "Una nota breve con decisión, fuente y condición de revisión.",
    importance: 1,
    effort: 1,
    action: "Registrar decisiones y sus supuestos",
    doneWhen: "Una decisión de prueba conserva motivo, fuentes y condición para revisarla.",
    reason: "Conservar el motivo ayuda a revisar una decisión cuando cambian los supuestos.",
    role: "Dirección",
    dependsOn: [],
  },
  {
    id: "equipo-1",
    area: "equipo",
    title: "¿Está claro qué rol responde por cada actividad recurrente?",
    evidence: "Una asignación funcional que el equipo pueda consultar.",
    importance: 2,
    effort: 2,
    action: "Asignar responsables a las actividades recurrentes",
    doneWhen: "Las actividades principales tienen un rol responsable y una forma de escalar dudas.",
    reason: "Una responsabilidad explícita facilita el seguimiento y las sustituciones.",
    role: "Dirección",
    dependsOn: [],
  },
  {
    id: "equipo-2",
    area: "equipo",
    title: "¿Alguien puede continuar la operación si falta una persona clave?",
    evidence: "Un procedimiento de relevo probado, sin compartir contraseñas.",
    importance: 3,
    effort: 4,
    action: "Ensayar el relevo de una actividad crítica",
    doneWhen: "Otra persona completa una prueba con accesos propios y documenta las dificultades.",
    reason: "Una prueba de relevo revela dependencias que un documento por sí solo no demuestra.",
    role: "Operaciones",
    dependsOn: ["equipo-1", "procesos-1"],
  },
  {
    id: "equipo-3",
    area: "equipo",
    title: "¿Revisan la carga de trabajo antes de aceptar nuevos compromisos?",
    evidence: "Una vista de pendientes y capacidad disponible.",
    importance: 2,
    effort: 1,
    action: "Revisar capacidad antes de asumir compromisos",
    doneWhen: "La revisión muestra pendientes, capacidad y lo que se decide posponer.",
    reason: "Comparar carga y capacidad permite hacer explícitos los compromisos que no caben.",
    role: "Dirección",
    dependsOn: ["equipo-1"],
  },
  {
    id: "clientes-1",
    area: "clientes",
    title: "¿Las solicitudes y oportunidades tienen un registro de seguimiento?",
    evidence: "Una lista con estado y próxima acción, sin datos sensibles innecesarios.",
    importance: 2,
    effort: 2,
    action: "Unificar el seguimiento de solicitudes",
    doneWhen: "Cada solicitud de prueba tiene estado, siguiente acción y responsable funcional.",
    reason: "Un registro común permite reconocer solicitudes sin respuesta.",
    role: "Comercial",
    dependsOn: [],
  },
  {
    id: "clientes-2",
    area: "clientes",
    title: "¿Antes de empezar acuerdan alcance y criterios de entrega?",
    evidence: "Un alcance operativo que ambas partes puedan comprobar.",
    importance: 3,
    effort: 2,
    action: "Definir una ficha de alcance de trabajo",
    doneWhen:
      "La ficha de prueba enumera resultado, inclusiones, exclusiones y criterio de aceptación.",
    reason: "Aclarar el resultado esperado ayuda a detectar diferencias de interpretación.",
    role: "Comercial",
    dependsOn: [],
  },
  {
    id: "clientes-3",
    area: "clientes",
    title: "¿Registran comentarios de clientes y las mejoras que deciden realizar?",
    evidence: "Un comentario vinculado con una acción, una decisión o un cierre.",
    importance: 1,
    effort: 1,
    action: "Cerrar el seguimiento de comentarios",
    doneWhen: "Un comentario de prueba tiene decisión registrada y cierre comprobable.",
    reason: "Relacionar comentarios y acciones permite comprobar qué se atendió.",
    role: "Comercial",
    dependsOn: ["clientes-1"],
  },
  {
    id: "tecnologia-1",
    area: "tecnologia",
    title: "¿Los accesos se asignan por persona y se retiran cuando dejan de necesitarse?",
    evidence: "Un inventario sin contraseñas y una revisión de permisos.",
    importance: 3,
    effort: 2,
    action: "Revisar el inventario de accesos",
    doneWhen:
      "La revisión identifica titulares funcionales, permisos necesarios y accesos por retirar.",
    reason: "Conocer quién tiene acceso facilita una revisión y un retiro controlados.",
    role: "Tecnología",
    dependsOn: [],
  },
  {
    id: "tecnologia-2",
    area: "tecnologia",
    title: "¿Han probado que pueden recuperar sus archivos desde un respaldo?",
    evidence: "Una recuperación real de prueba; tener una copia no basta para comprobarla.",
    importance: 3,
    effort: 3,
    action: "Probar la recuperación de un respaldo",
    doneWhen: "Un archivo de prueba se recupera en otra carpeta y se comprueba su integridad.",
    reason: "La recuperación ensayada revela si el respaldo realmente puede utilizarse.",
    role: "Tecnología",
    dependsOn: ["tecnologia-1"],
  },
  {
    id: "tecnologia-3",
    area: "tecnologia",
    title: "¿Las automatizaciones tienen reglas y una revisión de sus resultados?",
    evidence: "Un proceso estable, límites definidos y una comprobación del resultado.",
    importance: 2,
    effort: 3,
    action: "Definir controles antes de automatizar",
    doneWhen: "Un caso de prueba identifica entrada, regla, excepción y revisión humana.",
    reason:
      "Verificar el proceso y sus excepciones ayuda a evitar que una automatización repita errores.",
    role: "Tecnología",
    dependsOn: ["procesos-1"],
  },
];
export const QUESTION_IDS = new Set(QUESTIONS.map((q) => q.id));
const answerSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal("unknown"),
]);
const answersSchema = z
  .record(answerSchema)
  .refine((a) => Object.keys(a).every((id) => QUESTION_IDS.has(id)), "Hay preguntas desconocidas.");
export const taskUpdateSchema = z
  .object({
    status: z.enum(["pending", "doing", "done"]),
    effort: z.number().int().min(1).max(16),
    owner: z.enum(ROLES),
    note: z.string().max(200),
  })
  .strict();
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export const profileSchema = z
  .object({
    alias: z.string().trim().min(1).max(60),
    sector: z.enum(SECTORS),
    teamSize: z.enum(TEAM_SIZES),
    goal: z.enum(GOALS),
    capacity: z.number().int().min(2).max(20),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export const draftSchema = profileSchema
  .extend({
    alias: z.string().max(60),
    answers: answersSchema,
    step: z.number().int().min(0).max(6),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
export const diagnosisSchema = profileSchema
  .extend({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    rubricVersion: z.literal(RUBRIC_VERSION),
    mode: z.enum(["exercise", "example"]),
    answers: answersSchema.refine(
      (a) => QUESTIONS.every((q) => a[q.id] !== undefined),
      "Faltan respuestas.",
    ),
    updates: z
      .record(taskUpdateSchema)
      .refine(
        (u) => Object.keys(u).every((id) => QUESTION_IDS.has(id)),
        "Hay acciones desconocidas.",
      ),
  })
  .strict();
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export const storeSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    diagnoses: z.array(diagnosisSchema).max(40),
    draft: draftSchema.nullable(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (new Set(s.diagnoses.map((d) => d.id)).size !== s.diagnoses.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hay identificadores repetidos." });
  });
export type DiagnosticStore = z.infer<typeof storeSchema>;
export const DEFAULT_PROFILE: Profile = {
  alias: "Mi ejercicio",
  sector: "Servicios",
  teamSize: "2 a 5",
  goal: "Ordenar la operación",
  capacity: 6,
};
export const EMPTY_STORE: DiagnosticStore = {
  schemaVersion: 1,
  revision: 0,
  diagnoses: [],
  draft: null,
};
export const newDraft = (): Draft => ({ ...DEFAULT_PROFILE, answers: {}, step: 0 });

export interface Assessment {
  score: number | null;
  coverage: number;
  known: number;
  total: number;
  stage: string;
  areas: { id: AreaId; score: number | null; coverage: number; known: number; total: number }[];
}
export function assess(answers: Record<string, Answer>): Assessment {
  function summarize(qs: Question[]) {
    let sum = 0;
    let maximum = 0;
    let known = 0;
    for (const q of qs) {
      const value = answers[q.id];
      if (typeof value === "number") {
        sum += value * q.importance;
        maximum += 3 * q.importance;
        known++;
      }
    }
    return {
      score: maximum ? Math.round((100 * sum) / maximum) : null,
      coverage: Math.round((100 * known) / qs.length),
      known,
      total: qs.length,
    };
  }
  const overall = summarize(QUESTIONS);
  const stage =
    overall.coverage < 67
      ? "Por verificar"
      : overall.score === null
        ? "Sin información"
        : overall.score < 35
          ? "Requiere orden"
          : overall.score < 65
            ? "En construcción"
            : "Base consistente";
  return {
    ...overall,
    stage,
    areas: AREAS.map((area) => ({
      id: area.id,
      ...summarize(QUESTIONS.filter((q) => q.area === area.id)),
    })),
  };
}
export interface Action extends TaskUpdate {
  id: string;
  area: AreaId;
  title: string;
  doneWhen: string;
  reason: string;
  source: Question;
  answer: Answer;
  priority: number;
  dependsOn: string[];
  verification: boolean;
}
export function actionsFor(d: Diagnosis): Action[] {
  const actions = QUESTIONS.filter((q) => d.answers[q.id] !== 3).map((q): Action => {
    const answer = d.answers[q.id]!;
    const verification = answer === "unknown";
    const update = d.updates[q.id] ?? {
      status: "pending" as const,
      effort: verification ? 1 : q.effort,
      owner: q.role,
      note: "",
    };
    const deficit = verification ? 1 : 3 - answer;
    return {
      id: q.id,
      area: q.area,
      title: verification
        ? `Verificar la práctica: ${q.action.charAt(0).toLowerCase() + q.action.slice(1)}`
        : q.action,
      doneWhen: verification
        ? `Revisar la evidencia: ${q.evidence} Después registrar una nueva medición.`
        : q.doneWhen,
      reason: verification
        ? "La respuesta es desconocida. Primero comprobar; no se ha supuesto que la práctica no existe."
        : q.reason,
      source: q,
      answer,
      priority: Math.round((100 * deficit * q.importance) / (3 * update.effort)),
      dependsOn: verification ? [] : q.dependsOn.filter((id) => d.answers[id] !== 3),
      verification,
      ...update,
    };
  });
  return actions.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
export interface PlannedAction {
  action: Action;
  week: number | null;
  reason: string | null;
}
export function schedule(
  actions: Action[],
  capacity: number,
  weeks = 4,
): { entries: PlannedAction[]; used: number[]; scheduled: number; pending: number; hours: number } {
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 20)
    throw new Error("Capacidad inválida.");
  const used = Array<number>(weeks).fill(0);
  const entries: PlannedAction[] = [];
  const placed = new Map<string, PlannedAction>();
  const remaining = actions.filter((a) => a.status !== "done");
  const done = new Set(actions.filter((a) => a.status === "done").map((a) => a.id));
  while (remaining.length) {
    const i = remaining.findIndex((a) =>
      a.dependsOn.every(
        (id) => done.has(id) || placed.has(id) || !actions.some((x) => x.id === id),
      ),
    );
    if (i < 0) {
      for (const action of remaining)
        entries.push({ action, week: null, reason: "Revisar dependencias antes de programar." });
      break;
    }
    const action = remaining.splice(i, 1)[0]!;
    const dependencies = action.dependsOn
      .map((id) => placed.get(id))
      .filter((p): p is PlannedAction => !!p);
    let week: number | null = null;
    let reason: string | null = null;
    if (dependencies.some((p) => p.week === null))
      reason = "Primero resolver la acción de la que depende.";
    else if (action.effort > capacity)
      reason = "El esfuerzo supera una semana: dividir la acción o ajustar capacidad.";
    else {
      const first = Math.max(1, ...dependencies.map((p) => p.week ?? 1));
      for (let w = first; w <= weeks; w++)
        if (used[w - 1]! + action.effort <= capacity) {
          week = w;
          used[w - 1]! += action.effort;
          break;
        }
      if (week === null) reason = "Fuera de la capacidad de estas cuatro semanas.";
    }
    const entry = { action, week, reason };
    entries.push(entry);
    placed.set(action.id, entry);
  }
  return {
    entries,
    used,
    scheduled: entries.filter((e) => e.week !== null).length,
    pending: entries.filter((e) => e.week === null).length,
    hours: used.reduce((a, b) => a + b, 0),
  };
}
export function simulate(d: Diagnosis, selected: string[]): Assessment {
  const answers = { ...d.answers };
  for (const id of selected) if (QUESTION_IDS.has(id) && answers[id] !== "unknown") answers[id] = 3;
  return assess(answers);
}
export function completeDraft(draft: Draft, mode: Diagnosis["mode"] = "exercise"): Diagnosis {
  const now = new Date().toISOString();
  const { step: _step, ...profileAndAnswers } = draft;
  return diagnosisSchema.parse({
    ...profileAndAnswers,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    rubricVersion: RUBRIC_VERSION,
    mode,
    updates: {},
  });
}
export const EXAMPLES = [
  {
    id: "taller",
    alias: "Taller Horizonte · ficticio",
    sector: "Producción" as const,
    teamSize: "6 a 20" as const,
    description: "La entrega depende del dueño y los cobros están dispersos.",
    answers: [0, 1, 0, 1, 1, 2, 2, 1, 0, 1, 0, 1, 2, 2, 1, 2, 0, 1] as Answer[],
  },
  {
    id: "estudio",
    alias: "Estudio Sur · ficticio",
    sector: "Servicios" as const,
    teamSize: "2 a 5" as const,
    description: "Procesos claros; falta comprobar respaldos y distribuir carga.",
    answers: [3, 2, 3, 3, 3, 2, 3, 2, 2, 2, 1, 1, 3, 3, 2, 2, "unknown", 2] as Answer[],
  },
  {
    id: "comercio",
    alias: "Comercio Nexo · ficticio",
    sector: "Comercio" as const,
    teamSize: "6 a 20" as const,
    description: "Poca información confirmada: comprobar antes de priorizar cambios.",
    answers: [
      "unknown",
      "unknown",
      1,
      2,
      "unknown",
      1,
      2,
      "unknown",
      "unknown",
      2,
      "unknown",
      "unknown",
      2,
      2,
      "unknown",
      "unknown",
      "unknown",
      1,
    ] as Answer[],
  },
];
export function exampleDiagnosis(id: string): Diagnosis {
  const example = EXAMPLES.find((e) => e.id === id) ?? EXAMPLES[0]!;
  const draft = {
    ...newDraft(),
    alias: example.alias,
    sector: example.sector,
    teamSize: example.teamSize,
    answers: Object.fromEntries(QUESTIONS.map((q, i) => [q.id, example.answers[i]!])),
    step: 6,
  };
  return completeDraft(draft, "example");
}
