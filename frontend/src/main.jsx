import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LiveDataProvider } from "./context/LiveDataContext.jsx";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LiveDataProvider>
      <App />
    </LiveDataProvider>
  </StrictMode>
);