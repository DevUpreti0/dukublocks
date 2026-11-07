import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const templates = [
  { name: "Studio", type: "Portfolio", color: "violet", shape: "studio", tag: "Popular" },
  { name: "Forma", type: "Business", color: "blue", shape: "forma", tag: "New" },
  { name: "Morrow", type: "Store", color: "orange", shape: "morrow", tag: "E-commerce" },
  { name: "Northstar", type: "Agency", color: "green", shape: "north", tag: "Minimal" }
];


function AdminPortal() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  if (!signedIn) return <div className="admin-screen"><div className="admin-glow"></div><div className="admin-login"><div className="admin-logo">D</div><div className="eyebrow">DUKU FCA · CONTROL CENTRE</div><h1>Administrator <em>access.</em></h1><p>Manage websites, members, publishing and platform settings from one secure place.</p><label>Admin email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@dukubusiness.online"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/></label><button className="primary-btn full" onClick={()=>setNotice("Secure admin authentication is pending database and role setup. No credentials have been activated yet.")}>Continue to admin ↗</button>{notice&&<div className="admin-notice">{notice}</div>}<small>Restricted access · DuKu Business FCA Lab</small></div></div>;
  return <div className="admin-dashboard"><header><div className="brand"><span className="brand-mark">D</span>DuKu <b>FCA ADMIN</b></div><button className="ghost-btn" onClick={()=>setSignedIn(false)}>Sign out</button></header><div className="admin-layout"><aside><div className="eyebrow">CONTROL CENTRE</div>{["Overview","Members","Websites","Domains","Templates","Integrations","Reports","Platform settings","Audit log"].map((x,i)=><button key={x} className={i===0?"selected":""}>{["◫","♙","▣","◎","▦","⌘","▤","⚙","≡"][i]}　{x}</button>)}</aside><main><div className="eyebrow">PLATFORM OPERATIONS</div><h1>Welcome to your <em>command centre.</em></h1><p>Live platform metrics will appear when the database is connected.</p><div className="admin-metrics">{["Registered members","Published websites","Connected domains","Monthly visits"].map((x,i)=><div><small>{x}</small><b>—</b><span>Awaiting data connection</span></div>)}</div><section><h2>Platform management</h2><div className="admin-panels"><article><b>Website moderation</b><p>Review, suspend or restore customer websites.</p></article><article><b>Domain management</b><p>Manage tenant subdomains and custom domain verification.</p></article><article><b>Access control</b><p>Set admin roles, permissions and protected actions.</p></article></div></section><div className="admin-warning">Admin dashboard preview only. Authentication, audit logging and live data access must be enabled before production use.</div></main></div></div>;
}
function TenantSite() {
  const tenant = window.location.hostname.split(".")[0];
  return <div className="tenant-site"><div className="tenant-nav"><b>✦ {tenant}</b><span>HOME　 ABOUT　 CONTACT</span></div><div className="tenant-hero"><div className="eyebrow">POWERED BY DUKU FCA</div><h1>Your website,<br/><em>your own space.</em></h1><p>This DuKu subdomain is reserved for a published website. Once a site is published, its content will appear here.</p><a href="https://dukubusiness.online">Create your own website ↗</a></div><footer>Built with DuKu FCA · Free Website Builder</footer></div>;
}

function readLocalDraft() {
  try { return JSON.parse(window.localStorage.getItem("duku-fca-editor-draft") || "null") || {}; } catch (error) { return {}; }
}

