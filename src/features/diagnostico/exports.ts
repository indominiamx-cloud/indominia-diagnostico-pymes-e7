import { actionsFor, AREAS, assess, QUESTIONS, schedule, type Diagnosis } from "./model";

export const escapeHtml = (s: unknown): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function csvCell(s: unknown): string {
  let value = String(s);
  if (/^[=+\-@\t\r]/.test(value.trimStart()) || /^[\t\r]/.test(value)) value = `'${value}`;
  return `"${value.replace(/"/g, '""')}"`;
}
export function planCsv(d: Diagnosis): string {
  const plan = schedule(actionsFor(d), d.capacity);
  const rows = [
    [
      "Caso de prueba",
      "Acción",
      "Área",
      "Estado",
      "Rol",
      "Horas estimadas",
      "Semana propuesta",
      "Criterio de cierre",
      "Nota",
    ],
  ];
  for (const action of actionsFor(d))
    rows.push([
      d.alias,
      action.title,
      AREAS.find((a) => a.id === action.area)!.title,
      { pending: "Por hacer", doing: "En curso", done: "Hecho" }[action.status],
      action.owner,
      String(action.effort),
      action.status === "done"
        ? "Completada"
        : String(plan.entries.find((p) => p.action.id === action.id)?.week ?? "Sin programar"),
      action.doneWhen,
      action.note,
    ]);
  return "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function reportHtml(d: Diagnosis): string {
  const a = assess(d.answers);
  const actions = actionsFor(d);
  const plan = schedule(actions, d.capacity);
  const h = escapeHtml;
  return `<!doctype html><html lang="es-MX"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INDOMINIA · Informe operativo</title><style>body{font:15px/1.55 Arial,sans-serif;max-width:1000px;margin:40px auto;padding:0 24px}h1,h2,h3{line-height:1.2}p{text-align:justify}table{border-collapse:collapse;width:100%;margin:20px auto;font-size:13px}th,td{border:1px solid;padding:9px;text-align:left;vertical-align:top}small{font-size:12px}.tag{border:1px solid;padding:4px 8px;display:inline-block}article{break-inside:avoid;border-top:1px solid;padding:12px 0}@media print{body{margin:0;max-width:none}@page{margin:18mm}thead{display:table-header-group}tr{break-inside:avoid}}</style><body>
  <p class="tag">INDOMINIA · Ejercicio con datos de prueba</p><h1>Diagnóstico operativo para PyMEs</h1><h2>${h(d.alias)}</h2><p>${h(d.sector)} · Equipo: ${h(d.teamSize)} · Objetivo: ${h(d.goal)}. Medición: ${h(d.createdAt.slice(0, 10))}. Rúbrica ${h(d.rubricVersion)}.</p>
  <h2>Lectura del resultado</h2><p>Indicador operativo: ${a.score ?? "sin información"}${a.score !== null ? "/100" : ""}. Cobertura: ${a.coverage}% (${a.known}/${a.total} respuestas conocidas). Estado orientativo: ${h(a.stage)}. El indicador describe respuestas declaradas. No acredita cumplimiento, solvencia ni resultados futuros. Las respuestas desconocidas se excluyen del cálculo y requieren comprobación.</p>
  <table><thead><tr><th>Área</th><th>Indicador</th><th>Cobertura</th></tr></thead><tbody>${a.areas.map((x) => `<tr><td>${h(AREAS.find((p) => p.id === x.id)!.title)}</td><td>${x.score ?? "Sin información"}</td><td>${x.known}/${x.total}</td></tr>`).join("")}</tbody></table>
  <h2>Plan de cuatro semanas</h2><p>Capacidad declarada: ${d.capacity} horas por semana. ${plan.scheduled} acciones programadas; ${plan.pending} fuera de capacidad o pendientes de dependencia. El esfuerzo es una estimación editable. Las semanas son una propuesta, no un plazo contractual.</p>
  ${actions.map((x) => `<article><h3>${h(x.title)}</h3><p>Estado: ${h({ pending: "Por hacer", doing: "En curso", done: "Hecho" }[x.status])}. Rol: ${h(x.owner)}. Esfuerzo: ${x.effort} h. Semana: ${x.status === "done" ? "Completada" : (plan.entries.find((p) => p.action.id === x.id)?.week ?? "Sin programar")}.</p><p><strong>Origen:</strong> ${h(x.source.title)} Respuesta: ${h(x.answer === "unknown" ? "No lo sé" : ["No existe", "Informal", "Parcial", "Consistente"][x.answer])}.</p><p><strong>Motivo:</strong> ${h(x.reason)}</p><p><strong>Se comprueba con:</strong> ${h(x.doneWhen)}</p>${x.note ? `<p>Nota: ${h(x.note)}</p>` : ""}</article>`).join("") || "<p>No se generaron acciones correctivas con las respuestas conocidas. Conservar evidencia y repetir la medición cuando cambien las prácticas.</p>"}
  <h2>Respuestas de la medición</h2><table><thead><tr><th>Pregunta</th><th>Respuesta declarada</th></tr></thead><tbody>${QUESTIONS.map((q) => `<tr><td>${h(q.title)}</td><td>${h(d.answers[q.id] === "unknown" ? "No lo sé" : ["No existe", "Informal", "Parcial", "Consistente"][d.answers[q.id] as number])}</td></tr>`).join("")}</tbody></table>
  <h2>Método y límites</h2><p>Indicador = suma de respuesta (0 a 3) × peso de la pregunta, dividida entre la suma de 3 × peso de preguntas conocidas; se expresa de 0 a 100. Pesos internos: 1, 2 o 3. Prioridad = brecha × peso / esfuerzo, normalizada a 100/3. Una respuesta desconocida genera una acción de verificación de una hora; no se convierte en cero. El orden no sustituye una revisión profesional.</p><p>Este archivo es un informe, no un respaldo recuperable. Para conservar mediciones y avances, exportar también el JSON desde Historial. Los datos del módulo se guardan en el navegador de origen, sin sincronización entre dispositivos. Marcar una acción como hecha no cambia la medición inicial; es necesario volver a responder para comprobar cambios.</p><small>Generado por el módulo desarrollado con Codex para el Hackathon de Vibe Coding E7. No contiene asesoría jurídica, fiscal, contable, financiera ni PLD/FT.</small></body></html>`;
}
export function downloadFile(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
