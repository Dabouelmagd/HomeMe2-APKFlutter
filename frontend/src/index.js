import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
// StrictMode disabled: it double-mounts components in development which caused
// duplicate axios interceptor registrations and made login() hang on the
// response. Re-enable only after migrating interceptor setup outside the
// React component lifecycle (see /app/frontend/src/api/ refactor TODO).
root.render(<App />);
