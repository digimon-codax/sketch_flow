import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

window.onerror = function(msg, src, lineno, colno, error) {
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;"><h2>Runtime Error:</h2><p>${msg}</p><pre>${error?.stack}</pre></div>`;
};
window.onunhandledrejection = function(event) {
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;"><h2>Unhandled Promise Rejection:</h2><p>${event.reason}</p><pre>${event.reason?.stack}</pre></div>`;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
