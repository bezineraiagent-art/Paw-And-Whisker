import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setSessionId } from "@workspace/api-client-react";

function getOrCreateSessionId(): string {
  const key = "paw_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

setSessionId(getOrCreateSessionId());

createRoot(document.getElementById("root")!).render(<App />);
