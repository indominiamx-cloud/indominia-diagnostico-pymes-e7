import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FileDown,
  FolderClock,
  Info,
  LayoutDashboard,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  ANSWER_OPTIONS,
  AREAS,
  DEFAULT_PROFILE,
  EMPTY_STORE,
  EXAMPLES,
  GOALS,
  MODULE_TITLE,
  QUESTIONS,
  ROLES,
  SECTORS,
  TEAM_SIZES,
  actionsFor,
  assess,
  completeDraft,
  exampleDiagnosis,
  newDraft,
  schedule,
  simulate,
  type Action,
  type Diagnosis,
  type DiagnosticStore,
  type Draft,
  type TaskUpdate,
} from "./model";
import {
  DAMAGED_KEY,
  MAX_IMPORT_BYTES,
  STORAGE_KEY,
  exportBackup,
  loadStore,
  mergeBackup,
  parseBackup,
  recoverPrevious,
  saveStore,
  type LoadResult,
} from "./storage";
import { downloadFile, planCsv, reportHtml } from "./exports";
import { AreaRadar, AreaTable, ScoreRing } from "./Charts";
import "./diagnostico.css";

type View = "overview" | "questionnaire" | "plan" | "simulation" | "history" | "method";
const NAV = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard },
  { id: "questionnaire", label: "Diagnóstico", icon: ClipboardList },
  { id: "plan", label: "Plan de acción", icon: ListChecks },
  { id: "simulation", label: "Simulador", icon: SlidersHorizontal },
  { id: "history", label: "Historial", icon: FolderClock },
  { id: "method", label: "Método y criterios", icon: Info },
] as const;
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Cancun",
  }).format(new Date(date));

