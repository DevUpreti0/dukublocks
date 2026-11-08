import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors = {"Access-Control-Allow-Origin":"https://ai.dukubusiness.online","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const allowedModels = new Set(["openai/gpt-5.6-luna","openai/gpt-5.6-sol","google/gemini-3.8-flash","google/gemini-3.1-pro-preview"]);
Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed."}),{status:405,headers:cors});
  const gatewayKey=Deno.env.get("AI_GATEWAY_API_KEY");
  if(!gatewayKey) return new Response(JSON.stringify({error:"DuKu AI is not connected yet. An administrator must add the AI Gateway key to the secure Supabase function secrets."}),{status:503,headers:cors});
  try {
    const body=await req.json(); const model=String(body?.model||""); const messages=Array.isArray(body?.messages)?body.messages:[];
    if(!allowedModels.has(model)) return new Response(JSON.stringify({error:"That model is not enabled in DuKu AI."}),{status:400,headers:cors});
    if(!messages.length||messages.length>60) return new Response(JSON.stringify({error:"Send between 1 and 60 messages."}),{status:400,headers:cors});
    const safeMessages=messages.map((message:any)=>{const role=message?.role==="assistant"?"assistant":message?.role==="user"?"user":"";const content=typeof message?.content==="string"?message.content.trim():"";if(!role||!content||content.length>20000)throw new Error("Invalid message content.");return {role,content};});
    if(safeMessages.reduce((sum:number,item:any)=>sum+item.content.length,0)>80000) return new Response(JSON.stringify({error:"This conversation is too long. Start a new chat or shorten the messages."}),{status:413,headers:cors});
    const upstream=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+gatewayKey,"Content-Type":"application/json"},body:JSON.stringify({model,messages:safeMessages,stream:true,temperature:0.7})});
    if(!upstream.ok){const detail=await upstream.text();return new Response(JSON.stringify({error:upstream.status===401?"The AI Gateway key is invalid.":upstream.status===402?"AI Gateway credits or budget are unavailable.":upstream.status===429?"The AI service is busy. Please wait a moment and try again.":"The AI provider could not complete this request.",providerStatus:upstream.status,detail:detail.slice(0,500)}),{status:upstream.status,headers:cors});}
    const headers=new Headers(cors);headers.set("Content-Type","text/event-stream; charset=utf-8");headers.set("Cache-Control","no-cache, no-transform");headers.set("Connection","keep-alive");
    return new Response(upstream.body,{status:200,headers});
  } catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:"Unexpected DuKu AI error."}),{status:400,headers:cors});}
});