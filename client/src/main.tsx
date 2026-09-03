import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { ApplicantProvider } from "./context/ApplicantContext";
import { LoansSocketProvider } from "./context/LoansSocketContext";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <LoansSocketProvider>
        <ApplicantProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ApplicantProvider>
      </LoansSocketProvider>
    </ThemeProvider>
  </React.StrictMode>
);
