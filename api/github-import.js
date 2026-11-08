const { createClient } = require("@supabase/supabase-js");

const MAX_FILES = 400;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const SKIP_DIRS = new Set([".git", "node_modules", "vendor", ".next", "dist", "build", ".expo", ".gradle", "Pods"]);

function parseRepo(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error("Enter a valid GitHub repository URL."); }
  if (url.hostname.toLowerCase() !== "github.com") throw new Error("Only github.com repository links are supported.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Use a link like https://github.com/owner/repository.");
  const owner = parts[0], repo = parts[1].replace(/\.git$/i, "");
  let branch = "";
  if (parts[2] === "tree" && parts.length > 3) branch = parts.slice(3).join("/");
  return { owner, repo, branch };
}
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST required." });
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Sign in to import a GitHub repository." });
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: "Project import authentication is not configured." });
    const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
    const { data: userData, error: authError } = await db.auth.getUser(token);
    if (authError || !userData?.user) return res.status(401).json({ error: "Your session expired. Sign in again." });

    const body = req.body || {};
    const type = body.projectType === "android" ? "android" : "website";
    const { owner, repo, branch: requestedBranch } = parseRepo(String(body.url || "").trim());
    const githubToken = typeof body.githubToken === "string" ? body.githubToken.trim() : "";
    if (githubToken.length > 500) return res.status(400).json({ error: "GitHub token is invalid." });
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "DuKu-FCA-Project-Importer" };
    if (githubToken) headers.Authorization = "Bearer " + githubToken;
    const github = async path => {
      const response = await fetch("https://api.github.com" + path, { headers });
      if (!response.ok) {
        if (response.status === 404) throw new Error("Repository or branch not found, or the repository is private. For private repositories, enter a GitHub token with read-only repository access.");
        if (response.status === 401 || response.status === 403) throw new Error("GitHub rejected the token or API request. Check token permissions and rate limits.");
        throw new Error("GitHub API request failed (" + response.status + ").");
      }
      return response.json();
    };
    const metadata = await github("/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo));
    const branch = requestedBranch || metadata.default_branch;
    const treeData = await github("/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/git/trees/" + encodeURIComponent(branch) + "?recursive=1");
    if (treeData.truncated) throw new Error("GitHub reports this repository tree is too large to import in one pass.");
    const selected = (treeData.tree || []).filter(item => {
      if (item.type !== "blob" || !item.path || item.path.startsWith("/") || item.path.split("/").some(p => !p || p === ".." || SKIP_DIRS.has(p))) return false;
      return !item.path.startsWith(".github/") || item.path.endsWith(".yml") || item.path.endsWith(".yaml");
    });
    if (!selected.length) throw new Error("No importable source files were found in this repository.");
    if (selected.length > MAX_FILES) throw new Error("This repository has " + selected.length + " files. The importer currently supports up to " + MAX_FILES + " files.");
    const files = {};
    let total = 0;
    for (const item of selected) {
      if (item.size > MAX_FILE_BYTES) continue;
      const response = await fetch("https://raw.githubusercontent.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/" + encodeURIComponent(branch).replace(/%2F/g, "/") + "/" + item.path.split("/").map(encodeURIComponent).join("/"), { headers: githubToken ? { Authorization: "Bearer " + githubToken } : {} });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.includes(0)) continue;
      total += bytes.length;
      if (total > MAX_TOTAL_BYTES) throw new Error("Repository exceeds the 8 MB source import limit.");
      files[item.path] = bytes.toString("utf8");
    }
    if (!Object.keys(files).length) throw new Error("No text source files could be imported.");
    const name = metadata.name || repo;
    let row, table;
    if (type === "android") {
      table = "android_projects";
      const framework = files["pubspec.yaml"] ? "flutter" : files["settings.gradle"] || files["settings.gradle.kts"] ? "kotlin" : files["app/src/main/java/MainActivity.java"] ? "java" : files["app.json"] || files["package.json"] ? "expo" : "kotlin";
      const packageMatch = (files["app.json"] || files["android/app/src/main/AndroidManifest.xml"] || "").match(/(?:package|applicationId)["'\s:=]+([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)/);
      const packageName = packageMatch?.[1] || "com.imported." + repo.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 35);
      const source = files["App.tsx"] || files["lib/main.dart"] || files["app/src/main/java/MainActivity.kt"] || files["app/src/main/java/MainActivity.java"] || "";
      row = { workspace_id: body.workspaceId || null, name, package_name: packageName, framework, language: framework === "flutter" ? "dart" : framework === "kotlin" ? "kotlin" : framework === "java" ? "java" : "typescript", files, app_config: { platform: "android", imported_from: metadata.html_url, github_branch: branch, starter: "github-import" }, created_by: userData.user.id };
    } else {
      table = "code_projects";
      const pkg = files["package.json"] || "";
      const framework = /"next"/.test(pkg) ? "next" : /"react"/.test(pkg) ? "react" : /"vue"/.test(pkg) ? "vue" : /"svelte"/.test(pkg) ? "svelte" : "github";
      row = { workspace_id: body.workspaceId || null, name, language: files["tsconfig.json"] ? "typescript" : files["index.html"] ? "html" : "javascript", framework, files, preview_settings: { imported_from: metadata.html_url, github_branch: branch, libraries: [] }, created_by: userData.user.id, updated_at: new Date().toISOString() };
    }
    const { data: project, error: insertError } = await db.from(table).insert(row).select().single();
    if (insertError) throw new Error("Project import could not be saved: " + insertError.message);
    return res.status(200).json({ ok: true, project, importedFiles: Object.keys(files).length, repository: metadata.html_url, branch });
  } catch (error) {
    console.error("DuKu GitHub import:", error?.message || error);
    return res.status(400).json({ error: error?.message || "GitHub import failed." });
  }
};
module.exports.config = { maxDuration: 60 };
