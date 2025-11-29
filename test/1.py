import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { LogIn, PlayCircle, Github, Menu, X, ShieldCheck, Network, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// --- THEME TOKENS ---
const brand = {
  primary: "#e50914", // Netflix red vibe
  primaryDark: "#b20710",
  bg: "#0b0b0d", // near-black
  panel: "rgba(255,255,255,0.06)",
  text: "#f5f7fa",
  textMuted: "#aeb3c2",
  grid: "rgba(255,255,255,0.05)",
};

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl" style={{background: "linear-gradient(180deg, rgba(11,11,13,0.85), rgba(11,11,13,0.55))"}}>
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg" style={{background: `conic-gradient(from 180deg at 50% 50%, ${brand.primary}, ${brand.primaryDark})`}}></div>
          <span className="font-semibold tracking-wide" style={{color: brand.text}}>SocioSith</span>
        </Link>
        <div className=\"hidden md:flex items-center gap-6\">
          <Link className=\"text-sm hover:opacity-90\" style={{color: brand.text}} to=\"/\">Home</Link>
          <Link className=\"text-sm hover:opacity-90\" style={{color: brand.text}} to=\"/about\">About Us</Link>
          <Link className=\"text-sm hover:opacity-90\" style={{color: brand.text}} to=\"/support\">Customer Support</Link>
        </div>
        <div className=\"hidden md:flex items-center gap-3\">
          <Link to=\"/login\" className=\"inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border border-white/15 hover:border-white/30 transition\" style={{color: brand.text}}><LogIn className=\"h-4 w-4\" /> Login</Link>
          <Link to=\"/register\" className=\"inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border border-white/15 hover:border-white/30 transition\" style={{color: brand.text}}>Register</Link>
          <a href=\"https://github.com\" target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border border-white/15 hover:border-white/30 transition\" style={{color: brand.text}}><Github className=\"h-4 w-4\" /></a>
        </div>
        <button className="md:hidden p-2 rounded-lg border border-white/15" onClick={() => setOpen(!open)}>
          {open ? <X color={brand.text} /> : <Menu color={brand.text} />}
        </button>
      </nav>
      {open && (
        <div className=\"md:hidden px-4 pb-4 space-y-2\">
          <Link className=\"block text-sm\" style={{color: brand.text}} to=\"/\" onClick={()=>setOpen(false)}>Home</Link>
          <Link className=\"block text-sm\" style={{color: brand.text}} to=\"/about\" onClick={()=>setOpen(false)}>About Us</Link>
          <Link className=\"block text-sm\" style={{color: brand.text}} to=\"/support\" onClick={()=>setOpen(false)}>Customer Support</Link>
          <Link className=\"block text-sm\" style={{color: brand.text}} to=\"/login\" onClick={()=>setOpen(false)}>Login</Link>
          <Link className=\"block text-sm\" style={{color: brand.text}} to=\"/register\" onClick={()=>setOpen(false)}>Register</Link>
        </div>
      )}
    </header>
  );
}

function TechGridBackground() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      {/* dark base */}
      <div className="absolute inset-0" style={{backgroundColor: brand.bg}} />
      {/* radial glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[720px] rounded-full blur-3xl opacity-40" style={{background: `radial-gradient(ellipse at center, ${brand.primary}33, transparent 60%)`}} />
      {/* grid */}
      <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={brand.grid} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* angled accent */}
      <div className="absolute -right-24 top-20 h-64 w-64 rotate-12 rounded-3xl blur-2xl" style={{background: `linear-gradient(135deg, ${brand.primary}33, transparent)`}} />
    </div>
  );
}

