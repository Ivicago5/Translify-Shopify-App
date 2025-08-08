import { defineConfig, loadEnv } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };

  const host = process.env.HOST
    ? process.env.HOST.replace(/https?:\/\//, "")
    : "localhost";

  let hmrConfig;
  if (host === "localhost") {
    hmrConfig = {
      protocol: "ws",
      host: "localhost",
      port: 64999,
      clientPort: 64999,
    };
  } else {
    hmrConfig = {
      protocol: "wss",
      host: host,
      port: process.env.FRONTEND_PORT,
      clientPort: 443,
    };
  }

  const proxyOptions = {
    target: `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`,
    changeOrigin: false,
    secure: true,
    ws: false,
  };

  return {
    root: dirname(fileURLToPath(import.meta.url)),
    plugins: [react()],
    resolve: {
      preserveSymlinks: true,
    },
    server: {
      host: "localhost",
      port: process.env.FRONTEND_PORT || 5173,
      hmr: hmrConfig,
      proxy: {
        "^/api(/|(\\?.*)?$)": proxyOptions,
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.SHOPIFY_API_KEY': JSON.stringify(process.env.SHOPIFY_API_KEY),
    }
  };
});