export function DiagnosticApp() {
  const [store, setStore] = useState<DiagnosticStore>(structuredClone(EMPTY_STORE));
  const storeRef = useRef(store);
  const [loaded, setLoaded] = useState(false);
  const [storageStatus, setStorageStatus] = useState<LoadResult["status"]>("empty");
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    label: string;
    dangerous?: boolean;
    action: () => void;
  } | null>(null);
  const [planFilter, setPlanFilter] = useState("all");
  const [simulationIds, setSimulationIds] = useState<string[]>([]);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let loadedStore: LoadResult;
    try {
      loadedStore = loadStore(window.localStorage);
    } catch {
      loadedStore = {
        store: structuredClone(EMPTY_STORE),
        status: "unavailable",
        message:
          "El navegador impide acceder al almacenamiento. Usa un navegador con almacenamiento habilitado antes de empezar.",
      };
    }
    storeRef.current = loadedStore.store;
    setStore(loadedStore.store);
    setStorageStatus(loadedStore.status);
    setSelectedId(loadedStore.store.diagnoses[0]?.id ?? null);
    setError(loadedStore.message);
    setLoaded(true);
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setError(
          "Otra pestaña cambió los datos. Recarga antes de continuar para conservar esa versión.",
        );
        setStorageStatus("unavailable");
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    setSimulationIds([]);
    setPlanFilter("all");
  }, [selectedId]);
  useEffect(() => {
    if (!loaded) return;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, selectedId, loaded]);
  useEffect(() => {
    if (!confirmation) return;
    const before = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("#dx-confirm");
    dialog?.showModal();
    return () => {
      dialog?.close();
      before?.focus();
    };
  }, [confirmation]);
  const selected = store.diagnoses.find((d) => d.id === selectedId) ?? null;
  const assessment = selected ? assess(selected.answers) : null;
  const actions = useMemo(() => (selected ? actionsFor(selected) : []), [selected]);
  const planning = useMemo(
    () => (selected ? schedule(actions, selected.capacity) : null),
    [selected, actions],
  );
  const orderedActions = planning
    ? [
        ...planning.entries.map((entry) => entry.action),
        ...actions.filter((action) => action.status === "done"),
      ]
    : actions;
  const blocked = ["recoverable", "corrupt", "unavailable"].includes(storageStatus);

  function commit(next: DiagnosticStore): boolean {
    if (blocked) {
      setError(
        "Recupera o recarga los datos antes de continuar. No se sobrescribió el almacenamiento.",
      );
      return false;
    }
    try {
      const persisted = saveStore(window.localStorage, storeRef.current.revision, next);
      storeRef.current = persisted;
      setStore(persisted);
      setSaved(true);
      setError("");
      setStorageStatus("ok");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
      return false;
    }
  }
  function navigate(next: View) {
    setView(next);
    setNotice("");
  }
  function patchDraft(patch: Partial<Draft>) {
    const draft = storeRef.current.draft ?? newDraft();
    commit({ ...storeRef.current, draft: { ...draft, ...patch } });
  }
  function startNew(base?: Diagnosis) {
    const run = () => {
      const draft = base
        ? {
            ...newDraft(),
            alias: base.alias,
            sector: base.sector,
            teamSize: base.teamSize,
            goal: base.goal,
            capacity: base.capacity,
          }
        : newDraft();
      if (commit({ ...storeRef.current, draft })) {
        setView("questionnaire");
        setNotice(
          base
            ? "Nueva medición del mismo alias. Responde otra vez para comprobar cambios; la anterior se conserva."
            : "El borrador se guarda en este navegador mientras respondes.",
        );
      }
    };
    if (storeRef.current.draft)
      setConfirmation({
        title: "Ya tienes un borrador",
        body: "Puedes retomarlo desde Diagnóstico. Si comienzas otro, se sustituirán solo las respuestas del borrador; las mediciones completas se conservan.",
        label: "Comenzar otro borrador",
        action: run,
      });
    else run();
  }
  function openExample(id: string) {
    if (storeRef.current.diagnoses.length >= 40) {
      setError(
        "Llegaste al límite de 40 diagnósticos. Conserva un respaldo y elimina un ejercicio que ya no necesites.",
      );
      return;
    }
    const diagnosis = exampleDiagnosis(id);
    if (commit({ ...storeRef.current, diagnoses: [diagnosis, ...storeRef.current.diagnoses] })) {
      setSelectedId(diagnosis.id);
      setView("overview");
      setNotice(
        "Caso ficticio guardado. Puedes cambiar capacidad, registrar avances y probar el simulador.",
      );
    }
  }
  function updateSelected(patch: Partial<Diagnosis>) {
    if (!selectedId) return;
    commit({
      ...storeRef.current,
      diagnoses: storeRef.current.diagnoses.map((d) =>
        d.id === selectedId ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
      ),
    });
  }
  function updateTask(id: string, patch: Partial<TaskUpdate>) {
    const current = actions.find((a) => a.id === id);
    if (!current || !selected) return;
    const old = storeRef.current.diagnoses.find((d) => d.id === selected.id)!;
    const value = old.updates[id] ?? {
      status: current.status,
      effort: current.effort,
      owner: current.owner,
      note: current.note,
    };
    updateSelected({ updates: { ...old.updates, [id]: { ...value, ...patch } } });
  }
  function finishDraft() {
    const draft = storeRef.current.draft;
    if (!draft) return;
    if (storeRef.current.diagnoses.length >= 40) {
      setError(
        "El límite es de 40 diagnósticos. Exporta un respaldo antes de eliminar ejercicios antiguos.",
      );
      return;
    }
    try {
      const diagnosis = completeDraft(draft);
      if (
        commit({
          ...storeRef.current,
          diagnoses: [diagnosis, ...storeRef.current.diagnoses],
          draft: null,
        })
      ) {
        setSelectedId(diagnosis.id);
        setView("overview");
        setNotice("Diagnóstico guardado. Las prioridades conservan la respuesta que las originó.");
      }
    } catch {
      setError(
        "Faltan respuestas o un dato del perfil no es válido. Revisa los seis pasos antes de generar el resultado.",
      );
    }
  }
  function backup() {
    downloadFile(
      `indominia-respaldo-${new Date().toISOString().slice(0, 10)}.json`,
      exportBackup(storeRef.current),
      "application/json;charset=utf-8",
    );
    setNotice(
      "Respaldo JSON preparado para descarga. Guárdalo fuera de este navegador para poder recuperar tus ejercicios.",
    );
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("El respaldo supera el límite de 2 MB.");
      const incoming = parseBackup(await file.text());
      const result = mergeBackup(storeRef.current, incoming);
      if (!result.added) {
        setNotice(
          `No hay mediciones nuevas. Se conservaron ${result.duplicates} registros existentes sin sobrescribirlos.`,
        );
        return;
      }
      setConfirmation({
        title: "Revisar importación",
        body: `Se añadirán ${result.added} mediciones. ${result.duplicates} identificadores ya existen y se conservarán sin cambios. El borrador actual se conserva. No se enviará el archivo a un servidor.`,
        label: "Importar mediciones",
        action: () => {
          try {
            const latest = mergeBackup(storeRef.current, incoming);
            if (commit(latest.store)) {
              setSelectedId(latest.store.diagnoses[0]?.id ?? null);
              setNotice(`${latest.added} mediciones importadas y guardadas.`);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo importar.");
          }
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  function removeDiagnosis(d: Diagnosis) {
    setConfirmation({
      title: "Eliminar este ejercicio",
      body: `Se eliminará «${d.alias}», creado el ${dateLabel(d.createdAt)}, junto con sus avances en este navegador. Puedes cancelar y exportar un respaldo primero. Los demás ejercicios se conservan.`,
      label: "Eliminar ejercicio",
      dangerous: true,
      action: () => {
        const remaining = storeRef.current.diagnoses.filter((x) => x.id !== d.id);
        if (commit({ ...storeRef.current, diagnoses: remaining })) {
          if (selectedId === d.id) setSelectedId(remaining[0]?.id ?? null);
          setNotice("Ejercicio eliminado. Los demás registros se conservaron.");
        }
      },
    });
  }
  const button = (
    label: string,
    action: () => void,
    Icon = ArrowRight,
    variant = "primary",
    disabled = false,
  ) => (
    <button
      type="button"
      className={`dx-btn dx-btn-${variant}`}
      onClick={action}
      disabled={disabled}
    >
      {label}
      <Icon size={17} aria-hidden="true" />
    </button>
  );

  if (!loaded)
    return (
      <div className="dx-loading" role="status">
        Preparando tu espacio de trabajo…
      </div>
    );

  return (
    <div className="dx-app">
      <div className="dx-context">
        <div>
          <span className="dx-context-mark" aria-hidden="true" />
          <span>
            INDOMINIA <b>/</b> Herramientas para operar
          </span>
        </div>
        <span className="dx-local">
          <span className={blocked ? "dx-status-dot dx-status-error" : "dx-status-dot"} />
          {blocked
            ? "Revisar almacenamiento"
            : saved
              ? "Guardado en este navegador"
              : "Datos locales · sin cuenta"}
        </span>
      </div>
      <div className="dx-layout">
        <aside className="dx-sidebar">
          <p className="dx-sidebar-title">Tu espacio de trabajo</p>
          <nav aria-label="Secciones del diagnóstico">
            <ul>
              {NAV.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={view === id ? "page" : undefined}
                    onClick={() => {
                      if (id === "questionnaire" && !store.draft) startNew();
                      else navigate(id);
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                    {id === "plan" && actions.length > 0 && (
                      <small>{actions.filter((a) => a.status !== "done").length}</small>
                    )}
                    {id === "questionnaire" && store.draft && (
                      <span className="dx-draft-dot" aria-label="Borrador pendiente" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="dx-sidebar-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <strong>El control es tuyo.</strong>
            <p>
              Respuestas guardadas en este navegador. Exporta un respaldo para conservarlas en otro
              lugar.
            </p>
            <button type="button" onClick={() => navigate("history")}>
              Gestionar mis datos <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="dx-sidebar-footer">
            <span>Hackathon de Vibe Coding E7</span>
            <small>Módulo desarrollado con Codex</small>
          </div>
        </aside>
        <div className="dx-main" ref={headingRef} tabIndex={-1}>
          {error && (
            <div className="dx-message dx-message-error" role="alert">
              <Info size={20} aria-hidden="true" />
              <div>
                <strong>No se confirmó el guardado</strong>
                <p>{error}</p>
                {storageStatus === "recoverable" &&
                  button(
                    "Recuperar copia anterior",
                    () => {
                      try {
                        const recovered = recoverPrevious(window.localStorage);
                        storeRef.current = recovered;
                        setStore(recovered);
                        setSelectedId(recovered.diagnoses[0]?.id ?? null);
                        setStorageStatus("ok");
                        setError("");
                        setNotice(
                          "Copia anterior recuperada. La versión dañada se conservó por separado.",
                        );
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "No se pudo recuperar.");
                      }
                    },
                    RotateCcw,
                    "secondary",
                  )}
                {blocked &&
                  button(
                    "Descargar datos para revisión",
                    () => {
                      try {
                        downloadFile(
                          "indominia-datos-para-revision.txt",
                          window.localStorage.getItem(STORAGE_KEY) ??
                            window.localStorage.getItem(DAMAGED_KEY) ??
                            "Sin datos disponibles",
                          "text/plain;charset=utf-8",
                        );
                      } catch {
                        setError("No se permite leer el almacenamiento. Prueba otro navegador.");
                      }
                    },
                    Download,
                    "secondary",
                  )}
                {blocked &&
                  button("Recargar", () => window.location.reload(), RotateCcw, "secondary")}
              </div>
              {!blocked && (
                <button
                  type="button"
                  className="dx-icon-btn"
                  aria-label="Cerrar aviso de error"
                  onClick={() => setError("")}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
          {notice && (
            <div className="dx-message" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <p>{notice}</p>
              <button
                type="button"
                className="dx-icon-btn"
                aria-label="Cerrar aviso"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {view !== "questionnaire" && selected && (
            <div className="dx-record-bar">
              <label>
                Ejercicio activo
                <select
                  aria-label="Ejercicio activo"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {store.diagnoses.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.alias} · {dateLabel(d.createdAt)}
                    </option>
                  ))}
                </select>
              </label>
              <span className="dx-tag">
                {selected.mode === "example" ? "Caso ficticio" : "Ejercicio de prueba"}
              </span>
            </div>
          )}

          {view === "overview" && !selected && (
            <>
              <section className="dx-welcome">
                <p className="dx-eyebrow">Una herramienta de INDOMINIA</p>
                <h1>{MODULE_TITLE}</h1>
                <p className="dx-welcome-lead">
                  Identifica qué ordenar primero.
                  <br />
                  Convierte tus respuestas en acciones que puedas seguir.
                </p>
                <p className="dx-muted">
                  18 preguntas sobre la operación cotidiana. Prioridades explicadas, un plan
                  ajustado a tu capacidad y un registro para comprobar avances.
                </p>
                <div className="dx-button-row">
                  {button(
                    store.draft ? "Retomar mi diagnóstico" : "Comenzar diagnóstico",
                    () => (store.draft ? navigate("questionnaire") : startNew()),
                    ArrowRight,
                    "primary",
                    blocked,
                  )}
                  {button(
                    "Explorar un caso ficticio",
                    () => openExample("taller"),
                    ArrowUpRight,
                    "secondary",
                    blocked,
                  )}
                </div>
                <small className="dx-fine">
                  Sin cuenta, sin pedir datos personales. Para la demostración, utiliza únicamente
                  datos ficticios.
                </small>
              </section>
              <div className="dx-workflow">
                {[
                  { n: "01", t: "Observa", p: "Describe cómo trabaja hoy tu negocio." },
                  { n: "02", t: "Decide", p: "Comprueba por qué una acción aparece primero." },
                  { n: "03", t: "Da seguimiento", p: "Registra avances y vuelve a medir." },
                ].map((s) => (
                  <article key={s.n}>
                    <span>{s.n}</span>
                    <div>
                      <h2>{s.t}</h2>
                      <p>{s.p}</p>
                    </div>
                  </article>
                ))}
              </div>
              <section className="dx-examples">
                <div className="dx-section-heading">
                  <div>
                    <p className="dx-eyebrow">Pruébalo antes de responder</p>
                    <h2>Tres situaciones, distintas prioridades.</h2>
                  </div>
                  <span className="dx-tag">Todos los datos son ficticios</span>
                </div>
                <div className="dx-example-grid">
                  {EXAMPLES.map((e, i) => (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => openExample(e.id)}
                      disabled={blocked}
                    >
                      <span className="dx-example-num">0{i + 1}</span>
                      <h3>{e.alias.replace(" · ficticio", "")}</h3>
                      <p>{e.description}</p>
                      <span className="dx-text-link">
                        Abrir caso <ArrowUpRight size={17} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <div className="dx-note">
                <Info size={20} />
                <p>
                  El resultado es una guía de organización basada en tus respuestas. No determina
                  cumplimiento jurídico, fiscal, financiero ni PLD/FT. Puedes consultar todos los
                  criterios antes de empezar.
                </p>
                <button type="button" onClick={() => navigate("method")}>
                  Ver método <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {view === "overview" && selected && assessment && planning && (
            <>
              <div className="dx-page-heading">
                <div>
                  <p className="dx-eyebrow">Lectura inicial · {dateLabel(selected.createdAt)}</p>
                  <h1>
                    Un punto de partida.
                    <br />
                    <span>Tu siguiente decisión.</span>
                  </h1>
                </div>
                {button("Nueva medición", () => startNew(selected), Plus, "secondary", blocked)}
              </div>
              <div className="dx-summary-grid">
                <section className="dx-panel dx-score-panel">
                  <div className="dx-panel-top">
                    <h2>Estado operativo</h2>
                    <span className="dx-tag">{assessment.stage}</span>
                  </div>
                  <ScoreRing score={assessment.score} />
                  <p className="dx-score-caption">
                    Una lectura de tus prácticas declaradas.
                    <br />
                    La evidencia todavía debe comprobarse.
                  </p>
                  <div className="dx-coverage">
                    <span>Cobertura de información</span>
                    <strong>{assessment.coverage}%</strong>
                    <div className="dx-progress">
                      <span style={{ width: `${assessment.coverage}%` }} />
                    </div>
                    <small>
                      {assessment.known} de {assessment.total} respuestas conocidas
                    </small>
                  </div>
                </section>
                <section className="dx-panel dx-profile-panel">
                  <div className="dx-panel-top">
                    <h2>La operación, por área</h2>
                    <button
                      className="dx-text-button"
                      type="button"
                      onClick={() => navigate("method")}
                    >
                      Cómo se calcula <Info size={15} />
                    </button>
                  </div>
                  <AreaRadar assessment={assessment} />
                  <AreaTable assessment={assessment} />
                </section>
              </div>
              {assessment.coverage < 80 && (
                <div className="dx-note dx-note-amber">
                  <Info size={20} />
                  <p>
                    Hay {assessment.total - assessment.known} respuestas desconocidas. El indicador
                    excluye esas preguntas; conviene comprobarlas antes de interpretar una
                    puntuación alta como una base sólida.
                  </p>
                </div>
              )}
              <section className="dx-next-decision">
                <div>
                  <p className="dx-eyebrow">Primera acción propuesta</p>
                  <h2>
                    {planning.entries[0]?.action.title ??
                      (actions.length
                        ? "Repite la medición para comprobar los cambios."
                        : "Conserva la evidencia y programa una nueva revisión.")}
                  </h2>
                  <p>
                    {planning.entries[0]?.action.reason ??
                      "El indicador original se conserva aunque marques acciones como hechas. Una nueva medición permite contrastar lo reportado."}
                  </p>
                </div>
                {button("Abrir mi plan", () => navigate("plan"), ArrowRight, "inverse")}
              </section>
              <div className="dx-metrics">
                <article>
                  <ListChecks size={22} />
                  <div>
                    <strong>
                      {actions.filter((a) => a.status === "done").length}
                      <span> / {actions.length}</span>
                    </strong>
                    <p>Acciones marcadas como hechas</p>
                  </div>
                </article>
                <article>
                  <Clock3 size={22} />
                  <div>
                    <strong>
                      {selected.capacity}
                      <span> h/semana</span>
                    </strong>
                    <p>Capacidad que declaraste</p>
                  </div>
                </article>
                <article>
                  <Target size={22} />
                  <div>
                    <strong>
                      {planning.scheduled}
                      <span> acciones</span>
                    </strong>
                    <p>Caben en las próximas cuatro semanas</p>
                  </div>
                </article>
              </div>
              <section className="dx-panel">
                <div className="dx-section-heading">
                  <div>
                    <p className="dx-eyebrow">Una propuesta que respeta tu capacidad</p>
                    <h2>Las próximas cuatro semanas</h2>
                  </div>
                  <button type="button" className="dx-text-button" onClick={() => navigate("plan")}>
                    Ajustar capacidad <ArrowRight size={16} />
                  </button>
                </div>
                <WeekPlan plan={planning} capacity={selected.capacity} />
                {planning.pending > 0 && (
                  <p className="dx-fine">
                    {planning.pending} acciones quedan sin programar. Revisa dependencias, esfuerzo
                    y capacidad antes de asumir más compromisos.
                  </p>
                )}
              </section>
              <div className="dx-button-row dx-export-row">
                {button(
                  "Descargar informe",
                  () =>
                    downloadFile(
                      `indominia-informe-${selected.id.slice(0, 8)}.html`,
                      reportHtml(selected),
                      "text/html;charset=utf-8",
                    ),
                  FileDown,
                  "secondary",
                )}
                {button(
                  "Probar un escenario",
                  () => navigate("simulation"),
                  SlidersHorizontal,
                  "secondary",
                )}
              </div>
            </>
          )}

          {view === "questionnaire" && (
            <Wizard
              draft={store.draft}
              blocked={blocked}
              onChange={patchDraft}
              onStart={() => startNew()}
              onFinish={finishDraft}
              onPause={() => navigate("overview")}
            />
          )}

          {view === "plan" && selected && planning && (
            <>
              <div className="dx-page-heading">
                <div>
                  <p className="dx-eyebrow">Del resultado al trabajo concreto</p>
                  <h1>Un plan que sí cabe.</h1>
                  <p>Revisa la razón de cada acción, asigna un rol y registra avances.</p>
                </div>
                {button(
                  "Exportar plan CSV",
                  () =>
                    downloadFile(
                      `indominia-plan-${selected.id.slice(0, 8)}.csv`,
                      planCsv(selected),
                      "text/csv;charset=utf-8",
                    ),
                  Download,
                  "secondary",
                )}
              </div>
              <section className="dx-panel dx-capacity">
                <div>
                  <label htmlFor="dx-capacity">Capacidad semanal para estas mejoras</label>
                  <p>
                    Estimación editable. Cambiarla reorganiza el plan; el diagnóstico original se
                    conserva.
                  </p>
                </div>
                <div>
                  <input
                    id="dx-capacity"
                    type="range"
                    min="2"
                    max="20"
                    value={selected.capacity}
                    disabled={blocked}
                    onChange={(e) => updateSelected({ capacity: Number(e.target.value) })}
                  />
                  <output htmlFor="dx-capacity">
                    {selected.capacity} <span>h/semana</span>
                  </output>
                </div>
              </section>
              <WeekPlan plan={planning} capacity={selected.capacity} />
              <div className="dx-filter-row">
                <div className="dx-filter-buttons" aria-label="Filtrar acciones">
                  {[
                    { id: "all", label: "Todas" },
                    { id: "pending", label: "Por hacer" },
                    { id: "doing", label: "En curso" },
                    { id: "done", label: "Hechas" },
                    { id: "unknown", label: "Por verificar" },
                  ].map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      aria-pressed={planFilter === f.id}
                      onClick={() => setPlanFilter(f.id)}
                    >
                      {f.label}
                      <span>
                        {
                          actions.filter(
                            (a) =>
                              f.id === "all" ||
                              (f.id === "unknown" ? a.verification : a.status === f.id),
                          ).length
                        }
                      </span>
                    </button>
                  ))}
                </div>
                <small>Orden: prioridad y dependencias</small>
              </div>
              <div className="dx-action-list">
                {orderedActions
                  .filter(
                    (a) =>
                      planFilter === "all" ||
                      (planFilter === "unknown" ? a.verification : a.status === planFilter),
                  )
                  .map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      planned={planning.entries.find((p) => p.action.id === action.id)}
                      blocked={blocked}
                      onUpdate={(patch) => updateTask(action.id, patch)}
                    />
                  ))}
              </div>
              {!actions.some(
                (a) =>
                  planFilter === "all" ||
                  (planFilter === "unknown" ? a.verification : a.status === planFilter),
              ) && (
                <div className="dx-empty">
                  <CheckCircle2 size={32} />
                  <h2>No hay acciones en este filtro.</h2>
                  <p>
                    Prueba otra vista. Las acciones hechas no modifican automáticamente el resultado
                    inicial.
                  </p>
                </div>
              )}
            </>
          )}

          {view === "simulation" && selected && assessment && (
            <Simulation
              diagnosis={selected}
              selectedIds={simulationIds}
              onSelected={setSimulationIds}
              onPlan={() => navigate("plan")}
            />
          )}

          {view === "history" && (
            <>
              <div className="dx-page-heading">
                <div>
                  <p className="dx-eyebrow">Cada medición conserva su punto de partida</p>
                  <h1>Historial y recuperación</h1>
                  <p>{store.diagnoses.length} de 40 ejercicios en este navegador.</p>
                </div>
                <div className="dx-button-row">
                  {button(
                    "Exportar respaldo",
                    backup,
                    Download,
                    "secondary",
                    !store.diagnoses.length && !store.draft,
                  )}
                  {button(
                    "Importar JSON",
                    () => inputRef.current?.click(),
                    Upload,
                    "secondary",
                    blocked,
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,application/json"
                  className="dx-sr"
                  aria-label="Archivo de respaldo JSON"
                  onChange={(e) => void importFile(e.target.files?.[0])}
                />
              </div>
              <div className="dx-note">
                <Save size={20} />
                <p>
                  Los datos viven en este navegador y en este dispositivo. Limpiar sus datos,
                  cambiar de dirección web o usar otro navegador crea un espacio distinto. El JSON
                  es tu copia recuperable; el informe HTML y el CSV sirven para lectura.
                </p>
              </div>
              <div className="dx-history-examples">
                <span>Explorar otro caso ficticio</span>
                {EXAMPLES.map((example) => (
                  <button
                    type="button"
                    className="dx-btn dx-btn-secondary"
                    key={example.id}
                    disabled={blocked}
                    onClick={() => openExample(example.id)}
                  >
                    {example.alias.replace(" · ficticio", "")}
                    <Plus size={14} />
                  </button>
                ))}
              </div>
              {store.draft && (
                <div className="dx-draft-card">
                  <div>
                    <strong>Borrador: {store.draft.alias}</strong>
                    <p>
                      Paso {store.draft.step} de 6 · {Object.keys(store.draft.answers).length}/18
                      preguntas respondidas
                    </p>
                  </div>
                  {button(
                    "Retomar",
                    () => navigate("questionnaire"),
                    ArrowRight,
                    "secondary",
                    blocked,
                  )}
                </div>
              )}
              <div className="dx-history-list">
                {store.diagnoses.map((d) => {
                  const a = assess(d.answers);
                  return (
                    <article key={d.id}>
                      <div className="dx-history-score">
                        {a.score ?? "—"}
                        <small>/100</small>
                      </div>
                      <div>
                        <h2>{d.alias}</h2>
                        <p>
                          {dateLabel(d.createdAt)} · {d.sector} · Cobertura {a.coverage}%
                        </p>
                        <span className="dx-tag">
                          {d.mode === "example" ? "Caso ficticio" : "Ejercicio de prueba"}
                        </span>
                      </div>
                      <div className="dx-history-actions">
                        {button(
                          "Abrir",
                          () => {
                            setSelectedId(d.id);
                            navigate("overview");
                          },
                          ArrowUpRight,
                          "secondary",
                        )}
                        {button("Volver a medir", () => startNew(d), Plus, "quiet", blocked)}
                        <button
                          type="button"
                          className="dx-icon-btn"
                          aria-label={`Eliminar ${d.alias} del ${dateLabel(d.createdAt)}`}
                          onClick={() => removeDiagnosis(d)}
                          disabled={blocked}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!store.diagnoses.length && (
                <div className="dx-empty">
                  <FolderClock size={36} />
                  <h2>Todavía no hay mediciones.</h2>
                  <p>
                    Completa un diagnóstico o explora un caso ficticio para guardar tu primer
                    ejercicio.
                  </p>
                  {button("Comenzar diagnóstico", () => startNew(), Plus, "primary", blocked)}
                </div>
              )}
              {store.diagnoses.length > 1 && (
                <section className="dx-panel dx-comparison">
                  <div className="dx-section-heading">
                    <div>
                      <p className="dx-eyebrow">Antes y después, con contexto</p>
                      <h2>Comparar dos mediciones</h2>
                    </div>
                  </div>
                  <div className="dx-comparison-selects">
                    {[
                      { value: compareA, set: setCompareA, label: "Primera medición" },
                      { value: compareB, set: setCompareB, label: "Segunda medición" },
                    ].map((field) => (
                      <label key={field.label}>
                        {field.label}
                        <select value={field.value} onChange={(e) => field.set(e.target.value)}>
                          <option value="">Seleccionar…</option>
                          {store.diagnoses.map((d) => (
                            <option value={d.id} key={d.id}>
                              {d.alias} · {dateLabel(d.createdAt)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <Comparison
                    first={store.diagnoses.find((d) => d.id === compareA)}
                    second={store.diagnoses.find((d) => d.id === compareB)}
                  />
                </section>
              )}
            </>
          )}

          {view === "method" && <Method />}
          {(["plan", "simulation"] as View[]).includes(view) && !selected && (
            <div className="dx-empty">
              <ClipboardList size={36} />
              <h1>Primero, un punto de partida.</h1>
              <p>Completa el diagnóstico o utiliza un caso ficticio para explorar esta sección.</p>
              {button(
                "Explorar caso ficticio",
                () => openExample("taller"),
                ArrowRight,
                "primary",
                blocked,
              )}
            </div>
          )}
          <footer className="dx-module-footer">
            <span>INDOMINIA · Rúbrica operativa v1.0</span>
            <button type="button" onClick={() => navigate("method")}>
              Criterios visibles y límites
            </button>
            <span>Solo datos ficticios para esta demostración</span>
          </footer>
        </div>
      </div>
      {confirmation && (
        <dialog id="dx-confirm" className="dx-dialog" onCancel={() => setConfirmation(null)}>
          <div>
            <p className="dx-eyebrow">Revisa antes de continuar</p>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.body}</p>
            <div className="dx-button-row">
              <button
                type="button"
                className="dx-btn dx-btn-secondary"
                autoFocus
                onClick={() => setConfirmation(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`dx-btn dx-btn-${confirmation.dangerous ? "danger" : "primary"}`}
                onClick={() => {
                  const action = confirmation.action;
                  setConfirmation(null);
                  action();
                }}
              >
                {confirmation.label}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

function WeekPlan({ plan, capacity }: { plan: ReturnType<typeof schedule>; capacity: number }) {
  return (
    <div className="dx-weeks">
      {plan.used.map((used, i) => (
        <article key={i}>
          <div>
            <h3>Semana {i + 1}</h3>
            <span>
              {used}/{capacity} h
            </span>
          </div>
          <div className="dx-progress">
            <span style={{ width: `${(used / capacity) * 100}%` }} />
          </div>
          <ul>
            {plan.entries
              .filter((p) => p.week === i + 1)
              .map((p) => (
                <li key={p.action.id}>
                  {p.action.title}
                  <small>{p.action.effort} h estimadas</small>
                </li>
              ))}
          </ul>
          {!used && <p className="dx-fine">Capacidad disponible</p>}
        </article>
      ))}
    </div>
  );
}

function ActionCard({
  action,
  planned,
  blocked,
  onUpdate,
}: {
  action: Action;
  planned?: ReturnType<typeof schedule>["entries"][number] | undefined;
  blocked: boolean;
  onUpdate: (patch: Partial<TaskUpdate>) => void;
}) {
  const area = AREAS.find((a) => a.id === action.area)!;
  return (
    <article className={`dx-action-card ${action.status === "done" ? "dx-action-done" : ""}`}>
      <div className="dx-action-top">
        <span className="dx-tag">
          <i className={`dx-dot dx-color-${area.color}`} />
          {area.short}
        </span>
        <span className="dx-action-week">
          {action.status === "done" ? (
            <>
              <Check size={15} /> Hecha
            </>
          ) : planned?.week ? (
            `Semana ${planned.week}`
          ) : (
            "Sin programar"
          )}
        </span>
      </div>
      <h2>{action.title}</h2>
      <p>{action.reason}</p>
      <div className="dx-action-proof">
        <CheckCircle2 size={17} aria-hidden="true" />
        <p>
          <strong>Se comprueba con</strong>
          {action.doneWhen}
        </p>
      </div>
      <div className="dx-task-fields">
        <label>
          Estado
          <select
            value={action.status}
            disabled={blocked}
            onChange={(e) => onUpdate({ status: e.target.value as TaskUpdate["status"] })}
          >
            <option value="pending">Por hacer</option>
            <option value="doing">En curso</option>
            <option value="done">Hecho</option>
          </select>
        </label>
        <label>
          Rol responsable
          <select
            value={action.owner}
            disabled={blocked}
            onChange={(e) => onUpdate({ owner: e.target.value as TaskUpdate["owner"] })}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Esfuerzo estimado
          <select
            value={action.effort}
            disabled={blocked}
            onChange={(e) => onUpdate({ effort: Number(e.target.value) })}
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option value={n} key={n}>
                {n} h
              </option>
            ))}
          </select>
        </label>
      </div>
      {planned?.reason && action.status !== "done" && (
        <p className="dx-task-warning">
          <Clock3 size={15} />
          {planned.reason}
        </p>
      )}
      <details>
        <summary>
          Por qué aparece esta acción <Info size={14} />
        </summary>
        <div className="dx-trace">
          <p>
            <strong>Pregunta {action.id}:</strong> {action.source.title}
          </p>
          <p>
            <strong>Respuesta:</strong>{" "}
            {ANSWER_OPTIONS.find((o) => o.value === action.answer)!.label}. <strong>Peso:</strong>{" "}
            {action.source.importance}/3. <strong>Prioridad interna:</strong> {action.priority}.
          </p>
          {action.dependsOn.length > 0 && (
            <p>
              <strong>Antes de esta acción:</strong>{" "}
              {action.dependsOn.map((id) => QUESTIONS.find((q) => q.id === id)!.action).join("; ")}.
            </p>
          )}
          <p>
            Ordenar por prioridad no sustituye comprobar dependencias ni revisar la situación real.
          </p>
          <label>
            Nota de seguimiento · solo datos ficticios
            <textarea
              maxLength={200}
              value={action.note}
              disabled={blocked}
              onChange={(e) => onUpdate({ note: e.target.value })}
              placeholder="Qué comprobaste o qué falta por verificar"
            />
          </label>
        </div>
      </details>
    </article>
  );
}

function Wizard({
  draft,
  blocked,
  onChange,
  onStart,
  onFinish,
  onPause,
}: {
  draft: Draft | null;
  blocked: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onStart: () => void;
  onFinish: () => void;
  onPause: () => void;
}) {
  const [validation, setValidation] = useState("");
  const missingRef = useRef<HTMLParagraphElement>(null);
  const wizardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setValidation("");
    wizardRef.current?.focus({ preventScroll: true });
    wizardRef.current?.scrollIntoView?.({ block: "start" });
  }, [draft?.step]);
  if (!draft)
    return (
      <div className="dx-empty">
        <ClipboardList size={36} />
        <h1>Observa tu operación.</h1>
        <p>
          Responde sobre prácticas que puedas describir y comprobar. Puedes pausar y continuar en
          este navegador.
        </p>
        <button
          className="dx-btn dx-btn-primary"
          type="button"
          onClick={onStart}
          disabled={blocked}
        >
          Comenzar diagnóstico <ArrowRight size={17} />
        </button>
      </div>
    );
  const area = draft.step > 0 ? AREAS[draft.step - 1]! : null;
  const currentQuestions = area ? QUESTIONS.filter((q) => q.area === area.id) : [];
  const answered = Object.keys(draft.answers).length;
  function advance() {
    if (currentQuestions.some((q) => draft!.answers[q.id] === undefined)) {
      setValidation("Responde las tres preguntas. Si necesitas comprobar algo, elige «No lo sé».");
      requestAnimationFrame(() => missingRef.current?.focus());
      return;
    }
    if (draft!.step === 6) onFinish();
    else onChange({ step: draft!.step + 1 });
  }
  return (
    <section className="dx-wizard" ref={wizardRef} tabIndex={-1}>
      <div className="dx-page-heading">
        <div>
          <p className="dx-eyebrow">Tu punto de partida</p>
          <h1>{area ? area.title : "Antes de empezar"}</h1>
          <p>
            {area ? area.description : "Usa un alias ficticio y elige el contexto del ejercicio."}
          </p>
        </div>
        <span className="dx-tag">
          {draft.step ? `Paso ${draft.step} de 6` : "Contexto del ejercicio"}
        </span>
      </div>
      <div className="dx-wizard-progress">
        <div className="dx-progress">
          <span style={{ width: `${(answered / 18) * 100}%` }} />
        </div>
        <span>{answered}/18 respuestas</span>
      </div>
      <nav className="dx-stepper" aria-label="Pasos del cuestionario">
        <ol>
          {AREAS.map((a, i) => (
            <li
              key={a.id}
              className={
                draft.step === i + 1
                  ? "dx-step-active"
                  : QUESTIONS.filter((q) => q.area === a.id).every(
                        (q) => draft.answers[q.id] !== undefined,
                      )
                    ? "dx-step-complete"
                    : ""
              }
            >
              <span>{i + 1}</span>
              <small>{a.short}</small>
            </li>
          ))}
        </ol>
      </nav>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.step) {
            if (!draft.alias.trim()) {
              setValidation("Escribe un alias ficticio para reconocer este ejercicio.");
              return;
            }
            onChange({ alias: draft.alias.trim(), step: 1 });
          } else advance();
        }}
      >
        {!draft.step ? (
          <div className="dx-panel dx-profile-form">
            <label>
              Alias del ejercicio
              <input
                value={draft.alias}
                maxLength={60}
                required
                disabled={blocked}
                onChange={(e) => onChange({ alias: e.target.value })}
                autoComplete="off"
                placeholder="Ejemplo: Taller de prueba"
              />
              <small>No escribas nombres personales, correos ni datos de clientes.</small>
            </label>
            <div className="dx-form-grid">
              <label>
                Actividad
                <select
                  value={draft.sector}
                  disabled={blocked}
                  onChange={(e) => onChange({ sector: e.target.value as Draft["sector"] })}
                >
                  {SECTORS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Tamaño del equipo
                <select
                  value={draft.teamSize}
                  disabled={blocked}
                  onChange={(e) => onChange({ teamSize: e.target.value as Draft["teamSize"] })}
                >
                  {TEAM_SIZES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Qué quieres ordenar primero
              <select
                value={draft.goal}
                disabled={blocked}
                onChange={(e) => onChange({ goal: e.target.value as Draft["goal"] })}
              >
                {GOALS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Capacidad semanal para mejoras · {draft.capacity} horas
              <input
                type="range"
                min="2"
                max="20"
                value={draft.capacity}
                disabled={blocked}
                onChange={(e) => onChange({ capacity: Number(e.target.value) })}
              />
              <small>
                Es una estimación de tiempo disponible, no un compromiso. Podrás cambiarla después.
              </small>
            </label>
            <div className="dx-note">
              <ShieldCheck size={20} />
              <p>
                Las respuestas se guardan solo en este navegador. No envíes información personal o
                confidencial. Este ejercicio orienta la organización de la operación y no determina
                obligaciones ni cumplimiento.
              </p>
            </div>
          </div>
        ) : (
          <div className="dx-questions">
            {currentQuestions.map((q, index) => (
              <fieldset key={q.id} className="dx-question" aria-describedby={`${q.id}-evidence`}>
                <legend>
                  <span>{String((draft.step - 1) * 3 + index + 1).padStart(2, "0")}</span>
                  {q.title}
                </legend>
                <p id={`${q.id}-evidence`} className="dx-question-evidence">
                  Evidencia que podrías comprobar: {q.evidence}
                </p>
                <div className="dx-answer-options">
                  {ANSWER_OPTIONS.map((option) => (
                    <label
                      key={String(option.value)}
                      className={
                        draft.answers[q.id] === option.value
                          ? "dx-option dx-option-selected"
                          : "dx-option"
                      }
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={String(option.value)}
                        checked={draft.answers[q.id] === option.value}
                        disabled={blocked}
                        onChange={() =>
                          onChange({ answers: { ...draft.answers, [q.id]: option.value } })
                        }
                      />
                      <span className="dx-option-label">
                        {option.label}
                        {draft.answers[q.id] === option.value && <Check size={14} />}
                      </span>
                      <small>{option.detail}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
        {validation && (
          <p className="dx-form-error" ref={missingRef} tabIndex={-1} role="alert">
            {validation}
          </p>
        )}
        <div className="dx-wizard-actions">
          <div>
            {draft.step > 0 && (
              <button
                className="dx-btn dx-btn-secondary"
                type="button"
                onClick={() => onChange({ step: draft.step - 1 })}
                disabled={blocked}
              >
                <ChevronLeft size={17} />
                Anterior
              </button>
            )}
            <button className="dx-btn dx-btn-quiet" type="button" onClick={onPause}>
              Guardar y pausar <Save size={16} />
            </button>
          </div>
          <button className="dx-btn dx-btn-primary" type="submit" disabled={blocked}>
            {draft.step === 6
              ? "Generar diagnóstico"
              : draft.step
                ? "Siguiente área"
                : "Comenzar las preguntas"}
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
      <p className="dx-fine dx-wizard-fine">
        «No lo sé» conserva la incertidumbre. Se propondrá una comprobación y esa respuesta quedará
        fuera del indicador.
      </p>
    </section>
  );
}

function Simulation({
  diagnosis,
  selectedIds,
  onSelected,
  onPlan,
}: {
  diagnosis: Diagnosis;
  selectedIds: string[];
  onSelected: (ids: string[]) => void;
  onPlan: () => void;
}) {
  const original = assess(diagnosis.answers);
  const hypothetical = simulate(diagnosis, selectedIds);
  const candidates = actionsFor(diagnosis).filter((a) => !a.verification);
  const delta =
    original.score !== null && hypothetical.score !== null
      ? hypothetical.score - original.score
      : null;
  return (
    <>
      <div className="dx-page-heading">
        <div>
          <p className="dx-eyebrow">Explora antes de cambiar tu plan</p>
          <h1>¿Qué cambiaría si…?</h1>
          <p>
            Selecciona prácticas que supondrías consistentes. La medición guardada permanece
            intacta.
          </p>
        </div>
        <span className="dx-tag dx-tag-amber">Escenario hipotético</span>
      </div>
      <div className="dx-simulation-grid">
        <section className="dx-panel dx-simulation-result">
          <h2>Una hipótesis visible</h2>
          <div className="dx-simulation-rings">
            <div>
              <ScoreRing score={original.score} label="Medición original" compact />
            </div>
            <ArrowRight size={24} aria-hidden="true" />
            <div>
              <ScoreRing score={hypothetical.score} label="Respuestas hipotéticas" compact />
            </div>
          </div>
          <div className="dx-simulation-delta">
            <strong>{delta === null ? "—" : `+${delta}`}</strong>
            <span>puntos en la rúbrica interna</span>
          </div>
          <p>
            {selectedIds.length
              ? `Si ${selectedIds.length === 1 ? "la práctica seleccionada pasara" : `las ${selectedIds.length} prácticas seleccionadas pasaran`} al nivel «Consistente», el indicador sería ${hypothetical.score ?? "desconocido"}/100 con la misma información conocida.`
              : "Elige una práctica para ver cómo afecta al cálculo."}
          </p>
          <div className="dx-note dx-note-amber">
            <Info size={18} />
            <p>
              Este cambio es matemático y depende del supuesto elegido. No predice ahorros,
              ingresos, cumplimiento ni mejoras reales. Las respuestas desconocidas necesitan
              evidencia y no se simulan como confirmadas.
            </p>
          </div>
          <button
            className="dx-btn dx-btn-secondary"
            type="button"
            onClick={() => onSelected([])}
            disabled={!selectedIds.length}
          >
            Restablecer escenario <RotateCcw size={16} />
          </button>
        </section>
        <section className="dx-panel dx-simulation-choices">
          <div className="dx-panel-top">
            <h2>Prácticas que supondrías mejoradas</h2>
            <span>{selectedIds.length} seleccionadas</span>
          </div>
          {candidates.map((a) => (
            <label key={a.id} className="dx-simulation-option">
              <input
                type="checkbox"
                checked={selectedIds.includes(a.id)}
                onChange={(e) =>
                  onSelected(
                    e.target.checked
                      ? [...selectedIds, a.id]
                      : selectedIds.filter((id) => id !== a.id),
                  )
                }
              />
              <span>
                <strong>{a.title}</strong>
                <small>
                  Hoy: {ANSWER_OPTIONS.find((o) => o.value === a.answer)!.label} · Supuesto:
                  Consistente
                </small>
              </span>
            </label>
          ))}
          {!candidates.length && (
            <p className="dx-muted">
              Las prácticas conocidas ya se reportaron como consistentes. Conserva evidencia y
              verifica las respuestas desconocidas antes de asumir cambios.
            </p>
          )}
        </section>
      </div>
      <section className="dx-next-decision">
        <div>
          <p className="dx-eyebrow">La simulación no es una nueva medición</p>
          <h2>Decide qué vale la pena comprobar.</h2>
          <p>Vuelve al plan, prueba una mejora y registra otra medición cuando tengas evidencia.</p>
        </div>
        <button className="dx-btn dx-btn-inverse" type="button" onClick={onPlan}>
          Volver a mi plan <ArrowRight size={18} />
        </button>
      </section>
    </>
  );
}

function Comparison({
  first,
  second,
}: {
  first?: Diagnosis | undefined;
  second?: Diagnosis | undefined;
}) {
  if (!first || !second)
    return (
      <p className="dx-fine">
        Elige dos mediciones del mismo alias. Comprueba que corresponden al mismo ejercicio antes de
        interpretar diferencias.
      </p>
    );
  if (first.id === second.id)
    return <p className="dx-task-warning">Selecciona dos mediciones distintas.</p>;
  if (
    first.alias.trim().toLocaleLowerCase("es-MX") !== second.alias.trim().toLocaleLowerCase("es-MX")
  )
    return (
      <p className="dx-task-warning">
        Los alias son distintos. Selecciona mediciones del mismo ejercicio para evitar una
        comparación engañosa.
      </p>
    );
  const a = assess(first.answers);
  const b = assess(second.answers);
  const comparable = QUESTIONS.every(
    (q) => (first.answers[q.id] === "unknown") === (second.answers[q.id] === "unknown"),
  );
  return (
    <>
      <div className="dx-comparison-summary">
        <p>
          <strong>
            {a.score ?? "—"} → {b.score ?? "—"}
          </strong>
          <span>Indicador operativo</span>
        </p>
        <p>
          <strong>
            {a.coverage}% → {b.coverage}%
          </strong>
          <span>Cobertura de información</span>
        </p>
        <p>
          <strong>
            {comparable && a.score !== null && b.score !== null
              ? `${b.score - a.score > 0 ? "+" : ""}${b.score - a.score}`
              : "Revisar"}
          </strong>
          <span>{comparable ? "Diferencia en puntos" : "Cambió la información conocida"}</span>
        </p>
      </div>
      {!comparable && (
        <p className="dx-note-amber dx-comparison-warning">
          Las preguntas conocidas cambiaron. Una diferencia en el indicador puede deberse a esa
          cobertura; revisa las respuestas antes de atribuirla a mejoras.
        </p>
      )}
      <div className="dx-table-scroll">
        <table className="dx-data-table">
          <thead>
            <tr>
              <th>Área</th>
              <th>Primera medición</th>
              <th>Segunda medición</th>
            </tr>
          </thead>
          <tbody>
            {AREAS.map((area) => (
              <tr key={area.id}>
                <th scope="row">{area.title}</th>
                <td>{a.areas.find((x) => x.id === area.id)!.score ?? "Sin información"}</td>
                <td>{b.areas.find((x) => x.id === area.id)!.score ?? "Sin información"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Method() {
  return (
    <section className="dx-method">
      <div className="dx-page-heading">
        <div>
          <p className="dx-eyebrow">Rúbrica operativa v1.0</p>
          <h1>Puedes revisar cada criterio.</h1>
          <p>
            El resultado se puede reproducir con las respuestas, los pesos y las reglas que aparecen
            aquí.
          </p>
        </div>
        <span className="dx-tag">Sin criterios ocultos</span>
      </div>
      <div className="dx-method-grid">
        <article className="dx-panel">
          <span className="dx-method-number">01</span>
          <h2>Lo que mide</h2>
          <p>
            Describe prácticas operativas declaradas en seis áreas. El sector, tamaño y objetivo
            contextualizan el ejercicio; no cambian los pesos ni añaden supuestas obligaciones.
          </p>
          <p>
            Los pesos son decisiones de esta rúbrica interna. No hay comparación con otras empresas
            ni validación estadística. Una puntuación alta con poca información debe revisarse con
            cautela.
          </p>
        </article>
        <article className="dx-panel">
          <span className="dx-method-number">02</span>
          <h2>Lo que conserva como desconocido</h2>
          <p>
            «No lo sé» queda fuera del indicador y reduce la cobertura. Genera una acción para
            comprobar evidencia. No se trata como una práctica inexistente ni como una práctica
            cumplida.
          </p>
          <p>
            Una pregunta sin responder impide generar el diagnóstico. El sistema no completa
            respuestas por ti.
          </p>
        </article>
      </div>
      <section className="dx-panel dx-formula">
        <h2>Cómo se calcula</h2>
        <div>
          <span>Indicador operativo</span>
          <code>100 × Σ(respuesta × peso) / Σ(3 × peso)</code>
        </div>
        <p>
          Se incluyen solo preguntas conocidas y se redondea al entero más cercano. Respuestas: No
          existe = 0; Informal = 1; Parcial = 2; Consistente = 3. Si todas son desconocidas, no se
          muestra un indicador.
        </p>
        <div>
          <span>Prioridad de una acción</span>
          <code>100 × brecha × peso / (3 × horas estimadas)</code>
        </div>
        <p>
          Brecha = 3 − respuesta. Para una práctica desconocida se propone verificar: brecha de
          ordenación = 1 y esfuerzo inicial = 1 hora. La prioridad es un criterio de orden, no una
          urgencia normativa. Cambiar esfuerzo puede cambiar el orden.
        </p>
        <div>
          <span>Estado orientativo</span>
          <code>Cobertura menor a 67% → Por verificar</code>
        </div>
        <p>
          Con cobertura suficiente: indicador menor a 35 → Requiere orden; de 35 a 64 → En
          construcción; de 65 a 100 → Base consistente. Son umbrales internos, no una certificación.
        </p>
      </section>
      <section className="dx-panel">
        <h2>Qué cambia y qué se conserva</h2>
        <ul className="dx-method-list">
          <li>
            <strong>Plan:</strong> propone hasta cuatro semanas con la capacidad declarada y las
            dependencias explícitas. Una acción mayor que la capacidad semanal necesita dividirse o
            reestimarse. Las horas son estimaciones editables.
          </li>
          <li>
            <strong>Avances:</strong> marcar una acción como hecha registra una declaración del
            usuario. No verifica automáticamente la evidencia ni cambia las respuestas originales.
          </li>
          <li>
            <strong>Simulador:</strong> sustituye temporalmente las respuestas conocidas
            seleccionadas por 3. No guarda esas respuestas como una medición ni predice resultados
            reales.
          </li>
          <li>
            <strong>Historial:</strong> conserva mediciones y avances localmente. Se comparan
            ejercicios del mismo alias y se avisa cuando cambia la cobertura. El JSON permite
            trasladar los registros; no hay cuentas ni sincronización.
          </li>
          <li>
            <strong>Recuperación:</strong> antes de escribir se conserva la versión anterior y se
            comprueba la escritura. Si otra pestaña cambia los datos o una copia no se puede leer,
            se detiene el guardado. Esto no sustituye exportar un respaldo ni ofrece edición
            simultánea entre usuarios.
          </li>
        </ul>
      </section>
      <section className="dx-panel">
        <h2>Pesos, esfuerzo inicial y dependencias</h2>
        <div className="dx-table-scroll">
          <table className="dx-data-table">
            <thead>
              <tr>
                <th>Práctica</th>
                <th>Peso</th>
                <th>Horas</th>
                <th>Requiere antes</th>
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map((q) => (
                <tr key={q.id}>
                  <th scope="row">
                    <small>{q.id}</small>
                    {q.action}
                  </th>
                  <td>{q.importance}</td>
                  <td>{q.effort}</td>
                  <td>{q.dependsOn.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dx-fine">
          La dependencia se programa si esa práctica también necesita una acción. Una acción ya
          marcada como hecha libera esa dependencia. Para respuestas desconocidas, la primera tarea
          es comprobar.
        </p>
      </section>
      <div className="dx-note">
        <ShieldCheck size={22} />
        <p>
          La demostración utiliza datos ficticios. El módulo no decide obligaciones, cumplimiento,
          solvencia ni estrategias jurídicas, fiscales, contables, financieras o PLD/FT. Para esas
          materias se necesita un análisis especializado con hechos y fuentes vigentes.
        </p>
      </div>
      <p className="dx-fine">
        Desarrollo del módulo mediante Codex, por instrucciones e iteraciones en lenguaje natural.
        El análisis durante el uso aplica reglas visibles y no realiza llamadas a modelos de IA. No
        se usa Lovable para desarrollar este módulo.
      </p>
    </section>
  );
}
