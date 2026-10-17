const { useState, useEffect, useRef } = React;

/* ---------- small pieces ---------- */

function Folder({ style, className = "" }) {
  return (
    <div className={`folder ${className}`} style={style}>
      <svg viewBox="0 0 130 100" aria-hidden="true">
        <path d="M6 14a8 8 0 0 1 8-8h32l10 10h60a8 8 0 0 1 8 8v8H6z" fill="var(--folder)" />
        <rect x="6" y="26" width="118" height="70" rx="8" fill="var(--folder-top)" />
        <rect x="6" y="26" width="118" height="70" rx="8" fill="url(#shade)" />
        <defs>
          <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#3a9be0" stopOpacity="0.35" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Keycap({ label, size }) {
  return (
    <div className="keycap" style={{ "--k": size }}>
      <span>{label}</span>
    </div>
  );
}

// Spread a string into spans that each know their index, for staggered CSS.
function Letters({ text, extra = () => ({}), classFor = () => "" }) {
  return [...text].map((ch, i) => (
    <span key={i} className={classFor(i)} style={{ "--i": i, ...extra(i) }}>
      {ch === " " ? " " : ch}
    </span>
  ));
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- scenes: each gets t = ms since the scene started ---------- */

function SceneCan() {
  return (
    <div className="scene">
      <div className="row s-can">
        <span className="serif i">i</span>
        <span className="tin" aria-label="can" />
        <span className="serif t">’t</span>
      </div>
    </div>
  );
}

const DESK = [
  { x: 20, y: 18, w: 7, d: 0.05 },
  { x: 72, y: 14, w: 6, d: 0.12 },
  { x: 14, y: 46, w: 6, d: 0.18 },
  { x: 80, y: 50, w: 8, d: 0.1 },
  { x: 36, y: 68, w: 7, d: 0.22 },
  { x: 64, y: 72, w: 5, d: 0.28 },
];
const THUMBS = [
  { x: 28, y: 26, a: "#2b2b3a", b: "#7b5ea7", n: 12, d: 0.15 },
  { x: 66, y: 26, a: "#3a1c2c", b: "#e0607e", n: 7, d: 0.2 },
  { x: 24, y: 66, a: "#c9a7b8", b: "#f4d6e0", n: 31, d: 0.3 },
  { x: 74, y: 68, a: "#444", b: "#b8b8c2", n: 48, d: 0.25 },
];

function SceneDesk() {
  return (
    <div className="scene">
      {DESK.map((f, i) => (
        <Folder
          key={i}
          style={{ left: `${f.x}%`, top: `${f.y}%`, "--w": `${f.w}cqw`, "--d": `${f.d}s`, "--fx": `${(50 - f.x) * 0.7}cqw`, "--fy": `${(50 - f.y) * 0.5}cqw` }}
        />
      ))}
      {THUMBS.map((p, i) => (
        <div
          key={i}
          className="thumb"
          style={{ left: `${p.x}%`, top: `${p.y}%`, "--a": p.a, "--b": p.b, "--d": `${p.d}s`, "--fx": `${(50 - p.x) * 0.7}cqw`, "--fy": `${(50 - p.y) * 0.5}cqw` }}
        >
          <i>{p.n}</i>
        </div>
      ))}
      <div className="select-word pop">
        <span className="hl" />
        <span className="handle l" />
        <span className="handle r" />
        <span style={{ position: "relative" }}>stop</span>
      </div>
    </div>
  );
}

function SceneTyping({ t }) {
  const full = "moving..";
  const shown = full.slice(0, Math.floor(clamp((t - 150) / 700) * full.length));
  return (
    <div className="scene">
      <div className="typing">
        {shown}
        <span className="caret" />
      </div>
    </div>
  );
}

function SceneFall() {
  const rot = [-40, 25, -15, 50, -30, 20, -55, 35];
  return (
    <div className="scene">
      <div className="s-fall sans">
        <Letters
          text="anything"
          extra={(i) => ({ "--r": `${rot[i]}deg` })}
          classFor={(i) => (i % 3 === 1 ? "serif" : "")}
        />
      </div>
    </div>
  );
}

function SceneOrbit() {
  const word = "KEEP·MOVING·";
  return (
    <div className="scene white">
      <Folder style={{ right: "-1cqw", top: "2cqw", "--w": "9cqw" }} />
      <Folder style={{ left: "8cqw", bottom: "1cqw", "--w": "8cqw", "--d": ".15s" }} />
      <div className="orbit-wrap">
        <div className="orbit">
          {[...word].map((ch, i) => (
            <div key={i} className="token" style={{ "--a": `${(360 / word.length) * i}deg`, "--i": i }}>
              <span><b>{ch}</b></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneRings() {
  const phrase = "i can’t stop moving · ";
  const rings = [
    { r: 150, size: 64, dir: "cw" },
    { r: 250, size: 78, dir: "ccw" },
    { r: 360, size: 92, dir: "cw" },
    { r: 470, size: 100, dir: "ccw" },
  ];
  return (
    <div className="scene white">
      <div className="rings">
        <svg viewBox="0 0 1000 1000">
          <defs>
            {rings.map((g, i) => (
              <path key={i} id={`ring${i}`} d={`M500,${500 - g.r} a${g.r},${g.r} 0 1,1 0,${2 * g.r} a${g.r},${g.r} 0 1,1 0,-${2 * g.r}`} />
            ))}
          </defs>
          {rings.map((g, i) => {
            const len = 2 * Math.PI * g.r;
            const reps = Math.ceil(len / (g.size * 0.5 * phrase.length));
            return (
              <g key={i} className={g.dir}>
                <text fontSize={g.size} textLength={len - 2} lengthAdjust="spacing">
                  <textPath href={`#ring${i}`}>{phrase.repeat(reps)}</textPath>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="key-bounce">
        <Keycap label="esc" />
      </div>
    </div>
  );
}

// Renders a glyph at a tiny resolution and upscales it, so sharpening = "focus pull".
function PixelGlyph({ ch, res }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const w = Math.max(3, Math.round(res * 0.75));
    const h = Math.max(4, Math.round(res));
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `900 ${h * 1.05}px "Inter Tight", sans-serif`;
    ctx.fillText(ch, w / 2, h * 0.86);
  }, [ch, res]);
  return <canvas ref={ref} className="pixel-canvas" />;
}

function SceneZoom({ t }) {
  const p = clamp((t - 700) / 900);
  const res = 7 + Math.pow(p, 2) * 160;
  return (
    <div className="scene">
      <div className="row s-zoom sans">
        <PixelGlyph ch="z" res={res} />
        <span>oom</span>
      </div>
      <div className="lens" />
      <div className="plus" style={{ translate: "-6.5cqw -13cqw" }}>+</div>
    </div>
  );
}

const ANY_ITEMS = ["✱", "♞", "🍋", "⌘", "★", "☂"];

function SceneAny({ t }) {
  const idx = Math.floor(clamp((t - 250) / 1500, 0, 0.999) * ANY_ITEMS.length);
  return (
    <div className="scene">
      <div className="row s-any sans fade-up">
        <span>Any</span>
        <span className="braces">{"{"}</span>
        <span className="brace-slot">
          <span key={idx}>{ANY_ITEMS[idx]}</span>
        </span>
        <span className="braces">{"}"}</span>
      </div>
    </div>
  );
}

const BLOCKS = [
  { l: 0, t: 0, w: 38, h: 46, ch: "M", fs: 40, k: true },
  { l: 36, t: 6, w: 30, h: 36, ch: "o", fs: 34, k: false },
  { l: 62, t: -4, w: 42, h: 52, ch: "V", fs: 46, k: true },
  { l: -4, t: 44, w: 34, h: 60, ch: "e", fs: 52, k: false },
  { l: 28, t: 40, w: 40, h: 64, ch: "!", fs: 58, k: true },
  { l: 66, t: 48, w: 38, h: 56, ch: "g", fs: 48, k: false },
];

function SceneCollage() {
  return (
    <div className="scene">
      <div className="collage">
        {BLOCKS.map((b, i) => (
          <div
            key={i}
            className={`block ${b.k ? "k" : "w"}`}
            style={{
              left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, fontSize: `${b.fs}cqw`,
              "--x1": `${(i % 2 ? 1 : -1) * 3}cqw`, "--y1": `${(i % 3) - 1}cqw`,
              "--x2": `${(i % 2 ? -1 : 1) * 2}cqw`, "--y2": `${(i % 2 ? 2 : -2)}cqw`,
            }}
          >
            {b.ch}
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneTunnel() {
  const folders = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.3;
    const r = 30 + (i % 3) * 10;
    return { tx: `${Math.cos(a) * r}cqw`, ty: `${Math.sin(a) * r * 0.6}cqw`, d: `${(i % 8) * 0.09}s` };
  });
  return (
    <div className="scene">
      <div className="tunnel">
        {folders.map((f, i) => (
          <Folder key={i} style={{ "--tx": f.tx, "--ty": f.ty, "--d": f.d, "--w": "9cqw" }} />
        ))}
      </div>
      <div className="chip pop" style={{ "--d": ".4s" }}>moving</div>
    </div>
  );
}

function SceneSlam() {
  const arc = [
    { r: -28, y: "4cqw" },
    { r: -9, y: "-4cqw" },
    { r: 9, y: "-4cqw" },
    { r: 28, y: "4cqw" },
  ];
  return (
    <div className="scene">
      <div className="row s-slam sans">
        <Letters text="MOVE" extra={(i) => ({ "--r": `${arc[i].r}deg`, "--y": arc[i].y })} />
      </div>
    </div>
  );
}

const TAGS = [
  { n: "you", x: "-6cqw", y: "-8cqw", r: -4 },
  { n: "lena", x: "6cqw", y: "-9cqw", r: 3 },
  { n: "kai", x: "-17cqw", y: "-2cqw", r: 2 },
  { n: "mo", x: "13cqw", y: "-3cqw", r: -6 },
  { n: "juniper", x: "-3cqw", y: "-1cqw", r: -2 },
  { n: "ari", x: "-13cqw", y: "5cqw", r: 5 },
  { n: "sol", x: "3cqw", y: "6cqw", r: -3 },
  { n: "everyone", x: "12cqw", y: "4cqw", r: 4 },
];

function SceneTags() {
  return (
    <div className="scene">
      <div className="s-tags row">
        <span className="serif fade-up">with</span>
        <span className="sans fade-up" style={{ "--d": ".2s", marginLeft: ".25em" }}>anyone</span>
        {TAGS.map((tg, i) => (
          <span key={i} className="tag" style={{ "--x": tg.x, "--y": tg.y, "--r": `${tg.r}deg`, "--i": i }}>
            {tg.n}
          </span>
        ))}
      </div>
    </div>
  );
}

function SceneOutro() {
  return (
    <div className="scene">
      <div className="outro">
        <div className="pop" style={{ display: "inline-block", marginBottom: "1.5cqw" }}>
          <Keycap label="⌘" size="6cqw" />
        </div>
        <h1 className="fade-up" style={{ "--d": ".15s" }}>moving:</h1>
        <p className="fade-up" style={{ "--d": ".3s" }}>a kinetic typography study in React &amp; CSS</p>
      </div>
    </div>
  );
}

const SCENES = [
  { name: "i can’t", C: SceneCan, ms: 1800 },
  { name: "selection", C: SceneDesk, ms: 1700 },
  { name: "typing", C: SceneTyping, ms: 1300 },
  { name: "falling", C: SceneFall, ms: 1600 },
  { name: "orbit", C: SceneOrbit, ms: 1800 },
  { name: "rings", C: SceneRings, ms: 2200 },
  { name: "focus pull", C: SceneZoom, ms: 1900 },
  { name: "Any{ }", C: SceneAny, ms: 1900 },
  { name: "collage", C: SceneCollage, ms: 1400 },
  { name: "fly-through", C: SceneTunnel, ms: 1600 },
  { name: "slam", C: SceneSlam, ms: 1500 },
  { name: "tags", C: SceneTags, ms: 2000 },
  { name: "outro", C: SceneOutro, ms: 2600 },
];

/* ---------- player ---------- */

function App() {
  const [scene, setScene] = useState(0);
  const [t, setT] = useState(0);
  const [take, setTake] = useState(0); // bumps to remount (restart CSS) on every jump
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);

  const go = (i) => {
    elapsed.current = 0;
    setT(0);
    setScene((i + SCENES.length) % SCENES.length);
    setTake((k) => k + 1);
  };

  useEffect(() => {
    if (paused) return;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= SCENES[scene].ms) go(scene + 1);
      else setT(elapsed.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, paused]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      if (e.key === "ArrowRight") go(scene + 1);
      if (e.key === "ArrowLeft") go(scene - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene]);

  const { C, ms, name } = SCENES[scene];

  return (
    <div className={`player ${paused ? "paused" : ""}`}>
      <div className="stage" onClick={() => setPaused((p) => !p)}>
        <C key={take} t={t} />
      </div>
      <div className="controls">
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"}>
          {paused ? "▶" : "❚❚"}
        </button>
        <div className="track">
          {SCENES.map((s, i) => (
            <a
              key={i}
              title={s.name}
              onClick={() => go(i)}
              className={i < scene ? "done" : i === scene ? "now" : ""}
              style={{ "--w": s.ms, "--dur": `${s.ms}ms` }}
            >
              <i key={i === scene ? take : "x"} />
            </a>
          ))}
        </div>
        <span className="label">{String(scene + 1).padStart(2, "0")} · {name}</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