function MainApp() {
  const [active, setActive] = useState("Overview");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("Create your free account");
  const [showEditor, setShowEditor] = useState(false);
  const [siteName, setSiteName] = useState(() => readLocalDraft().siteName || "My first website");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [mobileNav, setMobileNav] = useState(false);
  const [published, setPublished] = useState(false);
  const [headline, setHeadline] = useState(() => readLocalDraft().headline || "Make your next idea unforgettable.");
  const [subline, setSubline] = useState(() => readLocalDraft().subline || "A beautiful online home for everything you do.");
  const [blocks, setBlocks] = useState(() => readLocalDraft().blocks || []);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [seoTitle, setSeoTitle] = useState(() => readLocalDraft().seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(() => readLocalDraft().seoDescription || "");
  const [siteSlug, setSiteSlug] = useState(() => readLocalDraft().siteSlug || "my-website");
  useEffect(() => {
    if (!showEditor) return;
    try { window.localStorage.setItem("duku-fca-editor-draft", JSON.stringify({ siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, updatedAt: new Date().toISOString() })); } catch (error) { /* Local storage may be unavailable in private browsing. */ }
  }, [showEditor, siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug]);
  const filtered = useMemo(() => templates.filter(t => (filter === "All" || t.type === filter) && t.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const addBlock = (label) => {
    const type = label.slice(2).trim();
    const defaults = {
      Text: ["A story worth sharing", "Write something meaningful for your visitors."],
      Image: ["Your visual story", "Add an image from your media library."],
      Button: ["Take the next step", "Explore more"],
      Section: ["A new section", "Introduce another part of your website."],
      Form: ["Get in touch", "Collect messages from your visitors."],
      "Embed code": ["Embedded content", "Add a trusted embed or widget."]
    };
    const [title, content] = defaults[type] || ["New element", "Add your content here."];
    setBlocks(current => current.concat([{ id: Date.now()+Math.random(), type, title, content }]));
  };
  const updateBlock = (id, field, value) => setBlocks(current => current.map(block => block.id===id ? { ...block, [field]: value } : block));
  const moveBlock = (index, direction) => setBlocks(current => {
    const next = [...current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const duplicateBlock = (block) => setBlocks(current => {
    const index = current.findIndex(item => item.id === block.id);
    const copy = { ...block, id: Date.now()+Math.random(), title: (block.title || "Element") + " copy" };
    return [...current.slice(0,index+1), copy, ...current.slice(index+1)];
  });
  const exportDraft = () => { const payload = { product: "DuKu FCA", siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, exportedAt: new Date().toISOString() }; const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = (siteSlug || "duku-fca-site") + "-backup.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); };
  const startEditor = (name) => { const saved = readLocalDraft(); if (name) { setSiteName(name + " website"); setHeadline("Make your next idea unforgettable."); setSubline("A beautiful online home for everything you do."); setBlocks([]); } else if (saved.siteName) { setSiteName(saved.siteName); setHeadline(saved.headline || "Make your next idea unforgettable."); setSubline(saved.subline || "A beautiful online home for everything you do."); setBlocks(saved.blocks || []); setSeoTitle(saved.seoTitle || ""); setSeoDescription(saved.seoDescription || ""); setSiteSlug(saved.siteSlug || "my-website"); } else { setSiteName("My first website"); setHeadline("Make your next idea unforgettable."); setSubline("A beautiful online home for everything you do."); setBlocks([]); } setShowEditor(true); setPublished(false); };
  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button>
      <a className="brand" href="#"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span><small>FREE WEBSITE BUILDER</small></a>
      <nav className="top-links"><a href="#features">Features</a><a href="#templates">Templates</a><a href="#how">How it works</a></nav>
      <div className="top-actions"><button className="text-btn" onClick={() => {setAuthMode("Welcome back");setShowAuth(true)}}>Log in</button><button className="primary-btn small" onClick={() => {setAuthMode("Create your free account");setShowAuth(true)}}>Start for free <span>↗</span></button></div>
    </header>
    <div className="layout">
      <aside className={"sidebar " + (mobileNav ? "open" : "")}>
        <div className="workspace"><div className="workspace-icon">D</div><div><b>My workspace</b><small>Free plan</small></div><span className="chevron">⌄</span></div>
        <div className="side-label">WORKSPACE</div>
        {["Overview","My websites","Templates","Domains","Media library"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>{setActive(item);setMobileNav(false);if(item==="Templates")document.getElementById("templates")?.scrollIntoView({behavior:"smooth"})}}><span>{["⌂","▣","▦","◎","▤"][i]}</span>{item}{item==="My websites" ? <i>0</i> : null}</button>)}
        <div className="side-label second">TOOLS</div>
        {["App integrations","Analytics","Help centre"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>setActive(item)}><span>{["⌘","↗","?"][i]}</span>{item}</button>)}
        <div className="side-bottom"><div className="upgrade-card"><div className="spark">✦</div><b>Build without limits</b><p>Explore more ways to grow your online presence.</p><button onClick={()=>setShowAuth(true)}>Explore plans ↗</button></div><div className="profile-row"><div className="avatar">G</div><div><b>Guest workspace</b><small>Sign in to sync your work</small></div><span>···</span></div></div>
      </aside>
      <main className="main-content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"></span> YOUR CREATIVE SPACE</div><h1>Build something <em>brilliant.</em></h1><p className="welcome-copy">Your ideas deserve a place on the internet. Make it happen with DuKu FCA.</p></div><div className="welcome-orb"><div className="orb-inner">D<span>✦</span></div><i className="orbit-dot one"></i><i className="orbit-dot two"></i></div></div>
        <section className="launch-card"><div className="launch-copy"><div className="pill"><span></span> YOUR NEXT BIG THING STARTS HERE</div><h2>From blank canvas<br/>to <span>live website.</span></h2><p>Design, customise and publish a website that feels unmistakably yours. No code required.</p><div className="launch-actions"><button className="primary-btn" onClick={()=>startEditor()}>Create a website <span>↗</span></button><button className="ghost-btn" onClick={()=>document.getElementById("templates").scrollIntoView({behavior:"smooth"})}>Explore templates <span>→</span></button></div><div className="trust-line"><span>✦</span> Free to start <b>·</b> No credit card required <b>·</b> Your site, your rules</div></div><div className="launch-art"><div className="float-card card-a"><span className="mini-icon">✦</span><div><b>Creative freedom</b><small>Make it yours</small></div></div><div className="browser-mock"><div className="browser-bar"><i></i><i></i><i></i><span>yourbrand.dukubusiness.online</span></div><div className="mock-page"><div className="mock-nav"><b>STUDIO<span>®</span></b><small>WORK　 ABOUT　 CONTACT</small></div><div className="mock-hero"><div><small>DESIGN THAT MOVES YOU</small><strong>Ideas into<br/><i>experiences.</i></strong><span className="mock-button">DISCOVER MORE ↗</span></div><div className="mock-image"><div className="mock-sun"></div><div className="mock-arch"></div></div></div></div></div><div className="float-card card-b"><span className="check-icon">✓</span><div><b>Ready to publish</b><small>Your vision, online</small></div></div><div className="art-glow"></div></div></section>
        <div className="stats-strip"><div><b>01</b><span>Start with an idea</span></div><div><b>02</b><span>Make it your own</span></div><div><b>03</b><span>Publish to the world</span></div><div className="stats-note">A simpler way to build online <span>✳</span></div></div>
        <section className="templates-section" id="templates"><div className="section-heading"><div><div className="eyebrow">A HEAD START FOR YOUR IDEAS</div><h2>Find your <em>starting point.</em></h2><p>Pick a design. Make it yours. The rest is up to you.</p></div><button className="view-all" onClick={()=>setFilter("All")}>View all templates <span>↗</span></button></div><div className="template-tools"><div className="filter-pills">{["All","Business","Portfolio","Store","Agency"].map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates"/></div></div><div className="template-grid">{filtered.map(t=><article className="template-card" key={t.name}><div className={"template-preview "+t.color}><div className="template-window"><div className="window-top"><span>● ● ●</span><small>{t.name.toLowerCase()}.studio</small></div><div className={"preview-design "+t.shape}><div className="preview-copy"><small>{t.type.toUpperCase()} TEMPLATE</small><b>{t.shape==="studio"?"Create with intention.":t.shape==="forma"?"Your work. Your world.":t.shape==="morrow"?"Everyday, elevated.":"Make good things happen."}</b><i></i></div><div className="preview-shape"></div></div></div><span className="template-tag">{t.tag}</span></div><div className="template-meta"><div><b>{t.name}</b><small>{t.type} · Responsive</small></div><button onClick={()=>startEditor(t.name)}>Use template <span>↗</span></button></div></article>)}</div>{filtered.length===0&&<div className="empty-state">No templates match that search. Try another name or category.</div>}</section>
        <section className="feature-section" id="features"><div className="eyebrow">EVERYTHING IN ONE PLACE</div><h2>Tools that make the<br/><em>hard part feel easy.</em></h2><div className="feature-grid"><div className="feature-card"><span>✥</span><h3>Visual website editor</h3><p>Arrange sections, update content and shape your site with a visual-first workflow.</p></div><div className="feature-card"><span>◈</span><h3>Responsive by design</h3><p>Create experiences that look considered on desktop, tablet and mobile.</p></div><div className="feature-card"><span>⌘</span><h3>Connect your stack</h3><p>Plan integrations for APIs, databases, forms and the tools your business already uses.</p></div><div className="feature-card"><span>↗</span><h3>Your own web address</h3><p>Publish on a DuKu subdomain and connect a domain you already own.</p></div></div></section>
        <section className="bottom-cta" id="how"><div><div className="eyebrow">YOUR NEXT CHAPTER IS ONLINE</div><h2>Good ideas look better<br/>on the <em>internet.</em></h2><p>Start building your website with DuKu FCA.</p></div><button className="primary-btn" onClick={()=>{setAuthMode("Create your free account");setShowAuth(true)}}>Create your free account ↗</button><div className="cta-star">✳</div></section>
        <footer><a className="brand footer-brand" href="#"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></a><span>© 2026 DuKu Business. Built for what's next.</span><div><a href="#features">Features</a><a href="#templates">Templates</a><a href="mailto:support@dukubusiness.online">Support</a></div></footer>
      </main>
    </div>
    {showAuth&&<div className="modal-backdrop" onClick={()=>setShowAuth(false)}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowAuth(false)}>×</button><div className="modal-mark">D</div><div className="eyebrow">WELCOME TO DUKU FCA</div><h2>{authMode}</h2><p>Save your projects, publish websites and manage everything in one place.</p><label>Email address<input type="email" placeholder="you@example.com"/></label><label>Password<input type="password" placeholder="At least 8 characters"/></label><button className="primary-btn full" onClick={()=>alert("Account services are being connected. Your signup will be enabled after secure authentication is configured.")}>{authMode==="Welcome back"?"Log in":"Create account"} ↗</button><small className="modal-legal">Authentication is not live yet. Connect the platform database to enable secure accounts.</small><button className="switch-auth" onClick={()=>setAuthMode(authMode==="Welcome back"?"Create your free account":"Welcome back")}>{authMode==="Welcome back"?"New to DuKu FCA? Create an account":"Already have an account? Log in"}</button></div></div>}
    {showEditor&&<div className="editor-overlay"><div className="editor-top"><button className="brand editor-brand" onClick={()=>setShowEditor(false)}><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></button><div className="editor-site"><input value={siteName} onChange={e=>setSiteName(e.target.value)}/><span className="saved">● Auto-saved on this device</span></div><div className="editor-actions"><button className="ghost-btn" onClick={exportDraft}>Export backup ↓</button><button className="ghost-btn" onClick={()=>setShowEditor(false)}>Exit editor</button><button className="primary-btn small" onClick={()=>setPublished(true)}>Publish ↗</button></div></div><div className="editor-workspace"><aside className="editor-tools"><b>ADD ELEMENTS</b>{["＋ Text","▧ Image","▤ Button","▥ Section","▱ Form","⌘ Embed code"].map(x=><button key={x} onClick={()=>addBlock(x)}>{x}</button>)}<div className="editor-help">Select text in the preview to edit your content.</div></aside><div className="editor-canvas-wrap"><div className="canvas-toolbar"><span>Live preview · {previewDevice==="desktop"?"Desktop":previewDevice==="tablet"?"Tablet":"Mobile"}</span><div className="device-switch"><button className={previewDevice==="desktop"?"active":""} onClick={()=>setPreviewDevice("desktop")}>Desktop</button><button className={previewDevice==="tablet"?"active":""} onClick={()=>setPreviewDevice("tablet")}>Tablet</button><button className={previewDevice==="mobile"?"active":""} onClick={()=>setPreviewDevice("mobile")}>Mobile</button></div></div><div className={"site-canvas preview-"+previewDevice}><div className="canvas-nav"><b>{siteName.toUpperCase()}</b><span>HOME　 ABOUT　 SERVICES　 CONTACT</span><button>LET'S TALK ↗</button></div><div className="canvas-hero"><div className="canvas-copy"><small>DESIGNED WITH DUKU FCA</small><h1 contentEditable suppressContentEditableWarning onBlur={e=>setHeadline(e.currentTarget.textContent)}>{headline}</h1><p contentEditable suppressContentEditableWarning onBlur={e=>setSubline(e.currentTarget.textContent)}>{subline}</p><button>Explore more ↗</button></div><div className="canvas-art"><div className="canvas-disc"></div><div className="canvas-block"></div></div></div><div className="canvas-lower"><span>01 / WHAT WE DO</span><b>Thoughtful design. Clear purpose.</b><span>SCROLL TO EXPLORE ↓</span></div>{blocks.map((block,index)=><div className="editor-added-block" key={block.id}><div className="block-editor-fields"><small>CONTENT BLOCK · {String(index+1).padStart(2,"0")} · {block.type.toUpperCase()}</small><input aria-label="Block heading" value={block.title||""} onChange={e=>updateBlock(block.id,"title",e.target.value)} placeholder="Block heading"/><textarea aria-label="Block content" value={block.content||""} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder="Write your content here."/></div><div className="block-controls"><button disabled={index===0} onClick={()=>moveBlock(index,-1)} title="Move up">↑</button><button disabled={index===blocks.length-1} onClick={()=>moveBlock(index,1)} title="Move down">↓</button><button onClick={()=>duplicateBlock(block)}>Duplicate</button><button onClick={()=>setBlocks(current=>current.filter(item=>item.id!==block.id))}>Remove</button></div></div>)}</div></div><aside className="properties"><b>PAGE SETTINGS</b><label>Page title<input value={siteName} onChange={e=>setSiteName(e.target.value)}/></label><label>Hero headline<textarea value={headline} onChange={e=>setHeadline(e.target.value)}/></label><label>Hero description<textarea value={subline} onChange={e=>setSubline(e.target.value)}/></label><div className="property-divider"></div><b>SEO & SEARCH</b><label>Search title<input value={seoTitle} onChange={e=>setSeoTitle(e.target.value)} placeholder={siteName}/></label><label>Meta description<textarea value={seoDescription} onChange={e=>setSeoDescription(e.target.value)} placeholder="Describe this page for search engines."/></label><label>Page URL slug<input value={siteSlug} onChange={e=>setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}/></label><div className="seo-preview"><small>SEARCH PREVIEW</small><b>{seoTitle||siteName}</b><span>dukubusiness.online/{siteSlug}</span><p>{seoDescription||"Your page description will appear here in search results."}</p></div><div className="property-note">Changes update the preview and save on this device. SEO settings are draft-only until publishing is connected.</div></aside></div>{published&&<div className="publish-toast">✓ Publish flow previewed. Connect hosting and a database to make this site live.</div>}</div>}
  </div>;
}
function App() {
  const host = window.location.hostname;
  if (host.startsWith("admin.")) return <AdminPortal />;
  if (host !== "dukubusiness.online" && host !== "www.dukubusiness.online" && host.endsWith(".dukubusiness.online")) return <TenantSite />;
  return <MainApp />;
}

export default App;
