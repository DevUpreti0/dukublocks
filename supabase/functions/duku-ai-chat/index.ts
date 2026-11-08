import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors = {"Access-Control-Allow-Origin":"https://ai.dukubusiness.online","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const allowedModels = new Set(["google/gemini-3.6-flash","google/gemini-3.1-pro-preview","openai/gpt-5","alibaba/qwen3.5-flash"]);
const fallbackModels = ["google/gemini-3.6-flash","google/gemini-3.1-pro-preview","openai/gpt-5","alibaba/qwen3.5-flash"];
const legacyModelAliases: Record<string,string> = {
  "openai/gpt-5.6-luna":"google/gemini-3.6-flash",
  "openai/gpt-5.6-sol":"google/gemini-3.1-pro-preview",
  "google/gemini-3.8-flash":"google/gemini-3.6-flash"
};
Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed."}),{status:405,headers:cors});
  const gatewayKey=Deno.env.get("AI_GATEWAY_API_KEY");
  if(!gatewayKey) return new Response(JSON.stringify({error:"DuKu AI is not connected yet. An administrator must add the AI Gateway key to the secure Supabase function secrets."}),{status:503,headers:cors});
  try {
    const body=await req.json(); const requestedModel=String(body?.model||""); const model=legacyModelAliases[requestedModel]||requestedModel; const messages=Array.isArray(body?.messages)?body.messages:[];
    if(!allowedModels.has(model)) return new Response(JSON.stringify({error:"That model is not enabled in DuKu AI."}),{status:400,headers:cors});
    if(!messages.length||messages.length>60) return new Response(JSON.stringify({error:"Send between 1 and 60 messages."}),{status:400,headers:cors});
    const safeMessages=messages.map((message:any)=>{
      const role=message?.role==="assistant"?"assistant":message?.role==="user"?"user":"";
      const raw=message?.content;
      if(!role)throw new Error("Invalid message role.");
      if(typeof raw==="string"){const content=raw.trim();if(!content||content.length>20000)throw new Error("Invalid message content.");return {role,content};}
      if(!Array.isArray(raw)||raw.length>8||role!=="user")throw new Error("Invalid multimodal message.");
      let chars=0;
      const content=raw.map((part:any)=>{
        if(part?.type==="text"&&typeof part.text==="string"&&part.text.length<=20000){chars+=part.text.length;return {type:"text",text:part.text};}
        if(part?.type==="image_url"&&typeof part.image_url?.url==="string"&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(part.image_url.url)&&part.image_url.url.length<=5500000){chars+=part.image_url.url.length;return {type:"image_url",image_url:{url:part.image_url.url,detail:"auto"}};}
        throw new Error("Unsupported attachment format. Use PNG, JPG, WEBP or GIF images.");
      });
      if(chars>11000000)throw new Error("Attachments are too large. Please send fewer or smaller files.");
      return {role,content};
    });
    if(safeMessages.reduce((sum:number,item:any)=>sum+(typeof item.content==="string"?item.content.length:JSON.stringify(item.content).length),0)>12000000)return new Response(JSON.stringify({error:"This conversation is too long. Start a new chat or shorten the messages."}),{status:413,headers:cors});
    const upstream=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+gatewayKey,"Content-Type":"application/json"},body:JSON.stringify({model,models:fallbackModels.filter(id=>id!==model),messages:safeMessages,stream:true})});
    if(!upstream.ok){
      const detail=await upstream.text();
      console.error("DuKu AI Gateway request failed",{status:upstream.status,model,detail:detail.slice(0,350)});
      const message=upstream.status===401?"The AI Gateway key is invalid.":upstream.status===402?"AI Gateway credits or budget are unavailable.":upstream.status===403?"AI Gateway denied this model for the current account or region. The request will need an eligible DuKu Version or updated Gateway access.":upstream.status===429?"The AI service is busy. Please wait a moment and try again.":"The AI provider could not complete this request.";
      return new Response(JSON.stringify({error:message,providerStatus:upstream.status,detail:detail.slice(0,350)}),{status:upstream.status,headers:cors});
    }
    const headers=new Headers(cors);headers.set("Content-Type","text/event-stream; charset=utf-8");headers.set("Cache-Control","no-cache, no-transform");headers.set("Connection","keep-alive");
    return new Response(upstream.body,{status:200,headers});
  } catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:"Unexpected DuKu AI error."}),{status:400,headers:cors});}
});