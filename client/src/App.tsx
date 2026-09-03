import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Consent } from "./pages/Consent";
import { Prequalify } from "./pages/Prequalify";
import { Status } from "./pages/Status";
import { Dashboard } from "./pages/Dashboard";
import { LoanDetail } from "./pages/LoanDetail";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/apply/consent" element={<Consent />} />
        <Route path="/apply/prequalify" element={<Prequalify />} />
        <Route path="/apply/status/:loanId" element={<Status />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/loans/:loanId" element={<LoanDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
