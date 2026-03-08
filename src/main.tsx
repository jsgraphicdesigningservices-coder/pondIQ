import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Firebase is initialized in src/lib/firebase.ts and imported where needed

createRoot(document.getElementById("root")!).render(<App />);
