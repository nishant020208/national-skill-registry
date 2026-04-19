import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// SPA fallback: if 404.html redirected here with a preserved path, restore it
// before React Router mounts so the user lands on their original route.
(() => {
  try {
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get("spa_redirect");
    if (redirect && redirect.startsWith("/")) {
      window.history.replaceState(null, "", redirect);
    }
  } catch {
    // no-op
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
