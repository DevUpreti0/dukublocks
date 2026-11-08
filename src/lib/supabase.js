import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabasePublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

// Share the Supabase session safely across DuKu's own subdomains.
// The value is split into small cookies to stay below common per-cookie limits.
const sharedDomainStorage = {
  getItem(key) {
    if (typeof document === "undefined") return null;
    const read = name => {
      const prefix = encodeURIComponent(name) + "=";
      const entry = document.cookie.split("; ").find(item => item.startsWith(prefix));
      return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
    };
    const count = Number(read(key + ".parts") || 0);
    if (!count) return read(key);
    let value = "";
    for (let i = 0; i < count; i += 1) {
      const part = read(key + "." + i);
      if (part === null) return null;
      value += part;
    }
    return value;
  },
  setItem(key, value) {
    if (typeof document === "undefined") return;
    const options = "; Path=/; Domain=.dukubusiness.online; SameSite=Lax; Secure";
    const chunkSize = 2800;
    const parts = [];
    for (let i = 0; i < value.length; i += chunkSize) parts.push(value.slice(i, i + chunkSize));
    document.cookie = encodeURIComponent(key) + "=; Max-Age=0" + options;
    const previous = Number(this._readRaw(key + ".parts") || 0);
    for (let i = 0; i < Math.max(previous, parts.length); i += 1) {
      const part = parts[i] || "";
      document.cookie = encodeURIComponent(key + "." + i) + "=" + encodeURIComponent(part) + (part ? "; Max-Age=604800" : "; Max-Age=0") + options;
    }
    document.cookie = encodeURIComponent(key + ".parts") + "=" + (parts.length > 1 ? parts.length : 0) + options;
    if (parts.length === 1) document.cookie = encodeURIComponent(key) + "=" + encodeURIComponent(value) + "; Max-Age=604800" + options;
  },
  _readRaw(name) {
    if (typeof document === "undefined") return null;
    const prefix = encodeURIComponent(name) + "=";
    const entry = document.cookie.split("; ").find(item => item.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  },
  removeItem(key) {
    if (typeof document === "undefined") return;
    const options = "; Max-Age=0; Path=/; Domain=.dukubusiness.online; SameSite=Lax; Secure";
    const count = Number(this._readRaw(key + ".parts") || 0);
    document.cookie = encodeURIComponent(key) + "=" + options;
    document.cookie = encodeURIComponent(key + ".parts") + "=" + options;
    for (let i = 0; i < Math.max(count, 8); i += 1) document.cookie = encodeURIComponent(key + "." + i) + "=" + options;
  }
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: sharedDomainStorage
      }
    })
  : null;
