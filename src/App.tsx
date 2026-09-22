import { useEffect, useRef, useState } from "react";
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
        <GoogleMap />
        <div className="map-empty-state"><Database size={34} /><h2>No live site data</h2><p>Site markers will appear after the NOC database is connected.</p></div>
        <div className="empty-card-row">
          {["Total Sites","On-Air","At-Risk","Off-Air"].map(label => <div className="empty-kpi" key={label}><RadioTower size={17}/><span>{label}</span><strong>—</strong></div>)}
        </div>
      </section>
    </main>
  );
}

function GoogleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setError("Google Maps API key is not available to the build."); return; }
    const initialize = () => {
      if (!mapRef.current || !window.google?.maps) return;
      new window.google.maps.Map(mapRef.current, { center: { lat: 23.8859, lng: 45.0792 }, zoom: 5, mapTypeId: "roadmap", streetViewControl: false, fullscreenControl: true });
    };
    if (window.google?.maps) { initialize(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true; script.onload = initialize;
    script.onerror = () => setError("Google Maps could not be loaded.");
    document.head.appendChild(script);
    return () => { script.onload = null; script.onerror = null; };
  }, []);
  return <div className="map-frame">{error ? <div className="map-error">{error}</div> : <div ref={mapRef} className="google-map" />}</div>;
}

declare global { interface Window { google?: { maps: { Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown } } } }

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("national_day_session") === "preview");
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;
  return <EmptyDashboard onLogout={() => { sessionStorage.removeItem("national_day_session"); setAuthenticated(false); }} />;
}
