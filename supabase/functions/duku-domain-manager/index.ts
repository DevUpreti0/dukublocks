import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const PROJECT_ID = "prj_2n4qYr0zvhSYsqNL3zPzEW5YmE2H";
const TEAM_ID = "team_IEA7icMgvucS822e2X1mvLgD";
const cleanDomain = (value: unknown) => {
  const domain = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  if (domain.length > 253 || !domain.includes(".") || !domain.split(".").every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) throw new Error("Enter a valid domain name.");
  return domain;
};
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Your session is invalid. Sign in again." }, 401);
  const user = userData.user;
  const admin = createClient(url, serviceKey);
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const siteId = String(body.site_id || "");
    const domain = cleanDomain(body.domain || "");
    if (!/^[0-9a-f-]{36}$/i.test(siteId)) throw new Error("Invalid website reference.");
    const { data: site, error: siteError } = await admin.from("sites").select("id,workspace_id,status,subdomain").eq("id", siteId).single();
    if (siteError || !site) throw new Error("Website not found.");
    const { data: workspace } = await admin.from("workspaces").select("id,owner_id").eq("id", site.workspace_id).single();
    const { data: member } = await admin.from("workspace_members").select("role").eq("workspace_id", site.workspace_id).eq("user_id", user.id).maybeSingle();
    if (workspace?.owner_id !== user.id && !["owner", "admin"].includes(member?.role || "")) return json({ error: "Only workspace owners or admins can manage this domain." }, 403);
    const { data: token, error: tokenError } = await admin.rpc("duku_get_vercel_domain_token_internal");
    if (tokenError || !token) return json({ error: "DuKu domain hosting is not configured yet. Ask the platform administrator to connect the Vercel domain API token." }, 503);
    const api = async (path: string, method = "GET", payload?: unknown) => {
      const response = await fetch("https://api.vercel.com" + path, {
        method,
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || data?.message || data?.error || ("Vercel returned " + response.status));
      return data;
    };
    if (action === "attach" || action === "refresh") {
      if (action === "attach" && site.status !== "published") throw new Error("Publish your website before attaching a live custom domain.");
      const { data: record, error: recordError } = await admin.from("site_domains").select("*").eq("site_id", siteId).eq("domain", domain).eq("domain_type", "custom").single();
      if (recordError || !record) throw new Error("Add this domain to your website first.");
      if (record.verification_status !== "verified") throw new Error("Verify domain ownership with the TXT record before attaching hosting.");
      const ensureProjectDomain = async (host: string) => {
        const existing = await api("/v9/projects/" + PROJECT_ID + "/domains/" + encodeURIComponent(host) + "?teamId=" + TEAM_ID).catch(() => null);
        if (existing) return existing;
        return await api("/v10/projects/" + PROJECT_ID + "/domains?teamId=" + TEAM_ID, "POST", { name: host });
      };
      const attached = await ensureProjectDomain(domain);
      const wwwDomain = "www." + domain;
      let wwwAttached: any = null;
      let wwwAttachError: string | null = null;
      try { wwwAttached = await ensureProjectDomain(wwwDomain); }
      catch (e) { wwwAttachError = e instanceof Error ? e.message : "Could not attach www hostname."; }
      const config = await api("/v6/domains/" + encodeURIComponent(domain) + "/config?projectIdOrName=" + PROJECT_ID + "&teamId=" + TEAM_ID).catch((e: Error) => ({ config_error: e.message }));
      const wwwConfig = await api("/v6/domains/" + encodeURIComponent(wwwDomain) + "/config?projectIdOrName=" + PROJECT_ID + "&teamId=" + TEAM_ID).catch((e: Error) => ({ config_error: e.message }));
      const apexVerified = attached?.verified === true || attached?.verification?.length === 0;
      const wwwVerified = wwwAttached?.verified === true || wwwAttached?.verification?.length === 0;
      const hostingStatus = apexVerified && wwwVerified && config?.misconfigured === false && wwwConfig?.misconfigured === false ? "active" : "pending_dns";
      const hostingConfig = {
        verified: Boolean(attached?.verified),
        wwwDomain,
        wwwVerified: Boolean(wwwAttached?.verified),
        misconfigured: config?.misconfigured ?? null,
        wwwMisconfigured: wwwConfig?.misconfigured ?? null,
        configuredBy: config?.configuredBy ?? null,
        recommendedCNAME: wwwConfig?.recommendedCNAME?.[0]?.value ?? null,
        recommendedIPv4: config?.recommendedIPv4?.[0]?.value ?? null,
        nameservers: config?.nameservers ?? null,
        verification: [...(attached?.verification ?? []), ...(wwwAttached?.verification ?? [])],
        configError: config?.config_error ?? wwwConfig?.config_error ?? wwwAttachError,
        lastProviderCheckAt: new Date().toISOString(),
      };
      const { error: saveError } = await admin.from("site_domains").update({ hosting_status: hostingStatus, hosting_config: hostingConfig, hosting_checked_at: new Date().toISOString() }).eq("id", record.id);
      if (saveError) throw new Error("Domain was attached but DuKu could not save the provider status.");
      return json({ success: true, domain, hosting_status: hostingStatus, hosting_config: hostingConfig, provider: { apex: attached, www: wwwAttached } });
    }
    if (action === "transfer_quote") {
      const { data: claimedDomain } = await admin.from("site_domains").select("site_id").eq("domain", domain).maybeSingle();
      if (claimedDomain && claimedDomain.site_id !== siteId) throw new Error("This domain is already connected to another DuKu website.");
      const years = Math.max(1, Math.min(10, Number(body.years) || 1));
      const price = await api("/v1/registrar/domains/" + encodeURIComponent(domain) + "/price?teamId=" + TEAM_ID + "&years=" + years);
      const transferPrice = Number(price.transferPrice);
      if (!Number.isFinite(transferPrice) || transferPrice <= 0) throw new Error("The registrar did not return a valid transfer price for this domain.");
      const { data: request, error: insertError } = await admin.from("domain_transfer_requests").insert({
        workspace_id: site.workspace_id, site_id: siteId, requested_by: user.id, domain,
        status: "quoted", years: Number(price.years) || years, auto_renew: body.auto_renew === true,
        quoted_price: transferPrice, currency: "USD",
        provider_response: { years: price.years, transferPrice: price.transferPrice, renewalPrice: price.renewalPrice },
      }).select("id,domain,status,years,auto_renew,quoted_price,currency,created_at").single();
      if (insertError) throw insertError;
      return json({ success: true, quote: request, renewal_price: price.renewalPrice, purchase_price: price.purchasePrice });
    }
    if (action === "transfer_status") {
      const requestId = String(body.request_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("Invalid transfer request.");
      const { data: transfer, error: transferError } = await admin.from("domain_transfer_requests").select("*").eq("id", requestId).eq("site_id", siteId).eq("requested_by", user.id).single();
      if (transferError || !transfer) throw new Error("Transfer request not found.");
      if (transfer.domain !== domain) throw new Error("The selected domain does not match this transfer request.");
      const result = await api("/v1/registrar/domains/" + encodeURIComponent(transfer.domain) + "/transfer?teamId=" + TEAM_ID);
      const providerStatus = String(result.status || result.state || "").toLowerCase();
      const status = ["completed","complete","transferred","success"].includes(providerStatus) ? "completed" : ["failed","error","cancelled","canceled"].includes(providerStatus) ? "failed" : "processing";
      const { error: updateError } = await admin.from("domain_transfer_requests").update({ status, provider_response: { status: providerStatus || "processing", orderId: transfer.registrar_order_id }, error_message: status === "failed" ? String(result.message || "Registrar reported a failed transfer.") : null, updated_at: new Date().toISOString() }).eq("id", transfer.id);
      if (updateError) throw updateError;
      if (status === "completed") await admin.from("site_domains").update({ verification_status: "verified", verified_at: new Date().toISOString(), verification_error: null }).eq("site_id", siteId).eq("domain", domain).eq("domain_type", "custom");
      return json({ success: true, status, domain, provider_status: providerStatus || "processing" });
    }
    if (action === "transfer_start") {
      if (body.confirm !== true) throw new Error("Confirm the transfer price and terms before continuing.");
      const requestId = String(body.request_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("Invalid transfer quote.");
      const { data: transfer, error: transferError } = await admin.from("domain_transfer_requests").select("*").eq("id", requestId).eq("site_id", siteId).eq("requested_by", user.id).single();
      if (transferError || !transfer || transfer.status !== "quoted" || transfer.domain !== domain) throw new Error("This transfer quote is no longer valid. Request a fresh quote.");
      const expectedPrice = Number(body.expected_price);
      if (!Number.isFinite(expectedPrice) || expectedPrice !== Number(transfer.quoted_price)) throw new Error("The confirmed price does not match the quote. Request a fresh quote.");
      const authCode = String(body.auth_code || "").trim();
      if (!authCode || authCode.length > 256) throw new Error("Enter a valid EPP authorisation code from your current registrar.");
      const contact = body.contact_information || {};
      const required = ["firstName","lastName","email","phone","address1","city","state","zip","country"];
      if (required.some(key => !String(contact[key] || "").trim())) throw new Error("Complete all required registrant contact details.");
      if (!/^\+[1-9]\d{7,14}$/.test(String(contact.phone))) throw new Error("Phone number must use international format, for example +919876543210.");
      if (!/^[A-Z]{2}$/.test(String(contact.country).toUpperCase())) throw new Error("Country must be a two-letter ISO code.");
      await admin.from("domain_transfer_requests").update({ status: "submitted", updated_at: new Date().toISOString() }).eq("id", transfer.id);
      try {
        const result = await api("/v1/registrar/domains/" + encodeURIComponent(domain) + "/transfer?teamId=" + TEAM_ID, "POST", {
          authCode,
          autoRenew: transfer.auto_renew === true,
          years: transfer.years,
          expectedPrice,
          contactInformation: {
            firstName: String(contact.firstName).trim(), lastName: String(contact.lastName).trim(), email: String(contact.email).trim(),
            phone: String(contact.phone).trim(), address1: String(contact.address1).trim(), ...(contact.address2 ? { address2: String(contact.address2).trim() } : {}),
            city: String(contact.city).trim(), state: String(contact.state).trim(), zip: String(contact.zip).trim(), country: String(contact.country).toUpperCase(),
            ...(contact.companyName ? { companyName: String(contact.companyName).trim() } : {}),
          },
        });
        const orderId = String(result.orderId || result.id || result.transferId || "");
        await admin.from("domain_transfer_requests").update({ status: "processing", registrar_order_id: orderId || null, provider_response: { status: result.status || "processing", orderId: orderId || null }, updated_at: new Date().toISOString() }).eq("id", transfer.id);
        const { data: existing } = await admin.from("site_domains").select("id").eq("site_id", siteId).eq("domain", domain).maybeSingle();
        if (!existing) await admin.from("site_domains").insert({ site_id: siteId, domain, domain_type: "custom", verification_status: "pending", verified_at: null, hosting_status: "not_attached", verification_token: "duku-fca=" + crypto.randomUUID().replaceAll("-", ""), dns_record_name: "_duku-verification." + domain });
        return json({ success: true, status: "processing", request_id: transfer.id, registrar_order_id: orderId || null, message: "Transfer request submitted to the registrar. Registration transfer and DNS activation are separate steps." });
      } catch (error) {
        await admin.from("domain_transfer_requests").update({ status: "failed", error_message: error instanceof Error ? error.message : "Registrar transfer failed.", updated_at: new Date().toISOString() }).eq("id", transfer.id);
        throw error;
      }
    }
    throw new Error("Unsupported domain operation.");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Domain operation failed." }, 400);
  }
});