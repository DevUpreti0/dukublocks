const { createClient } = require("@supabase/supabase-js");
const { createHash } = require("node:crypto");

const MAX_COMMAND = 4000;
const MAX_FILES = 400;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

function safeFiles(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) return [];
  const entries = Object.entries(files);
  if (entries.length > MAX_FILES) throw new Error("Project has too many files to sync (maximum 400).");
  let total = 0;
  return entries.flatMap(([name, value]) => {
    if (typeof value !== "string" || !name || name.startsWith("/") || name.includes("\\") || name.split("/").some(p => !p || p === "." || p === "..") || name.startsWith(".env")) return [];
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new Error("File exceeds 1 MB: " + name);
    total += bytes;
    if (total > MAX_TOTAL_BYTES) throw new Error("Project exceeds the 8 MB Linux workspace sync limit.");
    return [{ path: "workspace/" + name, content: Buffer.from(value, "utf8") }];
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST required." });
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Sign in again to use the Linux terminal." });
    const url = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return res.status(503).json({ error: "Workspace authentication is not configured on this deployment." });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
    const { data: userResult, error: authError } = await db.auth.getUser(token);
    if (authError || !userResult?.user) return res.status(401).json({ error: "Your session expired. Sign in again." });

    const body = req.body || {};
    const projectId = String(body.projectId || "");
    const projectType = body.projectType === "android" ? "android" : "website";
    const action = String(body.action || "run");
    if (!/^[0-9a-f-]{20,64}$/i.test(projectId)) return res.status(400).json({ error: "Save this project first, then reconnect the terminal." });
    if (!["run", "sync", "preview", "status"].includes(action)) return res.status(400).json({ error: "Unsupported terminal action." });

    const table = projectType === "android" ? "android_projects" : "code_projects";
    const columns = projectType === "android" ? "id,created_by,files,name,framework,package_name" : "id,created_by,files,name,language,framework";
    const { data: project, error: projectError } = await db.from(table).select(columns).eq("id", projectId).eq("created_by", userResult.user.id).single();
    if (projectError || !project) return res.status(404).json({ error: "Project not found or you do not have access to it." });

    const { Sandbox } = await import("@vercel/sandbox");
    const sandboxName = "duku-" + projectType + "-" + createHash("sha256").update(userResult.user.id + ":" + projectId).digest("hex").slice(0, 24);
    const sandbox = await Sandbox.getOrCreate({
      name: sandboxName,
      image: "vercel/sandbox/universal:latest",
      region: "bom1",
      resources: { vcpus: 2 },
      timeout: 20 * 60 * 1000,
      persistent: true,
      keepLastSnapshots: { count: 1 },
      networkPolicy: "allow-all",
      ports: [3000, 4173, 8081],
      resume: true,
      onCreate: async box => {
        await box.mkDir("workspace");
        const files = safeFiles(project.files || {});
        if (files.length) await box.writeFiles(files);
        const marker = await box.runCommand({ cmd: "bash", args: ["-lc", "printf '%s\\n' 'DuKu Linux workspace ready' > .duku-workspace"], cwd: "/vercel/sandbox/workspace" });
        if (marker.exitCode !== 0) throw new Error("Could not initialise the Linux project folder.");
      }
    });

    if (action === "sync") {
      const files = safeFiles(project.files || {});
      await sandbox.runCommand({ cmd: "mkdir", args: ["-p", "/vercel/sandbox/workspace"] });
      if (files.length) await sandbox.writeFiles(files);
      return res.status(200).json({ ok: true, output: "Saved project files synced into the isolated Linux workspace.", exitCode: 0, sandbox: sandboxName });
    }

    if (action === "status") {
      const r = await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", "printf 'Linux: '; uname -sr; printf 'Node: '; node --version 2>/dev/null || true; printf 'Python: '; python3 --version 2>/dev/null || true; printf 'npm: '; npm --version 2>/dev/null || true; printf 'pnpm: '; pnpm --version 2>/dev/null || true; printf 'bun: '; bun --version 2>/dev/null || true; printf '\\nProject files: '; find . -maxdepth 3 -type f | wc -l"],
        cwd: "/vercel/sandbox/workspace"
      });
      return res.status(200).json({ ok: r.exitCode === 0, output: await r.stdout(), stderr: await r.stderr(), exitCode: r.exitCode, sandbox: sandboxName });
    }

    if (action === "preview") {
      const install = await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", "if [ -f package.json ] && [ ! -d node_modules ]; then npm install --no-audit --no-fund; fi"],
        cwd: "/vercel/sandbox/workspace"
      });
      if (install.exitCode !== 0) return res.status(200).json({ ok: false, output: await install.stdout(), stderr: await install.stderr(), exitCode: install.exitCode });
      const start = await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", "if [ -f package.json ] && node -e \"process.exit(require('./package.json').scripts?.dev ? 0 : 1)\"; then (npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/duku-preview.log 2>&1 &); elif [ -f package.json ] && node -e \"process.exit(require('./package.json').scripts?.start ? 0 : 1)\"; then (HOST=0.0.0.0 PORT=3000 npm start > /tmp/duku-preview.log 2>&1 &); elif [ -f index.html ]; then (python3 -m http.server 3000 --bind 0.0.0.0 > /tmp/duku-preview.log 2>&1 &); else echo 'No supported web start script or index.html found.'; exit 2; fi; for i in $(seq 1 25); do if curl -sSf http://127.0.0.1:3000 >/dev/null; then exit 0; fi; sleep 1; done; cat /tmp/duku-preview.log; exit 1"],
        cwd: "/vercel/sandbox/workspace"
      });
      if (start.exitCode !== 0) return res.status(200).json({ ok: false, output: await start.stdout(), stderr: await start.stderr(), exitCode: start.exitCode });
      return res.status(200).json({ ok: true, output: "Preview server started.", previewUrl: sandbox.domain(3000), exitCode: 0 });
    }

    const command = String(body.command || "").trim();
    if (!command || command.length > MAX_COMMAND) return res.status(400).json({ error: "Enter a command up to 4,000 characters." });
    const result = await sandbox.runCommand({
      cmd: "timeout",
      args: ["50s", "bash", "-lc", command],
      cwd: "/vercel/sandbox/workspace"
    });
    return res.status(200).json({
      ok: result.exitCode === 0,
      output: (await result.stdout()).slice(0, 24000),
      stderr: (await result.stderr()).slice(0, 12000),
      exitCode: result.exitCode,
      sandbox: sandboxName
    });
  } catch (error) {
    console.error("DuKu Linux terminal error:", error);
    return res.status(500).json({ error: error?.message || "Linux workspace could not complete the request." });
  }
};
module.exports.config = { maxDuration: 60 };
