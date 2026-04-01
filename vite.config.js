import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
