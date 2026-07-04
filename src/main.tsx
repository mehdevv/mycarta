import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { initErudaDebug } from "./lib/eruda-debug";
import "./index.css";

void initErudaDebug().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
});
