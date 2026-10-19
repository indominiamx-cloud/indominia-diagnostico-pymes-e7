import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
// Publish only the assets used by this module, not the site's full public folder.
const diagnosticPublic = path.join(projectRoot, ".qa", "public-diagnostico");
mkdirSync(path.join(diagnosticPublic, "brand"), { recursive: true });
for (const asset of [
  "favicon.svg",
  "brand/indominia-horizontal.svg",
  "brand/indominia-horizontal-negative.svg",
  "brand/trama-nexo-protagonista.svg",
]) {
  copyFileSync(path.join(projectRoot, "public", asset), path.join(diagnosticPublic, asset));
}
export default defineConfig({
  root: fileURLToPath(new URL("./src/diagnostico-standalone", import.meta.url)),
  publicDir: diagnosticPublic,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": `${projectRoot}src` } },
  server: { host: "127.0.0.1", port: 5179, strictPort: true },
  build: { outDir: `${projectRoot}dist-diagnostico`, emptyOutDir: true },
});
