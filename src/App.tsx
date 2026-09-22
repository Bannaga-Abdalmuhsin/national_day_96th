import { useEffect, useState } from "react";
import { Clock3, Database, LogOut, RadioTower } from "lucide-react";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    sessionStorage.setItem("national_day_session", "preview");
    onLogin();
  }
  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true"><div className="orb orb-one" /><div className="orb orb-two" /></div>
      <section className="login-wrap">
        <div className="event-brand">
          <span className="saudi-flag" role="img" aria-label="Saudi Arabia flag">🇸🇦</span>
          <h1>National Day 96th</h1>
        </div>
        <form className="login-card" onSubmit={submit}>
          <h2>Login</h2>
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          <button type="submit">Sign In</button>
        </form>
      </section>
    </main>
  );
}

function EmptyDashboard({ onLogout }: { onLogout: () => void }) {
  const now = useClock();
  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}stc-logo.svg`} className="stc-logo" alt="stc" />
        <div className="date-card"><Clock3 size={15} /><div><strong>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong><span>{now.toLocaleTimeString("en-GB")}</span></div></div>
        <div className="title-block"><span>96th Saudi National Day</span><h1>COW Sites Monitoring Control Room</h1></div>
        <div className="connection-pill"><i /> AWAITING NOC DATA</div>
        <img src={`${import.meta.env.BASE_URL}aces-logo.svg`} className="aces-logo" alt="ACES" />
        <button className="icon-button" title="Sign out" onClick={onLogout}><LogOut size={17} /></button>
      </header>
      <section className="empty-dashboard">
        <div className="empty-panel"><Database size={42} /><h2>No live data connected</h2><p>The monitoring layout is ready for the live NOC database connection.</p></div>
        <div className="empty-card-row">
          {["Total Sites","On-Air","At-Risk","Off-Air"].map(label => <div className="empty-kpi" key={label}><RadioTower size={17}/><span>{label}</span><strong>—</strong></div>)}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("national_day_session") === "preview");
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;
  return <EmptyDashboard onLogout={() => { sessionStorage.removeItem("national_day_session"); setAuthenticated(false); }} />;
}
