import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Database, LogOut, MapPin, RefreshCw, Search, ShieldCheck, WifiOff, Zap } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const STC_LOGO = "https://cdn.builder.io/api/v1/image/assets%2F933b4488987b460eb6835be6e207de9f%2F7878b58181884abab63229785c2bd952?format=webp&width=800&height=1200";
const ACES_LOGO = "https://cdn.builder.io/api/v1/image/assets%2F933b4488987b460eb6835be6e207de9f%2F65975bef1fbc41deba818987731012ae?format=webp&width=800&height=1200";
const GOOGLE_MAPS_KEY = import.meta.env.GOOGLE_MAP_API ?? "";
const APPROVED_SITE_COUNT = 24;

type Site = {
  site_id: string;
  vendor: string | null;
  region: string | null;
  area: string | null;
  location_name: string | null;
  latitude: number;
  longitude: number;
};

type PowerAlarm = {
  id: string;
  tt_number: string;
  site_id: string;
  problem_description: string | null;
  status: string | null;
  tt_severity: string | null;
  start_at: string | null;
  end_at: string | null;
  action_taken: string | null;
  owner_responsible: string | null;
  synced_at: string | null;
  is_active: boolean;
};

type Outage = {
  id: string;
  tt_number: string;
  site_id: string;
  technology: string | null;
  alarms_description: string | null;
  status: string | null;
  tt_severity: string | null;
  oos_start_at: string | null;
  oos_end_at: string | null;
  action_taken: string | null;
  owner: string | null;
  synced_at: string | null;
  is_active: boolean;
};