function Home() {
  return (
    <main className="pt-24">
      <TechGridBackground />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <motion.h1
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            className="text-4xl md:text-5xl font-extrabold leading-tight"
            style={{color: brand.text}}
          >
            Gain Deep Insights <span className=\"whitespace-nowrap\">With <span style={{color: brand.primary}}>SocioSith</span></span>
          </motion.h1>
          <p className="mt-4 text-base md:text-lg" style={{color: brand.textMuted}}>
            Discover patterns and trends in social media that drive engagement and growth. SocioSith offers powerful tools to transform your strategy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg" style={{background: brand.primary, color: "white"}}>
              <LogIn className="h-4 w-4" /> Try Login Mock
            </Link>
            <button className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold border border-white/20" style={{color: brand.text}}>
              <PlayCircle className="h-4 w-4" /> View Demo (placeholder)
            </button>
          </div>
          <div id="features" className="mt-12 grid sm:grid-cols-2 gap-4">
            <Feature icon={<Network />} title="Network Graph">
              Static placeholder; wire data in Phase 2.
            </Feature>
            <Feature icon={<ShieldCheck />} title="Auth Ready">
              Route scaffolding for Login/Signup.
            </Feature>
          </div>
        </div>
        <HeroCard />
      </section>

      <section id="whyus" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <Panel>
          <div className="grid md:grid-cols-3 gap-6">
            <Stat kpi="0 APIs" label="No backend required (yet)" />
            <Stat kpi="< 5 min" label="Spin up & run locally" />
            <Stat kpi="100%" label="Router-ready pages" />
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Feature({ icon, title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4 backdrop-blur" style={{background: brand.panel}}>
      <div className="flex items-center gap-2">
        <span className="p-2 rounded-xl border border-white/10" style={{background: "rgba(229,9,20,0.1)", color: brand.text}}>
          {icon}
        </span>
        <h3 className="font-semibold" style={{color: brand.text}}>{title}</h3>
      </div>
      <p className="mt-2 text-sm" style={{color: brand.textMuted}}>{children}</p>
    </div>
  );
}

function Panel({ children }) {
  return (
    <div className="rounded-3xl border border-white/10 p-6" style={{background: brand.panel}}>
      {children}
    </div>
  );
}

function Stat({ kpi, label }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold" style={{color: brand.text}}>{kpi}</div>
      <div className="text-sm mt-1" style={{color: brand.textMuted}}>{label}</div>
    </div>
  );
}

function HeroCard() {
  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.6, delay: 0.1}}
      className="relative"
    >
      <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl" style={{background: brand.panel}}>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{background: brand.primary}}></span>
            <span className="h-2 w-2 rounded-full bg-white/40"></span>
            <span className="h-2 w-2 rounded-full bg-white/20"></span>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 p-4" style={{background: "rgba(255,255,255,0.03)"}}>
            <div className="flex items-center gap-2">
              <Sparkles color={brand.primary} className="h-4 w-4" />
              <p className="text-sm" style={{color: brand.text}}>Network preview (mock)</p>
            </div>
            {/* Placeholder graph */}
            <div className="mt-4 h-56 relative">
              {Array.from({ length: 22 }).map((_, i) => (
                <span key={i} className="absolute h-2 w-2 rounded-full" style={{
                  background: i%5===0 ? brand.primary : "#ffffff33",
                  left: `${Math.random()*90+5}%`,
                  top: `${Math.random()*80+10}%`
                }} />
              ))}
              {/* lines */}
              <svg className="absolute inset-0 w-full h-full">
                {[...Array(14)].map((_, i) => (
                  <line key={i} x1={`${Math.random()*100}%`} y1={`${Math.random()*100}%`} x2={`${Math.random()*100}%`} y2={`${Math.random()*100}%`} stroke={brand.primary} strokeOpacity="0.25" />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function mockLogin() {
    // No backend call — just a placeholder
    if (!email || !password) {
      alert("Please enter email & password (mock only)");
      return;
    }
    alert(`Logged in as ${email} (mock)`);
    navigate("/");
  }

  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>Welcome back</h2>
          <p className="text-sm mt-1" style={{color: brand.textMuted}}>Use any email & password — this is a front-end mock.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm" style={{color: brand.text}}>Email</span>
              <input
                className="mt-1 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2"
                style={{color: brand.text, caretColor: brand.primary}}
                placeholder="you@example.com"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm" style={{color: brand.text}}>Password</span>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2"
                style={{color: brand.text, caretColor: brand.primary}}
                placeholder="••••••••"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />
            </label>
            <button onClick={mockLogin} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg" style={{background: brand.primary, color: "white"}}>
              <LogIn className="h-4 w-4" /> Login (Mock)
            </button>
            <button className="w-full rounded-2xl px-5 py-3 text-sm font-semibold border border-white/15" style={{color: brand.text}}>
              Continue with Google (placeholder)
            </button>
          </div>
        </Panel>
      </div>
    </main>
  );
}

// --- Extra pages (Phase 1 placeholders) ---
function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();
  function mockRegister() {
    if (!email || !password || password !== confirm) {
      alert("Please fill all fields and ensure passwords match (mock).");
      return;
    }
    alert(`Registered ${email} (mock)`);
    navigate("/login");
  }
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>Create your account</h2>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm" style={{color: brand.text}}>Email</span>
              <input className="mt-1 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2" style={{color: brand.text, caretColor: brand.primary}} placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm" style={{color: brand.text}}>Password</span>
              <input type="password" className="mt-1 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2" style={{color: brand.text, caretColor: brand.primary}} placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm" style={{color: brand.text}}>Confirm Password</span>
              <input type="password" className="mt-1 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2" style={{color: brand.text, caretColor: brand.primary}} placeholder="••••••••" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            </label>
            <button onClick={mockRegister} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg" style={{background: brand.primary, color: "white"}}>Register (Mock)</button>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function About() {
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>About SocioSith</h2>
          <p className="mt-3 text-sm" style={{color: brand.textMuted}}>We analyze social graphs to reveal collaboration patterns, audience overlaps, and growth levers. This page is a placeholder for Phase 1.</p>
        </Panel>
      </div>
    </main>
  );
}

