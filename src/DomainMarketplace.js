import React, { useState } from "react";
import "./DomainMarketplace.css";

const suggestions = [".com", ".in", ".co", ".net", ".org", ".dev"];

function normalizeDomain(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

export default function DomainMarketplace() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function searchDomain(value = domain) {
    const clean = normalizeDomain(value);
    setDomain(clean);
    setResult(null);
    setError("");
    if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(clean)) {
      setError("Enter a valid domain, such as yourbrand.com.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("https://rdap.org/domain/" + encodeURIComponent(clean), {
        headers: { Accept: "application/rdap+json, application/json" }
      });
      if (response.status === 404) {
        setResult({ domain: clean, availability: "available", message: "No registration record was found. Final availability and price must be confirmed by the registrar." });
      } else if (response.ok) {
        setResult({ domain: clean, availability: "taken", message: "This domain already has a registration record." });
      } else {
        setResult({ domain: clean, availability: "unknown", message: "The registry could not confirm availability. Try again or check with a registrar." });
      }
    } catch (e) {
      setResult({ domain: clean, availability: "unknown", message: "The registry lookup could not be reached. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return <main className="duku-domain-market">
    <header className="dm-nav">
      <a className="dm-brand" href="https://dukubusiness.online"><span className="dm-logo">D</span><span>DuKu<span className="dm-brand-light"> Domains</span></span></a>
      <nav><a href="#search">Find a domain</a><a href="#services">Domain services</a><a href="https://dashboard.dukubusiness.online">Workspace</a></nav>
      <a className="dm-nav-cta" href="https://dashboard.dukubusiness.online">Sign in <span>↗</span></a>
    </header>
    <section className="dm-hero" id="search">
      <div className="dm-hero-glow" />
      <div className="dm-eyebrow"><span /> THE DOMAIN & DIGITAL IDENTITY HUB</div>
      <h1>Your next big idea<br/><em>starts with a name.</em></h1>
      <p>Find your domain, bring your brand online, and manage your digital presence from one DuKu account.</p>
      <form className="dm-search" onSubmit={e => { e.preventDefault(); searchDomain(); }}>
        <span className="dm-search-icon">⌕</span>
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Search your perfect domain name" aria-label="Domain name" />
        <button disabled={busy}>{busy ? "Checking…" : "Search domain"} <span>→</span></button>
      </form>
      <div className="dm-tlds">{suggestions.map(tld => <button key={tld} onClick={() => { const base = normalizeDomain(domain).split(".")[0] || "yourbrand"; searchDomain(base + tld); }}>{tld}</button>)}</div>
      {error && <div className="dm-error" role="alert">{error}</div>}
      {result && <article className={"dm-result dm-result-" + result.availability}>
        <div><small>REGISTRY LOOKUP · {result.availability.toUpperCase()}</small><h3>{result.domain}</h3><p>{result.message}</p></div>
        <div className="dm-result-action">{result.availability === "available" ? <><b>Next step</b><span>Registrar checkout is not active yet.</span></> : <button onClick={() => { const base=result.domain.split(".")[0]; setDomain(base); setResult(null); }}>Try another name</button>}</div>
      </article>}
      <div className="dm-trust"><span>✓ Domain lookup</span><span>✓ DNS management</span><span>✓ Website hosting</span><span>✓ Developer tools</span></div>
    </section>
    <section className="dm-services" id="services">
      <div className="dm-section-heading"><div><div className="dm-eyebrow">MORE THAN A DOMAIN</div><h2>Everything your name needs<br/>to go live.</h2></div><p>One connected platform for your domains, websites, apps, and development workflow.</p></div>
      <div className="dm-service-grid">
        <article><span className="dm-service-icon">⌁</span><h3>Domain management</h3><p>Connect domains, manage DNS records, configure redirects, and monitor renewals.</p><a href="https://dashboard.dukubusiness.online">Manage domains ↗</a></article>
        <article><span className="dm-service-icon">▤</span><h3>Web hosting</h3><p>Bring your website, SSL, publishing workflow, and custom domain into one workspace.</p><a href="https://dashboard.dukubusiness.online">Explore hosting ↗</a></article>
        <article><span className="dm-service-icon">⌘</span><h3>Developer connections</h3><p>Connect Git repositories and build workflows for Visual Studio Code and Android Studio.</p><a href="https://dashboard.dukubusiness.online">Open developer hub ↗</a></article>
      </div>
    </section>
    <section className="dm-register-note">
      <div><div className="dm-eyebrow">DUKU REGISTRAR</div><h2>Domain registration is the next connection.</h2><p>DuKu can check public registration records now. Live registration, pricing, payment, renewals, and transfer orders require an approved registrar/reseller API and account credentials. No domain is sold or reserved by this lookup.</p></div>
      <a href="https://dashboard.dukubusiness.online">Open DuKu workspace ↗</a>
    </section>
    <footer className="dm-footer"><a className="dm-brand" href="https://dukubusiness.online"><span className="dm-logo">D</span><span>DuKu<span className="dm-brand-light"> Domains</span></span></a><span>This website comes under Upreti Industries Limited (UIL), as a official subsidiary.</span><span>© {new Date().getFullYear()} DuKu Business</span></footer>
  </main>;
}
