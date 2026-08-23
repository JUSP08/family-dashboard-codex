import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Fan,
  Lightbulb,
  LoaderCircle,
  Megaphone,
  Play,
  Power,
  RefreshCw,
  SlidersHorizontal,
  Speaker,
  Square,
  ToggleLeft,
  Volume1,
  Volume2,
  VolumeX,
  WandSparkles,
} from "lucide-react";


const panelClass = "rounded-3xl border border-white/10 bg-slate-950/55 backdrop-blur-xl shadow-xl";


async function apiRequest(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}


function StatusPill({ state }) {
  const active = ["on", "playing", "heat", "cool"].includes(state);
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>
      {state.replaceAll("_", " ")}
    </span>
  );
}


function ActionButton({ children, onClick, disabled, active = false, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:cursor-wait disabled:opacity-50 ${active ? "border-cyan-300/30 bg-cyan-500/20 text-cyan-100" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}


function LightCard({ entity, busy, runAction }) {
  const isOn = entity.state === "on";
  const brightness = Math.round(((entity.attributes.brightness || 0) / 255) * 100);
  return (
    <article className={`${panelClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`rounded-2xl p-3 ${isOn ? "bg-amber-400/20 text-amber-300" : "bg-white/5 text-slate-500"}`}>
            <Lightbulb className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{entity.name}</h3>
            <p className="truncate text-[10px] text-slate-500">{entity.entityId}</p>
          </div>
        </div>
        <StatusPill state={entity.state} />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <ActionButton disabled={busy} active={isOn} onClick={() => runAction(entity, isOn ? "turn_off" : "turn_on")}>
          <Power className="mx-auto h-4 w-4" />
        </ActionButton>
        {[25, 60, 100].map((level) => (
          <ActionButton key={level} disabled={busy} active={isOn && Math.abs(brightness - level) < 15} onClick={() => runAction(entity, "set_brightness", level)}>
            {level}%
          </ActionButton>
        ))}
      </div>
    </article>
  );
}


function MediaCard({ entity, busy, runAction }) {
  const volume = Number(entity.attributes.volume_level || 0);
  const muted = Boolean(entity.attributes.is_volume_muted);
  const mediaLine = [entity.attributes.media_title, entity.attributes.media_artist].filter(Boolean).join(" · ");
  return (
    <article className={`${panelClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`rounded-2xl p-3 ${entity.state === "playing" ? "bg-cyan-400/20 text-cyan-300" : "bg-white/5 text-slate-400"}`}>
            <Speaker className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{entity.name}</h3>
            <p className="truncate text-[10px] text-slate-400">{mediaLine || `${Math.round(volume * 100)}% volume`}</p>
          </div>
        </div>
        <StatusPill state={entity.state} />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        <ActionButton disabled={busy} onClick={() => runAction(entity, "media_play_pause")} title="Play or pause"><Play className="mx-auto h-4 w-4" /></ActionButton>
        <ActionButton disabled={busy} onClick={() => runAction(entity, "media_stop")} title="Stop"><Square className="mx-auto h-4 w-4" /></ActionButton>
        <ActionButton disabled={busy} onClick={() => runAction(entity, "volume_set", Math.max(0, volume - 0.1))} title="Volume down"><Volume1 className="mx-auto h-4 w-4" /></ActionButton>
        <ActionButton disabled={busy} onClick={() => runAction(entity, "volume_set", Math.min(1, volume + 0.1))} title="Volume up"><Volume2 className="mx-auto h-4 w-4" /></ActionButton>
        <ActionButton disabled={busy} active={muted} onClick={() => runAction(entity, muted ? "unmute" : "mute")} title="Mute"><VolumeX className="mx-auto h-4 w-4" /></ActionButton>
      </div>
    </article>
  );
}


function SimpleEntityCard({ entity, busy, runAction }) {
  const isOn = entity.state === "on";
  const Icon = entity.domain === "fan" ? Fan : ToggleLeft;
  return (
    <article className={`${panelClass} flex items-center justify-between gap-4 p-4`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`rounded-2xl p-3 ${isOn ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{entity.name}</h3><p className="truncate text-[10px] text-slate-500">{entity.entityId}</p></div>
      </div>
      <ActionButton disabled={busy} active={isOn} onClick={() => runAction(entity, isOn ? "turn_off" : "turn_on")}><Power className="h-4 w-4" /></ActionButton>
    </article>
  );
}


function Section({ title, icon, children, count }) {
  if (!count) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-slate-300">{icon}<h2 className="text-xs font-black uppercase tracking-[0.18em]">{title}</h2><span className="text-xs text-slate-600">{count}</span></div>
      {children}
    </section>
  );
}


export default function SmartHomeView({ embedded = false }) {
  const [entities, setEntities] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [haUrl, setHaUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(new Set());
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [targets, setTargets] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const data = await apiRequest("/api/smart-home/entities");
      setEntities(data.entities || []);
      setConfigured(data.configured !== false);
      setHaUrl(data.homeAssistantUrl || "");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh({ quiet: true }), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const grouped = useMemo(() => ({
    lights: entities.filter((entity) => entity.domain === "light"),
    media: entities.filter((entity) => entity.domain === "media_player"),
    scenes: entities.filter((entity) => entity.domain === "scene"),
    switches: entities.filter((entity) => ["switch", "fan", "input_boolean"].includes(entity.domain)),
    climate: entities.filter((entity) => entity.domain === "climate"),
  }), [entities]);

  const runAction = useCallback(async (entity, action, value) => {
    setBusyIds((current) => new Set(current).add(entity.entityId));
    try {
      await apiRequest("/api/smart-home/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: entity.entityId, action, value }),
      });
      setError("");
      window.setTimeout(() => refresh({ quiet: true }), 350);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(entity.entityId);
        return next;
      });
    }
  }, [refresh]);

  const allLightsOff = async () => {
    await Promise.all(grouped.lights.filter((light) => light.state === "on").map((light) => runAction(light, "turn_off")));
  };

  const sendAnnouncement = async (event) => {
    event.preventDefault();
    if (!announcement.trim()) return;
    setAnnouncementSent(false);
    try {
      await apiRequest("/api/smart-home/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: announcement, targets: targets.split(",").map((target) => target.trim()).filter(Boolean) }),
      });
      setAnnouncement("");
      setAnnouncementSent(true);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-[1500px] space-y-6 pb-8 pt-2"}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300"><Lightbulb className="h-7 w-7" /></div><div><h1 className="text-2xl font-black text-white">{embedded ? "Home Assistant" : "Smart Home"}</h1><p className="text-sm text-slate-300">Lights, speakers, scenes, and household controls</p></div></div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={allLightsOff} disabled={!grouped.lights.some((light) => light.state === "on")} className="min-h-11 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 text-xs font-black text-rose-200 disabled:opacity-40"><Power className="mr-2 inline h-4 w-4" />All lights off</button>
          <button type="button" onClick={() => refresh()} disabled={loading} className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-black text-white"><RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
        </div>
      </header>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span>{error}</span></div>}

      {!configured ? (
        <div className={`${panelClass} p-8 text-center`}><SlidersHorizontal className="mx-auto h-10 w-10 text-cyan-300" /><h2 className="mt-4 text-lg font-black text-white">One credential left to connect</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">The dashboard already knows Home Assistant at <span className="text-cyan-200">{haUrl}</span>. Add a Home Assistant long-lived access token as <span className="font-mono text-cyan-200">HA_TOKEN</span> in <span className="font-mono text-cyan-200">backend/.env</span>, then restart the backend.</p></div>
      ) : loading ? (
        <div className="flex min-h-64 items-center justify-center text-slate-400"><LoaderCircle className="mr-3 h-6 w-6 animate-spin" />Loading Home Assistant devices…</div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Section title="Scenes" count={grouped.scenes.length} icon={<WandSparkles className="h-4 w-4 text-purple-300" />}>
              <div className={`${panelClass} flex flex-wrap gap-2 p-4`}>{grouped.scenes.map((scene) => <button key={scene.entityId} type="button" disabled={busyIds.has(scene.entityId)} onClick={() => runAction(scene, "activate")} className="min-h-11 rounded-2xl border border-purple-300/20 bg-purple-500/10 px-4 text-sm font-black text-purple-100 hover:bg-purple-500/20 disabled:opacity-50"><WandSparkles className="mr-2 inline h-4 w-4" />{scene.name}</button>)}</div>
            </Section>
            <section className={`${panelClass} p-4`}>
              <div className="mb-3 flex items-center gap-2 text-slate-300"><Megaphone className="h-4 w-4 text-cyan-300" /><h2 className="text-xs font-black uppercase tracking-[0.18em]">Speaker announcement</h2></div>
              <form onSubmit={sendAnnouncement} className="space-y-2"><input value={announcement} onChange={(event) => setAnnouncement(event.target.value)} maxLength={250} placeholder="Dinner is ready!" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" /><div className="flex gap-2"><input value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="Optional rooms: kitchen, bedroom" className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none placeholder:text-slate-600" /><button type="submit" className="rounded-xl bg-cyan-600 px-4 text-xs font-black text-white hover:bg-cyan-500">Send</button></div>{announcementSent && <p className="text-xs font-bold text-emerald-300">Announcement sent.</p>}</form>
            </section>
          </div>

          <Section title="Lights" count={grouped.lights.length} icon={<Lightbulb className="h-4 w-4 text-amber-300" />}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{grouped.lights.map((entity) => <LightCard key={entity.entityId} entity={entity} busy={busyIds.has(entity.entityId)} runAction={runAction} />)}</div></Section>
          <Section title="Speakers & media" count={grouped.media.length} icon={<Speaker className="h-4 w-4 text-cyan-300" />}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{grouped.media.map((entity) => <MediaCard key={entity.entityId} entity={entity} busy={busyIds.has(entity.entityId)} runAction={runAction} />)}</div></Section>
          <Section title="Switches & fans" count={grouped.switches.length} icon={<ToggleLeft className="h-4 w-4 text-emerald-300" />}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{grouped.switches.map((entity) => <SimpleEntityCard key={entity.entityId} entity={entity} busy={busyIds.has(entity.entityId)} runAction={runAction} />)}</div></Section>
          <Section title="Climate" count={grouped.climate.length} icon={<SlidersHorizontal className="h-4 w-4 text-blue-300" />}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{grouped.climate.map((entity) => <article key={entity.entityId} className={`${panelClass} p-4`}><div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-white">{entity.name}</h3><p className="mt-1 text-xs text-slate-400">Current {entity.attributes.current_temperature ?? "—"}° · Set {entity.attributes.temperature ?? "—"}°</p></div><StatusPill state={entity.state} /></div></article>)}</div></Section>

          {!entities.length && <div className={`${panelClass} p-8 text-center text-sm text-slate-400`}>Connected to Home Assistant, but no supported entities were returned. Check <span className="font-mono text-cyan-200">HA_ENTITY_ALLOWLIST</span> if it is set.</div>}
        </>
      )}
    </div>
  );
}
