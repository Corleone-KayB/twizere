import { Link, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useLoansSocketContext } from "../context/LoansSocketContext";

export function Layout() {
  const { theme, toggle } = useTheme();
  const { status } = useLoansSocketContext();
  const location = useLocation();
  const onBank = location.pathname.startsWith("/dashboard");

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" />
          Twizere
          <span className="pill-demo">HACKATHON DEMO</span>
        </Link>
        <div className="topbar-right">
          <span className="socket-status" title={`Live updates: ${status}`}>
            <span className={`socket-dot ${status}`} />
            {status === "open" ? "live" : status === "connecting" ? "connecting" : "offline"}
          </span>
          <nav className="roletabs">
            <Link to="/" className={`roletab ${!onBank ? "active" : ""}`}>
              Applicant
            </Link>
            <Link to="/dashboard" className={`roletab ${onBank ? "active" : ""}`}>
              Bank dashboard
            </Link>
          </nav>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <main className="view">
        <Outlet />
      </main>

      <div className="foot">
        Simulated applicant &amp; transaction data throughout — no real MTN or Airtel account is
        accessed by this demo.
      </div>
    </div>
  );
}
