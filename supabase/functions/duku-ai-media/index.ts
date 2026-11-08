import { experimental_getVideoStatus as getVideoStatus, experimental_startVideo as startVideo } from "npm:ai@7.0.76";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "https://ai.dukubusiness.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const imageModels = new Set(["openai/gpt-image-2", "bfl/flux-2-pro"]);
const videoModels = new Set(["google/veo-3.1-generate-001", "spacexai/grok-imagine-video", "alibaba/wan-v2.6-i2v-flash"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: cors });
  const headers = { ...cors };
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const userCheck = await fetch(supabaseUrl + "/auth/v1/user", { headers: { Authorization: auth, apikey: anonKey } });
    if (!userCheck.ok) return new Response(JSON.stringify({ error: "Please sign in again to use DuKu AI Studio." }), { status: 401, headers });
    if (!Deno.env.get("AI_GATEWAY_API_KEY")) return new Response(JSON.stringify({ error: "AI Gateway is not configured. Ask the DuKu administrator to check the secure Gateway key." }), { status: 503, headers });

    const body = await req.json();
    const action = String(body?.action || "");
    const prompt = String(body?.prompt || "").trim();
    if (action === "transcribe_audio") {
      const audio = String(body?.audio || "");
      const mediaType = String(body?.mediaType || "");
      if (!audio || audio.length > 5600000) return new Response(JSON.stringify({ error: "Audio is empty or exceeds the 4 MB recording limit." }), { status: 400, headers });
      if (!["audio/webm", "audio/webm;codecs=opus", "audio/mp4", "audio/mpeg", "audio/ogg"].includes(mediaType)) return new Response(JSON.stringify({ error: "Unsupported audio format. Try Chrome recording or a supported audio type." }), { status: 400, headers });
      const upstream = await fetch("https://ai-gateway.vercel.sh/v4/ai/transcription-model", {
        method: "POST",
        headers: { Authorization: "Bearer " + Deno.env.get("AI_GATEWAY_API_KEY"), "ai-gateway-protocol-version": "0.0.1", "ai-transcription-model-specification-version": "4", "ai-model-id": "openai/whisper-1", "Content-Type": "application/json" },
        body: JSON.stringify({ audio, mediaType }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(JSON.stringify({ error: upstream.status === 402 ? "AI Gateway credits or budget are unavailable." : "Audio transcription failed.", providerStatus: upstream.status, detail: detail.slice(0, 250) }), { status: upstream.status, headers });
      }
      const result = await upstream.json();
      return new Response(JSON.stringify({ text: result.text || "", language: result.language || null, durationInSeconds: result.durationInSeconds || null }), { headers });
    }
    if (action === "generate_image") {
      const model = String(body?.model || "openai/gpt-image-2");
      if (!imageModels.has(model)) return new Response(JSON.stringify({ error: "That image model is not enabled." }), { status: 400, headers });
      if (!prompt || prompt.length > 4000) return new Response(JSON.stringify({ error: "Enter an image prompt (up to 4,000 characters)." }), { status: 400, headers });
      const upstream = await fetch("https://ai-gateway.vercel.sh/v1/images/generations", {
        method: "POST",
        headers: { Authorization: "Bearer " + Deno.env.get("AI_GATEWAY_API_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, n: 1 }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(JSON.stringify({ error: upstream.status === 402 ? "AI Gateway credits or budget are unavailable." : upstream.status === 429 ? "Image generation is busy. Try again shortly." : "Image generation failed.", providerStatus: upstream.status, detail: detail.slice(0, 350) }), { status: upstream.status, headers });
      }
      const result = await upstream.json();
      const images = (result.data || []).filter((item: any) => typeof item.b64_json === "string").map((item: any) => "data:image/png;base64," + item.b64_json);
      if (!images.length) return new Response(JSON.stringify({ error: "The image provider returned no image. Try another prompt or model." }), { status: 502, headers });
      return new Response(JSON.stringify({ images, model }), { headers });
    }
    if (action === "edit_image") {
      const model = String(body?.model || "openai/gpt-image-2");
      const image = String(body?.image || "");
      if (!imageModels.has(model)) return new Response(JSON.stringify({ error: "That image model is not enabled." }), { status: 400, headers });
      if (!prompt || prompt.length > 4000) return new Response(JSON.stringify({ error: "Enter an editing instruction (up to 4,000 characters)." }), { status: 400, headers });
      if (!/^data:image\/(png|jpeg|webp);base64,/i.test(image) || image.length > 4800000) return new Response(JSON.stringify({ error: "Upload a PNG, JPG or WEBP image under 3.5 MB." }), { status: 400, headers });
      const upstream = await fetch("https://ai-gateway.vercel.sh/v1/images/edits", {
        method: "POST",
        headers: { Authorization: "Bearer " + Deno.env.get("AI_GATEWAY_API_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, images: [{ image_url: image }] }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(JSON.stringify({ error: upstream.status === 402 ? "AI Gateway credits or budget are unavailable." : upstream.status === 429 ? "Image editing is busy. Try again shortly." : "Image editing failed.", providerStatus: upstream.status, detail: detail.slice(0, 350) }), { status: upstream.status, headers });
      }
      const result = await upstream.json();
      const images = (result.data || []).map((item: any) => typeof item.b64_json === "string" ? "data:image/png;base64," + item.b64_json : item.url).filter((value: any) => typeof value === "string" && value.length > 0);
      if (!images.length) return new Response(JSON.stringify({ error: "The image provider returned no edited image." }), { status: 502, headers });
      return new Response(JSON.stringify({ images, model }), { headers });
    }
    if (action === "start_video") {
      const model = String(body?.model || "google/veo-3.1-generate-001");
      if (!videoModels.has(model)) return new Response(JSON.stringify({ error: "That video model is not enabled." }), { status: 400, headers });
      if (!prompt || prompt.length > 4000) return new Response(JSON.stringify({ error: "Enter a video prompt (up to 4,000 characters)." }), { status: 400, headers });
      const requestedDuration = Number(body?.duration) || 8;
      const duration = [4, 6, 8].includes(requestedDuration) ? requestedDuration : 8;
      if (model === "alibaba/wan-v2.6-i2v-flash") {
        const imageUrl = String(body?.imageUrl || "").trim();
        if (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 2048) return new Response(JSON.stringify({ error: "Image-to-video requires a publicly accessible HTTPS image URL." }), { status: 400, headers });
        if (prompt.length > 1500 || ![4, 6, 8].includes(duration)) return new Response(JSON.stringify({ error: "Wan image-to-video supports a prompt up to 1,500 characters and 4, 6 or 8 seconds here." }), { status: 400, headers });
        const started = await startVideo({ model, prompt: { image: imageUrl, text: prompt }, duration });
        return new Response(JSON.stringify({ operation: started.operation, model, status: "pending" }), { headers });
      }
      const started = await startVideo({ model, prompt, duration });
      return new Response(JSON.stringify({ operation: started.operation, model, status: "pending" }), { headers });
    }
    if (action === "check_video") {
      const model = String(body?.model || "");
      if (!videoModels.has(model) || !body?.operation) return new Response(JSON.stringify({ error: "Invalid video job reference." }), { status: 400, headers });
      const status = await getVideoStatus(model, { operation: body.operation });
      return new Response(JSON.stringify(status), { headers });
    }
    return new Response(JSON.stringify({ error: "Unknown media action." }), { status: 400, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "DuKu AI Studio encountered an error." }), { status: 500, headers });
  }
});