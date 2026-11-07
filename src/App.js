import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

const templates = [
  { name: "Studio", type: "Portfolio", color: "violet", shape: "studio", tag: "Popular" },
  { name: "Forma", type: "Business", color: "blue", shape: "forma", tag: "New" },
  { name: "Morrow", type: "Store", color: "orange", shape: "morrow", tag: "E-commerce" },
  { name: "Northstar", type: "Agency", color: "green", shape: "north", tag: "Minimal" }
];

function safeTenantLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  if (/^\/(?!\/)/.test(raw)) return raw;
  return "";
}

function safeEmbedUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return "";
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) : "";
    }
    if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
      const id = url.searchParams.get("v") || (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : "");
      return id ? "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) : "";
    }
    if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? "https://player.vimeo.com/video/" + id : "";
    }
    return "";
  } catch (error) { return ""; }
}


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
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageSlug = window.location.pathname.split("/").filter(Boolean)[0] || "";
  const [formValues, setFormValues] = useState({});
  const [formStatus, setFormStatus] = useState({});

  const submitPublishedForm = async (event, block) => {
    event.preventDefault();
    const values = formValues[block.id] || {};
    setFormStatus(current => ({ ...current, [block.id]: "Sending…" }));
    const { error } = await supabase.rpc("submit_site_form", {
      p_subdomain: tenant,
      p_form_title: block.title || "Website form",
      p_sender_name: values.name || "",
      p_sender_email: values.email || "",
      p_message: values.message || ""
    });
    setFormStatus(current => ({ ...current, [block.id]: error ? (error.message || "Could not send. Please try again.") : "Thanks! Your message has been sent." }));
    if (!error) setFormValues(current => ({ ...current, [block.id]: { name: "", email: "", message: "" } }));
  };
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) { setLoading(false); return () => { active = false; }; }
    supabase.rpc("get_published_site", { p_subdomain: tenant }).then(({ data, error }) => {
      if (!active) return;
      if (!error && data) setSite(data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [tenant]);
  const pages = site && Array.isArray(site.pages) ? site.pages : [];
  const currentPage = pages.find(page => page.slug === pageSlug) || pages.find(page => page.is_homepage) || pages[0];
  const content = currentPage && currentPage.content ? currentPage.content : {};
  const blocks = Array.isArray(content.sections) ? content.sections : [];
  useEffect(() => {
    if (!site || !currentPage || !isSupabaseConfigured) return;
    let referrerHost = null;
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch (error) { referrerHost = null; }
    supabase.rpc("track_site_page_view", { p_subdomain: tenant, p_page_slug: currentPage.slug || "", p_referrer_host: referrerHost });
  }, [site, currentPage, tenant]);
  useEffect(() => {
    if (!site || !currentPage) return;
    document.title = (currentPage.seo && currentPage.seo.title) || (site.seo_settings && site.seo_settings.title) || site.name;
    const description = (currentPage.seo && currentPage.seo.description) || (site.seo_settings && site.seo_settings.description) || "";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
  }, [site, currentPage]);
  if (loading) return <div className="tenant-site"><div className="tenant-loading">Loading published website…</div></div>;
  if (!site || !currentPage) return <div className="tenant-site"><div className="tenant-nav"><b>✦ {tenant}</b><a href="https://dukubusiness.online">DuKu FCA</a></div><div className="tenant-hero"><div className="eyebrow">DUKU FCA WEBSITE</div><h1>This website is <em>not available.</em></h1><p>It may not have been published yet, or the address may be incorrect.</p><a href="https://dukubusiness.online">Create your own website ↗</a></div><footer>Built with DuKu FCA · Free Website Builder</footer></div>;
  const appearance=site.site_settings||{};
  const tenantStyle={"--tenant-accent":appearance.brandColor||"#7c5ce0","--tenant-surface":appearance.surfaceColor||"#ffffff",fontFamily:appearance.siteFont||"Inter,Arial,sans-serif"};
  return <div className={"tenant-site tenant-published tenant-header-"+(appearance.headerStyle||"standard")} style={tenantStyle}>
    <div className="tenant-nav"><b>{appearance.logoText||site.name}</b><nav>{pages.map(page => <a key={page.id} href={page.is_homepage ? "/" : "/" + page.slug}>{page.title}</a>)}{(()=>{const rows=String(appearance.customNavText||"").split("\n").map(line=>{const parts=line.replace(/^\s*-\s*/,"").split("|");const rawHref=(parts.slice(1).join("|")||"").trim();return {child:/^\s*-/.test(line),label:(parts[0]||"").trim(),href:rawHref==="#"?"#":safeTenantLink(rawHref)};}).filter(row=>row.label&&row.href);const output=[];for(let i=0;i<rows.length;i++){const row=rows[i];if(!row.child&&rows[i+1]?.child){const children=[];while(rows[i+1]?.child){children.push(rows[++i]);}output.push(<details className="tenant-nav-dropdown" key={"menu-"+i}><summary>{row.label}</summary><div className="tenant-nav-dropdown-menu">{children.map((child,j)=><a key={j} href={child.href} target={/^https:\/\//i.test(child.href)?"_blank":undefined} rel={/^https:\/\//i.test(child.href)?"noopener noreferrer":undefined}>{child.label}</a>)}</div></details>);}else if(!row.child){output.push(<a key={"custom-"+i} href={row.href} target={/^https:\/\//i.test(row.href)?"_blank":undefined} rel={/^https:\/\//i.test(row.href)?"noopener noreferrer":undefined}>{row.label}</a>);}}return output;})()}</nav></div>
    <main className="tenant-published-main">
      <section className="tenant-published-hero"><div className="eyebrow">POWERED BY DUKU FCA</div><h1>{content.headline || site.name}</h1><p>{content.subline || ""}</p></section>
      {blocks.map((block,index) => {
        const type = String(block.type || "Text").toLowerCase();
        const asset = type === "image" ? (site.assets || []).find(item => item.id === block.assetId) : null;
        const link = safeTenantLink(block.linkUrl);
        const embed = type === "embed code" ? safeEmbedUrl(block.content) : "";
        const values = formValues[block.id] || { name: "", email: "", message: "" };
        return <section className={"tenant-content-block tenant-block-" + type.replace(/[^a-z]/g,"")} key={block.id || index} style={{maxWidth:block.widthMode==="standard"?"760px":block.widthMode==="wide"?"1100px":"none",width:block.widthMode==="full"?"100%":"calc(100% - 48px)",margin:block.widthMode==="full"?"20px 0":"20px auto",background:block.backgroundColor||undefined,textAlign:block.textAlign||"left",padding:(block.padding||24)+"px"}}>
          <div className="eyebrow">{String(index+1).padStart(2,"0")} · {(block.type || "CONTENT").toUpperCase()}</div>
          {type !== "button" && <h2>{block.title}</h2>}
          {type === "image" ? (asset && asset.public_url ? <img className="tenant-published-image" src={asset.public_url} alt={asset.alt_text || block.title || asset.file_name || "Website image"} loading="lazy" /> : <div className="tenant-image-placeholder">This image is not available yet.</div>) :
          type === "button" ? <div className="tenant-button-wrap">{link ? <a className="tenant-action-button" href={link} target={/^https:\/\//i.test(link) ? "_blank" : undefined} rel={/^https:\/\//i.test(link) ? "noopener noreferrer" : undefined}>{block.content || "Learn more"} ↗</a> : <span className="tenant-disabled-button">{block.content || "Button link not configured"}</span>}</div> :
          type === "form" ? <form className="tenant-contact-form" onSubmit={event => submitPublishedForm(event, block)}>
            <label>Your name<input required maxLength="120" value={values.name} onChange={event => setFormValues(current => ({ ...current, [block.id]: { ...values, name: event.target.value } }))} /></label>
            <label>Email address<input required type="email" maxLength="254" value={values.email} onChange={event => setFormValues(current => ({ ...current, [block.id]: { ...values, email: event.target.value } }))} /></label>
            <label>Message<textarea required maxLength="5000" rows="4" value={values.message} onChange={event => setFormValues(current => ({ ...current, [block.id]: { ...values, message: event.target.value } }))} /></label>
            <button type="submit" disabled={String(formStatus[block.id] || "").startsWith("Sending")}>Send message ↗</button>
            {formStatus[block.id] && <p className="tenant-form-status" role="status">{formStatus[block.id]}</p>}
          </form> :
          type === "embed code" ? (embed ? <div className="tenant-embed-frame"><iframe src={embed} title={block.title || "Embedded video"} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className="tenant-image-placeholder">Add a valid YouTube or Vimeo URL in the editor to display this embed.</div>) :
          type === "gallery" ? <div className="tenant-gallery-grid">{(block.items||[]).map((item,i)=>{const image=(site.assets||[]).find(asset=>asset.id===item.assetId);return image?.public_url?<figure key={i}><img src={image.public_url} alt={item.caption||image.alt_text||"Gallery image"} loading="lazy"/>{item.caption&&<figcaption>{item.caption}</figcaption>}</figure>:null;})}</div> :
          type === "testimonials" ? <div className="tenant-testimonial-grid">{(block.items||[]).map((item,i)=><article key={i}><div className="tenant-stars">★★★★★</div><blockquote>{item.quote}</blockquote><b>{item.name}</b><small>{item.role}</small></article>)}</div> :
          type === "pricing" ? <div className="tenant-pricing-grid">{(block.items||[]).map((item,i)=><article className={item.featured?"featured":""} key={i}><h3>{item.name}</h3><strong>{item.price}<small>{item.period}</small></strong><ul>{String(item.features||"").split("\\n").filter(Boolean).map((feature,j)=><li key={j}>{feature}</li>)}</ul></article>)}</div> :
          type === "faq" ? <div className="tenant-faq-list">{(block.items||[]).map((item,i)=><details key={i}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div> :
          type === "stats" ? <div className="tenant-stats-grid">{(block.items||[]).map((item,i)=><article key={i}><strong>{item.value}</strong><span>{item.label}</span></article>)}</div> :
          type === "team" ? <div className="tenant-team-grid">{(block.items||[]).map((item,i)=><article key={i}><div className="tenant-team-avatar">{String(item.name||"T").trim().charAt(0).toUpperCase()}</div><h3>{item.name}</h3><b>{item.role}</b><p>{item.bio}</p></article>)}</div> :
          type === "logo strip" ? <div className="tenant-logo-strip">{(block.items||[]).map((item,i)=><span key={i}>{item.name}</span>)}</div> :
          type === "columns" ? <div className={"tenant-columns-grid tenant-columns-"+Math.min(4,Math.max(1,(block.items||[]).length))}>{(block.items||[]).map((item,i)=><article key={i}><h3>{item.title}</h3><p>{item.content}</p>{item.linkLabel&&safeTenantLink(item.linkUrl)&&<a href={safeTenantLink(item.linkUrl)}>{item.linkLabel} ↗</a>}</article>)}</div> :
          type === "container" ? <div className={"tenant-nested-container tenant-nested-"+(block.containerStyle||"card")} style={{gap:(Number(block.containerGap)||14)+"px",borderRadius:(Number(block.containerRadius)||18)+"px",borderWidth:(Number(block.containerBorderWidth)||1)+"px"}}>{(block.children||[]).map(child=><div className={"tenant-nested-child tenant-nested-child-"+child.type} key={child.id}>{child.type==="heading"?<h3>{child.title}</h3>:child.type==="button"?(safeTenantLink(child.linkUrl)?<a className="tenant-action-button" href={safeTenantLink(child.linkUrl)}>{child.content||"Learn more"} ↗</a>:<span>{child.content}</span>):child.type==="image"?(()=>{const media=(site.assets||[]).find(item=>item.id===child.assetId);return media&&media.public_url?<img className="tenant-nested-image" src={media.public_url} alt={child.alt||media.file_name||"Section image"} loading="lazy"/>:<div className="tenant-image-placeholder">Image unavailable</div>;})():child.type==="gallery"?<div className="tenant-nested-gallery">{(child.assetIds||[]).map(id=>{const media=(site.assets||[]).find(item=>item.id===id);return media&&media.public_url?<img key={id} src={media.public_url} alt={media.file_name||"Gallery image"} loading="lazy"/>:null;})}</div>:child.type==="columns"?<div className="tenant-nested-columns">{(child.columns||[]).map((col,i)=><article key={i}><h4>{col.title}</h4><p>{col.content}</p></article>)}</div>:<p>{child.content}</p>}</div>)}</div> :
          type === "callout" ? <div className="tenant-callout"><p>{block.content}</p>{link&&<a className="tenant-action-button" href={link}>{block.linkLabel||"Get started"} ↗</a>}</div> :
          <p>{block.content}</p>}
        </section>;
      })}
    </main>
    <footer className={"tenant-footer-"+(appearance.footerLayout||"standard")}><div className="tenant-footer-copy">{appearance.footerText||("© "+new Date().getFullYear()+" "+site.name+". All rights reserved.")}</div><div className="tenant-social-links">{String(appearance.socialLinksText||"").split("\n").map((line,index)=>{const parts=line.split("|");const label=(parts[0]||"").trim();const href=safeTenantLink((parts.slice(1).join("|")||"").trim());return label&&href&&/^https:\/\//i.test(href)?<a key={"social-"+index} href={href} target="_blank" rel="noopener noreferrer">{label}</a>:null;})}</div><span>Built with <a href="https://dukubusiness.online">DuKu FCA</a></span></footer>
  </div>;
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
  const [publishedUrl, setPublishedUrl] = useState("");
  const [siteSubdomain, setSiteSubdomain] = useState(() => readLocalDraft().siteSubdomain || "");
  const [brandColor,setBrandColor]=useState(()=>readLocalDraft().brandColor||"#7c5ce0");
  const [surfaceColor,setSurfaceColor]=useState(()=>readLocalDraft().surfaceColor||"#ffffff");
  const [siteFont,setSiteFont]=useState(()=>readLocalDraft().siteFont||"Inter");
  const [headerStyle,setHeaderStyle]=useState(()=>readLocalDraft().headerStyle||"standard");
  const [logoText,setLogoText]=useState(()=>readLocalDraft().logoText||"");
  const [footerText,setFooterText]=useState(()=>readLocalDraft().footerText||"");
  const [customNavText,setCustomNavText]=useState(()=>readLocalDraft().customNavText||"");
  const [socialLinksText,setSocialLinksText]=useState(()=>readLocalDraft().socialLinksText||"");
  const [footerLayout,setFooterLayout]=useState(()=>readLocalDraft().footerLayout||"standard");
  const [headline, setHeadline] = useState(() => readLocalDraft().headline || "Make your next idea unforgettable.");
  const [subline, setSubline] = useState(() => readLocalDraft().subline || "A beautiful online home for everything you do.");
  const [blocks, setBlocks] = useState(() => readLocalDraft().blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [reusableSections, setReusableSections] = useState(() => readLocalDraft().reusableSections || []);
  const [sectionNotice, setSectionNotice] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [seoTitle, setSeoTitle] = useState(() => readLocalDraft().seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(() => readLocalDraft().seoDescription || "");
  const [siteSlug, setSiteSlug] = useState(() => readLocalDraft().siteSlug || "my-website");
  const [pages, setPages] = useState(() => {
    const saved = readLocalDraft();
    return saved.pages && saved.pages.length ? saved.pages : [{ id: "home", name: "Home", slug: "home", headline: saved.headline || "Make your next idea unforgettable.", subline: saved.subline || "A beautiful online home for everything you do.", blocks: saved.blocks || [], seoTitle: saved.seoTitle || "", seoDescription: saved.seoDescription || "" }];
  });
  const [activePageId, setActivePageId] = useState(() => readLocalDraft().activePageId || "home");
  const [mediaAssets, setMediaAssets] = useState(() => readLocalDraft().mediaAssets || []);
  const [mediaNotice, setMediaNotice] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [cloudSiteId, setCloudSiteId] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudNotice, setCloudNotice] = useState("");
  const [cloudSites, setCloudSites] = useState([]);
  const [cloudSitesLoading, setCloudSitesLoading] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState([]);
  const [formInboxLoading, setFormInboxLoading] = useState(false);
  const [formInboxError, setFormInboxError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("30");
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [analyticsSites, setAnalyticsSites] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [marketplaceAccount,setMarketplaceAccount]=useState(null);
  const [marketplaceOrders,setMarketplaceOrders]=useState([]);
  const [marketplaceLedger,setMarketplaceLedger]=useState([]);
  const [marketplacePayouts,setMarketplacePayouts]=useState([]);
  const [marketplaceLoading,setMarketplaceLoading]=useState(false);
  const [marketplaceError,setMarketplaceError]=useState("");
  const [domainRows, setDomainRows] = useState([]);
  const [domainSites, setDomainSites] = useState([]);
  const [domainInput, setDomainInput] = useState("");
  const [domainSiteId, setDomainSiteId] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [domainNotice, setDomainNotice] = useState("");
  const [domainVerifying, setDomainVerifying] = useState("");
  const loadDomains = async () => {
    if (!workspace) return;
    setDomainLoading(true); setDomainError("");
    try {
      const { data: sites, error: sitesError } = await supabase.from("sites").select("id,name,subdomain,status").eq("workspace_id", workspace.id);
      if (sitesError) throw sitesError;
      setDomainSites(sites || []);
      if (!sites?.length) { setDomainRows([]); return; }
      const { data, error } = await supabase.from("site_domains").select("*").in("site_id", sites.map(site=>site.id)).eq("domain_type","custom").order("created_at",{ascending:false});
      if (error) throw error;
      setDomainRows((data || []).map(row=>({...row,siteName:sites.find(site=>site.id===row.site_id)?.name || "Website"})));
      if (!domainSiteId && sites[0]) setDomainSiteId(sites[0].id);
    } catch (error) { setDomainError(error.message || "Could not load domains."); }
    finally { setDomainLoading(false); }
  };
  const addCustomDomain = async () => {
    setDomainError(""); setDomainNotice("");
    if (!domainSiteId) { setDomainError("Create or select a website first."); return; }
    let domain = domainInput.trim().toLowerCase();
    if (domain.startsWith("https://")) domain = domain.slice(8);
    else if (domain.startsWith("http://")) domain = domain.slice(7);
    if (domain.startsWith("www.")) domain = domain.slice(4);
    if (domain.endsWith("/")) domain = domain.slice(0,-1);
    const labels = domain.split(".");
    const validDomain = domain.length >= 4 && domain.length <= 253 && labels.length >= 2 && labels.every(label => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) && /^[a-z]{2,63}$/.test(labels[labels.length-1]);
    if (!validDomain) { setDomainError("Enter a valid domain name, such as example.com. Do not include a path."); return; }
    setDomainLoading(true);
    try {
      const token = "duku-fca=" + (window.crypto?.randomUUID ? window.crypto.randomUUID().replace(/-/g,"") : Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
      const { error } = await supabase.from("site_domains").insert({site_id:domainSiteId,domain,domain_type:"custom",verification_status:"pending",verification_token:token,dns_record_name:"_duku-verification."+domain});
      if (error) throw error;
      setDomainInput(""); setDomainNotice("Domain added. Publish the TXT record below, then verify ownership.");
      await loadDomains();
    } catch (error) { setDomainError(error.message || "Could not add this domain."); }
    finally { setDomainLoading(false); }
  };
  const verifyCustomDomain = async (row) => {
    setDomainVerifying(row.id); setDomainError(""); setDomainNotice("");
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-domain",{body:{domain_id:row.id}});
      if (error) throw error;
      if (data?.verified) setDomainNotice(row.domain+" ownership verified successfully.");
      else setDomainNotice(data?.message || "DNS record is not visible yet. Try again after propagation.");
      await loadDomains();
    } catch (error) { setDomainError(error.message || "Could not verify domain."); }
    finally { setDomainVerifying(""); }
  };

  const loadMarketplace = async () => {
    if (!workspace) return;
    setMarketplaceLoading(true); setMarketplaceError("");
    try {
      const [accountResult,ordersResult,ledgerResult,payoutResult] = await Promise.all([
        supabase.from("marketplace_accounts").select("*").eq("workspace_id",workspace.id).maybeSingle(),
        supabase.from("marketplace_orders").select("id,site_id,provider_order_id,buyer_email,currency,gross_amount_paise,commission_amount_paise,gateway_fee_paise,refund_amount_paise,seller_net_amount_paise,status,created_at").eq("workspace_id",workspace.id).order("created_at",{ascending:false}).limit(100),
        supabase.from("marketplace_ledger").select("id,entry_type,amount_paise,currency,description,created_at").eq("workspace_id",workspace.id).order("created_at",{ascending:false}).limit(100),
        supabase.from("marketplace_payout_requests").select("id,amount_paise,status,requested_at,processed_at,failure_reason").eq("workspace_id",workspace.id).order("requested_at",{ascending:false}).limit(50)
      ]);
      for (const result of [accountResult,ordersResult,ledgerResult,payoutResult]) if(result.error) throw result.error;
      setMarketplaceAccount(accountResult.data||null); setMarketplaceOrders(ordersResult.data||[]); setMarketplaceLedger(ledgerResult.data||[]); setMarketplacePayouts(payoutResult.data||[]);
    } catch(error) { setMarketplaceError(error.message||"Could not load payment earnings."); }
    finally { setMarketplaceLoading(false); }
  };
  const exportMarketplaceReport = () => {
    const rows = [
      ["Record type","Reference","Date","Status","Currency","Gross amount","DuKu commission","Gateway fee","Refund amount","Seller net / amount","Description"],
      ...marketplaceOrders.map(order=>["Order",order.provider_order_id||order.id,order.created_at,order.status,order.currency||"INR",Number(order.gross_amount_paise||0)/100,Number(order.commission_amount_paise||0)/100,Number(order.gateway_fee_paise||0)/100,Number(order.refund_amount_paise||0)/100,Number(order.seller_net_amount_paise||0)/100,""]),
      ...marketplaceLedger.map(entry=>["Ledger",entry.id,entry.created_at,entry.entry_type,entry.currency||"INR","","","","",Number(entry.amount_paise||0)/100,entry.description||""]),
      ...marketplacePayouts.map(payout=>["Payout",payout.id,payout.requested_at,payout.status,"INR","","","","",Number(payout.amount_paise||0)/100,payout.failure_reason||""])
    ];
    const csv = rows.map(row=>row.map(value=>{const cell=String(value??"");return /[",\\n]/.test(cell)?'"'+cell.replace(/"/g,'""')+'"':cell;}).join(",")).join("\\r\\n");
    const blob = new Blob(["\\uFEFF",csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "duku-marketplace-financial-report-"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const loadAnalytics = async (range = analyticsRange) => {
    if (!workspace) return;
    setAnalyticsLoading(true); setAnalyticsError("");
    try {
      const { data: ownedSites, error: sitesError } = await supabase.from("sites").select("id,name,subdomain,status").eq("workspace_id", workspace.id);
      if (sitesError) throw sitesError;
      const ids = (ownedSites || []).map(site => site.id);
      setAnalyticsSites(ownedSites || []);
      if (!ids.length) { setAnalyticsEvents([]); return; }
      const since = new Date(Date.now() - Number(range) * 86400000).toISOString();
      const { data, error } = await supabase.from("site_analytics_events").select("id,site_id,page_slug,referrer_host,created_at").in("site_id", ids).gte("created_at", since).order("created_at", { ascending: false }).limit(10000);
      if (error) throw error;
      setAnalyticsEvents(data || []);
    } catch (error) { setAnalyticsError(error.message || "Could not load analytics."); }
    finally { setAnalyticsLoading(false); }
  };


  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setAuthUser(data.session ? data.session.user : null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setAuthUser(session ? session.user : null); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!authUser || !isSupabaseConfigured) { setWorkspace(null); return; }
    let active = true;
    supabase.from("workspaces").select("*").eq("owner_id", authUser.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setCloudNotice("Account connected, but workspace could not load: " + error.message);
      else setWorkspace(data || null);
    });
    return () => { active = false; };
  }, [authUser]);
  useEffect(() => {
    if (!workspace || !authUser) { setCloudSites([]); return; }
    let active = true;
    setCloudSitesLoading(true);
    supabase.from("sites").select("id,name,slug,status,updated_at,created_at").eq("workspace_id", workspace.id).order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setCloudNotice("Could not load saved websites: " + error.message);
        else setCloudSites(data || []);
        setCloudSitesLoading(false);
      });
    return () => { active = false; };
  }, [workspace, authUser]);
  const loadFormInbox = async () => {
    if (!workspace) return;
    setFormInboxLoading(true); setFormInboxError("");
    try {
      const { data: ownedSites, error: sitesError } = await supabase.from("sites").select("id,name,subdomain").eq("workspace_id", workspace.id);
      if (sitesError) throw sitesError;
      const ids = (ownedSites || []).map(site => site.id);
      if (!ids.length) { setFormSubmissions([]); setFormInboxLoading(false); return; }
      const { data, error } = await supabase.from("form_submissions").select("*").in("site_id", ids).order("created_at", { ascending: false }).limit(250);
      if (error) throw error;
      const siteMap = Object.fromEntries((ownedSites || []).map(site => [site.id, site]));
      setFormSubmissions((data || []).map(item => ({ ...item, site: siteMap[item.site_id] || null })));
    } catch (error) { setFormInboxError(error.message || "Could not load form submissions."); }
    finally { setFormInboxLoading(false); }
  };
  const markSubmissionRead = async (submission) => {
    const { error } = await supabase.from("form_submissions").update({ is_read: !submission.is_read }).eq("id", submission.id);
    if (error) { setFormInboxError(error.message || "Could not update submission."); return; }
    setFormSubmissions(current => current.map(item => item.id === submission.id ? { ...item, is_read: !submission.is_read } : item));
    setSelectedSubmission(current => current && current.id === submission.id ? { ...current, is_read: !submission.is_read } : current);
  };
  const openCloudSite = async (site) => {
    setCloudNotice("");
    try {
      const [{ data: siteData, error: siteError }, { data: pageRows, error: pageError }, { data: assetRows, error: assetError }] = await Promise.all([
        supabase.from("sites").select("*").eq("id", site.id).single(),
        supabase.from("site_pages").select("*").eq("site_id", site.id).order("sort_order"),
        supabase.from("site_assets").select("*").eq("site_id", site.id)
      ]);
      if (siteError) throw siteError;
      if (pageError) throw pageError;
      if (assetError) throw assetError;
      const restoredPages = (pageRows || []).map((row,index) => ({
        id: row.id, name: row.title, slug: row.slug,
        headline: (row.content && row.content.headline) || "",
        subline: (row.content && row.content.subline) || "",
        blocks: (row.content && row.content.sections) || [],
        seoTitle: (row.seo && row.seo.title) || "",
        seoDescription: (row.seo && row.seo.description) || ""
      }));
      const restoredAssets = await Promise.all((assetRows || []).map(async row => {
        const { data, error } = await supabase.storage.from("duku-fca-media").createSignedUrl(row.storage_path, 3600);
        return { id: row.client_asset_key || row.id, name: row.file_name, type: row.mime_type || "image/*", size: row.file_size || 0, dataUrl: (data && data.signedUrl) || "", cloudUploaded: true, storagePath: row.storage_path, signedUrlError: error ? error.message : null };
      }));
      const first = restoredPages[0] || { id:"home", name:"Home", slug:"home", headline:"", subline:"", blocks:[], seoTitle:"", seoDescription:"" };
      setSiteName(siteData.name); setSiteSubdomain(siteData.subdomain || siteData.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); setBrandColor(siteData.site_settings?.brandColor||"#7c5ce0"); setSurfaceColor(siteData.site_settings?.surfaceColor||"#ffffff"); setSiteFont(siteData.site_settings?.siteFont||"Inter"); setHeaderStyle(siteData.site_settings?.headerStyle||"standard"); setLogoText(siteData.site_settings?.logoText||""); setFooterText(siteData.site_settings?.footerText||""); setCustomNavText(siteData.site_settings?.customNavText||""); setSocialLinksText(siteData.site_settings?.socialLinksText||""); setFooterLayout(siteData.site_settings?.footerLayout||"standard"); setHeadline(first.headline || siteData.site_settings?.headline || ""); setSubline(first.subline || siteData.site_settings?.subline || "");
      setBlocks(first.blocks || []); setSeoTitle(first.seoTitle || ""); setSeoDescription(first.seoDescription || ""); setSiteSlug(first.slug || siteData.slug || "home");
      setPages(restoredPages.length ? restoredPages : [first]); setActivePageId(first.id); setMediaAssets(restoredAssets); setCloudSiteId(siteData.id); setShowEditor(true);
    } catch (error) { setCloudNotice("Could not open this website: " + (error.message || "Please try again.")); }
  };
  const submitAuth = async () => {
    if (!isSupabaseConfigured) { setAuthNotice("Supabase configuration is missing. Please try again after deployment settings are applied."); return; }
    if (!authEmail.trim() || !authPassword) { setAuthNotice("Enter your email and password to continue."); return; }
    setAuthBusy(true); setAuthNotice("");
    try {
      if (authMode === "Welcome back") {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setShowAuth(false);
      } else {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { display_name: authEmail.trim().split("@")[0] }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) { setAuthUser(data.user); setShowAuth(false); setAuthNotice("Your DuKu FCA account is ready."); }
        else setAuthNotice("Account created. Check your email to confirm your address, then log in.");
      }
    } catch (error) { setAuthNotice(error.message || "Authentication failed. Please try again."); }
    finally { setAuthBusy(false); }
  };
  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setCloudNotice(error.message);
    else { setAuthUser(null); setWorkspace(null); setCloudSiteId(null); setCloudNotice("Signed out."); }
  };
  const saveCloudDraft = async () => {
    if (!authUser) { setAuthMode("Welcome back"); setShowAuth(true); return; }
    if (!workspace) { setCloudNotice("Your workspace is still loading. Please try again in a moment."); return; }
    setCloudBusy(true); setCloudNotice("");
    try {
      let siteId = cloudSiteId;
      if (!siteId) {
        const { data: found, error } = await supabase.from("sites").select("id").eq("workspace_id", workspace.id).eq("name", siteName).limit(1).maybeSingle();
        if (error) throw error;
        if (found) siteId = found.id;
      }
      const keepPublished = cloudSites.some(item => item.id === siteId && item.status === "published");
      const sitePayload = { workspace_id: workspace.id, name: siteName, slug: (siteSlug || "my-website").toLowerCase().replace(/[^a-z0-9-]/g,"-"), status: keepPublished ? "published" : "draft", site_settings: { headline, subline, template: "custom", brandColor, surfaceColor, siteFont, headerStyle, logoText, footerText, customNavText, socialLinksText, footerLayout }, seo_settings: { title: seoTitle, description: seoDescription } };
      if (siteId) {
        const { error } = await supabase.from("sites").update(sitePayload).eq("id", siteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sites").insert(sitePayload).select("id").single();
        if (error) throw error;
        siteId = data.id;
      }
      setCloudSiteId(siteId);
      const { data: existingPages, error: pageLoadError } = await supabase.from("site_pages").select("id,slug").eq("site_id", siteId);
      if (pageLoadError) throw pageLoadError;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const current = page.id === activePageId ? { ...page, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : page;
        const slug = (current.slug || current.name || "page").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"") || "page";
        const payload = { site_id: siteId, title: current.name, slug, is_homepage: index === 0, is_published: keepPublished, sort_order: index, content: { headline: current.headline || headline, subline: current.subline || subline, sections: current.blocks || [] }, seo: { title: current.seoTitle || "", description: current.seoDescription || "" } };
        const existing = existingPages.find(item => item.slug === slug);
        const result = existing ? await supabase.from("site_pages").update(payload).eq("id", existing.id) : await supabase.from("site_pages").insert(payload);
        if (result.error) throw result.error;
      }
      const desiredSlugs = pages.map(page => (page.id === activePageId ? siteSlug : page.slug || page.name || "page").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"") || "page");
      const stalePageIds = existingPages.filter(row => !desiredSlugs.includes(row.slug)).map(row => row.id);
      if (stalePageIds.length) {
        const { error } = await supabase.from("site_pages").delete().in("id", stalePageIds);
        if (error) throw error;
      }
      for (const asset of mediaAssets) {
        if (asset.cloudUploaded) continue;
        const blob = await fetch(asset.dataUrl).then(response => response.blob());
        const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g,"-");
        const path = workspace.id + "/" + siteId + "/" + asset.id + "-" + safeName;
        const { error: uploadError } = await supabase.storage.from("duku-fca-media").upload(path, blob, { upsert: true, contentType: asset.type });
        if (uploadError) throw uploadError;
        const { error: assetError } = await supabase.from("site_assets").insert({ site_id: siteId, storage_path: path, file_name: asset.name, mime_type: asset.type, file_size: asset.size, client_asset_key: asset.id });
        if (assetError) throw assetError;
        setMediaAssets(current => current.map(item => item.id === asset.id ? { ...item, cloudUploaded: true, storagePath: path } : item));
      }
      setCloudSites(current => [{ id: siteId, name: siteName, slug: sitePayload.slug, status: sitePayload.status, updated_at: new Date().toISOString() }, ...current.filter(item => item.id !== siteId)]);
      setCloudNotice("Saved to your DuKu FCA cloud workspace. Your website is still a draft and is not public.");
    } catch (error) { setCloudNotice("Cloud save failed: " + (error.message || "Please try again.")); }
    finally { setCloudBusy(false); }
  };
  const publishSite = async () => {
    if (!authUser) { setAuthMode("Welcome back"); setShowAuth(true); return; }
    if (!cloudSiteId) { setCloudNotice("Save this website to your cloud workspace first, then publish it."); return; }
    setCloudBusy(true); setCloudNotice("");
    try {
      const chosenSubdomain = (siteSubdomain || siteName).toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");
      const { data: assets, error: assetsError } = await supabase.from("site_assets").select("id,storage_path,file_name,mime_type,client_asset_key,public_url").eq("site_id", cloudSiteId);
      if (assetsError) throw assetsError;
      for (const asset of (assets || [])) {
        if (asset.public_url) continue;
        const { data: signed, error: signedError } = await supabase.storage.from("duku-fca-media").createSignedUrl(asset.storage_path, 300);
        if (signedError || !signed?.signedUrl) throw signedError || new Error("Could not access a saved media file.");
        const response = await fetch(signed.signedUrl);
        if (!response.ok) throw new Error("Could not download " + asset.file_name + " from your private media library.");
        const blob = await response.blob();
        const safeName = (asset.file_name || "image").replace(/[^a-zA-Z0-9._-]/g,"-");
        const publicPath = workspace.id + "/" + cloudSiteId + "/" + (asset.client_asset_key || asset.id) + "-" + safeName;
        const { error: uploadError } = await supabase.storage.from("duku-fca-public-media").upload(publicPath, blob, { upsert: true, contentType: asset.mime_type || blob.type || "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("duku-fca-public-media").getPublicUrl(publicPath);
        const { error: updateError } = await supabase.from("site_assets").update({ public_storage_path: publicPath, public_url: publicData.publicUrl }).eq("id", asset.id);
        if (updateError) throw updateError;
      }
      const { data, error } = await supabase.rpc("publish_site", { p_site_id: cloudSiteId, p_subdomain: chosenSubdomain });
      if (error) throw error;
      setPublished(true); setPublishedUrl(data.url);
      setCloudSites(current => current.map(item => item.id === cloudSiteId ? { ...item, status: "published", slug: data.subdomain } : item));
      setCloudNotice("Your website is live: " + data.url);
    } catch (error) { setCloudNotice("Publishing failed: " + (error.message || "Please try again.")); }
    finally { setCloudBusy(false); }
  };
  useEffect(() => {
    if (!showEditor) return;
    try { const updatedPages = pages.map(page => page.id === activePageId ? { ...page, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : page); setPages(updatedPages); window.localStorage.setItem("duku-fca-editor-draft", JSON.stringify({ siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, pages: updatedPages, activePageId, mediaAssets, siteSubdomain, brandColor, surfaceColor, siteFont, headerStyle, logoText, footerText, customNavText, socialLinksText, footerLayout, reusableSections, updatedAt: new Date().toISOString() })); } catch (error) { /* Local storage may be unavailable in private browsing. */ }
  // pages is read to merge the current editor state; adding it here would create a state-update loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor, siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, activePageId, mediaAssets, siteSubdomain, brandColor, surfaceColor, siteFont, headerStyle, logoText, footerText, customNavText, socialLinksText, footerLayout, reusableSections]);
  const filtered = useMemo(() => templates.filter(t => (filter === "All" || t.type === filter) && t.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const switchPage = (page) => {
    const current = { headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug };
    setPages(list => list.map(item => item.id === activePageId ? { ...item, ...current } : item));
    setActivePageId(page.id);
    setHeadline(page.headline || "Make your next idea unforgettable.");
    setSubline(page.subline || "A beautiful online home for everything you do.");
    setBlocks(page.blocks || []);
    setSeoTitle(page.seoTitle || "");
    setSeoDescription(page.seoDescription || "");
    setSiteSlug(page.slug || page.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"));
  };
  const addPage = () => {
    const name = window.prompt("Enter the new page name (for example, About):");
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    const id = "page-" + Date.now();
    const newPage = { id, name: cleanName, slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g,"-"), headline: cleanName, subline: "Add a short introduction for this page.", blocks: [], seoTitle: "", seoDescription: "" };
    setPages(list => [...list.map(item => item.id === activePageId ? { ...item, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : item), newPage]);
    setActivePageId(id); setHeadline(newPage.headline); setSubline(newPage.subline); setBlocks([]); setSeoTitle(""); setSeoDescription(""); setSiteSlug(newPage.slug);
  };
  const deletePage = (page) => {
    if (pages.length <= 1) { window.alert("A website must have at least one page."); return; }
    if (!window.confirm("Delete the " + page.name + " page?")) return;
    const remaining = pages.filter(item => item.id !== page.id);
    setPages(remaining);
    if (page.id === activePageId) switchPage(remaining[0]);
  };
  const addBlock = (label) => {
    const type = label.slice(2).trim();
    const defaults = {
      Text: ["A story worth sharing", "Write something meaningful for your visitors."],
      Image: ["Your visual story", "Add an image from your media library."],
      Button: ["Take the next step", "Explore more"],
      Section: ["A new section", "Introduce another part of your website."],
      Form: ["Get in touch", "Collect messages from your visitors."],
      "Embed code": ["Embedded content", "Add a trusted embed or widget."],
      Gallery: ["A visual collection", ""],
      Testimonials: ["Kind words from our clients", ""],
      Pricing: ["Simple, transparent pricing", ""],
      FAQ: ["Frequently asked questions", ""],
      Stats: ["Results that speak", ""],
      Team: ["Meet the people behind it", ""],
      "Logo strip": ["Trusted by teams", ""],
      Callout: ["Ready to get started?", "Tell visitors what to do next."],
      Columns: ["A flexible content layout", "Arrange related content side by side."],
      Container: ["Nested content section", "A flexible container for grouped content."]
    };
    const [title, content] = defaults[type] || ["New element", "Add your content here."];
    const items = type === "Gallery" ? [{assetId:"",caption:"Gallery image 1"},{assetId:"",caption:"Gallery image 2"},{assetId:"",caption:"Gallery image 3"}] :
      type === "Testimonials" ? [{name:"Alex Morgan",role:"Customer",quote:"An excellent experience from start to finish."},{name:"Jamie Lee",role:"Founder",quote:"The team made everything feel simple."}] :
      type === "Pricing" ? [{name:"Starter",price:"₹499",period:"/ month",features:"Essential features\\nEmail support",featured:false},{name:"Growth",price:"₹999",period:"/ month",features:"Everything in Starter\\nPriority support",featured:true}] :
      type === "FAQ" ? [{question:"How do I get started?",answer:"Choose a plan and contact our team."},{question:"Can I change my plan?",answer:"Yes, you can upgrade or downgrade at any time."}] :
      type === "Stats" ? [{value:"10+",label:"Years of experience"},{value:"250+",label:"Happy clients"},{value:"98%",label:"Satisfaction"}] :
      type === "Team" ? [{name:"Alex Morgan",role:"Creative Director",bio:"Focused on thoughtful, useful experiences."},{name:"Jamie Lee",role:"Product Lead",bio:"Turning ideas into clear solutions."}] :
      type === "Logo strip" ? [{name:"Brand One"},{name:"Brand Two"},{name:"Brand Three"},{name:"Brand Four"}] :
      type === "Columns" ? [{title:"First column",content:"Add your content here."},{title:"Second column",content:"Add your content here."}] :
      type === "Container" ? [{id:"child-"+Date.now()+"-1",type:"heading",title:"A clear heading",content:""},{id:"child-"+Date.now()+"-2",type:"text",title:"",content:"Add supporting details inside this container."}] : undefined;
    setBlocks(current => current.concat([{ id: Date.now()+Math.random(), type, title, content, items, children: type === "Container" ? items : undefined, containerStyle: type === "Container" ? "card" : undefined, linkUrl: type === "Button" ? "https://example.com" : "" }]));
  };
  const updateBlock = (id, field, value) => setBlocks(current => current.map(block => block.id===id ? { ...block, [field]: value } : block));
  const updateNestedChild = (blockId, childId, field, value) => setBlocks(current => current.map(block => block.id===blockId ? {...block,children:(block.children||[]).map(child=>child.id===childId?{...child,[field]:value}:child)} : block));
  const addNestedChild = (blockId, type) => setBlocks(current => current.map(block => block.id===blockId ? {...block,children:[...(block.children||[]),{id:"child-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),type,title:type==="heading"?"New heading":"",content:type==="button"?"Learn more":"",linkUrl:"",assetId:"",assetIds:[],columns:type==="columns"?[{title:"Column one",content:""},{title:"Column two",content:""}]:undefined}]} : block));
  const removeNestedChild = (blockId, childId) => setBlocks(current => current.map(block => block.id===blockId ? {...block,children:(block.children||[]).filter(child=>child.id!==childId)} : block));
  const reorderNestedChild = (blockId, sourceId, targetId) => setBlocks(current => current.map(block => { if(block.id!==blockId)return block; const children=[...(block.children||[])]; const from=children.findIndex(child=>child.id===sourceId); const to=children.findIndex(child=>child.id===targetId); if(from<0||to<0||from===to)return block; const [moved]=children.splice(from,1); children.splice(to,0,moved); return {...block,children}; }));
  const saveReusableSection = (block) => {
    const name = window.prompt("Name this reusable section:", block.title || block.type + " section");
    if (!name || !name.trim()) return;
    const snapshot = JSON.parse(JSON.stringify({ ...block, id: undefined }));
    setReusableSections(current => [{ id: "section-" + Date.now(), name: name.trim(), block: snapshot }, ...current]);
    setSectionNotice("\"" + name.trim() + "\" saved to your section library.");
  };
  const insertReusableSection = (section) => {
    const copy = JSON.parse(JSON.stringify(section.block));
    copy.id = Date.now() + Math.random();
    setBlocks(current => [...current, copy]);
    setSelectedBlockId(copy.id);
    setSectionNotice(section.name + " added to this page.");
  };
  const reorderBlocks = (sourceId, targetId) => setBlocks(current => {
    const from = current.findIndex(block => String(block.id) === String(sourceId));
    const to = current.findIndex(block => String(block.id) === String(targetId));
    if (from < 0 || to < 0 || from === to) return current;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  });
  const selectedBlock = blocks.find(block => String(block.id) === String(selectedBlockId)) || null;

  const uploadMedia = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) { setMediaNotice("Please choose an image file."); return; }
      if (file.size > 2 * 1024 * 1024) { setMediaNotice(file.name + " is larger than 2 MB. Choose a smaller image."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const asset = { id: "asset-" + Date.now() + "-" + Math.random().toString(36).slice(2,8), name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
        setMediaAssets(current => [asset, ...current]);
        setMediaNotice(file.name + " added to this device's media library.");
      };
      reader.onerror = () => setMediaNotice("Could not read " + file.name + ". Please try again.");
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };
  const insertMedia = (asset) => {
    setBlocks(current => current.concat([{ id: Date.now()+Math.random(), type: "Image", title: asset.name, content: "Image added from your media library.", assetId: asset.id }]));
    setMediaNotice(asset.name + " added to the current page.");
  };
  const removeMedia = (assetId) => {
    setMediaAssets(current => current.filter(asset => asset.id !== assetId));
    setMediaNotice("Asset removed from this device's library. Existing page blocks are not changed.");
  };
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
  const exportDraft = () => { const payload = { product: "DuKu FCA", siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, pages, activePageId, mediaAssets, siteSubdomain, exportedAt: new Date().toISOString() }; const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = (siteSlug || "duku-fca-site") + "-backup.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); };
  const startEditor = (name) => { const saved = readLocalDraft(); if (name) { setSiteName(name + " website"); setHeadline("Make your next idea unforgettable."); setSubline("A beautiful online home for everything you do."); setBlocks([]); setSeoTitle(""); setSeoDescription(""); setSiteSlug("home"); setSiteSubdomain((name || "my-website").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); setPages([{ id: "home", name: "Home", slug: "home", headline: "Make your next idea unforgettable.", subline: "A beautiful online home for everything you do.", blocks: [], seoTitle: "", seoDescription: "" }]); setActivePageId("home"); } else if (saved.siteName) { setSiteName(saved.siteName); setHeadline(saved.headline || "Make your next idea unforgettable."); setSubline(saved.subline || "A beautiful online home for everything you do."); setBlocks(saved.blocks || []); setSeoTitle(saved.seoTitle || ""); setSeoDescription(saved.seoDescription || ""); setSiteSlug(saved.siteSlug || "my-website"); setSiteSubdomain(saved.siteSubdomain || ""); } else { setSiteName("My first website"); setHeadline("Make your next idea unforgettable."); setSubline("A beautiful online home for everything you do."); setBlocks([]); setSiteSubdomain(""); } setShowEditor(true); setPublished(false); setPublishedUrl(""); };
  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button>
      <a className="brand" href="/"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span><small>FREE WEBSITE BUILDER</small></a>
      <nav className="top-links"><a href="#features">Features</a><a href="#templates">Templates</a><a href="#how">How it works</a></nav>
      <div className="top-actions">{authUser?<><span className="signed-in-label">{authUser.email}</span><button className="text-btn" onClick={signOut}>Sign out</button></>:<><button className="text-btn" onClick={() => {setAuthMode("Welcome back");setShowAuth(true)}}>Log in</button><button className="primary-btn small" onClick={() => {setAuthMode("Create your free account");setShowAuth(true)}}>Start for free <span>↗</span></button></>}</div>
    </header>
    <div className="layout">
      <aside className={"sidebar " + (mobileNav ? "open" : "")}>
        <div className="workspace"><div className="workspace-icon">D</div><div><b>My workspace</b><small>Free plan</small></div><span className="chevron">⌄</span></div>
        <div className="side-label">WORKSPACE</div>
        {["Overview","My websites","Templates","Domains","Media library","Form submissions","Payments & earnings"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>{setActive(item);setMobileNav(false);if(item==="Templates")document.getElementById("templates")?.scrollIntoView({behavior:"smooth"});if(item==="Form submissions")loadFormInbox();if(item==="Analytics")loadAnalytics();if(item==="Domains")loadDomains();if(item==="Payments & earnings")loadMarketplace()}}><span>{["⌂","▣","▦","◎","▤","✉","₹"][i]}</span>{item}{item==="My websites" ? <i>0</i> : null}</button>)}
        <div className="side-label second">TOOLS</div>
        {["App integrations","Analytics","Help centre"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>setActive(item)}><span>{["⌘","↗","?"][i]}</span>{item}</button>)}
        <div className="side-bottom"><div className="upgrade-card"><div className="spark">✦</div><b>Build without limits</b><p>Explore more ways to grow your online presence.</p><button onClick={()=>setShowAuth(true)}>Explore plans ↗</button></div><div className="profile-row"><div className="avatar">G</div><div><b>Guest workspace</b><small>Sign in to sync your work</small></div><span>···</span></div></div>
      </aside>
      <main className="main-content">
        {authUser&&<section className="cloud-websites-panel"><div><div className="eyebrow">YOUR CLOUD WORKSPACE</div><h2>My saved websites</h2><p>Open your projects from any device after signing in.</p></div>{cloudSitesLoading?<span>Loading your websites…</span>:cloudSites.length?<div className="cloud-site-list">{cloudSites.map(site=><div className="cloud-site-row" key={site.id}><div><b>{site.name}</b><small>{site.slug} · {site.status}</small></div><button onClick={()=>openCloudSite(site)}>Open editor ↗</button></div>)}</div>:<div className="cloud-empty">No cloud websites yet. Create a website and choose Save to cloud in the editor.</div>}</section>}
        {active === "Domains" ? <section className="analytics-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">DOMAIN MANAGEMENT</div><h1>Your custom <em>domains.</em></h1><p>Connect a domain you own and prove DNS ownership securely.</p></div><button className="ghost-btn" onClick={loadDomains} disabled={domainLoading}>{domainLoading?"Refreshing…":"↻ Refresh"}</button></div>
          <div className="domain-add-card"><h2>Add a custom domain</h2><div className="domain-add-fields"><input value={domainInput} onChange={event=>setDomainInput(event.target.value)} placeholder="example.com" aria-label="Custom domain"/><select value={domainSiteId} onChange={event=>setDomainSiteId(event.target.value)} aria-label="Website">{domainSites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select><button className="primary-btn" onClick={addCustomDomain} disabled={domainLoading}>Add domain</button></div><p>Use a domain you already own. DuKu FCA will provide a DNS TXT challenge to verify ownership.</p></div>
          {domainError&&<div className="form-inbox-error">{domainError}</div>}{domainNotice&&<div className="domain-notice">{domainNotice}</div>}
          {domainLoading&&!domainRows.length?<div className="cloud-empty">Loading domains…</div>:!domainRows.length?<div className="cloud-empty">{domainSites.length?"No custom domains added yet.":"Create and save a website before adding a domain."}</div>:<div className="domain-list">{domainRows.map(row=><article className="domain-card" key={row.id}><div className="domain-card-head"><div><b>{row.domain}</b><small>{row.siteName} · Added {new Date(row.created_at).toLocaleDateString()}</small></div><span className={"domain-status "+(row.verification_status==="verified"?"verified":"pending")}>{row.verification_status==="verified"?"DNS verified":"Verification pending"}</span></div><div className="domain-dns-record"><small>1. Add this TXT record in your domain DNS settings</small><div><span>Type</span><b>TXT</b></div><div><span>Name / Host</span><code>{row.dns_record_name || "_duku-verification."+row.domain}</code><button onClick={()=>GenUI.copy(row.dns_record_name || "_duku-verification."+row.domain)}>Copy</button></div><div><span>Value</span><code>{row.verification_token}</code><button onClick={()=>GenUI.copy(row.verification_token)}>Copy</button></div></div><div className="domain-card-footer"><span>{row.verified_at?"Verified "+new Date(row.verified_at).toLocaleString():"DNS may take time to propagate."}</span><button className="ghost-btn" onClick={()=>verifyCustomDomain(row)} disabled={domainVerifying===row.id}>{domainVerifying===row.id?"Checking DNS…":"Verify DNS ownership"}</button></div><p className="domain-routing-note">DNS ownership verification is separate from connecting traffic. Domain routing to your published website will be enabled after the domain is attached to DuKu FCA hosting.</p></article>)}</div>}
        </section> : active === "Analytics" ? <section className="analytics-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">WEBSITE PERFORMANCE</div><h1>Site <em>analytics.</em></h1><p>Privacy-conscious page-view reporting for your published websites.</p></div><div className="analytics-actions"><select value={analyticsRange} onChange={event=>{setAnalyticsRange(event.target.value);loadAnalytics(event.target.value)}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button className="ghost-btn" onClick={loadAnalytics} disabled={analyticsLoading}>{analyticsLoading?"Refreshing…":"↻ Refresh"}</button></div></div>
          {analyticsError&&<div className="form-inbox-error">{analyticsError}</div>}
          <div className="analytics-stats"><div><small>Page views</small><b>{analyticsEvents.length.toLocaleString()}</b><span>Recorded visits to pages</span></div><div><small>Published websites</small><b>{analyticsSites.filter(site=>site.status==="published").length}</b><span>Currently live</span></div><div><small>Top page</small><b>{analyticsEvents.length ? (analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{}) && Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1])[0][0]) : "—"}</b><span>By page views</span></div></div>
          {analyticsLoading&&!analyticsEvents.length?<div className="cloud-empty">Loading analytics…</div>:!analyticsSites.length?<div className="cloud-empty">Create and publish a website to start collecting analytics.</div>:<div className="analytics-grid"><article className="analytics-card"><h2>Views by website</h2>{analyticsSites.map(site=>{const count=analyticsEvents.filter(event=>event.site_id===site.id).length;return <div className="analytics-bar-row" key={site.id}><span>{site.name}</span><div><i style={{width:(analyticsEvents.length?Math.max(3,count/Math.max(1,...analyticsSites.map(s=>analyticsEvents.filter(e=>e.site_id===s.id).length))*100):0)+"%"}}/></div><b>{count}</b></div>})}</article><article className="analytics-card"><h2>Top pages</h2>{Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([slug,count])=><div className="analytics-list-row" key={slug}><span>/{slug}</span><b>{count}</b></div>)}{!analyticsEvents.length&&<p>No page views recorded in this period yet.</p>}</article><article className="analytics-card"><h2>Traffic sources</h2>{Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.referrer_host||"Direct / unknown";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([source,count])=><div className="analytics-list-row" key={source}><span>{source}</span><b>{count}</b></div>)}{!analyticsEvents.length&&<p>Sources appear as visitors arrive from other websites.</p>}</article><article className="analytics-card"><h2>Recent activity</h2>{analyticsEvents.slice(0,8).map(event=><div className="analytics-list-row" key={event.id}><span>/{event.page_slug||"home"} · {analyticsSites.find(site=>site.id===event.site_id)?.name||"Website"}<small>{new Date(event.created_at).toLocaleString()}</small></span><b>View</b></div>)}{!analyticsEvents.length&&<p>Published page views will appear here.</p>}</article></div>}
          <p className="analytics-privacy-note">DuKu FCA records page views, page paths and referring hostnames only. It does not currently estimate unique visitors or collect visitor names, email addresses or IP addresses.</p>
        </section> : active === "Payments & earnings" ? <section className="analytics-panel marketplace-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">SELLER PAYMENTS</div><h1>Your <em>earnings.</em></h1><p>Track sales, DuKu commission, refunds and seller settlements from your published websites.</p></div><div className="analytics-actions"><button className="ghost-btn" onClick={exportMarketplaceReport} disabled={!marketplaceOrders.length&&!marketplaceLedger.length&&!marketplacePayouts.length}>↓ Export CSV</button><button className="ghost-btn" onClick={loadMarketplace} disabled={marketplaceLoading}>{marketplaceLoading?"Refreshing…":"↻ Refresh"}</button></div></div>
          {marketplaceError&&<div className="form-inbox-error">{marketplaceError}</div>}
          <div className="marketplace-banner"><div><b>Marketplace payments · Cashfree Easy Split</b><p>Customer payments are designed to split automatically: 2.1% DuKu platform commission and the remaining eligible amount to your verified seller account.</p></div><span className={"domain-status "+(marketplaceAccount?.onboarding_status==="verified"?"verified":"pending")}>{marketplaceAccount?.onboarding_status==="verified"?"KYC verified":"Gateway setup required"}</span></div>
          <div className="analytics-stats marketplace-stats">
            <div><small>Gross sales</small><b>₹{(marketplaceOrders.filter(o=>["paid","partially_refunded","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.gross_amount_paise||0),0)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><span>Successful customer payments</span></div>
            <div><small>DuKu commission (2.1%)</small><b>₹{(marketplaceOrders.filter(o=>["paid","partially_refunded","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.commission_amount_paise||0),0)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><span>Before reversals and refunds</span></div>
            <div><small>Seller net earnings</small><b>₹{(marketplaceOrders.filter(o=>["paid","partially_refunded","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.seller_net_amount_paise||0),0)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><span>Before settlement adjustments</span></div>
          </div>
          <div className="marketplace-setup-card"><div><div className="eyebrow">BANK & KYC ONBOARDING</div><h2>{marketplaceAccount?.onboarding_status==="verified"?"Payout account connected":"Connect your payout account"}</h2><p>{marketplaceAccount?.onboarding_status==="verified"?"Your payment provider has marked your seller account as verified.": "Secure identity and bank verification will be completed on Cashfree’s hosted onboarding flow. DuKu will not store your full bank credentials, card details or identity documents."}</p><small>Account status: {marketplaceAccount?.onboarding_status||"Not started"} · KYC: {marketplaceAccount?.kyc_status||"Not started"} · Settlements: {marketplaceAccount?.settlement_status||"Not ready"}</small></div><button className="primary-btn" disabled>{marketplaceAccount?.onboarding_status==="verified"?"Account connected":"Available after DuKu gateway activation"}</button></div>
          <div className="analytics-grid marketplace-lists"><article className="analytics-card"><h2>Recent customer orders</h2>{marketplaceOrders.length?marketplaceOrders.slice(0,10).map(order=><div className="analytics-list-row" key={order.id}><span>{order.provider_order_id||"Order"}<small>{new Date(order.created_at).toLocaleString()} · {order.status}</small></span><b>₹{(Number(order.gross_amount_paise)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></div>):<p>No paid orders yet. Payments will appear here after the gateway is activated.</p>}</article><article className="analytics-card"><h2>Commission & activity ledger</h2>{marketplaceLedger.length?marketplaceLedger.slice(0,10).map(entry=><div className="analytics-list-row" key={entry.id}><span>{entry.description||entry.entry_type}<small>{new Date(entry.created_at).toLocaleString()}</small></span><b>{Number(entry.amount_paise)<0?"−":"+"}₹{(Math.abs(Number(entry.amount_paise))/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></div>):<p>Verified payment and settlement entries will be recorded here.</p>}</article><article className="analytics-card"><h2>Withdrawals & settlements</h2>{marketplacePayouts.length?marketplacePayouts.map(p=><div className="analytics-list-row" key={p.id}><span>{p.status}<small>{new Date(p.requested_at).toLocaleString()}</small></span><b>₹{(Number(p.amount_paise)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></div>):<p>Withdrawal requests will be enabled after Cashfree approves the marketplace and verifies your payout account. Settlements are processed by the payment provider.</p>}</article></div>
          <p className="analytics-privacy-note">Amounts shown are based on recorded payment records and are not a bank balance or guaranteed withdrawable amount. Actual settlements depend on provider fees, taxes, refunds, disputes, reserves and settlement status. No withdrawal is initiated from this dashboard until the provider integration is approved and connected.</p>
        </section> : active === "Form submissions" ? <section className="form-inbox-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">CUSTOMER MESSAGES</div><h1>Form <em>submissions.</em></h1><p>Messages sent through contact forms on your published websites.</p></div><button className="ghost-btn" onClick={loadFormInbox} disabled={formInboxLoading}>{formInboxLoading ? "Refreshing…" : "↻ Refresh"}</button></div>
          <div className="form-inbox-stats"><div><small>Total messages</small><b>{formSubmissions.length}</b></div><div><small>Unread</small><b>{formSubmissions.filter(item=>!item.is_read).length}</b></div><div><small>Websites</small><b>{new Set(formSubmissions.map(item=>item.site_id)).size}</b></div></div>
          {formInboxError && <div className="form-inbox-error">{formInboxError}</div>}
          {formInboxLoading && !formSubmissions.length ? <div className="cloud-empty">Loading your messages…</div> : !formSubmissions.length ? <div className="cloud-empty">No form submissions yet. Messages from your published website forms will appear here.</div> :
            <div className="form-inbox-layout"><div className="form-inbox-list">{formSubmissions.map(item=><button key={item.id} className={"form-inbox-item "+(!item.is_read?"unread ":"")+(selectedSubmission?.id===item.id?"selected":"")} onClick={()=>{setSelectedSubmission(item);if(!item.is_read)markSubmissionRead(item)}}><span className="form-inbox-item-top"><b>{item.sender_name}</b><small>{new Date(item.created_at).toLocaleString()}</small></span><span className="form-inbox-site">{item.site?.name || "Website"} · {item.form_title}</span><span className="form-inbox-preview">{item.message}</span></button>)}</div>
            {selectedSubmission ? <article className="form-inbox-detail"><div className="eyebrow">MESSAGE DETAILS</div><h2>{selectedSubmission.sender_name}</h2><a href={"mailto:"+selectedSubmission.sender_email}>{selectedSubmission.sender_email}</a><p className="form-inbox-meta">{selectedSubmission.site?.name || "Website"} · {selectedSubmission.form_title} · {new Date(selectedSubmission.created_at).toLocaleString()}</p><div className="form-inbox-message">{selectedSubmission.message}</div><button className="ghost-btn" onClick={()=>markSubmissionRead(selectedSubmission)}>{selectedSubmission.is_read?"Mark as unread":"Mark as read"}</button></article> : <div className="form-inbox-detail form-inbox-empty">Select a message to read it.</div>}</div>}
        </section> : <>
        <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"></span> YOUR CREATIVE SPACE</div><h1>Build something <em>brilliant.</em></h1><p className="welcome-copy">Your ideas deserve a place on the internet. Make it happen with DuKu FCA.</p></div><div className="welcome-orb"><div className="orb-inner">D<span>✦</span></div><i className="orbit-dot one"></i><i className="orbit-dot two"></i></div></div>
        <section className="launch-card"><div className="launch-copy"><div className="pill"><span></span> YOUR NEXT BIG THING STARTS HERE</div><h2>From blank canvas<br/>to <span>live website.</span></h2><p>Design, customise and publish a website that feels unmistakably yours. No code required.</p><div className="launch-actions"><button className="primary-btn" onClick={()=>startEditor()}>Create a website <span>↗</span></button><button className="ghost-btn" onClick={()=>document.getElementById("templates").scrollIntoView({behavior:"smooth"})}>Explore templates <span>→</span></button></div><div className="trust-line"><span>✦</span> Free to start <b>·</b> No credit card required <b>·</b> Your site, your rules</div></div><div className="launch-art"><div className="float-card card-a"><span className="mini-icon">✦</span><div><b>Creative freedom</b><small>Make it yours</small></div></div><div className="browser-mock"><div className="browser-bar"><i></i><i></i><i></i><span>yourbrand.dukubusiness.online</span></div><div className="mock-page"><div className="mock-nav"><b>STUDIO<span>®</span></b><small>WORK　 ABOUT　 CONTACT</small></div><div className="mock-hero"><div><small>DESIGN THAT MOVES YOU</small><strong>Ideas into<br/><i>experiences.</i></strong><span className="mock-button">DISCOVER MORE ↗</span></div><div className="mock-image"><div className="mock-sun"></div><div className="mock-arch"></div></div></div></div></div><div className="float-card card-b"><span className="check-icon">✓</span><div><b>Ready to publish</b><small>Your vision, online</small></div></div><div className="art-glow"></div></div></section>
        <div className="stats-strip"><div><b>01</b><span>Start with an idea</span></div><div><b>02</b><span>Make it your own</span></div><div><b>03</b><span>Publish to the world</span></div><div className="stats-note">A simpler way to build online <span>✳</span></div></div>
        <section className="templates-section" id="templates"><div className="section-heading"><div><div className="eyebrow">A HEAD START FOR YOUR IDEAS</div><h2>Find your <em>starting point.</em></h2><p>Pick a design. Make it yours. The rest is up to you.</p></div><button className="view-all" onClick={()=>setFilter("All")}>View all templates <span>↗</span></button></div><div className="template-tools"><div className="filter-pills">{["All","Business","Portfolio","Store","Agency"].map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates"/></div></div><div className="template-grid">{filtered.map(t=><article className="template-card" key={t.name}><div className={"template-preview "+t.color}><div className="template-window"><div className="window-top"><span>● ● ●</span><small>{t.name.toLowerCase()}.studio</small></div><div className={"preview-design "+t.shape}><div className="preview-copy"><small>{t.type.toUpperCase()} TEMPLATE</small><b>{t.shape==="studio"?"Create with intention.":t.shape==="forma"?"Your work. Your world.":t.shape==="morrow"?"Everyday, elevated.":"Make good things happen."}</b><i></i></div><div className="preview-shape"></div></div></div><span className="template-tag">{t.tag}</span></div><div className="template-meta"><div><b>{t.name}</b><small>{t.type} · Responsive</small></div><button onClick={()=>startEditor(t.name)}>Use template <span>↗</span></button></div></article>)}</div>{filtered.length===0&&<div className="empty-state">No templates match that search. Try another name or category.</div>}</section>
        <section className="feature-section" id="features"><div className="eyebrow">EVERYTHING IN ONE PLACE</div><h2>Tools that make the<br/><em>hard part feel easy.</em></h2><div className="feature-grid"><div className="feature-card"><span>✥</span><h3>Visual website editor</h3><p>Arrange sections, update content and shape your site with a visual-first workflow.</p></div><div className="feature-card"><span>◈</span><h3>Responsive by design</h3><p>Create experiences that look considered on desktop, tablet and mobile.</p></div><div className="feature-card"><span>⌘</span><h3>Connect your stack</h3><p>Plan integrations for APIs, databases, forms and the tools your business already uses.</p></div><div className="feature-card"><span>↗</span><h3>Your own web address</h3><p>Publish on a DuKu subdomain and connect a domain you already own.</p></div></div></section>
        <section className="bottom-cta" id="how"><div><div className="eyebrow">YOUR NEXT CHAPTER IS ONLINE</div><h2>Good ideas look better<br/>on the <em>internet.</em></h2><p>Start building your website with DuKu FCA.</p></div><button className="primary-btn" onClick={()=>{setAuthMode("Create your free account");setShowAuth(true)}}>Create your free account ↗</button><div className="cta-star">✳</div></section>
        <footer><a className="brand footer-brand" href="#"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></a><span>© 2026 DuKu Business. Built for what's next.</span><div><a href="#features">Features</a><a href="#templates">Templates</a><a href="mailto:support@dukubusiness.online">Support</a></div></footer>
        </>}
      </main>
    </div>
    {showAuth&&<div className="modal-backdrop" onClick={()=>setShowAuth(false)}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowAuth(false)}>×</button><div className="modal-mark">D</div><div className="eyebrow">WELCOME TO DUKU FCA</div><h2>{authMode}</h2><p>Save your projects, publish websites and manage everything in one place.</p><label>Email address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={authMode==="Welcome back"?"current-password":"new-password"}/></label><button className="primary-btn full" disabled={authBusy} onClick={submitAuth}>{authBusy?"Please wait…":authMode==="Welcome back"?"Log in":"Create account"} ↗</button>{authNotice&&<div className="auth-feedback">{authNotice}</div>}<small className="modal-legal">{isSupabaseConfigured?"Secure sign-in powered by DuKu FCA Supabase.":"Account service configuration is not available in this deployment yet."}</small><button className="switch-auth" onClick={()=>setAuthMode(authMode==="Welcome back"?"Create your free account":"Welcome back")}>{authMode==="Welcome back"?"New to DuKu FCA? Create an account":"Already have an account? Log in"}</button></div></div>}
    {showEditor&&<div className="editor-overlay"><div className="editor-top"><button className="brand editor-brand" onClick={()=>setShowEditor(false)}><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></button><div className="editor-site"><input value={siteName} onChange={e=>setSiteName(e.target.value)}/><span className="saved">{authUser?"● "+authUser.email:"● Auto-saved on this device"}</span></div><div className="editor-actions"><button className="ghost-btn" onClick={exportDraft}>Export backup ↓</button><button className="ghost-btn" disabled={!authUser||cloudBusy} onClick={saveCloudDraft}>{cloudBusy?"Saving…":"Save to cloud"}</button><button className="ghost-btn" onClick={()=>setShowEditor(false)}>Exit editor</button>{authUser&&<button className="ghost-btn" onClick={signOut}>Sign out</button>}<button className="primary-btn small" disabled={cloudBusy} onClick={publishSite}>{cloudBusy?"Publishing…":"Publish ↗"}</button></div>{cloudNotice&&<div className="cloud-save-notice">{cloudNotice}</div>}</div><div className="editor-workspace"><aside className="editor-tools"><b>PAGES</b><div className="page-manager">{pages.map(page=><div className={"page-manager-row "+(page.id===activePageId?"active":"")} key={page.id}><button className="page-select" onClick={()=>switchPage(page)}>{page.name}</button>{pages.length>1&&<button className="page-delete" onClick={()=>deletePage(page)} title={"Delete "+page.name}>×</button>}</div>)}<button className="add-page-btn" onClick={addPage}>＋ Add page</button></div><b>ADD ELEMENTS</b>{["＋ Text","▧ Image","▤ Button","▥ Section","▱ Form","⌘ Embed code","▧ Gallery","❝ Testimonials","＄ Pricing","？ FAQ","▥ Stats","♙ Team","✧ Logo strip","↗ Callout","▦ Columns","▣ Container"].map(x=><button key={x} onClick={()=>addBlock(x)}>{x}</button>)}<b className="media-heading">REUSABLE SECTIONS</b><div className="reusable-section-library"><button type="button" disabled={!selectedBlockId} onClick={()=>selectedBlock&&saveReusableSection(selectedBlock)}>＋ Save selected section</button>{reusableSections.length===0?<small>No saved sections yet. Select a block and save it here.</small>:reusableSections.map(section=><div className="reusable-section-row" key={section.id}><span><b>{section.name}</b><small>{section.block.type} · reusable</small></span><button type="button" onClick={()=>insertReusableSection(section)}>Insert</button><button type="button" title="Delete saved section" onClick={()=>setReusableSections(current=>current.filter(item=>item.id!==section.id))}>×</button></div>)}</div>{sectionNotice&&<div className="media-notice">{sectionNotice}</div>}<b className="media-heading">MEDIA LIBRARY</b><label className="media-upload">＋ Upload images<input type="file" accept="image/*" multiple onChange={uploadMedia}/></label><div className="media-note">Images are stored locally in this browser. Max 2 MB each.</div>{mediaNotice&&<div className="media-notice">{mediaNotice}</div>}<div className="media-grid">{mediaAssets.map(asset=><div className="media-item" key={asset.id}><img src={asset.dataUrl} alt={asset.name}/><div><span title={asset.name}>{asset.name}</span><button onClick={()=>insertMedia(asset)}>Add</button><button onClick={()=>removeMedia(asset.id)} title="Remove from library">×</button></div></div>)}</div><div className="editor-help">Select text in the preview to edit your content.</div></aside><div className="editor-canvas-wrap"><div className="canvas-toolbar"><span>Live preview · {previewDevice==="desktop"?"Desktop":previewDevice==="tablet"?"Tablet":"Mobile"}</span><div className="device-switch"><button className={previewDevice==="desktop"?"active":""} onClick={()=>setPreviewDevice("desktop")}>Desktop</button><button className={previewDevice==="tablet"?"active":""} onClick={()=>setPreviewDevice("tablet")}>Tablet</button><button className={previewDevice==="mobile"?"active":""} onClick={()=>setPreviewDevice("mobile")}>Mobile</button></div></div><div className={"site-canvas preview-"+previewDevice}><div className="canvas-nav"><b>{siteName.toUpperCase()}</b><span>{pages.map(page=>page.name.toUpperCase()).join("　 ")}</span><button>LET'S TALK ↗</button></div><div className="canvas-hero"><div className="canvas-copy"><small>{activePageId==="home"?"DESIGNED WITH DUKU FCA":activePageId.toUpperCase()+" · DUKU FCA"}</small><h1 contentEditable suppressContentEditableWarning onBlur={e=>setHeadline(e.currentTarget.textContent)}>{headline}</h1><p contentEditable suppressContentEditableWarning onBlur={e=>setSubline(e.currentTarget.textContent)}>{subline}</p><button>Explore more ↗</button></div><div className="canvas-art"><div className="canvas-disc"></div><div className="canvas-block"></div></div></div><div className="canvas-lower"><span>01 / WHAT WE DO</span><b>Thoughtful design. Clear purpose.</b><span>SCROLL TO EXPLORE ↓</span></div>{blocks.map((block,index)=><div className={"editor-added-block "+(selectedBlockId===block.id?"is-selected":"")+(draggedBlockId===block.id?" is-dragging":"")} key={block.id} draggable onClick={()=>setSelectedBlockId(block.id)} onDragStart={event=>{setDraggedBlockId(block.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",String(block.id));}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const source=event.dataTransfer.getData("text/plain")||draggedBlockId;reorderBlocks(source,block.id);setDraggedBlockId(null);}} onDragEnd={()=>setDraggedBlockId(null)} style={{background:block.backgroundColor||undefined,textAlign:block.textAlign||"left",padding:(block.padding||24)+"px",maxWidth:block.widthMode==="standard"?"760px":block.widthMode==="wide"?"1100px":"none",width:block.widthMode==="full"?"100%":"calc(100% - 48px)",margin:block.widthMode==="full"?"0":"18px auto"}}><div className="block-editor-fields"><small>CONTENT BLOCK · {String(index+1).padStart(2,"0")} · {block.type.toUpperCase()}</small><input aria-label="Block heading" value={block.title||""} onChange={e=>updateBlock(block.id,"title",e.target.value)} placeholder="Block heading"/><textarea aria-label="Block content" value={block.content||""} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder={block.type==="Embed code"?"Paste a YouTube or Vimeo URL here.":block.type==="Button"?"Button label":"Write your content here."}/>{(block.type==="Button"||block.type==="Embed code"||block.type==="Callout")&&<input aria-label={block.type==="Embed code"?"Embed URL":"Button destination URL"} value={block.type==="Embed code"?(block.content||""):(block.linkUrl||"")} onChange={e=>updateBlock(block.id,block.type==="Embed code"?"content":"linkUrl",e.target.value)} placeholder={block.type==="Embed code"?"https://youtu.be/…":"https://yourwebsite.com"} />}{block.type==="Callout"&&<input value={block.linkLabel||""} onChange={e=>updateBlock(block.id,"linkLabel",e.target.value)} placeholder="Button label"/>}{block.type==="Image"&&<div className="block-image-preview">{(()=>{const asset=mediaAssets.find(item=>item.id===block.assetId);return asset?<img src={asset.dataUrl} alt={block.title||asset.name}/>:<span>{block.assetId?"This image is no longer in your media library.":"Choose an image from the Media Library."}</span>;})()}</div>}
{block.type==="Container"&&<div className="nested-child-editor"><label>Container style<select value={block.containerStyle||"card"} onChange={e=>updateBlock(block.id,"containerStyle",e.target.value)}><option value="card">Card</option><option value="plain">Plain</option><option value="bordered">Bordered</option><option value="glass">Glass</option></select></label><label>Space between elements · {block.containerGap||14}px<input type="range" min="4" max="48" step="2" value={block.containerGap||14} onChange={e=>updateBlock(block.id,"containerGap",Number(e.target.value))}/></label><label>Corner radius · {block.containerRadius||18}px<input type="range" min="0" max="40" step="2" value={block.containerRadius||18} onChange={e=>updateBlock(block.id,"containerRadius",Number(e.target.value))}/></label><label>Border thickness · {block.containerBorderWidth||1}px<input type="range" min="0" max="6" step="1" value={block.containerBorderWidth||1} onChange={e=>updateBlock(block.id,"containerBorderWidth",Number(e.target.value))}/></label><b>INNER ELEMENTS · {(block.children||[]).length}</b>{(block.children||[]).map((child,childIndex)=><div className="nested-child-row" key={child.id} draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",String(child.id));e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}} onDrop={e=>{e.preventDefault();const source=e.dataTransfer.getData("text/plain");if(source)reorderNestedChild(block.id,source,child.id);}}><div className="nested-child-toolbar"><small>⠿ {child.type.toUpperCase()} · {childIndex+1}</small><div><button type="button" disabled={childIndex===0} onClick={()=>reorderNestedChild(block.id,child.id,(block.children||[])[childIndex-1].id)} aria-label="Move inner element up">↑</button><button type="button" disabled={childIndex===(block.children||[]).length-1} onClick={()=>reorderNestedChild(block.id,child.id,(block.children||[])[childIndex+1].id)} aria-label="Move inner element down">↓</button></div></div>{child.type==="heading"?<input value={child.title||""} placeholder="Heading" onChange={e=>updateNestedChild(block.id,child.id,"title",e.target.value)}/>:child.type==="image"?<><select value={child.assetId||""} onChange={e=>updateNestedChild(block.id,child.id,"assetId",e.target.value)}><option value="">Choose media image</option>{mediaAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><input value={child.alt||""} placeholder="Image alt text" onChange={e=>updateNestedChild(block.id,child.id,"alt",e.target.value)}/></>:child.type==="gallery"?<select multiple value={child.assetIds||[]} onChange={e=>updateNestedChild(block.id,child.id,"assetIds",Array.from(e.target.selectedOptions).map(option=>option.value))}>{mediaAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select>:child.type==="columns"?<div className="nested-columns-fields">{(child.columns||[{title:"Column one",content:""},{title:"Column two",content:""}]).map((col,i)=><div key={i}><input value={col.title||""} placeholder="Column heading" onChange={e=>updateNestedChild(block.id,child.id,"columns",(child.columns||[{title:"Column one",content:""},{title:"Column two",content:""}]).map((v,j)=>j===i?{...v,title:e.target.value}:v))}/><textarea value={col.content||""} placeholder="Column content" onChange={e=>updateNestedChild(block.id,child.id,"columns",(child.columns||[{title:"Column one",content:""},{title:"Column two",content:""}]).map((v,j)=>j===i?{...v,content:e.target.value}:v))}/></div>)}</div>:<textarea value={child.content||""} placeholder="Content" onChange={e=>updateNestedChild(block.id,child.id,"content",e.target.value)}/>}{child.type==="button"&&<input value={child.linkUrl||""} placeholder="Button URL" onChange={e=>updateNestedChild(block.id,child.id,"linkUrl",e.target.value)}/>}<button type="button" onClick={()=>removeNestedChild(block.id,child.id)}>Remove</button></div>)}<div className="nested-child-actions"><button type="button" onClick={()=>addNestedChild(block.id,"heading")}>＋ Heading</button><button type="button" onClick={()=>addNestedChild(block.id,"text")}>＋ Text</button><button type="button" onClick={()=>addNestedChild(block.id,"button")}>＋ Button</button><button type="button" onClick={()=>addNestedChild(block.id,"image")}>＋ Image</button><button type="button" onClick={()=>addNestedChild(block.id,"gallery")}>＋ Gallery</button><button type="button" onClick={()=>addNestedChild(block.id,"columns")}>＋ Columns</button></div></div>}{["Gallery","Testimonials","Pricing","FAQ","Stats","Team","Logo strip","Columns"].includes(block.type)&&<div className="structured-block-editor">{(block.items||[]).map((item,itemIndex)=><div className="structured-item-editor" key={itemIndex}><b>{block.type} item {itemIndex+1}</b>
{block.type==="Gallery"&&<><select aria-label="Gallery image" value={item.assetId||""} onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,assetId:e.target.value}:v))}><option value="">Choose image from media library</option>{mediaAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><input aria-label="Image caption" value={item.caption||""} placeholder="Image caption" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,caption:e.target.value}:v))}/></>}
{block.type==="Testimonials"&&<><input value={item.name||""} placeholder="Customer name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/><input value={item.role||""} placeholder="Role / company" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,role:e.target.value}:v))}/><textarea value={item.quote||""} placeholder="Testimonial" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,quote:e.target.value}:v))}/></>}
{block.type==="Pricing"&&<><input value={item.name||""} placeholder="Plan name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/><input value={item.price||""} placeholder="Price" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,price:e.target.value}:v))}/><input value={item.period||""} placeholder="Billing period" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,period:e.target.value}:v))}/><textarea value={item.features||""} placeholder="One feature per line" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,features:e.target.value}:v))}/><label className="featured-toggle"><input type="checkbox" checked={!!item.featured} onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,featured:e.target.checked}:v))}/> Featured plan</label></>}
{block.type==="FAQ"&&<><input value={item.question||""} placeholder="Question" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,question:e.target.value}:v))}/><textarea value={item.answer||""} placeholder="Answer" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,answer:e.target.value}:v))}/></>}
{block.type==="Stats"&&<><input value={item.value||""} placeholder="Statistic (e.g. 98%)" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,value:e.target.value}:v))}/><input value={item.label||""} placeholder="Label" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,label:e.target.value}:v))}/></>}
{block.type==="Team"&&<><input value={item.name||""} placeholder="Name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/><input value={item.role||""} placeholder="Role" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,role:e.target.value}:v))}/><textarea value={item.bio||""} placeholder="Short bio" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,bio:e.target.value}:v))}/></>}
{block.type==="Logo strip"&&<input value={item.name||""} placeholder="Brand / partner name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/>}{block.type==="Columns"&&<><input value={item.title||""} placeholder="Column heading" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,title:e.target.value}:v))}/><textarea value={item.content||""} placeholder="Column content" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,content:e.target.value}:v))}/><input value={item.linkLabel||""} placeholder="Optional link label" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,linkLabel:e.target.value}:v))}/><input value={item.linkUrl||""} placeholder="Optional link URL (https://…)" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,linkUrl:e.target.value}:v))}/></>}</>
<button type="button" onClick={()=>updateBlock(block.id,"items",block.items.filter((v,i)=>i!==itemIndex))}>Remove item</button></div>)}<button type="button" onClick={()=>updateBlock(block.id,"items",[...(block.items||[]),block.type==="Gallery"?{assetId:"",caption:"New image"}:block.type==="Testimonials"?{name:"Customer",role:"",quote:""}:block.type==="Pricing"?{name:"New plan",price:"",period:"",features:"",featured:false}:block.type==="FAQ"?{question:"New question",answer:""}:block.type==="Stats"?{value:"0",label:"New metric"}:block.type==="Team"?{name:"New member",role:"Role",bio:""}:block.type==="Logo strip"?{name:"New brand"}:block.type==="Columns"?{title:"New column",content:"Add your content here."}:{name:"New item"}])} disabled={block.type==="Columns"&&(block.items||[]).length>=4}>＋ Add {block.type==="FAQ"?"question":block.type==="Pricing"?"plan":block.type==="Columns"?"column":"item"}</button></div>}</div><div className="block-controls"><button disabled={index===0} onClick={()=>moveBlock(index,-1)} title="Move up">↑</button><button disabled={index===blocks.length-1} onClick={()=>moveBlock(index,1)} title="Move down">↓</button><button onClick={()=>duplicateBlock(block)}>Duplicate</button><button onClick={()=>setSelectedBlockId(block.id)}>Design</button><button onClick={()=>setBlocks(current=>current.filter(item=>item.id!==block.id))}>Remove</button></div></div>)}</div></div><aside className="properties">{selectedBlock&&<><b>SELECTED ELEMENT · {selectedBlock.type.toUpperCase()}</b><label>Background color<input type="color" value={selectedBlock.backgroundColor||"#ffffff"} onChange={e=>updateBlock(selectedBlock.id,"backgroundColor",e.target.value)}/></label><label>Text alignment<div className="block-align-options"><button className={(selectedBlock.textAlign||"left")==="left"?"active":""} onClick={()=>updateBlock(selectedBlock.id,"textAlign","left")}>Left</button><button className={selectedBlock.textAlign==="center"?"active":""} onClick={()=>updateBlock(selectedBlock.id,"textAlign","center")}>Center</button><button className={selectedBlock.textAlign==="right"?"active":""} onClick={()=>updateBlock(selectedBlock.id,"textAlign","right")}>Right</button></div></label><label>Layout width<select value={selectedBlock.widthMode||"standard"} onChange={e=>updateBlock(selectedBlock.id,"widthMode",e.target.value)}><option value="standard">Standard content</option><option value="wide">Wide section</option><option value="full">Full width</option></select></label><label>Section spacing <input type="range" min="8" max="72" step="4" value={selectedBlock.padding||24} onChange={e=>updateBlock(selectedBlock.id,"padding",Number(e.target.value))}/><span className="property-note">{selectedBlock.padding||24}px padding</span></label><button className="clear-selection-btn" onClick={()=>setSelectedBlockId(null)}>Close element settings</button><div className="property-divider"></div></>}<b>PAGE SETTINGS</b><label>Page title<input value={siteName} onChange={e=>setSiteName(e.target.value)}/></label><label>Hero headline<textarea value={headline} onChange={e=>setHeadline(e.target.value)}/></label><label>Hero description<textarea value={subline} onChange={e=>setSubline(e.target.value)}/></label><div className="property-divider"></div><b>BRAND & APPEARANCE</b><label>Brand accent<input type="color" value={brandColor} onChange={e=>setBrandColor(e.target.value)}/></label><label>Section surface<input type="color" value={surfaceColor} onChange={e=>setSurfaceColor(e.target.value)}/></label><label>Website font<select value={siteFont} onChange={e=>setSiteFont(e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option><option>Trebuchet MS</option><option>Verdana</option></select></label><label>Header layout<select value={headerStyle} onChange={e=>setHeaderStyle(e.target.value)}><option value="standard">Standard navigation</option><option value="centered">Centered brand</option><option value="minimal">Minimal</option></select></label><label>Logo / brand text<input value={logoText} onChange={e=>setLogoText(e.target.value)} placeholder={siteName}/></label><label>Footer text<input value={footerText} onChange={e=>setFooterText(e.target.value)} placeholder="© Your business. All rights reserved."/></label><label>Extra navigation links<textarea rows="4" value={customNavText} onChange={e=>setCustomNavText(e.target.value)} placeholder={"Services | /services\nBook now | https://example.com/book"}/><span className="property-note">One link per line: Label | URL. Use /page for internal pages.</span></label><label>Social media links<textarea rows="4" value={socialLinksText} onChange={e=>setSocialLinksText(e.target.value)} placeholder={"Instagram | https://instagram.com/yourbrand\nYouTube | https://youtube.com/@yourbrand"}/><span className="property-note">One link per line: Platform | Full https:// URL.</span></label><label>Footer layout<select value={footerLayout} onChange={e=>setFooterLayout(e.target.value)}><option value="standard">Standard</option><option value="centered">Centered footer</option><option value="columns">Three-part footer</option></select></label><div className="property-note">Dropdown menu: add a parent link using “Services | #”, then add child links on the next lines starting with “- ”, for example “- Web Design | /web-design”.</div><div className="property-divider"></div><b>PUBLISHING</b><label>Free subdomain<input value={siteSubdomain} onChange={e=>setSiteSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="your-brand"/></label><div className="property-note">Your public address: {(siteSubdomain || siteName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "your-site")}.dukubusiness.online</div><div className="property-divider"></div><b>SEO & SEARCH</b><label>Search title<input value={seoTitle} onChange={e=>setSeoTitle(e.target.value)} placeholder={siteName}/></label><label>Meta description<textarea value={seoDescription} onChange={e=>setSeoDescription(e.target.value)} placeholder="Describe this page for search engines."/></label><label>Page URL slug<input value={siteSlug} onChange={e=>setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}/></label><div className="seo-preview"><small>SEARCH PREVIEW</small><b>{seoTitle||siteName}</b><span>dukubusiness.online/{siteSlug}</span><p>{seoDescription||"Your page description will appear here in search results."}</p></div><div className="property-note">Changes update the preview and save on this device. SEO settings are draft-only until publishing is connected.</div></aside></div>{published&&<div className="publish-toast">✓ Website published at <a href={publishedUrl} target="_blank" rel="noreferrer">{publishedUrl}</a></div>}</div>}
  </div>;
}
function App() {
  const host = window.location.hostname;
  if (host.startsWith("admin.")) return <AdminPortal />;
  if (host !== "dukubusiness.online" && host !== "www.dukubusiness.online" && host.endsWith(".dukubusiness.online")) return <TenantSite />;
  return <MainApp />;
}

export default App;
