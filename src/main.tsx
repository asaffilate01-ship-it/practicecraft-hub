import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearLegacySupabaseResponseCache } from "./lib/legacyApiCache";

// Clean up authenticated response caches left behind by older service workers.
void clearLegacySupabaseResponseCache();

createRoot(document.getElementById("root")!).render(<App />);
