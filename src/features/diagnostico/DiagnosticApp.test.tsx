import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DiagnosticApp } from "./DiagnosticApp";
import { EMPTY_STORE, exampleDiagnosis } from "./model";
import { STORAGE_KEY, saveStore } from "./storage";

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("recorridos del diagnóstico", () => {
  it("permite editar un alias vacío en el borrador sin inventar respuestas", () => {
    render(<DiagnosticApp />);
    fireEvent.click(screen.getByRole("button", { name: "Comenzar diagnóstico" }));
    const alias = screen.getByRole("textbox", { name: /Alias del ejercicio/ });
    fireEvent.change(alias, { target: { value: "" } });
    expect(alias).toHaveValue("");
    fireEvent.change(alias, { target: { value: "Caso de prueba" } });
    fireEvent.click(screen.getByRole("button", { name: "Comenzar las preguntas" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente área" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Responde las tres preguntas");
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });
  it("conserva capacidad y estado de una acción tras desmontar y volver a cargar", () => {
    const diagnosis = exampleDiagnosis("taller");
    saveStore(window.localStorage, 0, { ...EMPTY_STORE, diagnoses: [diagnosis] });
    const first = render(<DiagnosticApp />);
    fireEvent.click(screen.getByRole("button", { name: /Plan de acción/ }));
    fireEvent.change(screen.getByRole("slider", { name: "Capacidad semanal para estas mejoras" }), {
      target: { value: "3" },
    });
    const card = screen
      .getByRole("heading", { name: "Unificar el registro de cobros" })
      .closest("article")!;
    fireEvent.change(within(card).getByRole("combobox", { name: "Estado" }), {
      target: { value: "doing" },
    });
    first.unmount();
    render(<DiagnosticApp />);
    fireEvent.click(screen.getByRole("button", { name: /Plan de acción/ }));
    expect(
      screen.getByRole("slider", { name: "Capacidad semanal para estas mejoras" }),
    ).toHaveValue("3");
    const restored = screen
      .getByRole("heading", { name: "Unificar el registro de cobros" })
      .closest("article")!;
    expect(within(restored).getByRole("combobox", { name: "Estado" })).toHaveValue("doing");
  });
  it("la simulación cambia solo el escenario y no escribe respuestas", () => {
    saveStore(window.localStorage, 0, { ...EMPTY_STORE, diagnoses: [exampleDiagnosis("taller")] });
    render(<DiagnosticApp />);
    fireEvent.click(screen.getByRole("button", { name: "Simulador" }));
    const before = window.localStorage.getItem(STORAGE_KEY);
    fireEvent.click(screen.getByRole("checkbox", { name: /Unificar el registro de cobros/ }));
    expect(screen.getByText(/la práctica seleccionada pasara/)).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it("maneja el acceso al almacenamiento denegado sin dejar una pantalla vacía", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<DiagnosticApp />);
    expect(screen.getByRole("alert")).toHaveTextContent("El navegador impide acceder");
    expect(screen.getByRole("button", { name: "Comenzar diagnóstico" })).toBeDisabled();
  });
});
