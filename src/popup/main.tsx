import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../index.css";
import { syncSystemTheme } from "../lib/theme";
import { PopupApp } from "./PopupApp";

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("Popup root element is missing.");
}

syncSystemTheme();

createRoot(rootElement).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
);
