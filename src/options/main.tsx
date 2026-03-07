import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../index.css";
import { syncSystemTheme } from "../lib/theme";
import { OptionsApp } from "./OptionsApp";

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("Options root element is missing.");
}

syncSystemTheme();

createRoot(rootElement).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
);
