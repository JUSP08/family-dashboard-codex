import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { installDeploymentRefresh } from "./deploymentRefresh";

if (import.meta.env.PROD) {
  // Defined by Vite and shared with the deployed version.json.
  // eslint-disable-next-line no-undef
  installDeploymentRefresh(window, document, __DASHBOARD_BUILD_ID__);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
