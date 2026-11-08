import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import "./DuKuAI.css";

const STORE_KEY = "duku-ai-conversations-v1";
const MODELS = [
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", family: "GPT", note: "Fast, capable assistant" },
  { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", family: "GPT", note: "Advanced reasoning" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", family: "Gemini", note: "Fast multimodal assistant" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", family: "Gemini", note: "Advanced reasoning and analysis" }
];
const starterPrompts = [
  ["✦", "Write something", "Write a clear, engaging introduction for my new project."],
  ["⌘", "Code", "Help me build a responsive React component with clean code."],
  ["▧", "Learn", "Explain a difficult topic in simple words with examples."],
  ["↗", "Plan", "Create a practical step-by-step plan for my next big goal."]
];
const makeId = () => "chat-" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const readChats = () => { try { const value = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };

export default function DuKuAI() {
  const [user,setUser] = useState(null);
  const [authReady,setAuthReady] = useState(false);
  const [authMode,setAuthMode] = useState("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [authError,setAuthError] = useState("");
  const [chats,setChats] = useState(readChats);
  const [activeId,setActiveId] = useState(() => readChats()[0]?.id || "");
  const [model,setModel] = useState(MODELS[0].id);
  const [input,setInput] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [menuOpen,setMenuOpen] = useState(false);
  const [attached,setAttached] = useState([]);
  const [listening,setListening] = useState(false);
  const [speakingId,setSpeakingId] = useState("");
  const recognitionRef = useRef(null);
  const [copied,setCopied] = useState("");
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const activeChat = chats.find(c=>c.id===activeId) || null;
  const selectedModel = MODELS.find(m=>m.id===model) || MODELS[0];

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({data})=>{setUser(data.session?.user || null);setAuthReady(true);});
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user || null));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{localStorage.setItem(STORE_KEY,JSON.stringify(chats));},[chats]);
  const latestMessageContent = activeChat?.messages?.[activeChat.messages.length - 1]?.content;
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[activeChat?.messages?.length,latestMessageContent]);
  const newChat = useCallback(()=>{const id=makeId();setChats(prev=>[{id,title:"New chat",model,updatedAt:Date.now(),messages:[]},...prev]);setActiveId(id);setInput("");setError("");setAttached([]);setSidebarOpen(false);},[model]);
  const ensureChat = () => {
    if(activeChat) return activeChat.id;
    const id=makeId();setChats(prev=>[{id,title:"New chat",model,updatedAt:Date.now(),messages:[]},...prev]);setActiveId(id);return id;
  };
  const signIn = async (e) => {
    e.preventDefault(); setAuthError("");
    if(!supabase){setAuthError("DuKu authentication is not configured yet.");return;}
    const result = authMode==="signin" ? await supabase.auth.signInWithPassword({email,password}) : await supabase.auth.signUp({email,password});
    if(result.error)setAuthError(result.error.message);
    else if(authMode==="signup" && !result.data.session)setAuthError("Check your email to confirm your account, then sign in.");
  };
  const send = async (overrideText) => {
    const text = String(overrideText ?? input).trim();
    if((!text && !attached.length) || busy) return;
    if(!user){setError("Sign in to start a private AI conversation.");return;}
    const chatId=ensureChat();
    const outgoingFiles = attached.slice();
    const promptText = (text + outgoingFiles.filter(f=>f.extractedText).map(f=>"\n\n[File: "+f.name+"]\n"+f.extractedText).join("")).slice(0,18000);
    const nextMessages=[...(chats.find(c=>c.id===chatId)?.messages||[]),{id:makeId(),role:"user",content:promptText || "Please analyze the attached image(s).",files:outgoingFiles.map(f=>({name:f.name,type:f.type}))},{id:makeId(),role:"assistant",content:""}];
    setChats(prev=>prev.map(c=>c.id===chatId?{...c,title:c.messages.length?c.title:text.slice(0,42)+(text.length>42?"…":""),model,updatedAt:Date.now(),messages:nextMessages}:c));
    setInput("");setAttached([]);setBusy(true);setError("");
    const controller=new AbortController();abortRef.current=controller;
    try {
      const {data:{session}}=await supabase.auth.getSession();
      const response=await fetch(process.env.REACT_APP_SUPABASE_URL+"/functions/v1/duku-ai-chat",{
        method:"POST",signal:controller.signal,
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY},
        body:JSON.stringify({model,messages:nextMessages.filter(m=>m.content).map((m,i)=>({role:m.role,content:m.role==="user" && i===nextMessages.length-2 ? [{type:"text",text:m.content},...outgoingFiles.filter(f=>f.dataUrl).map(f=>({type:"image_url",image_url:{url:f.dataUrl}}))] : m.content}))})
      });
      if(!response.ok){let detail="AI service request failed ("+response.status+").";try{const payload=await response.json();detail=payload.error||detail;}catch{}throw new Error(detail);}
      if(!response.body)throw new Error("Streaming is not supported by this browser.");
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";let answer="";
      const updateAssistantMessage = (content) => setChats(prev=>prev.map(c=>c.id===chatId?{...c,messages:c.messages.map((m,i)=>i===c.messages.length-1?{...m,content}:m),updatedAt:Date.now()}:c));
      while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines){if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(data==="[DONE]")continue;try{const packet=JSON.parse(data);if(packet.error)throw new Error(packet.error.message||"AI provider error");answer+=packet.choices?.[0]?.delta?.content||"";updateAssistantMessage(answer);}catch(parseError){if(parseError instanceof SyntaxError)continue;throw parseError;}}}
      if(!answer)throw new Error("The model returned an empty response. Please try again.");
    } catch(err) {
      if(err.name!=="AbortError"){setError(err.message||"Something went wrong. Please try again.");setChats(prev=>prev.map(c=>c.id===chatId?{...c,messages:c.messages.filter((m,i)=>!(i===c.messages.length-1&&!m.content))}:c));}
    } finally {setBusy(false);abortRef.current=null;}
  };
  const stop = () => abortRef.current?.abort();
  const deleteChat = (id) => {setChats(prev=>prev.filter(c=>c.id!==id));if(activeId===id)setActiveId("");};
  const copyMessage = async (value,id) => {try{await navigator.clipboard.writeText(value);setCopied(id);setTimeout(()=>setCopied(""),1400);}catch{setError("Clipboard access was blocked by your browser.");}};
  const filteredChats=useMemo(()=>chats.filter(c=>c.title.toLowerCase().includes(search.toLowerCase())),[chats,search]);
  const extractPdfText = async (file) => {
    if (!window.pdfjsLib) {
      await new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";script.onload=resolve;script.onerror=()=>reject(new Error("PDF reader could not load. Try again."));document.head.appendChild(script);});
      window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    if(pdf.numPages>60)throw new Error("PDF limit is 60 pages.");
    const pages=[];for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();pages.push(content.items.map(item=>item.str).join(" "));}
    return pages.join("\n\n");
  };
  const attachFiles=async(files)=>{
    for(const file of Array.from(files||[]).slice(0,5)){
      const type=file.type||"";
      if(file.size>8*1024*1024){setError(file.name+" exceeds the 8 MB file limit.");continue;}
      try{
        if(type.startsWith("image/")&&["image/png","image/jpeg","image/webp","image/gif"].includes(type)){
          if(file.size>3800000){setError(file.name+" is too large for image analysis. Please use an image under 3.8 MB.");continue;}
          const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
          setAttached(prev=>[...prev,{name:file.name,type,dataUrl,size:file.size}].slice(-5));
        }else if(type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
          const extractedText=await extractPdfText(file);setAttached(prev=>[...prev,{name:file.name,type:"application/pdf",extractedText,size:file.size}].slice(-5));
        }else if(type.startsWith("text/")||/\.(txt|md|csv|json|js|jsx|ts|tsx|py|html|css|xml|yaml|yml)$/i.test(file.name)){
          if(file.size>500000){setError(file.name+" exceeds the 500 KB text limit.");continue;}
          const extractedText=await file.text();setAttached(prev=>[...prev,{name:file.name,type,extractedText,size:file.size}].slice(-5));
        }else{setError("Unsupported file type: "+file.name);}
      }catch(err){setError(err.message||("Could not read "+file.name));}
    }
  };
  const startVoice=()=>{
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){setError("Voice input needs a browser with speech recognition, such as Chrome.");return;}
    if(listening){recognitionRef.current?.stop();setListening(false);return;}
    const recognition=new SpeechRecognition();recognition.lang=navigator.language||"en-IN";recognition.interimResults=true;recognition.continuous=true;
    recognition.onresult=(event)=>{let transcript="";for(let i=0;i<event.results.length;i++)transcript+=event.results[i][0].transcript;setInput(transcript);};
    recognition.onerror=()=>{setListening(false);setError("Voice input stopped. Please try again.");};
    recognition.onend=()=>setListening(false);recognitionRef.current=recognition;recognition.start();setListening(true);setError("");
  };
  const speakMessage=(content,id)=>{
    if(!window.speechSynthesis){setError("Spoken replies are not supported in this browser.");return;}
    if(speakingId===id){window.speechSynthesis.cancel();setSpeakingId("");return;}
    window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(content);utterance.onend=()=>setSpeakingId("");utterance.onerror=()=>setSpeakingId("");setSpeakingId(id);window.speechSynthesis.speak(utterance);
  };
  if(!authReady)return <div className="dai-loading"><span className="dai-mark">D</span> Loading DuKu AI…</div>;
  if(!user)return <div className="dai-auth-page"><div className="dai-auth-glow"></div><div className="dai-auth-card"><a className="dai-brand" href="https://dukubusiness.online"><span className="dai-mark">D</span><span>DuKu <b>AI</b></span></a><div className="dai-auth-icon">✦</div><h1>{authMode==="signin"?"Welcome back":"Create your DuKu account"}</h1><p>One workspace for GPT, Gemini and your everyday AI work.</p><form onSubmit={signIn}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required placeholder="At least 6 characters"/></label>{authError&&<div className="dai-auth-error">{authError}</div>}<button className="dai-auth-submit" type="submit">{authMode==="signin"?"Sign in to DuKu AI":"Create account"} <span>→</span></button></form><button className="dai-auth-switch" onClick={()=>{setAuthMode(authMode==="signin"?"signup":"signin");setAuthError("");}}>{authMode==="signin"?"New to DuKu? Create an account":"Already have an account? Sign in"}</button><small>By continuing, you agree to use AI responsibly. Your chats are private to your account.</small></div><div className="dai-auth-footer">A product by Upreti Industries Limited · <a href="https://dukubusiness.online">DuKu Business</a></div></div>;

  return <div className="dai-app">
    <aside className={"dai-sidebar "+(sidebarOpen?"open":"")}>
      <div className="dai-sidebar-top"><a className="dai-brand" href="https://dukubusiness.online"><span className="dai-mark">D</span><span>DuKu <b>AI</b></span></a><button className="dai-icon-btn dai-sidebar-close" onClick={()=>setSidebarOpen(false)}>×</button></div>
      <button className="dai-new-chat" onClick={newChat}><span>＋</span> New chat <kbd>⌘ K</kbd></button>
      <label className="dai-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chats"/></label>
      <div className="dai-history-label">YOUR CHATS</div>
      <div className="dai-history">{filteredChats.map(c=><div key={c.id} className={"dai-history-item "+(c.id===activeId?"active":"")}><button onClick={()=>{setActiveId(c.id);setSidebarOpen(false);}}><span>◷</span><span>{c.title}</span></button><button className="dai-delete-chat" title="Delete chat" onClick={()=>deleteChat(c.id)}>×</button></div>)}{!filteredChats.length&&<p className="dai-history-empty">Your conversations will appear here.</p>}</div>
      <div className="dai-sidebar-bottom"><div className="dai-plan-card"><span>✦</span><div><b>DuKu AI workspace</b><small>GPT + Gemini models</small></div><i>●</i></div><button className="dai-account" onClick={()=>setMenuOpen(!menuOpen)}><span className="dai-avatar">{(user.email||"U").slice(0,1).toUpperCase()}</span><span><b>{user.email?.split("@")[0]}</b><small>Personal workspace</small></span><span className="dai-more">···</span></button>{menuOpen&&<div className="dai-account-menu"><button onClick={()=>supabase.auth.signOut()}>Sign out</button></div>}</div>
    </aside>
    {sidebarOpen&&<button className="dai-mobile-scrim" onClick={()=>setSidebarOpen(false)} aria-label="Close navigation"/>}
    <main className="dai-main">
      <header className="dai-topbar"><div className="dai-top-left"><button className="dai-icon-btn dai-mobile-menu" onClick={()=>setSidebarOpen(true)}>☰</button><button className="dai-model-select" onClick={()=>setMenuOpen(!menuOpen)}><span className={selectedModel.family==="GPT"?"dai-model-gpt":"dai-model-gem"}>{selectedModel.family==="GPT"?"✳":"✦"}</span>{selectedModel.label}<span className="dai-chevron">⌄</span></button>{menuOpen&&<div className="dai-model-menu">{MODELS.map(m=><button key={m.id} className={m.id===model?"selected":""} onClick={()=>{setModel(m.id);setMenuOpen(false);}}><span className={m.family==="GPT"?"dai-model-gpt":"dai-model-gem"}>{m.family==="GPT"?"✳":"✦"}</span><span><b>{m.label}</b><small>{m.note}</small></span>{m.id===model&&<i>✓</i>}</button>)}</div>}</div><div className="dai-top-right"><span className="dai-secure-dot"></span><span>Private workspace</span><button className="dai-icon-btn" title="New chat" onClick={newChat}>＋</button></div></header>
      <div className={"dai-conversation "+(activeChat?.messages?.length?"has-messages":"")}>
        {!activeChat?.messages?.length?<div className="dai-welcome"><div className="dai-welcome-orb"><span>✦</span><i></i></div><p className="dai-eyebrow">YOUR AI WORKSPACE</p><h1>What can I help you <em>create?</em></h1><p className="dai-welcome-copy">Ask anything. Explore ideas, solve problems, write code and get things moving.</p><div className="dai-prompt-grid">{starterPrompts.map(([icon,title,prompt])=><button key={title} onClick={()=>send(prompt)}><span>{icon}</span><b>{title}</b><small>{prompt}</small><i>↗</i></button>)}</div></div>:<div className="dai-messages">{activeChat.messages.map((m,i)=><article className={"dai-message "+m.role} key={m.id}><div className="dai-message-avatar">{m.role==="user"?(user.email||"U").slice(0,1).toUpperCase():"✦"}</div><div className="dai-message-body"><div className="dai-message-name">{m.role==="user"?"You":"DuKu AI"}{m.role==="assistant"&&<span>{selectedModel.label}</span>}</div><div className="dai-message-content">{m.content|| (busy&&i===activeChat.messages.length-1?<span className="dai-thinking"><i></i><i></i><i></i> Thinking…</span>:"")}{m.files?.length>0&&<div className="dai-sent-files">{m.files.map((f,j)=><span key={j}>▧ {f.name}</span>)}</div>}</div>{m.role==="assistant"&&m.content&&<div className="dai-message-actions"><button onClick={()=>copyMessage(m.content,m.id)}>{copied===m.id?"✓ Copied":"▢ Copy"}</button><button onClick={()=>speakMessage(m.content,m.id)}>{speakingId===m.id?"■ Stop voice":"◖)) Read aloud"}</button><button onClick={()=>send("Please continue from your previous answer.")}>↻ Continue</button></div>}</div></article>)}<div ref={bottomRef}/></div>}
      </div>
      <div className="dai-composer-wrap"><div className="dai-composer" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();attachFiles(e.dataTransfer.files);}}>{attached.length>0&&<div className="dai-attachments">{attached.map((f,i)=><span key={i}>{f.type.startsWith("image/")?"▧":f.type==="application/pdf"?"PDF":"▤"} {f.name}<button onClick={()=>setAttached(v=>v.filter((_,j)=>j!==i))}>×</button></span>)}</div>}<textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={e=>{const files=Array.from(e.clipboardData.files||[]);if(files.length){e.preventDefault();attachFiles(files);}}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message DuKu AI… (paste or drop a file)" rows={1}/><div className="dai-composer-tools"><div><label className="dai-attach-btn" title="Attach images, PDFs, documents or code">＋<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml" multiple onChange={e=>{attachFiles(e.target.files);e.target.value="";}}/></label><button className={"dai-voice-btn "+(listening?"active":"")} title="Voice input" onClick={startVoice}>{listening?"●":"♩"} <span>{listening?"Listening":"Voice"}</span></button><span className="dai-tool-divider"></span><span className="dai-model-hint">{selectedModel.family} model</span></div><div><small>Enter to send · Shift + Enter for new line</small>{busy?<button className="dai-stop-btn" onClick={stop}>■ Stop</button>:<button className="dai-send-btn" disabled={!input.trim()&&!attached.length} onClick={()=>send()}>↑</button>}</div></div></div><p className="dai-disclaimer">{error||"DuKu AI can make mistakes. Check important information."}</p></div>
      <footer className="dai-footer">DuKu AI · Built under Upreti Industries Limited <span>•</span> <a href="https://dukubusiness.online">DuKu Business</a></footer>
    </main>
  </div>;
}
