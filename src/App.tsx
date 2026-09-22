import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, LogOut, MapPin, RadioTower, Search, ShieldCheck, Zap } from "lucide-react";
import { incidents, sites, type Site, type SiteStatus } from "./data";

const statusColor: Record<SiteStatus, string> = {
  "ON-AIR": "#38d4ff",
  "AT-RISK": "#f5b942",
  "OFF-AIR": "#ef4444",
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function SitePin({ site, selected, onSelect }: { site: Site; selected: boolean; onSelect: () => void }) {
  return (
    <button
      className={`site-pin ${selected ? "selected" : ""}`}
      style={{ left: `${site.x}%`, top: `${site.y}%`, "--pin": statusColor[site.status] } as React.CSSProperties}
      onClick={onSelect}
      aria-label={`${site.id} ${site.status}`}
    >
      <RadioTower size={18} />
      <span>{site.id.replace("COW-", "")}</span>
    </button>
  );
}

export default function App() {
  const now = useClock();
  const [city, setCity] = useState("All Cities");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Site | null>(null);
  const [status, setStatus] = useState<"All" | SiteStatus>("All");

  const filtered = useMemo(() => sites.filter(site =>
    (city === "All Cities" || site.city === city) &&
    (status === "All" || site.status === status) &&
    site.id.toLowerCase().includes(query.toLowerCase())
  ), [city, query, status]);

  const total = sites.length;
  const onAir = sites.filter(s => s.status === "ON-AIR").length;
  const offAir = sites.filter(s => s.status === "OFF-AIR").length;
  const atRisk = sites.filter(s => s.status === "AT-RISK").length;
  const availability = ((onAir + atRisk) / total * 100).toFixed(1);

  return (
    <main className="app-shell">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}stc-logo.svg`} className="stc-logo" alt="stc" />
        <div className="date-card"><Clock3 size={15} /><div><strong>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong><span>{now.toLocaleTimeString("en-GB")}</span></div></div>
        <div className="title-block"><span>96th Saudi National Day</span><h1>COW Sites Monitoring Control Room</h1></div>
        <div className="live-pill"><i /> LIVE MONITORING</div>
        <img src={`${import.meta.env.BASE_URL}aces-logo.svg`} className="aces-logo" alt="ACES" />
        <button className="icon-button" title="Sign out"><LogOut size={17} /></button>
      </header>

      <section className="ticker">
        <div><b>24 COW Sites</b><span>Kingdom-wide National Day readiness</span><em>{availability}% availability</em><span>•</span><b>{onAir} On-Air</b><span>•</span><b className="warning">{atRisk} At-Risk</b><span>•</span><b className="danger">{offAir} Off-Air</b></div>
      </section>

      <section className="monitoring-stage">
        <div className="map-canvas">
          <div className="map-grid" />
          <div className="saudi-shape">SAUDI ARABIA<span>National Day Coverage</span></div>
          {filtered.map(site => <SitePin key={site.id} site={site} selected={selected?.id === site.id} onSelect={() => setSelected(site)} />)}
          <div className="map-legend">{Object.entries(statusColor).map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>
        </div>

        <aside className="glass left-panel">
          <label>Search Site ID</label>
          <div className="search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="COW-ND001" /></div>
          <label>City</label>
          <select value={city} onChange={e => setCity(e.target.value)}><option>All Cities</option>{[...new Set(sites.map(s => s.city))].map(c => <option key={c}>{c}</option>)}</select>
          <label>Operational Status</label>
          <div className="filter-buttons">{(["All", "ON-AIR", "AT-RISK", "OFF-AIR"] as const).map(item => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item}</button>)}</div>
          <div className="divider" />
          <label>Coverage Summary</label>
          {[...new Set(sites.map(s => s.city))].map(c => {
            const count = sites.filter(s => s.city === c && s.status !== "OFF-AIR").length;
            return <button className="city-card" key={c} onClick={() => setCity(c)}><span>{c}</span><strong>{count}<small>/4</small></strong><div><i style={{ width: `${count / 4 * 100}%` }} /></div></button>;
          })}
        </aside>

        <aside className="right-panel">
          <div className="glass availability-card"><div className="gauge" style={{ "--value": `${Number(availability) * 3.6}deg` } as React.CSSProperties}><div><strong>{availability}%</strong><span>Availability</span></div></div></div>
          <div className="kpi-grid">
            <div className="glass kpi"><RadioTower /><span>Total Sites<strong>{total}</strong></span></div>
            <div className="glass kpi"><ShieldCheck /><span>On-Air<strong>{onAir}</strong></span></div>
            <div className="glass kpi warning"><AlertTriangle /><span>At-Risk<strong>{atRisk}</strong></span></div>
            <div className="glass kpi danger"><Zap /><span>Off-Air<strong>{offAir}</strong></span></div>
          </div>
          <div className="glass risk-list"><div className="panel-heading"><span><i /> ACTIVE ALERTS</span><b>{incidents.length}</b></div>{incidents.map(item => <button key={item.site} onClick={() => setSelected(sites.find(s => s.id === item.site) ?? null)}><span><strong>{item.site}</strong><small>{item.alarm}</small></span><em className={item.severity.toLowerCase()}>{item.severity}</em></button>)}</div>
        </aside>

        {selected && <div className="glass site-popup"><button onClick={() => setSelected(null)}>×</button><div className="site-title"><MapPin /><span><strong>{selected.id}</strong><small>{selected.city} · {selected.venue}</small></span><em style={{ color: statusColor[selected.status] }}>{selected.status}</em></div><dl><div><dt>Power Configuration</dt><dd>{selected.power}</dd></div><div><dt>Battery Backup</dt><dd>{selected.battery} minutes</dd></div><div><dt>Control Status</dt><dd>Team assigned · Live tracking</dd></div></dl></div>}
      </section>

      <section className="incident-strip">
        <div className="table-title"><AlertTriangle size={16} /> Active Incident & Escalation Queue <span>Frontend layout preview — connect live data next</span></div>
        <div className="incident-table"><div className="table-row header"><span>Site ID</span><span>Active Alarm</span><span>Owner</span><span>Elapsed Time</span><span>Severity</span></div>{incidents.map(item => <div className="table-row" key={item.site}><strong>{item.site}</strong><span>{item.alarm}</span><span>{item.owner}</span><code>{item.age}</code><em className={item.severity.toLowerCase()}>{item.severity}</em></div>)}</div>
      </section>
    </main>
  );
}
