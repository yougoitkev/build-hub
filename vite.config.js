import { defineConfig } from "vite";
import { fileURLToPath } from "url";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/TMS/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/backend_Tms": {
        target: "https://da.apps.nttdataservices.com",
        changeOrigin: true,
        secure: false,
      },
      // Backward compatibility for anything still using /backend
      "/backend": {
        target: "https://da.apps.nttdataservices.com/backend_Tms",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/backend/, ""),
      },
      "/api/reports/local": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