function Support() {
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>Customer Support</h2>
          <p className="mt-3 text-sm" style={{color: brand.textMuted}}>Have questions? In Phase 2 we'll hook this to a ticket system. For now, this is static content.</p>
        </Panel>
      </div>
    </main>
  );
}

function Demo() {
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>Platform Demo</h2>
          <p className="mt-2 text-sm" style={{color: brand.textMuted}}>Watch a short video to understand our features. Replace the URL with your own demo.</p>
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
            <iframe className="w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Plans() {
  const plans = [
    { name:'Free', price:'$0', cta:'Get Started', features:['1 saved graph','Basic analytics','Email support (48h)'] },
    { name:'Basic', price:'$9/mo', cta:'Choose Basic', features:['5 saved graphs','Channel comparisons','Standard support (24h)'] },
    { name:'Pro', price:'$29/mo', cta:'Choose Pro', features:['Unlimited graphs','CSV export','Priority support (4h)'] }
  ];
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>Subscription Plans</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {plans.map(p => (
              <div key={p.name} className="rounded-2xl border border-white/10 p-5" style={{background:'rgba(255,255,255,0.04)'}}>
                <div className="text-lg font-semibold" style={{color: brand.text}}>{p.name}</div>
                <div className="mt-1 text-3xl font-bold" style={{color: brand.text}}>{p.price}</div>
                <ul className="mt-4 space-y-2 text-sm" style={{color: brand.textMuted}}>{p.features.map(f=> <li key={f}>• {f}</li>)}</ul>
                <Link to="/register" className="mt-5 inline-block rounded-xl px-4 py-2 font-semibold" style={{background: brand.primary, color:'white'}}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Reviews() {
  const items = [
    {author:'Maya, Creator', text:'SocioSith helped me spot collaboration opportunities in a week.'},
    {author:'Tim, Analyst', text:'The graph view made audience overlaps obvious to our team.'},
    {author:'Nick, Marketing', text:'Clean UI, fast insights. Can\'t wait for Pro features.'}
  ];
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>What Users Say</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {items.map((r,i)=> (
              <div key={i} className="rounded-2xl border border-white/10 p-5" style={{background:'rgba(255,255,255,0.04)'}}>
                <p className="text-sm" style={{color: brand.text}}>{r.text}</p>
                <div className="mt-3 text-xs" style={{color: brand.textMuted}}>— {r.author}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function SupportChat() {
  const [thread, setThread] = useState([{from:'support', text:'Hi! How can we help today?'}]);
  const [msg, setMsg] = useState('');
  function send(){
    if(!msg.trim()) return;
    setThread(t=>[...t, {from:'you', text: msg}]);
    setMsg('');
    setTimeout(()=>{
      setThread(t=>[...t, {from:'support', text:'Thanks! We\'ll reply within 24h. (mock response)'}]);
    }, 800);
  }
  return (
    <main className="pt-24 min-h-screen">
      <TechGridBackground />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <Panel>
          <h2 className="text-2xl font-semibold" style={{color: brand.text}}>Customer Support</h2>
          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 p-4" style={{background:'rgba(255,255,255,0.03)'}}>
            {thread.map((m,i)=> (
              <div key={i} className={m.from==='you' ? 'text-right' : 'text-left'}>
                <span className="inline-block rounded-xl px-3 py-2 text-sm" style={{background:m.from==='you'? 'rgba(229,9,20,0.15)':'rgba(255,255,255,0.06)', color: brand.text}}>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="flex-1 rounded-xl border border-white/15 bg-transparent px-3 py-2" style={{color: brand.text}} placeholder="Type your question..." value={msg} onChange={e=>setMsg(e.target.value)} />
            <button onClick={send} className="rounded-xl px-4 py-2 font-semibold" style={{background: brand.primary, color:'white'}}>Send</button>
          </div>
          <p className="mt-3 text-xs" style={{color: brand.textMuted}}>Front-end mock only. Phase 2 will connect to ticket backend.</p>
        </Panel>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Router>
      <div style={{background: brand.bg, minHeight: "100vh"}}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support-chat" element={<SupportChat />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/reviews" element={<Reviews />} />
        </Routes>
        <footer className="border-t border-white/10 mt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
            <span className="text-xs" style={{color: brand.textMuted}}>© {new Date().getFullYear()} SocioSith</span>
            <a href="#" className="text-xs hover:underline" style={{color: brand.text}}>Privacy</a>
          </div>
        </footer>
      </div>
    </Router>
  );
}