import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [tailwindcss()],
  publicDir: "static",
  build: {
    outDir: "public",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        datenschutz: resolve(import.meta.dirname, "datenschutzerklaerung.html")
      }
    }
  },
  server: {
    port: Number(process.env.PORT) || 9090,
    open: true
  }
});
