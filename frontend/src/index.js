import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { installSameOriginRewrite } from "./api/sameOriginRewrite";
import App from "./App";

// Must run BEFORE any module imports trigger a request: rewrites all
// cross-origin /api calls to same-origin when the page is served from
// a custom domain (e.g. homemeapp.net) whose ingress already proxies /api.
installSameOriginRewrite();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
