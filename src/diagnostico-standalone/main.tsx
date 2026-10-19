import React from "react";
import { createRoot } from "react-dom/client";
import { DiagnosticApp } from "../features/diagnostico/DiagnosticApp";
import "../features/diagnostico/base.css";

function Standalone() {
  return (
    <>
      <a href="#contenido" className="dx-skip">
        Saltar al diagnóstico
      </a>
      <header className="dx-standalone-header">
        <div>
          <a href="/" aria-label="INDOMINIA, inicio de la demostración">
            <img
              src="/brand/indominia-horizontal.svg"
              width="220"
              height="40"
              alt="INDOMINIA · Consultoría multidisciplinaria"
            />
          </a>
          <nav aria-label="Principal">
            <a href="/" aria-current="page">
              Diagnóstico operativo para PyMEs
            </a>
          </nav>
          <span className="dx-tag">Demostración · datos ficticios</span>
        </div>
      </header>
      <main id="contenido">
        <DiagnosticApp />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Standalone />
  </React.StrictMode>,
);