type SiteStatus = "ON-AIR" | "AT-RISK" | "OFF-AIR";
type SyncRun = { synced_at: string; status: string };
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

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError("Sign in failed. Check your email and password.");
    setSubmitting(false);
  }

  return (
    <main className="login-page">
      <svg className="login-filter-defs" width="0" height="0" aria-hidden="true">
        <filter id="flag-wave" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.003 0.015" numOctaves="2" seed="3" result="noise">
            <animate attributeName="baseFrequency" values="0.003 0.015;0.005 0.012;0.003 0.015" dur="5s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="login-background" aria-hidden="true"><div className="flag-motion" /></div>
      <section className="login-wrap">
        <div className="event-brand">
          <img className="login-stc-logo" src={STC_LOGO} alt="stc" />
          <span className="saudi-flag" role="img" aria-label="Saudi Arabia flag">🇸🇦</span>
          <h1>National Day 96th</h1>
        </div>
        <form className="login-card" onSubmit={submit}>
          <h2>Login</h2>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Signing In…" : "Sign In"}</button>
        </form>
      </section>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function siteStatus(siteId: string, powerAlarms: PowerAlarm[], outages: Outage[]): SiteStatus {
  if (outages.some(item => item.site_id === siteId && item.is_active)) return "OFF-AIR";
  if (powerAlarms.some(item => item.site_id === siteId && item.is_active)) return "AT-RISK";
  return "ON-AIR";
}

function SiteMap({ sites, selected, onSelect, powerAlarms, outages }: { sites: Site[]; selected: Site | null; onSelect: (site: Site) => void; powerAlarms: PowerAlarm[]; outages: Outage[] }) {
  const bounds = { minLat: 16, maxLat: 31, minLng: 41, maxLng: 47 };
  return (
    <div className="map-canvas">
      {GOOGLE_MAPS_KEY ? (
        <iframe
          title="Approved Saudi National Day sites map"
          className="google-map"
          src={`https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&center=24.7%2C45.7&zoom=5&maptype=roadmap`}
          loading="lazy"
        />
      ) : <div className="map-grid" />}
      <div className="map-overlay" aria-hidden="true" />
      {sites.map(site => {
        const left = ((site.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
        const top = (1 - (site.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
        const status = siteStatus(site.site_id, powerAlarms, outages);
        return <button key={site.site_id} className={`site-pin ${selected?.site_id === site.site_id ? "selected" : ""}`} style={{ left: `${left}%`, top: `${top}%`, "--pin": status === "OFF-AIR" ? "#ef4444" : status === "AT-RISK" ? "#f5b942" : "#38d4ff" } as React.CSSProperties} onClick={() => onSelect(site)} title={`${site.site_id} · ${status}`}><MapPin size={17} /><span>{site.site_id}</span></button>;
      })}
      <div className="map-caption"><strong>{GOOGLE_MAPS_KEY ? "LIVE MAP" : "APPROVED SITE COORDINATES"}</strong><span>{sites.length} approved sites</span></div>
    </div>
  );
}

function Metric({ icon, label, value, tone = "" }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return <div className={`metric glass ${tone}`}><span className="metric-icon">{icon}</span><span>{label}<strong>{value}</strong></span></div>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const now = useClock();
  const [sites, setSites] = useState<Site[]>([]);
  const [powerAlarms, setPowerAlarms] = useState<PowerAlarm[]>([]);
  const [outages, setOutages] = useState<Outage[]>([]);
  const [selected, setSelected] = useState<Site | null>(null);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All regions");
  const [vendor, setVendor] = useState("All vendors");
  const [status, setStatus] = useState<"All statuses" | SiteStatus>("All statuses");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      setLoading(false);
      return;
    }
    setRefreshing(true);
    const [sitesResult, powerResult, outagesResult, syncResult] = await Promise.all([
      supabase.from("national_day_sites").select("*").order("site_id"),
      supabase.from("national_day_power_alarms").select("*").eq("is_active", true).order("start_at", { ascending: false }),
      supabase.from("national_day_outages").select("*").eq("is_active", true).order("oos_start_at", { ascending: false }),
      supabase.from("national_day_sync_runs").select("synced_at,status").eq("status", "completed").order("synced_at", { ascending: false }).limit(1),
    ]);
    const requestError = sitesResult.error ?? powerResult.error ?? outagesResult.error ?? syncResult.error;
    if (requestError) {
      setError("Live data is unavailable. The last successful data remains visible.");
    } else {
      const nextSites = (sitesResult.data ?? []) as Site[];
      const nextPower = (powerResult.data ?? []) as PowerAlarm[];
      const nextOutages = (outagesResult.data ?? []) as Outage[];
      setSites(nextSites);
      setPowerAlarms(nextPower);
      setOutages(nextOutages);
      const latestSync = (syncResult.data?.[0] ?? null) as SyncRun | null;
      setLastSyncedAt(latestSync?.synced_at ?? null);
      setError("");
      if (selected && !nextSites.some(site => site.site_id === selected.site_id)) setSelected(null);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 300000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredSites = useMemo(() => sites.filter(site => {
    const siteStatusValue = siteStatus(site.site_id, powerAlarms, outages);
    return (region === "All regions" || site.region === region) &&
      (vendor === "All vendors" || site.vendor === vendor) &&
      (status === "All statuses" || siteStatusValue === status) &&
      `${site.site_id} ${site.location_name ?? ""}`.toLowerCase().includes(query.toLowerCase());
  }), [sites, powerAlarms, outages, region, vendor, status, query]);

  const offAirSites = new Set(outages.map(item => item.site_id));
  const atRiskSites = new Set(powerAlarms.map(item => item.site_id));
  const onAir = Math.max(0, sites.length - new Set([...offAirSites, ...atRiskSites]).size);
  const age = lastSyncedAt ? Date.now() - new Date(lastSyncedAt).getTime() : Infinity;
  const syncStale = !lastSyncedAt || age > 600000;
  const selectedPower = selected ? powerAlarms.filter(item => item.site_id === selected.site_id) : [];
  const selectedOutages = selected ? outages.filter(item => item.site_id === selected.site_id) : [];
  const regions = [...new Set(sites.map(site => site.region).filter(Boolean))] as string[];
  const vendors = [...new Set(sites.map(site => site.vendor).filter(Boolean))] as string[];

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <img src={STC_LOGO} className="stc-logo" alt="stc" />
        <div className="date-card"><Clock3 size={15} /><div><strong>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong><span>{now.toLocaleTimeString("en-GB")}</span></div></div>
        <div className="title-block"><span>96th Saudi National Day</span><h1>stc COW Interactive TT Status</h1></div>
        <div className={`connection-pill ${syncStale ? "stale" : ""}`}><i /> {syncStale ? "SYNC STALE" : "LIVE DATA"}</div>
        <img src={ACES_LOGO} className="aces-logo" alt="ACES" />
        <button className="icon-button" title="Sign out" onClick={onLogout}><LogOut size={17} /></button>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-toolbar glass">
          <div className="search-control"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search site or location" /></div>
          <select value={region} onChange={event => setRegion(event.target.value)}><option>All regions</option>{regions.map(item => <option key={item}>{item}</option>)}</select>
          <select value={vendor} onChange={event => setVendor(event.target.value)}><option>All vendors</option>{vendors.map(item => <option key={item}>{item}</option>)}</select>
          <select value={status} onChange={event => setStatus(event.target.value as "All statuses" | SiteStatus)}><option>All statuses</option><option>ON-AIR</option><option>AT-RISK</option><option>OFF-AIR</option></select>
          <button className="refresh-button" onClick={() => void loadData()} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh</button>
        </div>
        {error && <div className="data-warning"><WifiOff size={16} />{error}</div>}
        {syncStale && <div className="data-warning warning"><AlertTriangle size={16} />No successful synchronization in the last ten minutes.</div>}
        <div className="metric-grid">
          <Metric icon={<Database size={18} />} label="Total Sites" value={APPROVED_SITE_COUNT} />
          <Metric icon={<ShieldCheck size={18} />} label="On-Air" value={onAir} />
          <Metric icon={<Zap size={18} />} label="Off-Air" value={offAirSites.size} tone="danger" />
          <Metric icon={<AlertTriangle size={18} />} label="Active Power Alarms" value={powerAlarms.length} tone="warning" />
          <Metric icon={<WifiOff size={18} />} label="Active Outages" value={outages.length} tone="danger" />
        </div>
        <div className="sync-line">Last synchronized: <strong>{formatDate(lastSyncedAt)}</strong> · {loading ? "Loading live data…" : `${filteredSites.length} sites shown`}</div>
        <div className="dashboard-grid">
          <section className="glass map-panel"><div className="panel-heading"><span><MapPin size={15} /> APPROVED SITE COVERAGE</span><b>{sites.length}/24</b></div><SiteMap sites={filteredSites} selected={selected} onSelect={setSelected} powerAlarms={powerAlarms} outages={outages} /></section>
          <aside className="glass alerts-panel"><div className="panel-heading"><span><AlertTriangle size={15} /> ACTIVE RECORDS</span><b>{powerAlarms.length + outages.length}</b></div><div className="record-list">{powerAlarms.length + outages.length === 0 ? <div className="empty-records">No live alarms or outages.</div> : <>{powerAlarms.map(item => <button className="record" key={`power-${item.id}`} onClick={() => setSelected(sites.find(site => site.site_id === item.site_id) ?? null)}><span><strong>{item.site_id} · POWER</strong><small>{item.problem_description || "Power alarm"}</small></span><em className="warning">{item.tt_severity || item.status || "OPEN"}</em></button>)}{outages.map(item => <button className="record" key={`outage-${item.id}`} onClick={() => setSelected(sites.find(site => site.site_id === item.site_id) ?? null)}><span><strong>{item.site_id} · OUTAGE</strong><small>{item.alarms_description || item.technology || "Outage record"}</small></span><em className="danger">{item.tt_severity || item.status || "OPEN"}</em></button>)}</>}</div></aside>
      <section className="empty-dashboard">
        <GoogleMap />
        <div className="map-empty-state"><Database size={34} /><h2>No live site data</h2><p>Site markers will appear after the NOC database is connected.</p></div>
        <div className="empty-card-row">
          {["Total Sites","On-Air","At-Risk","Off-Air"].map(label => <div className="empty-kpi" key={label}><RadioTower size={17}/><span>{label}</span><strong>—</strong></div>)}
        </div>
        {selected && <section className="glass site-detail"><div className="site-detail-heading"><div><span><MapPin size={16} /> {selected.site_id}</span><h2>{selected.location_name || "Approved site"}</h2><p>{selected.area || "—"} · {selected.region || "—"} · {selected.vendor || "—"}</p></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Close site details">×</button></div><div className="detail-columns"><div><h3>Power alarms <b>{selectedPower.length}</b></h3>{selectedPower.length === 0 ? <p className="muted">No live records.</p> : selectedPower.map(item => <div className="detail-record" key={item.id}><strong>{item.tt_number}</strong><span>{item.problem_description || "Power alarm"}</span><small>{formatDate(item.start_at)} · {item.status || "—"}</small></div>)}</div><div><h3>Outages <b>{selectedOutages.length}</b></h3>{selectedOutages.length === 0 ? <p className="muted">No live records.</p> : selectedOutages.map(item => <div className="detail-record" key={item.id}><strong>{item.tt_number}</strong><span>{item.alarms_description || item.technology || "Outage"}</span><small>{formatDate(item.oos_start_at)} · {item.status || "—"}</small></div>)}</div></div></section>}
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
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) return <div className="app-loading">Loading secure session…</div>;
  if (!session) return <Login />;
  return <Dashboard onLogout={() => { void supabase?.auth.signOut(); }} />;
}
