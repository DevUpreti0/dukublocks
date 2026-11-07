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
  return <div className="tenant-site tenant-published">
    <div className="tenant-nav"><b>✦ {site.name}</b><nav>{pages.map(page => <a key={page.id} href={page.is_homepage ? "/" : "/" + page.slug}>{page.title}</a>)}</nav></div>
    <main className="tenant-published-main">
      <section className="tenant-published-hero"><div className="eyebrow">POWERED BY DUKU FCA</div><h1>{content.headline || site.name}</h1><p>{content.subline || ""}</p></section>
      {blocks.map((block,index) => {
        const type = String(block.type || "Text").toLowerCase();
        const asset = type === "image" ? (site.assets || []).find(item => item.id === block.assetId) : null;
        const link = safeTenantLink(block.linkUrl);
        const embed = type === "embed code" ? safeEmbedUrl(block.content) : "";
        const values = formValues[block.id] || { name: "", email: "", message: "" };
        return <section className={"tenant-content-block tenant-block-" + type.replace(/[^a-z]/g,"")} key={block.id || index}>
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
          <p>{block.content}</p>}
        </section>;
      })}
    </main>
    <footer>Built with <a href="https://dukubusiness.online">DuKu FCA</a> · Free Website Builder</footer>
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
  const [headline, setHeadline] = useState(() => readLocalDraft().headline || "Make your next idea unforgettable.");
  const [subline, setSubline] = useState(() => readLocalDraft().subline || "A beautiful online home for everything you do.");
  const [blocks, setBlocks] = useState(() => readLocalDraft().blocks || []);
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
      setSiteName(siteData.name); setSiteSubdomain(siteData.subdomain || siteData.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); setHeadline(first.headline || siteData.site_settings?.headline || ""); setSubline(first.subline || siteData.site_settings?.subline || "");
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
      const sitePayload = { workspace_id: workspace.id, name: siteName, slug: (siteSlug || "my-website").toLowerCase().replace(/[^a-z0-9-]/g,"-"), status: keepPublished ? "published" : "draft", site_settings: { headline, subline, template: "custom" }, seo_settings: { title: seoTitle, description: seoDescription } };
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
    try { const updatedPages = pages.map(page => page.id === activePageId ? { ...page, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : page); setPages(updatedPages); window.localStorage.setItem("duku-fca-editor-draft", JSON.stringify({ siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, pages: updatedPages, activePageId, mediaAssets, siteSubdomain, updatedAt: new Date().toISOString() })); } catch (error) { /* Local storage may be unavailable in private browsing. */ }
  // pages is read to merge the current editor state; adding it here would create a state-update loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor, siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, activePageId, mediaAssets, siteSubdomain]);
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
      "Embed code": ["Embedded content", "Add a trusted embed or widget."]
    };
    const [title, content] = defaults[type] || ["New element", "Add your content here."];
    setBlocks(current => current.concat([{ id: Date.now()+Math.random(), type, title, content, linkUrl: type === "Button" ? "https://example.com" : "" }]));
  };
  const updateBlock = (id, field, value) => setBlocks(current => current.map(block => block.id===id ? { ...block, [field]: value } : block));
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
        {["Overview","My websites","Templates","Domains","Media library","Form submissions"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>{setActive(item);setMobileNav(false);if(item==="Templates")document.getElementById("templates")?.scrollIntoView({behavior:"smooth"});if(item==="Form submissions")loadFormInbox();if(item==="Analytics")loadAnalytics()}}><span>{["⌂","▣","▦","◎","▤","✉"][i]}</span>{item}{item==="My websites" ? <i>0</i> : null}</button>)}
        <div className="side-label second">TOOLS</div>
        {["App integrations","Analytics","Help centre"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>setActive(item)}><span>{["⌘","↗","?"][i]}</span>{item}</button>)}
        <div className="side-bottom"><div className="upgrade-card"><div className="spark">✦</div><b>Build without limits</b><p>Explore more ways to grow your online presence.</p><button onClick={()=>setShowAuth(true)}>Explore plans ↗</button></div><div className="profile-row"><div className="avatar">G</div><div><b>Guest workspace</b><small>Sign in to sync your work</small></div><span>···</span></div></div>
      </aside>
      <main className="main-content">
        {authUser&&<section className="cloud-websites-panel"><div><div className="eyebrow">YOUR CLOUD WORKSPACE</div><h2>My saved websites</h2><p>Open your projects from any device after signing in.</p></div>{cloudSitesLoading?<span>Loading your websites…</span>:cloudSites.length?<div className="cloud-site-list">{cloudSites.map(site=><div className="cloud-site-row" key={site.id}><div><b>{site.name}</b><small>{site.slug} · {site.status}</small></div><button onClick={()=>openCloudSite(site)}>Open editor ↗</button></div>)}</div>:<div className="cloud-empty">No cloud websites yet. Create a website and choose Save to cloud in the editor.</div>}</section>}
        {active === "Analytics" ? <section className="analytics-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">WEBSITE PERFORMANCE</div><h1>Site <em>analytics.</em></h1><p>Privacy-conscious page-view reporting for your published websites.</p></div><div className="analytics-actions"><select value={analyticsRange} onChange={event=>{setAnalyticsRange(event.target.value);loadAnalytics(event.target.value)}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button className="ghost-btn" onClick={loadAnalytics} disabled={analyticsLoading}>{analyticsLoading?"Refreshing…":"↻ Refresh"}</button></div></div>
          {analyticsError&&<div className="form-inbox-error">{analyticsError}</div>}
          <div className="analytics-stats"><div><small>Page views</small><b>{analyticsEvents.length.toLocaleString()}</b><span>Recorded visits to pages</span></div><div><small>Published websites</small><b>{analyticsSites.filter(site=>site.status==="published").length}</b><span>Currently live</span></div><div><small>Top page</small><b>{analyticsEvents.length ? (analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{}) && Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1])[0][0]) : "—"}</b><span>By page views</span></div></div>
          {analyticsLoading&&!analyticsEvents.length?<div className="cloud-empty">Loading analytics…</div>:!analyticsSites.length?<div className="cloud-empty">Create and publish a website to start collecting analytics.</div>:<div className="analytics-grid"><article className="analytics-card"><h2>Views by website</h2>{analyticsSites.map(site=>{const count=analyticsEvents.filter(event=>event.site_id===site.id).length;return <div className="analytics-bar-row" key={site.id}><span>{site.name}</span><div><i style={{width:(analyticsEvents.length?Math.max(3,count/Math.max(1,...analyticsSites.map(s=>analyticsEvents.filter(e=>e.site_id===s.id).length))*100):0)+"%"}}/></div><b>{count}</b></div>})}</article><article className="analytics-card"><h2>Top pages</h2>{Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([slug,count])=><div className="analytics-list-row" key={slug}><span>/{slug}</span><b>{count}</b></div>)}{!analyticsEvents.length&&<p>No page views recorded in this period yet.</p>}</article><article className="analytics-card"><h2>Traffic sources</h2>{Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.referrer_host||"Direct / unknown";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([source,count])=><div className="analytics-list-row" key={source}><span>{source}</span><b>{count}</b></div>)}{!analyticsEvents.length&&<p>Sources appear as visitors arrive from other websites.</p>}</article><article className="analytics-card"><h2>Recent activity</h2>{analyticsEvents.slice(0,8).map(event=><div className="analytics-list-row" key={event.id}><span>/{event.page_slug||"home"} · {analyticsSites.find(site=>site.id===event.site_id)?.name||"Website"}<small>{new Date(event.created_at).toLocaleString()}</small></span><b>View</b></div>)}{!analyticsEvents.length&&<p>Published page views will appear here.</p>}</article></div>}
          <p className="analytics-privacy-note">DuKu FCA records page views, page paths and referring hostnames only. It does not currently estimate unique visitors or collect visitor names, email addresses or IP addresses.</p>
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
    {showEditor&&<div className="editor-overlay"><div className="editor-top"><button className="brand editor-brand" onClick={()=>setShowEditor(false)}><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></button><div className="editor-site"><input value={siteName} onChange={e=>setSiteName(e.target.value)}/><span className="saved">{authUser?"● "+authUser.email:"● Auto-saved on this device"}</span></div><div className="editor-actions"><button className="ghost-btn" onClick={exportDraft}>Export backup ↓</button><button className="ghost-btn" disabled={!authUser||cloudBusy} onClick={saveCloudDraft}>{cloudBusy?"Saving…":"Save to cloud"}</button><button className="ghost-btn" onClick={()=>setShowEditor(false)}>Exit editor</button>{authUser&&<button className="ghost-btn" onClick={signOut}>Sign out</button>}<button className="primary-btn small" disabled={cloudBusy} onClick={publishSite}>{cloudBusy?"Publishing…":"Publish ↗"}</button></div>{cloudNotice&&<div className="cloud-save-notice">{cloudNotice}</div>}</div><div className="editor-workspace"><aside className="editor-tools"><b>PAGES</b><div className="page-manager">{pages.map(page=><div className={"page-manager-row "+(page.id===activePageId?"active":"")} key={page.id}><button className="page-select" onClick={()=>switchPage(page)}>{page.name}</button>{pages.length>1&&<button className="page-delete" onClick={()=>deletePage(page)} title={"Delete "+page.name}>×</button>}</div>)}<button className="add-page-btn" onClick={addPage}>＋ Add page</button></div><b>ADD ELEMENTS</b>{["＋ Text","▧ Image","▤ Button","▥ Section","▱ Form","⌘ Embed code"].map(x=><button key={x} onClick={()=>addBlock(x)}>{x}</button>)}<b className="media-heading">MEDIA LIBRARY</b><label className="media-upload">＋ Upload images<input type="file" accept="image/*" multiple onChange={uploadMedia}/></label><div className="media-note">Images are stored locally in this browser. Max 2 MB each.</div>{mediaNotice&&<div className="media-notice">{mediaNotice}</div>}<div className="media-grid">{mediaAssets.map(asset=><div className="media-item" key={asset.id}><img src={asset.dataUrl} alt={asset.name}/><div><span title={asset.name}>{asset.name}</span><button onClick={()=>insertMedia(asset)}>Add</button><button onClick={()=>removeMedia(asset.id)} title="Remove from library">×</button></div></div>)}</div><div className="editor-help">Select text in the preview to edit your content.</div></aside><div className="editor-canvas-wrap"><div className="canvas-toolbar"><span>Live preview · {previewDevice==="desktop"?"Desktop":previewDevice==="tablet"?"Tablet":"Mobile"}</span><div className="device-switch"><button className={previewDevice==="desktop"?"active":""} onClick={()=>setPreviewDevice("desktop")}>Desktop</button><button className={previewDevice==="tablet"?"active":""} onClick={()=>setPreviewDevice("tablet")}>Tablet</button><button className={previewDevice==="mobile"?"active":""} onClick={()=>setPreviewDevice("mobile")}>Mobile</button></div></div><div className={"site-canvas preview-"+previewDevice}><div className="canvas-nav"><b>{siteName.toUpperCase()}</b><span>{pages.map(page=>page.name.toUpperCase()).join("　 ")}</span><button>LET'S TALK ↗</button></div><div className="canvas-hero"><div className="canvas-copy"><small>{activePageId==="home"?"DESIGNED WITH DUKU FCA":activePageId.toUpperCase()+" · DUKU FCA"}</small><h1 contentEditable suppressContentEditableWarning onBlur={e=>setHeadline(e.currentTarget.textContent)}>{headline}</h1><p contentEditable suppressContentEditableWarning onBlur={e=>setSubline(e.currentTarget.textContent)}>{subline}</p><button>Explore more ↗</button></div><div className="canvas-art"><div className="canvas-disc"></div><div className="canvas-block"></div></div></div><div className="canvas-lower"><span>01 / WHAT WE DO</span><b>Thoughtful design. Clear purpose.</b><span>SCROLL TO EXPLORE ↓</span></div>{blocks.map((block,index)=><div className="editor-added-block" key={block.id}><div className="block-editor-fields"><small>CONTENT BLOCK · {String(index+1).padStart(2,"0")} · {block.type.toUpperCase()}</small><input aria-label="Block heading" value={block.title||""} onChange={e=>updateBlock(block.id,"title",e.target.value)} placeholder="Block heading"/><textarea aria-label="Block content" value={block.content||""} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder={block.type==="Embed code"?"Paste a YouTube or Vimeo URL here.":block.type==="Button"?"Button label":"Write your content here."}/>{(block.type==="Button"||block.type==="Embed code")&&<input aria-label={block.type==="Button"?"Button destination URL":"Embed URL"} value={block.type==="Button"?(block.linkUrl||""):(block.content||"")} onChange={e=>updateBlock(block.id,block.type==="Button"?"linkUrl":"content",e.target.value)} placeholder={block.type==="Button"?"https://yourwebsite.com":"https://youtu.be/…"} />}{block.type==="Image"&&<div className="block-image-preview">{(()=>{const asset=mediaAssets.find(item=>item.id===block.assetId);return asset?<img src={asset.dataUrl} alt={block.title||asset.name}/>:<span>{block.assetId?"This image is no longer in your media library.":"Choose an image from the Media Library."}</span>;})()}</div>}</div><div className="block-controls"><button disabled={index===0} onClick={()=>moveBlock(index,-1)} title="Move up">↑</button><button disabled={index===blocks.length-1} onClick={()=>moveBlock(index,1)} title="Move down">↓</button><button onClick={()=>duplicateBlock(block)}>Duplicate</button><button onClick={()=>setBlocks(current=>current.filter(item=>item.id!==block.id))}>Remove</button></div></div>)}</div></div><aside className="properties"><b>PAGE SETTINGS</b><label>Page title<input value={siteName} onChange={e=>setSiteName(e.target.value)}/></label><label>Hero headline<textarea value={headline} onChange={e=>setHeadline(e.target.value)}/></label><label>Hero description<textarea value={subline} onChange={e=>setSubline(e.target.value)}/></label><div className="property-divider"></div><b>PUBLISHING</b><label>Free subdomain<input value={siteSubdomain} onChange={e=>setSiteSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="your-brand"/></label><div className="property-note">Your public address: {(siteSubdomain || siteName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "your-site")}.dukubusiness.online</div><div className="property-divider"></div><b>SEO & SEARCH</b><label>Search title<input value={seoTitle} onChange={e=>setSeoTitle(e.target.value)} placeholder={siteName}/></label><label>Meta description<textarea value={seoDescription} onChange={e=>setSeoDescription(e.target.value)} placeholder="Describe this page for search engines."/></label><label>Page URL slug<input value={siteSlug} onChange={e=>setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}/></label><div className="seo-preview"><small>SEARCH PREVIEW</small><b>{seoTitle||siteName}</b><span>dukubusiness.online/{siteSlug}</span><p>{seoDescription||"Your page description will appear here in search results."}</p></div><div className="property-note">Changes update the preview and save on this device. SEO settings are draft-only until publishing is connected.</div></aside></div>{published&&<div className="publish-toast">✓ Website published at <a href={publishedUrl} target="_blank" rel="noreferrer">{publishedUrl}</a></div>}</div>}
  </div>;
}
function App() {
  const host = window.location.hostname;
  if (host.startsWith("admin.")) return <AdminPortal />;
  if (host !== "dukubusiness.online" && host !== "www.dukubusiness.online" && host.endsWith(".dukubusiness.online")) return <TenantSite />;
  return <MainApp />;
}

export default App;
