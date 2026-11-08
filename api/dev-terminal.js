const { createClient } = require("@supabase/supabase-js");
const { createHash, randomUUID } = require("node:crypto");

const MAX_COMMAND = 4000;
const MAX_FILES = 400;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const WORKDIR = "/vercel/sandbox/workspace";

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

function cleanText(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
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
      timeout: 45 * 60 * 1000,
      persistent: true,
      keepLastSnapshots: { count: 2 },
      networkPolicy: "allow-all",
      ports: [3000, 4173, 8081],
      resume: true,
      onCreate: async box => {
        await box.mkDir("workspace");
        const files = safeFiles(project.files || {});
        if (files.length) await box.writeFiles(files);
        await box.runCommand({ cmd: "bash", args: ["-lc", "printf '%s\\n' 'DuKu Linux workspace ready' > .duku-workspace"], cwd: WORKDIR });
      }
    });

    const owner = userResult.user.id;
    const getSession = async () => {
      const { data, error } = await db.from("dev_terminal_sessions").select("*").eq("user_id", owner).eq("project_id", projectId).eq("project_type", projectType).maybeSingle();
      if (error) throw error;
      return data;
    };
    const upsertSession = async patch => {
      const { error } = await db.from("dev_terminal_sessions").upsert({
        user_id: owner, project_id: projectId, project_type: projectType, sandbox_name: sandboxName, updated_at: new Date().toISOString(), ...patch
      }, { onConflict: "user_id,project_id,project_type" });
      if (error) throw error;
    };
    const syncProject = async () => {
      const files = safeFiles(project.files || {});
      await sandbox.runCommand({ cmd: "mkdir", args: ["-p", WORKDIR] });
      if (files.length) await sandbox.writeFiles(files);
    };

    if (action === "sync") {
      await syncProject();
      return res.status(200).json({ ok: true, output: "Saved project files synced into the isolated Linux workspace.", exitCode: 0, sandbox: sandboxName });
    }

    if (action === "status") {
      const r = await sandbox.runCommand({ cmd: "bash", args: ["-lc", "printf 'Linux: '; uname -sr; printf 'Node: '; node --version 2>/dev/null || true; printf 'Python: '; python3 --version 2>/dev/null || true; printf 'npm: '; npm --version 2>/dev/null || true; printf 'pnpm: '; pnpm --version 2>/dev/null || true; printf 'bun: '; bun --version 2>/dev/null || true; printf '\\nProject files: '; find . -maxdepth 3 -type f | wc -l"], cwd: WORKDIR });
      return res.status(200).json({ ok: r.exitCode === 0, output: await r.stdout(), stderr: await r.stderr(), exitCode: r.exitCode, sandbox: sandboxName });
    }

    if (action === "preview") {
      const install = await sandbox.runCommand({ cmd: "bash", args: ["-lc", "if [ -f package.json ] && [ ! -d node_modules ]; then npm install --no-audit --no-fund; fi"], cwd: WORKDIR });
      if (install.exitCode !== 0) return res.status(200).json({ ok: false, output: await install.stdout(), stderr: await install.stderr(), exitCode: install.exitCode });
      const start = await sandbox.runCommand({ cmd: "bash", args: ["-lc", "if [ -f package.json ] && node -e \"process.exit(require('./package.json').scripts?.dev ? 0 : 1)\"; then (npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/duku-preview.log 2>&1 &); elif [ -f package.json ] && node -e \"process.exit(require('./package.json').scripts?.start ? 0 : 1)\"; then (HOST=0.0.0.0 PORT=3000 npm start > /tmp/duku-preview.log 2>&1 &); elif [ -f index.html ]; then (python3 -m http.server 3000 --bind 0.0.0.0 > /tmp/duku-preview.log 2>&1 &); else echo 'No supported web start script or index.html found.'; exit 2; fi; for i in $(seq 1 60); do if curl -sSf http://127.0.0.1:3000 >/dev/null; then exit 0; fi; sleep 1; done; cat /tmp/duku-preview.log; exit 1"], cwd: WORKDIR });
      if (start.exitCode !== 0) return res.status(200).json({ ok: false, output: await start.stdout(), stderr: await start.stderr(), exitCode: start.exitCode });
      return res.status(200).json({ ok: true, output: "Preview server started.", previewUrl: sandbox.domain(3000), exitCode: 0 });
    }

    if (action === "shell-start") {
      const existing = await getSession();
      if (existing?.shell_command_id) {
        try {
          await sandbox.getCommand(existing.shell_command_id);
          return res.status(200).json({ ok: true, output: "Persistent PTY shell is already connected.", shellReady: true });
        } catch (_) {}
      }
      await sandbox.runCommand({ cmd: "bash", args: ["-lc", "command -v script >/dev/null 2>&1 || (sudo apt-get update && sudo apt-get install -y util-linux); : > /tmp/duku-shell.tty.log"], cwd: WORKDIR });
      const shell = await sandbox.runCommand({ cmd: "script", args: ["-qefc", "env TERM=dumb PS1='ubuntu@duku:\\w$ ' bash --noprofile --norc -i", "/tmp/duku-shell.tty.log"], cwd: WORKDIR, stdin: true, detached: true });
      await upsertSession({ shell_session_id: shell.sessionId || null, shell_command_id: shell.id, shell_output_offset: 0 });
      return res.status(200).json({ ok: true, output: "Persistent interactive Bash PTY connected. Working directory and shell state persist while the sandbox session is active.", shellReady: true });
    }

    if (action === "shell-input") {
      const line = cleanText(body.command, MAX_COMMAND);
      if (!line) return res.status(400).json({ error: "Enter a shell command." });
      let state = await getSession();
      let shell = null;
      if (state?.shell_command_id) {
        try {
          shell = await sandbox.getCommand(state.shell_command_id);
          await shell.writeStdin(line + "\n");
          return res.status(200).json({ ok: true, output: "Command sent to persistent interactive PTY.", shellReady: true });
        } catch (_) { shell = null; }
      }
      await sandbox.runCommand({ cmd: "bash", args: ["-lc", "command -v script >/dev/null 2>&1 || (sudo apt-get update && sudo apt-get install -y util-linux); : > /tmp/duku-shell.tty.log"], cwd: WORKDIR });
      shell = await sandbox.runCommand({ cmd: "script", args: ["-qefc", "env TERM=dumb PS1='ubuntu@duku:\\w$ ' bash --noprofile --norc -i", "/tmp/duku-shell.tty.log"], cwd: WORKDIR, stdin: true, detached: true });
      await upsertSession({ shell_session_id: shell.sessionId || null, shell_command_id: shell.id, shell_output_offset: 0 });
      await shell.writeStdin(line + "\n");
      return res.status(200).json({ ok: true, output: "Reconnected persistent interactive PTY and sent command.", shellReady: true });
    }

    if (action === "shell-read") {
      const state = await getSession();
      const offset = Number(state?.shell_output_offset || 0);
      const readScript = "size=$(stat -c%s /tmp/duku-shell.tty.log 2>/dev/null || echo 0); start=$(( " + offset + " + 1 )); if [ \"$size\" -ge \"$start\" ] && [ \"$size\" -gt " + offset + " ]; then tail -c +\"$start\" /tmp/duku-shell.tty.log; fi; printf '\\n__DUKU_SIZE__='; printf '%s' \"$size\"";
      const r = await sandbox.runCommand({ cmd: "bash", args: ["-lc", readScript], cwd: WORKDIR });
      const raw = await r.stdout();
      const marker = raw.lastIndexOf("__DUKU_SIZE__=");
      const output = (marker >= 0 ? raw.slice(0, marker) : raw).slice(-24000);
      const newOffset = marker >= 0 ? Number(raw.slice(marker + 14).trim()) : offset;
      if (Number.isFinite(newOffset) && newOffset >= offset) await db.from("dev_terminal_sessions").update({ shell_output_offset: newOffset, updated_at: new Date().toISOString() }).eq("user_id", owner).eq("project_id", projectId).eq("project_type", projectType);
      return res.status(200).json({ ok: true, output });
    }

    if (action === "job-start" || action === "android-build") {
      let command = cleanText(body.command, MAX_COMMAND);
      if (action === "android-build") {
        const buildType = body.buildType === "release" ? "release" : "debug";
        const framework = String(project.framework || "expo").toLowerCase();
        const packageId = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(String(project.package_name || "")) ? String(project.package_name) : "com.dukubusiness.myapp";
        const appLabel = String(project.name || "DuKu App").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 48) || "DuKu App";
        const packageOrg = packageId.split(".").slice(0, -1).join(".") || "com.dukubusiness";
        const bootstrap = framework === "expo" ? [
          "if [ ! -f package.json ]; then cat > package.json <<'JSON'",
          JSON.stringify({ name: "duku-mobile-app", private: true, main: "node_modules/expo/AppEntry.js", scripts: { start: "expo start", android: "expo run:android" }, dependencies: { expo: "*", "expo-status-bar": "*", react: "*", "react-native": "*" } }),
          "JSON",
          "fi",
          "npm install --no-audit --no-fund"
        ] : framework === "flutter" ? [
          "if [ ! -f pubspec.yaml ]; then cat > pubspec.yaml <<'YAML'",
          "name: duku_mobile_app",
          "description: DuKu Business Android project",
          "publish_to: none",
          "version: 1.0.0+1",
          "environment:",
          "  sdk: '>=3.4.0 <4.0.0'",
          "dependencies:",
          "  flutter:",
          "    sdk: flutter",
          "  cupertino_icons: ^1.0.8",
          "dev_dependencies:",
          "  flutter_test:",
          "    sdk: flutter",
          "  flutter_lints: ^5.0.0",
          "flutter:",
          "  uses-material-design: true",
          "YAML",
          "fi",
          "if ! command -v flutter >/dev/null 2>&1; then",
          "  FLUTTER_ARCHIVE=$(python3 -c \"import json,urllib.request; d=json.load(urllib.request.urlopen('https://storage.googleapis.com/flutter_infra_release/releases/releases_linux.json')); r=next(x for x in d['releases'] if x['channel']=='stable'); print(r['archive'])\")",
          "  curl -fsSL \"https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/$FLUTTER_ARCHIVE\" -o /tmp/flutter.tar.xz",
          "  tar -xf /tmp/flutter.tar.xz -C \"$HOME\"",
          "fi",
          "export PATH=\"$HOME/flutter/bin:$PATH\"",
          "flutter precache --android",
          "flutter pub get",
          "if [ ! -d android ]; then flutter create --platforms=android --org " + packageOrg + " .; fi"
        ] : framework === "kotlin" || framework === "java" ? [
          "if [ ! -f settings.gradle ] && [ ! -f settings.gradle.kts ] && [ ! -f gradlew ]; then",
          "  SOURCE_FILE=$(find app/src/main/java -maxdepth 1 -type f \\( -name 'MainActivity.kt' -o -name 'MainActivity.java' \\) 2>/dev/null | head -1)",
          "  if [ -z \"$SOURCE_FILE\" ]; then echo 'MainActivity.kt or MainActivity.java was not found.'; exit 2; fi",
          "  MAIN_PACKAGE=$(sed -n 's/^package[[:space:]]\\+\\([^;]*\\).*$/\\1/p' \"$SOURCE_FILE\" | head -1 | tr -d ' ')",
          "  MAIN_PACKAGE=${MAIN_PACKAGE:-" + packageId + "}",
          "  MAIN_PACKAGE_PATH=$(printf '%s' \"$MAIN_PACKAGE\" | tr '.' '/')",
          "  MAIN_CLASS=\"$MAIN_PACKAGE.MainActivity\"",
          "  mkdir -p \"app/src/main/java/$MAIN_PACKAGE_PATH\" app/src/main/res/values",
          "  mv \"$SOURCE_FILE\" \"app/src/main/java/$MAIN_PACKAGE_PATH/\"",
          "  cat > settings.gradle <<'GRADLE'",
          "pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }",
          "dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }",
          "rootProject.name = 'DuKuAndroid'",
          "include ':app'",
          "GRADLE",
          "  cat > build.gradle <<'GRADLE'",
          "plugins { id 'com.android.application' version '8.9.2' apply false }",
          "GRADLE",
          "  cat > app/build.gradle <<'GRADLE'",
          "plugins { id 'com.android.application' }",
          "android { namespace '" + packageId + "'; compileSdk 36; defaultConfig { applicationId '" + packageId + "'; minSdk 24; targetSdk 36; versionCode 1; versionName '1.0' } }",
          "dependencies { implementation 'androidx.appcompat:appcompat:1.7.0' }",
          "GRADLE",
          "  if [ '" + framework + "' = kotlin ]; then sed -i \"s/plugins { id 'com.android.application' }/plugins { id 'com.android.application'; id 'org.jetbrains.kotlin.android' version '2.1.20' }/\" app/build.gradle; fi",
          "  cat > app/src/main/AndroidManifest.xml <<MANIFEST",
          "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"><application android:label=\"" + appLabel + "\" android:theme=\"@style/AppTheme\"><activity android:name=\"$MAIN_CLASS\" android:exported=\"true\"><intent-filter><action android:name=\"android.intent.action.MAIN\"/><category android:name=\"android.intent.category.LAUNCHER\"/></intent-filter></activity></application></manifest>",
          "MANIFEST",
          "  echo '<resources><style name=\"AppTheme\" parent=\"Theme.AppCompat.Light.NoActionBar\"/></resources>' > app/src/main/res/values/styles.xml",
          "  echo 'org.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8' > gradle.properties",
          "  curl -fsSL https://services.gradle.org/distributions/gradle-8.13-bin.zip -o /tmp/gradle.zip",
          "  unzip -q /tmp/gradle.zip -d /tmp",
          "  /tmp/gradle-8.13/bin/gradle wrapper --gradle-version 8.13",
          "fi"
        ] : [];
        const script = [
          "set -euo pipefail",
          "cd " + WORKDIR,
          "export ANDROID_HOME=\"$HOME/android-sdk\" ANDROID_SDK_ROOT=\"$HOME/android-sdk\"",
          "export PATH=\"$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH\"",
          "if ! command -v java >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y openjdk-17-jdk; fi",
          "if ! command -v unzip >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y unzip curl; fi",
          "mkdir -p \"$ANDROID_HOME/cmdline-tools\"",
          "if [ ! -x \"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager\" ]; then",
          "  tmp=$(mktemp -d)",
          "  curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip -o \"$tmp/tools.zip\"",
          "  mkdir -p \"$tmp/unpack\"",
          "  echo \"4e4c464f145a7515b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583  $tmp/tools.zip\" | sha256sum -c -",
          "  unzip -q \"$tmp/tools.zip\" -d \"$tmp/unpack\"",
          "  rm -rf \"$ANDROID_HOME/cmdline-tools/latest\"",
          "  mv \"$tmp/unpack/cmdline-tools\" \"$ANDROID_HOME/cmdline-tools/latest\"",
          "  rm -rf \"$tmp\"",
          "fi",
          "yes | sdkmanager --sdk_root=\"$ANDROID_HOME\" --licenses >/dev/null || true",
          "sdkmanager --sdk_root=\"$ANDROID_HOME\" \"platform-tools\" \"platforms;android-36\" \"build-tools;36.0.0\"",
          ...bootstrap,
          "if [ ! -d android ] && [ -f app.json ] && [ -f package.json ]; then npx --yes expo prebuild --platform android --non-interactive; fi",
          "if [ ! -d android ] && [ -f package.json ] && grep -q '\"expo\"' package.json; then npx --yes expo prebuild --platform android --non-interactive; fi",
          "if [ '" + framework + "' = flutter ]; then GRADLEW=./android/gradlew; elif [ -x ./gradlew ]; then GRADLEW=./gradlew; elif [ -x ./android/gradlew ]; then cd android; GRADLEW=./gradlew; elif [ -f ./gradlew ]; then chmod +x ./gradlew; GRADLEW=./gradlew; elif [ -f ./android/gradlew ]; then cd android; chmod +x ./gradlew; GRADLEW=./gradlew; else echo 'Gradle wrapper not found. Create/import a valid Android Gradle project.'; exit 2; fi",
          "if [ '" + buildType + "' = release ]; then",
          "  mkdir -p .duku-signing",
          "  if [ ! -f .duku-signing/release.jks ]; then",
          "    STOREPASS=$(openssl rand -hex 24)",
          "    keytool -genkeypair -v -keystore .duku-signing/release.jks -storepass \"$STOREPASS\" -keypass \"$STOREPASS\" -alias duku-release -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=DuKu Project Release,O=DuKu Business,C=IN'",
          "    printf 'DUKU_STORE_PASSWORD=%s\\nDUKU_KEY_ALIAS=duku-release\\nDUKU_KEY_PASSWORD=%s\\n' \"$STOREPASS\" \"$STOREPASS\" > .duku-signing/signing.env",
          "    chmod 600 .duku-signing/release.jks .duku-signing/signing.env",
          "  fi",
          "  . .duku-signing/signing.env",
          "  export DUKU_STORE_PASSWORD DUKU_KEY_ALIAS DUKU_KEY_PASSWORD DUKU_KEYSTORE_PATH=\"$PWD/.duku-signing/release.jks\"",
          "  cat > /tmp/duku-signing.init.gradle <<'GRADLE'",
          "gradle.projectsEvaluated { gradle.rootProject.allprojects.each { p ->",
          "  if (p.plugins.hasPlugin('com.android.application')) {",
          "    def a = p.extensions.findByName('android')",
          "    a.signingConfigs.maybeCreate('dukuRelease').with {",
          "      storeFile = new File(System.getenv('DUKU_KEYSTORE_PATH'))",
          "      storePassword = System.getenv('DUKU_STORE_PASSWORD')",
          "      keyAlias = System.getenv('DUKU_KEY_ALIAS')",
          "      keyPassword = System.getenv('DUKU_KEY_PASSWORD')",
          "    }",
          "    a.buildTypes.getByName('release').signingConfig = a.signingConfigs.getByName('dukuRelease')",
          "  }",
          "} }",
          "GRADLE",
          "  if [ '" + framework + "' = flutter ]; then mkdir -p \"$HOME/.gradle/init.d\"; cp /tmp/duku-signing.init.gradle \"$HOME/.gradle/init.d/duku-signing.gradle\"; flutter build appbundle --release && flutter build apk --release; else \"$GRADLEW\" -I /tmp/duku-signing.init.gradle bundleRelease && \"$GRADLEW\" -I /tmp/duku-signing.init.gradle assembleRelease; fi",
          "else",
          "  if [ '" + framework + "' = flutter ]; then flutter build apk --debug; else \"$GRADLEW\" assembleDebug; fi",
          "fi",
          "mkdir -p /tmp/duku-artifacts",
          "find . -type f \\( -name '*.apk' -o -name '*.aab' \\) -exec cp -f {} /tmp/duku-artifacts/ \\;",
          "ARTIFACT_TOKEN=$(openssl rand -hex 24)",
          "cat > /tmp/duku-artifacts-server.py <<'PY'",
          "import http.server, os, urllib.parse",
          "token = os.environ['DUKU_ARTIFACT_TOKEN']",
          "class Handler(http.server.SimpleHTTPRequestHandler):",
          "    def __init__(self, *args, **kwargs): super().__init__(*args, directory='/tmp/duku-artifacts', **kwargs)",
          "    def do_GET(self):",
          "        path = urllib.parse.urlparse(self.path).path",
          "        prefix = '/' + token + '/'",
          "        if not path.startswith(prefix): self.send_error(403); return",
          "        self.path = path[len('/' + token):]",
          "        super().do_GET()",
          "http.server.ThreadingHTTPServer(('0.0.0.0', 4173), Handler).serve_forever()",
          "PY",
          "printf '%s' \"$ARTIFACT_TOKEN\" > /tmp/duku-artifacts.token",
          "(DUKU_ARTIFACT_TOKEN=\"$ARTIFACT_TOKEN\" python3 /tmp/duku-artifacts-server.py >/tmp/duku-artifacts-server.log 2>&1 &)",
          "echo '--- APK/AAB OUTPUTS ---'",
          "find /tmp/duku-artifacts -maxdepth 1 -type f -printf '%f (%s bytes)\\n' | head -30"
        ].join("\n");
        const scriptPath = WORKDIR + "/.duku-android-build.sh";
        await sandbox.writeFiles([{ path: "workspace/.duku-android-build.sh", content: Buffer.from(script, "utf8") }]);
        await sandbox.runCommand({ cmd: "chmod", args: ["700", scriptPath], cwd: WORKDIR });
        command = "bash " + scriptPath;
      }
      if (!command) return res.status(400).json({ error: "Enter a command to run." });
      const jobId = randomUUID();
      const logPath = "/tmp/duku-job-" + jobId + ".log";
      const exitPath = "/tmp/duku-job-" + jobId + ".exit";
      const wrapped = "set +e; " + command + " > " + logPath + " 2>&1; code=$?; printf '%s' \"$code\" > " + exitPath + "; exit \"$code\"";
      const job = await sandbox.runCommand({ cmd: "bash", args: ["-lc", wrapped], cwd: WORKDIR, detached: true });
      const { error: saveError } = await db.from("dev_terminal_jobs").insert({
        id: jobId, user_id: owner, project_id: projectId, project_type: projectType,
        sandbox_name: sandboxName, sandbox_session_id: job.sessionId || "", command_id: job.id,
        command: action === "android-build" ? "Android " + (body.buildType === "release" ? "release" : "debug") + " build" : command,
        status: "running"
      });
      if (saveError) {
        try { await job.kill("SIGTERM"); } catch (_) {}
        throw saveError;
      }
      return res.status(202).json({ ok: true, jobId, commandId: job.id, message: action === "android-build" ? "Android build started in your isolated Linux environment." : "Long-running job started.", sandbox: sandboxName });
    }

    if (action === "job-poll" || action === "job-cancel") {
      const jobId = String(body.jobId || "");
      if (!/^[0-9a-f-]{36}$/i.test(jobId)) return res.status(400).json({ error: "Invalid job identifier." });
      const { data: job, error: jobError } = await db.from("dev_terminal_jobs").select("*").eq("id", jobId).eq("user_id", owner).eq("project_id", projectId).eq("project_type", projectType).single();
      if (jobError || !job) return res.status(404).json({ error: "Job not found." });
      if (action === "job-cancel") {
        const runningSandbox = await Sandbox.getOrCreate({ name: sandboxName, image: "vercel/sandbox/universal:latest", region: "bom1", resume: true, persistent: true });
        try { const commandHandle = await runningSandbox.getCommand(job.command_id); await commandHandle.kill("SIGTERM"); } catch (_) {}
        await db.from("dev_terminal_jobs").update({ status: "cancelled", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", owner);
        return res.status(200).json({ ok: true, status: "cancelled" });
      }
      const readSandbox = await Sandbox.getOrCreate({ name: sandboxName, image: "vercel/sandbox/universal:latest", region: "bom1", resume: true, persistent: true });
      const logPath = "/tmp/duku-job-" + jobId + ".log";
      const exitPath = "/tmp/duku-job-" + jobId + ".exit";
      const check = await readSandbox.runCommand({ cmd: "bash", args: ["-lc", "tail -c 24000 " + logPath + " 2>/dev/null || true; printf '\\n__DUKU_EXIT__='; if [ -f " + exitPath + " ]; then cat " + exitPath + "; else printf 'RUNNING'; fi"], cwd: WORKDIR });
      const combined = await check.stdout();
      const marker = combined.lastIndexOf("__DUKU_EXIT__=");
      const output = (marker >= 0 ? combined.slice(0, marker) : combined).slice(-24000);
      const exitText = marker >= 0 ? combined.slice(marker + 14).trim() : "RUNNING";
      const status = exitText === "RUNNING" ? "running" : Number(exitText) === 0 ? "completed" : "failed";
      const exitCode = exitText === "RUNNING" ? null : Number(exitText);
      await db.from("dev_terminal_jobs").update({ status, exit_code: exitCode, output_tail: output, updated_at: new Date().toISOString(), finished_at: status === "running" ? null : new Date().toISOString() }).eq("id", jobId).eq("user_id", owner);
      return res.status(200).json({ ok: true, status, exitCode, output, jobId, artifactUrl: status === "completed" && job.command.startsWith("Android ") ? readSandbox.domain(4173) : null });
    }

    if (action === "android-build") return res.status(400).json({ error: "Build request was not initialized." });

    const command = cleanText(body.command, MAX_COMMAND);
    if (!command) return res.status(400).json({ error: "Enter a command up to 4,000 characters." });
    const result = await sandbox.runCommand({ cmd: "bash", args: ["-lc", command], cwd: WORKDIR });
    return res.status(200).json({ ok: result.exitCode === 0, output: (await result.stdout()).slice(0, 24000), stderr: (await result.stderr()).slice(0, 12000), exitCode: result.exitCode, sandbox: sandboxName });
  } catch (error) {
    console.error("DuKu Linux terminal error:", error);
    return res.status(500).json({ error: error?.message || "Linux workspace could not complete the request." });
  }
};
module.exports.config = { maxDuration: 60 };
