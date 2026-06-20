import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const groqApiKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || "";

  return {
    appType: "spa",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.GROQ_API_KEY": JSON.stringify(groqApiKey),
    },
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
  };
});
