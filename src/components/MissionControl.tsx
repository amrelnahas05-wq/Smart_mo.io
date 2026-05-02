import { useState, useEffect, useRef, useCallback } from "react";

const BASE = "http://192.168.4.1";

type ConnStatus = "offline" | "online" | "warn";
type LogEntry = { ts: string; html: string; type: "ok" | "err" | "info" | "warn" };

interface Telemetry {
  conn: string;
  connClass: string;
  lastCmd: string;
  obstacle: boolean;
  mode: string;
  modeClass: string;
  status: ConnStatus;
  statusText: string;
}

const CMD_MAP: Record<string, string> = {
  F: "FWD", B: "REV", L: "LEFT", R: "RIGHT", X: "STOP",
  V: "BLADE+", P: "BLADE-", V2: "MOT3+", P2: "MOT3-",
};

export default function MissionControl({ lang = "en" }: { lang?: "en" | "ar" }) {
  const [telem, setTelem] = useState<Telemetry>({
    conn: "OFFLINE", connClass: "danger",
    lastCmd: "--", obstacle: false,
    mode: "MANUAL", modeClass: "",
    status: "offline", statusText: "OFFLINE",
  });
  const [bladeOn, setBladeOn] = useState(false);
  const [motor3On, setMotor3On] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sweepPct, setSweepPct] = useState(0);
  const [sweepMsg, setSweepMsg] = useState("");
  const [speed, setSpeed] = useState(255);
  const [speed2, setSpeed2] = useState(255);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [log, setLog] = useState<LogEntry[]>([{ ts: "", html: "// Waiting for ESP32 connection at 192.168.4.1...", type: "info" }]);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sweepBarRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sweepingRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  const ts = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

  const addLog = useCallback((html: string, type: LogEntry["type"]) => {
    setLog(prev => [...prev.slice(-60), { ts: ts(), html, type }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 30);
  }, []);

  const setOffline = useCallback(() => {
    setTelem(t => ({ ...t, conn: "OFFLINE", connClass: "danger", status: "offline", statusText: "OFFLINE" }));
  }, []);

  const send = useCallback(async (cmd: string) => {
    try {
      const r = await fetch(`${BASE}/cmd?v=${encodeURIComponent(cmd)}`, { signal: AbortSignal.timeout(3000) });
      const txt = await r.text();
      if (txt.startsWith("OK")) { addLog(txt, "ok"); } else { addLog(txt, "err"); }
      return txt;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "connection failed";
      addLog(`ERR: ${msg}`, "err");
      setOffline();
    }
  }, [addLog, setOffline]);

  const sendSpeed = useCallback(async (val: number) => {
    try { await fetch(`${BASE}/speed?v=${val}`, { signal: AbortSignal.timeout(2000) }); } catch (_) {}
  }, []);

  const sendSpeed2 = useCallback(async (val: number) => {
    try { await fetch(`${BASE}/speed2?v=${val}`, { signal: AbortSignal.timeout(2000) }); } catch (_) {}
  }, []);

  /* ── Polling ── */
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${BASE}/status`, { signal: AbortSignal.timeout(2500) });
        const d = await r.json();
        const obs = !!d.obstacle;
        const mode = d.area_mode ? "SWEEP" : "MANUAL";
        setTelem({
          conn: "ONLINE", connClass: "safe",
          lastCmd: CMD_MAP[d.last_cmd] || (d.last_cmd || "--"),
          obstacle: obs,
          mode,
          modeClass: d.area_mode ? "crimson" : "",
          status: obs ? "warn" : "online",
          statusText: obs ? "OBSTACLE" : "ONLINE",
        });
        if (!d.area_mode && sweepingRef.current) {
          sweepingRef.current = false;
          setSweeping(false);
          setSweepPct(0);
          addLog("OK: sweep completed", "ok");
          if (sweepBarRef.current) clearInterval(sweepBarRef.current);
        }
      } catch (_) { setOffline(); }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [addLog, setOffline]);

  /* ── D-Pad hold logic ── */
  const startCmd = useCallback((cmd: string) => {
    send(cmd);
    holdRef.current = setInterval(() => send(cmd), 280);
  }, [send]);

  const stopCmd = useCallback((cmd: string) => {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
    if (["F", "B", "L", "R"].includes(cmd)) send("X");
  }, [send]);

  /* ── Keyboard ── */
  useEffect(() => {
    const map: Record<string, string> = { ArrowUp: "F", ArrowDown: "B", ArrowLeft: "L", ArrowRight: "R", " ": "X" };
    const held: Record<string, boolean> = {};
    const onDown = (e: KeyboardEvent) => {
      const cmd = map[e.key];
      if (!cmd || held[e.key]) return;
      e.preventDefault();
      held[e.key] = true;
      startCmd(cmd);
    };
    const onUp = (e: KeyboardEvent) => {
      const cmd = map[e.key];
      if (!cmd) return;
      held[e.key] = false;
      stopCmd(cmd);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [startCmd, stopCmd]);

  /* ── Area sweep ── */
  const handleSweep = async () => {
    if (sweeping) {
      await send("X");
      sweepingRef.current = false;
      setSweeping(false);
      setSweepPct(0);
      if (sweepBarRef.current) clearInterval(sweepBarRef.current);
      return;
    }
    const l = parseInt(length);
    const w = parseInt(width);
    if (!l || !w || l < 1 || w < 1) { addLog("ERR: enter valid length and width in cm", "err"); return; }
    await send(`Kl${l}`);
    await send(`Kw${w}`);
    const lanes = Math.max(1, Math.floor(l / 30));
    const totalMs = lanes * (w / 20 * 1000) + lanes * 750 * 2;
    sweepingRef.current = true;
    setSweeping(true);
    setSweepMsg(`Sweeping ${l}cm × ${w}cm — ${lanes} lanes`);
    addLog(`// sweep started — ${l}cm × ${w}cm — ${lanes} lanes`, "info");
    const start = Date.now();
    sweepBarRef.current = setInterval(() => {
      if (!sweepingRef.current) { if (sweepBarRef.current) clearInterval(sweepBarRef.current); setSweepPct(0); return; }
      const pct = Math.min(100, ((Date.now() - start) / totalMs) * 100);
      setSweepPct(pct);
      if (pct >= 100) { if (sweepBarRef.current) clearInterval(sweepBarRef.current); }
    }, 500);
  };

  const DPadBtn = ({ cmd, label, className = "" }: { cmd: string; label: string; className?: string }) => (
    <button
      className={`cbtn${className ? " " + className : ""}`}
      onMouseDown={() => startCmd(cmd)}
      onMouseUp={() => stopCmd(cmd)}
      onMouseLeave={() => { if (holdRef.current) stopCmd(cmd); }}
      onTouchStart={(e) => { e.preventDefault(); startCmd(cmd); }}
      onTouchEnd={(e) => { e.preventDefault(); stopCmd(cmd); }}
      onTouchCancel={(e) => { e.preventDefault(); stopCmd(cmd); }}
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div className="mc-wrap">

      {/* ── TELEMETRY BAR ── */}
      <div className="mc-telem">
        {[
          { label: lang === "ar" ? "الاتصال" : "Connection", value: telem.conn, cls: telem.connClass },
          { label: lang === "ar" ? "آخر أمر" : "Last Command", value: telem.lastCmd, cls: "" },
          { label: lang === "ar" ? "عائق" : "Obstacle", value: telem.obstacle ? "BLOCKED" : "CLEAR", cls: telem.obstacle ? "danger" : "safe" },
          { label: lang === "ar" ? "الوضع" : "Mode", value: telem.mode, cls: telem.modeClass },
        ].map(({ label, value, cls }) => (
          <div className="mc-telem-cell" key={label}>
            <div className="mc-telem-label">{label}</div>
            <div className={`mc-telem-value${cls ? " " + cls : ""}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── OBSTACLE BANNER ── */}
      {telem.obstacle && (
        <div className="mc-obs-banner">
          <span className="mc-obs-badge">⚠ {lang === "ar" ? "عائق" : "OBSTACLE"}</span>
          <span className="mc-obs-msg">{lang === "ar" ? "تم اكتشاف عائق — الجزازة متوقفة. أزل العائق للمتابعة." : "Obstacle detected — mower halted. Clear the path to resume."}</span>
        </div>
      )}

      <div className="mc-grid">

        {/* ── D-PAD ── */}
        <div className="mc-card mc-card-dpad">
          <div className="mc-card-title">{lang === "ar" ? "التحكم الاتجاهي" : "Directional Control"}</div>
          <div className="mc-card-sub">// {lang === "ar" ? "اضغط مع الاستمرار للتحرك · يتوقف عند الإفلات" : "press & hold to move · auto-stops on release"}</div>
          <div className="mc-dpad">
            <DPadBtn cmd="F" label="▲" />
            <DPadBtn cmd="L" label="◀" />
            <button
              className="cbtn cbtn-stop"
              onMouseDown={() => send("X")}
              onMouseUp={() => { if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; } }}
              onTouchStart={(e) => { e.preventDefault(); send("X"); }}
              onTouchEnd={(e) => e.preventDefault()}
            >
              {lang === "ar" ? "وقف" : "STOP"}
            </button>
            <DPadBtn cmd="R" label="▶" />
            <DPadBtn cmd="B" label="▼" />
          </div>
          <div className="mc-key-hint">
            <span>↑</span><span>↓</span><span>←</span><span>→</span>&nbsp; {lang === "ar" ? "مفاتيح الأسهم" : "Arrow keys"} &nbsp;·&nbsp; <span>SPACE</span> {lang === "ar" ? "وقف" : "Stop"}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="mc-right-col">

          {/* Blade Motor */}
          <div className="mc-card">
            <div className="mc-card-title">{lang === "ar" ? "محرك الشفرة" : "Blade Motor"}</div>
            <div className="mc-card-sub">// motor x — {lang === "ar" ? "شفرة القطع" : "cutting blade"}</div>
            <div className="mc-motor-row">
              <button
                className={`mbtn${bladeOn ? " motor-on" : ""}`}
                onClick={() => { send("V"); setBladeOn(true); }}
              >⚙ {lang === "ar" ? "تشغيل" : "On"}</button>
              <button
                className={`mbtn mbtn-off`}
                onClick={() => { send("P"); setBladeOn(false); }}
              >◼ {lang === "ar" ? "إيقاف" : "Off"}</button>
            </div>
            <div className="mc-spd-header">
              <span className="mc-spd-label">{lang === "ar" ? "سرعة الشفرة" : "Blade Speed"}</span>
              <span className="mc-spd-val">{Math.round(speed / 255 * 100)}%</span>
            </div>
            <input type="range" min={0} max={255} value={speed}
              onChange={(e) => { const v = +e.target.value; setSpeed(v); sendSpeed(v); }} />
            <div className="mc-spd-ticks"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>

          {/* Motor 3 */}
          <div className="mc-card">
            <div className="mc-card-title">{lang === "ar" ? "المحرك 3" : "Motor 3"}</div>
            <div className="mc-card-sub">// motor y — {lang === "ar" ? "محرك مساعد" : "auxiliary drive"}</div>
            <div className="mc-motor-row">
              <button
                className={`mbtn${motor3On ? " motor-on" : ""}`}
                onClick={() => { send("V2"); setMotor3On(true); }}
              >⚙ {lang === "ar" ? "تشغيل" : "On"}</button>
              <button
                className="mbtn mbtn-off"
                onClick={() => { send("P2"); setMotor3On(false); }}
              >◼ {lang === "ar" ? "إيقاف" : "Off"}</button>
            </div>
            <div className="mc-spd-header">
              <span className="mc-spd-label">{lang === "ar" ? "سرعة المحرك 3" : "Motor 3 Speed"}</span>
              <span className="mc-spd-val">{Math.round(speed2 / 255 * 100)}%</span>
            </div>
            <input type="range" min={0} max={255} value={speed2}
              onChange={(e) => { const v = +e.target.value; setSpeed2(v); sendSpeed2(v); }} />
            <div className="mc-spd-ticks"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>
        </div>

        {/* ── AREA SWEEP ── */}
        <div className="mc-card">
          <div className="mc-card-title">{lang === "ar" ? "مسح المنطقة" : "Area Sweep"}</div>
          <div className="mc-card-sub">// {lang === "ar" ? "نمط الجز الشبكي المستقل" : "autonomous grid mowing pattern"}</div>
          <div className="mc-sweep-grid">
            <div className="mc-inp-group">
              <label>{lang === "ar" ? "الطول (سم)" : "Length (cm)"}</label>
              <input type="number" min={1} value={length} onChange={e => setLength(e.target.value)} placeholder="e.g. 200" />
            </div>
            <div className="mc-inp-group">
              <label>{lang === "ar" ? "العرض (سم)" : "Width (cm)"}</label>
              <input type="number" min={1} value={width} onChange={e => setWidth(e.target.value)} placeholder="e.g. 150" />
            </div>
          </div>
          <button className={`mc-btn-sweep${sweeping ? " sweeping" : ""}`} onClick={handleSweep}>
            {sweeping ? `⏹  ${lang === "ar" ? "إيقاف المسح" : "STOP SWEEP"}` : `▶  ${lang === "ar" ? "بدء المسح" : "START SWEEP"}`}
          </button>
          {sweeping && (
            <div className="mc-sweep-info">
              <span>{sweepMsg}</span>
              <div className="mc-sweep-track"><div className="mc-sweep-fill" style={{ width: `${sweepPct}%` }} /></div>
            </div>
          )}
        </div>

        {/* ── LOG ── */}
        <div className="mc-card">
          <div className="mc-card-title">{lang === "ar" ? "سجل النظام" : "System Log"}</div>
          <div className="mc-card-sub">// {lang === "ar" ? "موجز الأوامر والتيليمتري" : "command & telemetry feed"}</div>
          <div className="mc-log" ref={logRef}>
            {log.map((e, i) => (
              <div key={i}>
                {e.ts && <span className="mc-log-ts">[{e.ts}]</span>}
                <span className={`mc-log-${e.type}`}> {e.html}</span>
              </div>
            ))}
          </div>
          <div className="mc-log-footer">
            <span className="mc-log-ssid">SSID: ESP32_Rover · PASS: rover1234 · IP: 192.168.4.1</span>
            <button className="mc-clear-btn" onClick={() => setLog([{ ts: "", html: "// Log cleared.", type: "info" }])}>
              CLEAR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
