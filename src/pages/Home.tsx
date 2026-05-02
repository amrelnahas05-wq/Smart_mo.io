import { useState, useEffect, useRef, useCallback } from "react";
import { t, type Lang } from "@/i18n/translations";
import MissionControl from "@/components/MissionControl";

/* ─── Scroll-reveal hook ─── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    const targets = document.querySelectorAll(".reveal");
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
}

/* ─── Counter animation hook ─── */
function useCounter(target: number, duration = 1600) {
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);

  return { count, ref };
}

/* ─── FAQ item ─── */
function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button className="faq-q" onClick={onToggle}>
        <span>{q}</span>
        <span className="faq-chevron">{open ? "−" : "+"}</span>
      </button>
      <div className="faq-body">
        <p className="faq-a">{a}</p>
      </div>
    </div>
  );
}

/* ─── Metric counter ─── */
function MetricCounter({ num, label }: { num: string; label: string }) {
  const parsed = parseInt(num.replace(/\D/g, ""));
  const suffix = num.replace(/[\d]/g, "");
  const isNum = !isNaN(parsed);
  const { count, ref } = useCounter(isNum ? parsed : 0);
  return (
    <div className="metric" ref={ref}>
      <div className="metric-num">{isNum ? `${count}${suffix}` : num}</div>
      <span className="metric-unit">{label}</span>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formState, setFormState] = useState({ name: "", email: "", org: "", message: "" });
  const [formSent, setFormSent] = useState(false);

  const tx = t[lang];

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowSticky(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  return (
    <div className={`solm-root${theme === "light" ? " light" : ""}`} dir={tx.dir}>

      {/* ── STICKY FLOATING CTA ── */}
      {showSticky && (
        <div className="sticky-cta">
          <button
            className="sticky-cta-btn"
            onClick={() => scrollTo("#control")}
          >
            ⚙ {lang === "ar" ? "لوحة التحكم" : "Control Panel"}
          </button>
        </div>
      )}

      {/* ── NAV ── */}
      <nav className={`solm-nav${scrolled ? " scrolled" : ""}`}>
        <div className="solm-logo">Da3poles<span>™</span></div>

        <ul className="solm-nav-links">
          {tx.navItems.map((id, i) => (
            <li key={id}>
              <a href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(`#${id}`); }}>
                {tx.navItemsLabels[i]}
              </a>
            </li>
          ))}
          <li>
            <a href="#control" onClick={(e) => { e.preventDefault(); scrollTo("#control"); }} style={{ color: "var(--accent)" }}>
              {tx.navControl}
            </a>
          </li>
        </ul>

        <div className="nav-right-group">
          <button className="theme-toggle" title="Toggle theme" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          <button className="lang-toggle" onClick={() => setLang(l => l === "en" ? "ar" : "en")}>
            {lang === "en" ? "عربي" : "EN"}
          </button>
          <button className="nav-cta" onClick={() => scrollTo("#control")}>
            {tx.navCta}
          </button>
          <button
            className="hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`bar${menuOpen ? " open" : ""}`} />
            <span className={`bar${menuOpen ? " open" : ""}`} />
            <span className={`bar${menuOpen ? " open" : ""}`} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ── */}
      <div className={`mobile-drawer${menuOpen ? " open" : ""}`}>
        {tx.navItems.map((id, i) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(`#${id}`); }}>
            {tx.navItemsLabels[i]}
          </a>
        ))}
        <a href="#control" onClick={(e) => { e.preventDefault(); scrollTo("#control"); }} style={{ color: "var(--accent)" }}>
          {tx.navControl}
        </a>
        <div className="drawer-bottom">
          <button className="theme-toggle" title="Toggle theme" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          <button className="lang-toggle" onClick={() => { setLang(l => l === "en" ? "ar" : "en"); setMenuOpen(false); }}>
            {lang === "en" ? "عربي" : "EN"}
          </button>
          <button className="btn-primary mobile-cta" onClick={() => { scrollTo("#control"); }}>
            {tx.navCta}
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <section id="hero" className="hero-section">
        <div className="hero-bg-grid" aria-hidden />
        <div className="hero-left">
          <div className="hero-tag">{tx.heroTag}</div>
          <h1 className="hero-title">
            {tx.heroTitle[0]}<br />
            <span className="gold">{tx.heroTitle[1]}</span><br />
            <span className="dim">{tx.heroTitle[2]}</span>
          </h1>
          <p className="hero-sub">{tx.heroSub}</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => scrollTo("#features")}>{tx.heroBtnExplore}</button>
            <button className="btn-ghost" onClick={() => scrollTo("#specs")}>{tx.heroBtnSpecs}</button>
            <button
              className="btn-primary btn-control"
              onClick={() => scrollTo("#control")}
            >
              {tx.heroBtnControl}
            </button>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-visual">
            <div className="hero-ring" />
            <div className="hero-ring" />
            <div className="hero-ring" />
            <div className="hero-core">
              <span className="mower-icon">🌿</span>
            </div>
            <div className="stat-bubble sb1">RANGE<span>100M</span></div>
            <div className="stat-bubble sb2">RUNTIME<span>6 HRS</span></div>
            <div className="stat-bubble sb3">COVERAGE<span>500M²</span></div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div id="strip">
        <div className="strip-inner">
          <span>AUTONOMOUS</span> NAVIGATION &nbsp;·&nbsp; <span>OBSTACLE</span> AVOIDANCE &nbsp;·&nbsp; <span>WIFI</span> CONTROL &nbsp;·&nbsp; <span>SMART</span> CHARGING &nbsp;·&nbsp; <span>REAL-TIME</span> MONITORING &nbsp;·&nbsp;
          <span>AUTONOMOUS</span> NAVIGATION &nbsp;·&nbsp; <span>OBSTACLE</span> AVOIDANCE &nbsp;·&nbsp; <span>WIFI</span> CONTROL &nbsp;·&nbsp; <span>SMART</span> CHARGING &nbsp;·&nbsp; <span>REAL-TIME</span> MONITORING &nbsp;·&nbsp;
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="features-section">
        <div className="section-tag reveal">{tx.featuresTag}</div>
        <h2 className="section-title reveal">{tx.featuresTitle[0]}<br />{tx.featuresTitle[1]}</h2>
        <div className="features-grid">
          {[
            { icon: "🧠", title: lang === "ar" ? "دماغ ESP32 ثنائي النواة" : "ESP32 Dual-Core Brain", desc: lang === "ar" ? "النواة 0 تتعامل مع اتصال WiFi ومعالجة الأوامر بينما تشغل النواة 1 منطق القرار المستقل." : "Core 0 handles WiFi communication and command processing while Core 1 runs autonomous decision logic — simultaneously, with zero-latency response.", mono: "FREERTOS · DUAL-CORE · 240MHz" },
            { icon: "📡", title: lang === "ar" ? "رادار بالموجات فوق الصوتية" : "Ultrasonic Radar", desc: lang === "ar" ? "مستشعر HC-SR04 مع مسح سيرفو 180° يوفر رسم خريطة المسافات في الوقت الفعلي." : "HC-SR04 sensor with 180° servo sweep delivers real-time distance mapping across 2–400cm with ±0.3cm accuracy.", mono: "HC-SR04 · 40kHz · ±0.3cm" },
            { icon: "📶", title: lang === "ar" ? "تحكم WiFi" : "WiFi Control", desc: lang === "ar" ? "بروتوكول IEEE 802.11 b/g/n مع نطاق لاسلكي يصل إلى 100 متر وواجهة ويب للتحكم." : "IEEE 802.11 b/g/n WiFi protocol with up to 100m wireless range. Web-based control interface with real-time status and emergency stop.", mono: "802.11 b/g/n · 100m · LOW LATENCY" },
            { icon: "⚡", title: lang === "ar" ? "نظام طاقة ذكي" : "Smart Power System", desc: lang === "ar" ? "حزمة ليثيوم أيون 14.8V / 6000mAh مع BMS متكاملة وحماية حرارية." : "Lithium-Ion NMC 4S2P pack at 14.8V / 6000mAh with integrated BMS, cell balancing, thermal protection, and CC/CV charging at up to 3A.", mono: "14.8V · 6000mAh · BMS" },
            { icon: "⚙️", title: lang === "ar" ? "قيادة دقيقة" : "Precision Drive", desc: lang === "ar" ? "محرك H-bridge مزدوج L298N مع تنظيم سرعة PWM وتحكم ثنائي الاتجاه." : "L298N dual H-bridge motor driver with PWM speed regulation (0–255) and bidirectional DC motor control — 2A per channel.", mono: "L298N · PWM 0–255 · 2A/CH" },
            { icon: "🏗️", title: lang === "ar" ? "هيكل معياري" : "Modular Chassis", desc: lang === "ar" ? "إطار من سبائك الفولاذ عالي القوة مع مواد مركبة خفيفة الوزن وتعليق متقدم." : "High-strength steel alloy frame with lightweight composites, integrated sensor mounts, thermal management, and advanced suspension geometry for any terrain.", mono: "STEEL ALLOY · COMPOSITE · MODULAR" },
          ].map(({ icon, title, desc, mono }) => (
            <div className="feat-card reveal" key={title}>
              <span className="feat-icon">{icon}</span>
              <div className="feat-title">{title}</div>
              <p className="feat-desc">{desc}</p>
              <div className="feat-mono">{mono}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE CONTROL PANEL EMBED ── */}
      <section id="control" className="control-section">
        <div className="section-tag reveal">{tx.controlTag}</div>
        <h2 className="section-title reveal">{tx.controlTitle[0]}<br /><span className="gold">{tx.controlTitle[1]}</span></h2>
        <p className="control-sub reveal">{tx.controlSub}</p>
        <div className="reveal">
          <MissionControl lang={lang} />
        </div>
      </section>

      {/* ── SPECS ── */}
      <section id="specs" className="specs-section">
        <div className="specs-inner">
          <div>
            <div className="section-tag reveal">{tx.specsTag}</div>
            <h2 className="section-title reveal">{tx.specsTitle[0]}<br />{tx.specsTitle[1]}</h2>
            <div className="spec-table">
              {[
                [lang === "ar" ? "المتحكم الدقيق" : "Microcontroller", "ESP32 Dual-Core"],
                [lang === "ar" ? "البطارية" : "Battery", "14.8V / 6000mAh"],
                [lang === "ar" ? "نطاق الاستشعار" : "Sensor Range", "2cm – 400cm"],
                [lang === "ar" ? "تردد المسح" : "Scan Frequency", "40kHz"],
                [lang === "ar" ? "نطاق WiFi" : "WiFi Range", "100 Meters"],
                [lang === "ar" ? "الشحن" : "Charging", "CC/CV · 3A Max"],
                [lang === "ar" ? "محرك المحرك" : "Motor Driver", "L298N H-Bridge"],
                [lang === "ar" ? "مسح السيرفو" : "Servo Sweep", "180°"],
              ].map(([label, val]) => (
                <div className="spec-row reveal" key={label}>
                  <span className="spec-label">{label}</span>
                  <span className="spec-val">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-tag reveal">{tx.algoTag}</div>
            <h2 className="section-title reveal">{tx.algoTitle[0]}<br />{tx.algoTitle[1] || ""}</h2>
            <div className="code-block reveal">
              <span className="code-comment">// HC-SR04 distance measurement</span>{"\n"}
              <span className="code-kw">float</span> <span className="code-fn">getDistance</span>() {"{"}{"\n"}
              {"  "}<span className="code-fn">digitalWrite</span>(trigPin, HIGH);{"\n"}
              {"  "}<span className="code-fn">delayMicroseconds</span>(<span className="code-num">10</span>);{"\n"}
              {"  "}<span className="code-fn">digitalWrite</span>(trigPin, LOW);{"\n"}
              {"\n"}
              {"  "}<span className="code-kw">long</span> duration ={"\n"}
              {"    "}<span className="code-fn">pulseIn</span>(echoPin, HIGH);{"\n"}
              {"\n"}
              {"  "}<span className="code-comment">// Convert to cm</span>{"\n"}
              {"  "}<span className="code-kw">return</span> duration * <span className="code-num">0.034</span> / <span className="code-num">2</span>;{"\n"}
              {"}"}
            </div>
            <p className="specs-note reveal">{tx.algoNote}</p>
          </div>
        </div>
      </section>

      {/* ── METRICS ── */}
      <section id="metrics" className="metrics-section">
        <div className="section-tag reveal">{tx.metricsTag}</div>
        <h2 className="section-title reveal">{tx.metricsTitle[0]}<br />{tx.metricsTitle[1]}</h2>
        <div className="metrics-row">
          <MetricCounter num="6" label={lang === "ar" ? "ساعات تشغيل مستقل" : "Hours Autonomous Runtime"} />
          <MetricCounter num="500" label={lang === "ar" ? "م² مساحة التغطية" : "m² Coverage Area"} />
          <MetricCounter num="100" label={lang === "ar" ? "م نطاق WiFi" : "m WiFi Range"} />
          <MetricCounter num="60%" label={lang === "ar" ? "انخفاض تكلفة الصيانة" : "Lower Maintenance Cost"} />
        </div>
      </section>

      {/* ── SAFETY ── */}
      <section id="safety" className="safety-section">
        <div className="section-tag reveal">{tx.safetyTag}</div>
        <h2 className="section-title reveal">{tx.safetyTitle[0]}<br />{tx.safetyTitle[1]}</h2>
        <div className="safety-grid">
          {[
            { badge: lang === "ar" ? "التفعيل" : "Activation", title: lang === "ar" ? "شروط تفعيل الشفرة" : "Blade Motor Conditions", items: lang === "ar" ? ["أجهزة الاستشعار تؤكد منطقة خالية من العوائق", "تم التحقق من حد القرب (>30 سم)", "إشارة الإيقاف الطارئ غير نشطة", "جهد البطارية ضمن النطاق الآمن"] : ["Path sensors confirm obstacle-free zone", "Proximity threshold verified (>30cm)", "Emergency stop signal inactive", "Battery voltage within safe range"] },
            { badge: lang === "ar" ? "الإيقاف" : "Shutdown", title: lang === "ar" ? "مشغلات الإيقاف التلقائي" : "Auto Shutdown Triggers", items: lang === "ar" ? ["تم اكتشاف عائق ضمن 15 سم", "تنشيط مستشعر الميل/الانقلاب", "فقدان اتصال WiFi (>5 ثوانٍ)", "مستوى البطارية حرج (<10%)"] : ["Obstacle detected within 15cm", "Tilt / rollover sensor activated", "WiFi connection lost (>5 sec)", "Battery critical level (<10%)"] },
            { badge: lang === "ar" ? "التحكم" : "Control", title: lang === "ar" ? "مجموعة الأوامر" : "Mobile Command Set", items: lang === "ar" ? ["للأمام — تسريع محركات القيادة", "للخلف — عكس محركات القيادة", "دوران — التدوير في مكانه (يسار/يمين)", "إيقاف — توقف طارئ + إيقاف الشفرة"] : ["Forward — Accelerate drive motors", "Backward — Reverse drive motors", "Spin — Rotate in place (L/R)", "Stop — Emergency halt + blade shutdown"] },
            { badge: lang === "ar" ? "الكفاءة" : "Efficiency", title: lang === "ar" ? "الأداء" : "Performance", items: lang === "ar" ? ["وقت تفعيل الشفرة: <100ms", "عرض حالة الاتصال في الوقت الفعلي", "مراقبة مستوى البطارية", "استجابة أوامر WiFi منخفضة الكمون"] : ["Blade engagement time: <100ms", "Real-time connection status display", "Battery level monitoring", "Low-latency WiFi command response"] },
          ].map(({ badge, title, items }) => (
            <div className="safety-card reveal" key={badge}>
              <span className="safety-badge">{badge}</span>
              <div className="safety-title">{title}</div>
              <ul className="safety-list">
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARKET ── */}
      <section id="market" className="market-section">
        <div className="market-inner">
          <div>
            <div className="section-tag reveal">{tx.marketTag}</div>
            <h2 className="section-title reveal">{tx.marketTitle[0]}<br />{tx.marketTitle[1]}<br />{tx.marketTitle[2]}</h2>
            <p className="market-sub reveal">{tx.marketSub}</p>
            <ul className="advantage-list">
              {[
                ["📍", lang === "ar" ? "مراكز خدمة محلية" : "Local Service Centers", lang === "ar" ? "دعم فوري، بدون تأخيرات مركزية" : "Immediate support, no centralized delays"],
                ["🔧", lang === "ar" ? "قابلية عالية للإصلاح" : "High Repairability", lang === "ar" ? "تصميم معياري لإصلاحات سريعة" : "Modular design for quick fixes"],
                ["💰", lang === "ar" ? "صيانة أقل بنسبة 60%" : "60% Lower Maintenance", lang === "ar" ? "مقارنة بالمنافسين العالميين" : "vs. global competitors"],
                ["🚀", lang === "ar" ? "نشر خلال 4 أسابيع" : "4-Week Deployment", lang === "ar" ? "مقارنة بـ 12+ أسبوعاً للعلامات العالمية" : "vs. 12+ weeks for global brands"],
                ["🏙️", lang === "ar" ? "رؤية المدن الذكية السعودية" : "Saudi Smart City Vision", lang === "ar" ? "متوافق مع استراتيجية نيوم" : "Aligned with NEOM strategy"],
              ].map(([icon, bold, rest]) => (
                <li key={bold as string} className="reveal">
                  <span className="adv-icon">{icon}</span>
                  <div><strong>{bold}</strong> — {rest}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="market-right reveal">
            <div className="section-tag">// {lang === "ar" ? "الهدف السوقي" : "market target"}</div>
            <div className="market-big-num">$480M</div>
            <div className="market-sub-label">{lang === "ar" ? "حجم السوق السعودي" : "KSA MARKET SIZE"}</div>
            <div className="market-stats">
              <div className="market-stat">
                <div className="market-stat-num">$50M</div>
                <div className="market-stat-label">{lang === "ar" ? "الإيرادات المستهدفة 2028" : "TARGET REVENUE 2028"}</div>
              </div>
              <div className="market-stat">
                <div className="market-stat-num">10K+</div>
                <div className="market-stat-label">{lang === "ar" ? "التركيبات" : "INSTALLATIONS"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="faq-section">
        <div className="section-tag reveal">{tx.faqTag}</div>
        <h2 className="section-title reveal">{tx.faqTitle[0]}</h2>
        <div className="faq-list">
          {tx.faqs.map(({ q, a }, i) => (
            <div className="reveal" key={i}>
              <FaqItem
                q={q}
                a={a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section id="roadmap" className="roadmap-section">
        <div className="section-tag reveal">{tx.roadmapTag}</div>
        <h2 className="section-title reveal">{tx.roadmapTitle[0]}<br />{tx.roadmapTitle[1]}</h2>
        <div className="roadmap-track">
          {[
            [lang === "ar" ? "المرحلة 1" : "Phase 1", lang === "ar" ? "برامج نيوم التجريبية" : "NEOM Pilot Programs", "Q1–Q2 2026"],
            [lang === "ar" ? "المرحلة 2" : "Phase 2", lang === "ar" ? "التوسع في السوق السعودي" : "KSA Market Expansion", "Q3–Q4 2026"],
            [lang === "ar" ? "المرحلة 3" : "Phase 3", lang === "ar" ? "القيادة الإقليمية لدول الخليج" : "GCC Regional Leadership", "2027"],
            [lang === "ar" ? "المرحلة 4" : "Phase 4", lang === "ar" ? "الهيمنة على الشرق الأوسط" : "Middle East Dominance", "2028+"],
          ].map(([phase, title, date], i) => (
            <div className="road-step reveal" key={phase as string}>
              <div className={`road-dot${i === 0 ? " active" : ""}`} />
              <div className="road-phase">{phase}</div>
              <div className="road-title">{title}</div>
              <div className="road-date">{date}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" className="team-section">
        <div className="section-tag reveal">{tx.teamTag}</div>
        <h2 className="section-title reveal">{lang === "ar" ? "فريق" : "Team"}<br /><span style={{ color: "var(--gold)" }}>Da3poles</span></h2>
        <p className="team-intro reveal">{tx.teamIntro}</p>
        <div className="team-grid">
          {[
            ["حازم محمد أنور", "91250211"],
            ["عبدالله هاني عبدالله", "91261280"],
            ["كريم حلمي حلمي", "91250530"],
            ["أحمد عبدالله سعد", "91250053"],
            ["عبدالرحمن محمد عبده", "91250363"],
            ["عمر حسين سمير", "91250456"],
            ["عمر مصطفى طه", "91250479"],
            ["عمر ممدوح محمد", "91250480"],
            ["عمرو مجدي عبدالقادر", "91250497"],
            ["عمرو أحمد محمد", "91250490"],
            ["سعيد عماد سعيد", "91250308"],
            ["كريم أيمن سعيد", "91250527"],
            ["أحمد محمد عبدالرازق", "91250071"],
            ["محمد حسين الديب", "91250682"],
            ["محمد محمود يحيى", "91250737"],
          ].map(([name, code]) => (
            <div className="team-card reveal" key={code as string}>
              <div className="team-avatar">👤</div>
              <div className="team-name">{name}</div>
              <div className="team-code">{code}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT FORM ── */}
      <section id="contact" className="contact-section">
        <div className="contact-inner">
          <div className="reveal">
            <div className="section-tag">{tx.contactTag}</div>
            <h2 className="section-title">{tx.contactTitle[0]}<br /><span className="gold">{tx.contactTitle[1]}</span></h2>
            <p className="contact-sub">{tx.contactSub}</p>
            <div className="contact-info-items">
              <div className="contact-info-item">
                <span className="contact-info-icon">📍</span>
                <span>{lang === "ar" ? "جامعة القاهرة، الجيزة، مصر" : "Cairo University, Giza, Egypt"}</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-icon">📧</span>
                <span>da3poles29@gmail.com</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-icon">🌐</span>
                <span>smart-mow-control.vercel.app</span>
              </div>
            </div>
          </div>

          <div className="reveal">
            {formSent ? (
              <div className="form-success">
                <div className="form-success-icon">✓</div>
                <div className="form-success-msg">{tx.contactSuccess}</div>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleForm}>
                <div className="form-row">
                  <div className="form-group">
                    <label>{tx.contactName}</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                      placeholder={lang === "ar" ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed"}
                    />
                  </div>
                  <div className="form-group">
                    <label>{tx.contactEmail}</label>
                    <input
                      type="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState(s => ({ ...s, email: e.target.value }))}
                      placeholder={lang === "ar" ? "مثال: ahmed@company.com" : "e.g. ahmed@company.com"}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{tx.contactOrg}</label>
                  <input
                    type="text"
                    value={formState.org}
                    onChange={(e) => setFormState(s => ({ ...s, org: e.target.value }))}
                    placeholder={lang === "ar" ? "مثال: شركة نيوم" : "e.g. NEOM Company"}
                  />
                </div>
                <div className="form-group">
                  <label>{tx.contactMessage}</label>
                  <textarea
                    required
                    rows={4}
                    value={formState.message}
                    onChange={(e) => setFormState(s => ({ ...s, message: e.target.value }))}
                    placeholder={lang === "ar" ? "أخبرنا عن مشروعك أو اهتمامك..." : "Tell us about your project or interest..."}
                  />
                </div>
                <button type="submit" className="btn-primary form-submit">{tx.contactSubmit}</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="solm-footer">
        <div className="footer-copy">{tx.footerCopy}</div>
        <div className="footer-uni">{tx.footerUni}</div>
      </footer>
    </div>
  );
}
