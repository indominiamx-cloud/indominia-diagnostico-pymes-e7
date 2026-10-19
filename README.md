# INDOMINIA — Diagnóstico operativo para PyMEs

Aplicación nueva desarrollada el 19 de octubre de 2026 con Codex para el Hackathon de Vibe Coding E7. Esta copia de evaluación contiene únicamente el módulo; su lógica, pantallas y pruebas coinciden por SHA-256 con los archivos de la rama de desarrollo del proyecto INDOMINIA. El manifiesto identifica los archivos de origen.

## Qué permite hacer

- Responder 18 preguntas en seis áreas, distinguiendo prácticas inexistentes, informales, parciales, consistentes y desconocidas.
- Consultar un resultado con cobertura y prioridades trazables.
- Editar roles, esfuerzo y avances, y organizar cuatro semanas bajo una capacidad declarada.
- Explorar hipótesis sin cambiar la medición guardada.
- Comparar mediciones, exportar informes y CSV, y recuperar registros desde JSON.

## Ejecutar

Node.js verificado: 24.15.0.

```text
npm ci
npm run dev
```

Abrir la dirección Local de Vite. Para compilar: `npm run build`. Para verificar: `npm test` y `npm run typecheck`. No requiere claves ni base de datos externa. No abrir el HTML mediante file://.

## Datos y límites

Usar solamente datos ficticios en esta demostración. Los registros permanecen en el navegador del visitante, sin cuentas ni sincronización. Exportar el respaldo JSON para conservarlos fuera de ese navegador. El indicador es una rúbrica operativa interna, sin benchmarking ni certificación. No determina cumplimiento, solvencia, obligaciones ni resultados futuros. El simulador aplica supuestos visibles; no utiliza un modelo de IA en ejecución.

## Origen y alcance

El módulo se desarrolló con Codex en una rama aislada y también se integró en una pestaña del sitio INDOMINIA. El sitio comercial tuvo desarrollo previo con Lovable y Codex, pero no forma parte funcional de esta copia. Se reutilizan los tokens y logotipos institucionales autorizados como activos de marca. La nueva funcionalidad y su historial de instrucciones corresponden al 19 de octubre.

El código y los activos pertenecen a su titular; esta publicación no añade una licencia general sobre la identidad corporativa.
