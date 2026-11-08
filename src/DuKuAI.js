import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import "./DuKuAI.css";

const STORE_KEY = "duku-ai-conversations-v1";
const MODELS = [
  { id: "google/gemini-3.6-flash", label: "DuKu Version 1", family: "DuKu", note: "Fast everyday assistant" },
  { id: "google/gemini-3.1-pro-preview", label: "DuKu Version 2", family: "DuKu", note: "Deep reasoning and analysis" },
  { id: "openai/gpt-5", label: "DuKu Version 3", family: "DuKu", note: "Balanced work and creativity" },
  { id: "alibaba/qwen3.5-flash", label: "DuKu Version 4", family: "DuKu", note: "Multimodal and visual work" }
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
  const [syncReady,setSyncReady] = useState(false);
  const [syncStatus,setSyncStatus] = useState("Connecting…");
  const [legacyChats] = useState(readChats);
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
  const [recording,setRecording] = useState(false);
  const [transcribing,setTranscribing] = useState(false);
  const [speakingId,setSpeakingId] = useState("");
  const [toolMode,setToolMode] = useState("chat");
  const [mediaPrompt,setMediaPrompt] = useState("");
  const [mediaBusy,setMediaBusy] = useState(false);
  const [mediaError,setMediaError] = useState("");
  const [mediaImages,setMediaImages] = useState([]);
  const [mediaReferenceImage,setMediaReferenceImage] = useState(null);
  const [videoReferenceUrl,setVideoReferenceUrl] = useState("");
  const [videoModel,setVideoModel] = useState("google/veo-3.1-generate-001");
  const [videoDuration,setVideoDuration] = useState(8);
  const [videoJob,setVideoJob] = useState(null);
  const [videoStatus,setVideoStatus] = useState(null);
  const [mediaLibrary,setMediaLibrary] = useState([]);
  const [libraryLoading,setLibraryLoading] = useState(false);
  const [libraryError,setLibraryError] = useState("");
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
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
  useEffect(() => {
    let cancelled = false;
    setSyncReady(false);
    setChats([]);
    setActiveId("");
    if (!user?.id || !supabase) {
      setSyncStatus("Sign in to sync");
      return () => { cancelled = true; };
    }
    setSyncStatus("Loading your chats…");
    supabase.from("duku_ai_conversations")
      .select("id,title,model,messages,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) {
          setSyncStatus("Cloud sync unavailable");
          setError("Could not load your synced chats: " + loadError.message);
          return;
        }
        const restored = (data || []).map(row => ({
          id: row.id,
          title: row.title || "New chat",
          model: row.model || MODELS[0].id,
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
          messages: Array.isArray(row.messages) ? row.messages : []
        }));
        setChats(restored);
        setActiveId(restored[0]?.id || "");
        setSyncStatus("All chats synced");
        setSyncReady(true);
      });
    return () => { cancelled = true; };
  }, [user?.id]);
  useEffect(() => {
    if (syncReady) localStorage.setItem(STORE_KEY, JSON.stringify(chats));
  }, [chats, syncReady]);
  useEffect(() => {
    if (!user?.id || !syncReady || !chats.length || !supabase) return;
    setSyncStatus("Saving…");
    const timer = setTimeout(async () => {
      const rows = chats.map(chat => ({
        id: chat.id,
        user_id: user.id,
        title: String(chat.title || "New chat").slice(0, 160),
        model: chat.model || MODELS[0].id,
        messages: Array.isArray(chat.messages) ? chat.messages : [],
        updated_at: new Date(chat.updatedAt || Date.now()).toISOString()
      }));
      const { error: saveError } = await supabase.from("duku_ai_conversations").upsert(rows, { onConflict: "user_id,id" });
      setSyncStatus(saveError ? "Sync error" : "All chats synced");
      if (saveError) setError("Chat sync failed: " + saveError.message);
    }, 800);
    return () => clearTimeout(timer);
  }, [chats, user?.id, syncReady]);
  const latestMessageContent = activeChat?.messages?.[activeChat.messages.length - 1]?.content;
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[activeChat?.messages?.length,latestMessageContent]);
  const newChat = useCallback(()=>{const id=makeId();setChats(prev=>[{id,title:"New chat",model,updatedAt:Date.now(),messages:[]},...prev]);setActiveId(id);setInput("");setError("");setAttached([]);setSidebarOpen(false);},[model]);
  useEffect(() => {
    const handleShortcuts = (event) => {
      const target = event.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        newChat();
      } else if (event.key === "Escape") {
        setMenuOpen(false);
        setSidebarOpen(false);
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        document.querySelector(".dai-search input")?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [newChat]);
  const importLegacyChats = () => {
    if (!syncReady || !legacyChats.length || chats.length) return;
    const restored = legacyChats.map(chat => ({
      ...chat,
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      model: chat.model || MODELS[0].id
    }));
    setChats(restored);
    setActiveId(restored[0]?.id || "");
    setSyncStatus("Importing this device’s chats…");
  };
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
      if(!session?.access_token)throw new Error("Your sign-in session expired. Please sign in again.");
      const conversationMessages=nextMessages.filter(m=>m.content).map((m,i)=>({
        role:m.role,
        content:m.role==="user" && i===nextMessages.length-2
          ? [{type:"text",text:m.content},...outgoingFiles.filter(f=>f.dataUrl).map(f=>({type:"image_url",image_url:{url:f.dataUrl}}))]
          : m.content
      }));
      const response=await fetch(process.env.REACT_APP_SUPABASE_URL+"/functions/v1/duku-ai-chat",{
        method:"POST",signal:controller.signal,
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY},
        body:JSON.stringify({model,messages:conversationMessages})
      });
      if(!response.ok){
        let detail="AI service request failed ("+response.status+").";
        try{
          const payload=await response.json();
          detail=payload.error||detail;
          if(payload.detail)detail+=" Details: "+String(payload.detail).slice(0,240);
        }catch{}
        throw new Error(detail);
      }
      if(!response.body)throw new Error("Streaming is not supported by this browser.");
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";let answer="";
      const updateAssistantMessage = (content) => setChats(prev=>prev.map(c=>c.id===chatId?{...c,messages:c.messages.map((m,i)=>i===c.messages.length-1?{...m,content}:m),updatedAt:Date.now()}:c));
      const consumeLine=(line)=>{
        if(!line.startsWith("data:"))return;
        const data=line.slice(5).trim();
        if(!data||data==="[DONE]")return;
        let packet;
        try{packet=JSON.parse(data);}catch{return;}
        if(packet.error)throw new Error(packet.error.message||"AI provider error");
        const delta=packet.choices?.[0]?.delta?.content;
        if(typeof delta==="string"&&delta){answer+=delta;updateAssistantMessage(answer);}
      };
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        const lines=buffer.split("\n");buffer=lines.pop()||"";
        for(const line of lines)consumeLine(line.trim());
      }
      if(buffer.trim())consumeLine(buffer.trim());
      if(!answer)throw new Error("The selected DuKu Version returned an empty response. Please try another version.");
    } catch(err) {
      if(err.name!=="AbortError"){setError(err.message||"Something went wrong. Please try again.");setChats(prev=>prev.map(c=>c.id===chatId?{...c,messages:c.messages.filter((m,i)=>!(i===c.messages.length-1&&!m.content))}:c));}
    } finally {setBusy(false);abortRef.current=null;}
  };
  const stop = () => abortRef.current?.abort();

  const loadMediaLibrary = async () => {
    if (!user?.id || !supabase) return;
    setLibraryLoading(true); setLibraryError("");
    const {data,error: listError} = await supabase.from("duku_ai_media_assets").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
    if (listError) setLibraryError(listError.message);
    else { const enriched = await Promise.all((data||[]).map(async asset => { const {data:signed} = await supabase.storage.from("duku-ai-library").createSignedUrl(asset.bucket_path,3600); return {...asset,previewUrl:signed?.signedUrl||""}; })); setMediaLibrary(enriched); }
    setLibraryLoading(false);
  };
  useEffect(() => { if (user?.id) loadMediaLibrary(); else setMediaLibrary([]); }, [user?.id]);
  const saveMediaAsset = async ({source,type,name,prompt,model,mimeType,metadata={}}) => {
    if (!user?.id || !supabase || !source) return;
    const response = await fetch(source);
    if (!response.ok) throw new Error("Could not retrieve the generated media file for saving.");
    const blob = await response.blob();
    const finalType = mimeType || blob.type || (type==="image"?"image/png":"video/mp4");
    const ext = finalType.includes("webm")?"webm":finalType.includes("jpeg")||finalType.includes("jpg")?"jpg":finalType.includes("webp")?"webp":type==="video"?"mp4":"png";
    const id = crypto.randomUUID();
    const path = user.id+"/"+id+"."+ext;
    const {error: uploadError} = await supabase.storage.from("duku-ai-library").upload(path,blob,{contentType:finalType,upsert:false});
    if (uploadError) throw uploadError;
    const {data,error: rowError} = await supabase.from("duku_ai_media_assets").insert({user_id:user.id,asset_type:type,name,prompt,model,bucket_path:path,mime_type:finalType,file_size:blob.size,metadata}).select().single();
    if (rowError) { await supabase.storage.from("duku-ai-library").remove([path]); throw rowError; }
    setMediaLibrary(prev=>[row,...prev]);
    return row;
  };
  const openLibraryAsset = async (asset) => {
    const {data,error: signedError} = await supabase.storage.from("duku-ai-library").createSignedUrl(asset.bucket_path,3600);
    if (signedError) { setLibraryError(signedError.message); return; }
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  };
  const deleteLibraryAsset = async (asset) => {
    const {error: fileError} = await supabase.storage.from("duku-ai-library").remove([asset.bucket_path]);
    if (fileError) { setLibraryError(fileError.message); return; }
    const {error: rowError} = await supabase.from("duku_ai_media_assets").delete().eq("id",asset.id);
    if (rowError) { setLibraryError(rowError.message); return; }
    setMediaLibrary(prev=>prev.filter(item=>item.id!==asset.id));
  };
  const mediaRequest = async (payload) => {
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error("Please sign in again.");
    const response=await fetch(process.env.REACT_APP_SUPABASE_URL+"/functions/v1/duku-ai-media",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY},
      body:JSON.stringify(payload)
    });
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Media generation failed.");return data;
  };
  const readMediaImage = async (file) => {
    if (!file) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) { setMediaError("Use a PNG, JPG or WEBP image."); return; }
    if (file.size > 3500000) { setMediaError("Reference image must be under 3.5 MB."); return; }
    const dataUrl = await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); });
    setMediaReferenceImage({name:file.name,type:file.type,dataUrl});
    setMediaError("");
  };
  const generateImage = async () => {
    if(!mediaPrompt.trim()||mediaBusy)return;setMediaBusy(true);setMediaError("");setMediaImages([]);
    try {
      const data = mediaReferenceImage
        ? await mediaRequest({action:"edit_image",model:"openai/gpt-image-2",prompt:mediaPrompt.trim(),image:mediaReferenceImage.dataUrl})
        : await mediaRequest({action:"generate_image",model:"openai/gpt-image-2",prompt:mediaPrompt.trim()});
      setMediaImages(data.images||[]);
      for (let i=0;i<(data.images||[]).length;i++) { try { await saveMediaAsset({source:data.images[i],type:"image",name:"AI image "+new Date().toLocaleString(),prompt:mediaPrompt.trim(),model:"openai/gpt-image-2"}); } catch(saveErr) { setMediaError("Image generated, but saving to Library failed: "+saveErr.message); } }
    } catch(err){setMediaError(err.message||"Image generation failed.");}finally{setMediaBusy(false);}
  };
  const generateVideo = async () => {
    if(!mediaPrompt.trim()||mediaBusy)return;
    const imageToVideo = videoModel === "alibaba/wan-v2.6-i2v-flash";
    if (imageToVideo && !/^https:\/\//i.test(videoReferenceUrl.trim())) { setMediaError("For image-to-video, add a publicly accessible HTTPS image URL (PNG, JPG or WEBP)."); return; }
    setMediaBusy(true);setMediaError("");setVideoStatus(null);setVideoJob(null);
    try {
      const payload = {action:"start_video",model:videoModel,prompt:mediaPrompt.trim(),duration:videoDuration};
      if (imageToVideo) payload.imageUrl = videoReferenceUrl.trim();
      const data=await mediaRequest(payload);setVideoJob({operation:data.operation,model:data.model});setVideoStatus("pending");
    } catch(err){setMediaError(err.message||"Video generation could not start.");}finally{setMediaBusy(false);}
  };
  const checkVideo = async () => {
    if(!videoJob||mediaBusy)return;setMediaBusy(true);setMediaError("");
    try{const data=await mediaRequest({action:"check_video",model:videoJob.model,operation:videoJob.operation});setVideoStatus(data); if(data.status==="completed"&&Array.isArray(data.videos)){for(let i=0;i<data.videos.length;i++){const v=data.videos[i];const src=v.url||(v.base64?"data:video/mp4;base64,"+v.base64:"");if(src){try{await saveMediaAsset({source:src,type:"video",name:"AI video "+new Date().toLocaleString(),prompt:mediaPrompt.trim(),model:videoJob.model,mimeType:"video/mp4"});}catch(saveErr){setMediaError("Video ready, but saving to Library failed: "+saveErr.message);}}}}}
    catch(err){setMediaError(err.message||"Could not check video status.");}finally{setMediaBusy(false);}
  };

  const exportChat = () => {
    if (!activeChat?.messages?.length) return;
    const transcript = activeChat.messages.map(message =>
      (message.role === "user" ? "YOU" : "DUKU AI") + "\\n" + (message.content || "") +
      (message.files?.length ? "\\nAttachments: " + message.files.map(file => file.name).join(", ") : "")
    ).join("\\n\\n------------------------------\\n\\n");
    const blob = new Blob(["DuKu AI conversation: " + (activeChat.title || "New chat") + "\\n\\n" + transcript], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (activeChat.title || "duku-ai-chat").replace(/[^a-z0-9-_]+/gi,"-").slice(0,60) + ".txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const deleteChat = async (id) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId("");
    if (user?.id && supabase) {
      const { error: deleteError } = await supabase.from("duku_ai_conversations").delete().eq("id", id).eq("user_id", user.id);
      if (deleteError) { setError("Could not delete the cloud copy: " + deleteError.message); setSyncStatus("Sync error"); }
    }
  };
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
    const extracted=pages.join("\n\n").trim();return extracted.length>30?extracted:await ocrPdf(pdf);
  };
  const loadExternalScript = (src, globalName) => new Promise((resolve,reject) => {
    if(window[globalName])return resolve(window[globalName]);
    const script=document.createElement("script");script.src=src;script.async=true;
    script.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error("Document reader failed to initialize."));
    script.onerror=()=>reject(new Error("Could not load document reader. Check your connection."));
    document.head.appendChild(script);
  });
  const extractOfficeText = async (file) => {
    const name=file.name.toLowerCase();
    if(name.endsWith(".docx")){const mammoth=await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js","mammoth");return (await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value||"";}
    if(name.endsWith(".xlsx")||name.endsWith(".xls")){const XLSX=await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","XLSX");const book=XLSX.read(await file.arrayBuffer(),{type:"array"});return book.SheetNames.map(sheet=>"SHEET: "+sheet+"\n"+XLSX.utils.sheet_to_csv(book.Sheets[sheet])).join("\n\n").slice(0,120000);}
    if(name.endsWith(".pptx")){const JSZip=await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js","JSZip");const zip=await JSZip.loadAsync(await file.arrayBuffer());const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));const slides=[];for(let i=0;i<Math.min(names.length,80);i++){const xml=await zip.files[names[i]].async("text");const doc=new DOMParser().parseFromString(xml,"application/xml");slides.push("SLIDE "+(i+1)+": "+Array.from(doc.getElementsByTagName("a:t")).map(n=>n.textContent).join(" "));}return slides.join("\n\n").slice(0,120000);}
    throw new Error("Unsupported Office document.");
  };
  const ocrPdf = async (pdf) => {
    const Tesseract=await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js","Tesseract");const worker=await Tesseract.createWorker("eng");const pages=[];
    try{for(let n=1;n<=Math.min(pdf.numPages,5);n++){setError("OCR reading scanned PDF page "+n+"…");const page=await pdf.getPage(n);const viewport=page.getViewport({scale:1.4});const canvas=document.createElement("canvas");canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;const result=await worker.recognize(canvas);pages.push(result.data.text||"");canvas.width=0;canvas.height=0;}}finally{await worker.terminate();}
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
        }else if(/\.(docx|xlsx|xls|pptx)$/i.test(file.name)){
          const extractedText=await extractOfficeText(file);setAttached(prev=>[...prev,{name:file.name,type,extractedText,size:file.size}].slice(-5));
        }else if(type.startsWith("text/")||/\.(txt|md|csv|json|js|jsx|ts|tsx|py|html|css|xml|yaml|yml)$/i.test(file.name)){
          if(file.size>500000){setError(file.name+" exceeds the 500 KB text limit.");continue;}
          const extractedText=await file.text();setAttached(prev=>[...prev,{name:file.name,type,extractedText,size:file.size}].slice(-5));
        }else{setError("Unsupported file type: "+file.name);}
      }catch(err){setError(err.message||("Could not read "+file.name));}
    }
  };
  const toggleRecording = async () => {
    if(recording){recorderRef.current?.stop();setRecording(false);return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setError("Audio recording is not supported in this browser. Try the latest Chrome.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      recordedChunksRef.current=[];
      recorder.ondataavailable=event=>{if(event.data?.size)recordedChunksRef.current.push(event.data);};
      recorder.onstop=async()=>{
        stream.getTracks().forEach(track=>track.stop());
        const blob=new Blob(recordedChunksRef.current,{type:recorder.mimeType||"audio/webm"});
        if(blob.size>4*1024*1024){setError("Recording is larger than 4 MB. Please make a shorter recording.");return;}
        if(!blob.size){setError("No audio was recorded.");return;}
        setTranscribing(true);setError("Transcribing your recording…");
        try{
          const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
          const audio=String(dataUrl).split(",")[1]||"";
          const result=await mediaRequest({action:"transcribe_audio",audio,mediaType:blob.type.split(";")[0]});
          if(!result.text?.trim())throw new Error("No speech was detected in the recording.");
          setInput(prev=>(prev?prev+" ":"")+result.text.trim());setError("Audio transcribed. Review the text, then send it.");
        }catch(err){setError(err.message||"Could not transcribe this recording.");}
        finally{setTranscribing(false);}
      };
      recorderRef.current=recorder;recorder.start();setRecording(true);setError("Recording… tap the microphone again to finish.");
    }catch(err){setError(err.message||"Microphone permission was denied.");}
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
  if(!user)return <div className="dai-auth-page"><div className="dai-auth-glow"></div><div className="dai-auth-card"><a className="dai-brand" href="https://dukubusiness.online"><span className="dai-mark">D</span><span>DuKu <b>AI</b></span></a><div className="dai-auth-icon">✦</div><h1>{authMode==="signin"?"Welcome back":"Create your DuKu account"}</h1><p>One private workspace. Four DuKu Versions. One place to create.</p><form onSubmit={signIn}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required placeholder="At least 6 characters"/></label>{authError&&<div className="dai-auth-error">{authError}</div>}<button className="dai-auth-submit" type="submit">{authMode==="signin"?"Sign in to DuKu AI":"Create account"} <span>→</span></button></form><button className="dai-auth-switch" onClick={()=>{setAuthMode(authMode==="signin"?"signup":"signin");setAuthError("");}}>{authMode==="signin"?"New to DuKu? Create an account":"Already have an account? Sign in"}</button><small>By continuing, you agree to use AI responsibly. Your chats are private to your account.</small></div><div className="dai-auth-footer">A product by Upreti Industries Limited · <a href="https://dukubusiness.online">DuKu Business</a></div></div>;

  return <div className="dai-app">
    <aside className={"dai-sidebar "+(sidebarOpen?"open":"")}>
      <div className="dai-sidebar-top"><a className="dai-brand" href="https://dukubusiness.online"><span className="dai-mark">D</span><span>DuKu <b>AI</b></span></a><button className="dai-icon-btn dai-sidebar-close" onClick={()=>setSidebarOpen(false)}>×</button></div>
      <button className="dai-new-chat" onClick={newChat}><span>＋</span> New chat <kbd>⌘ K</kbd></button>
      <label className="dai-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chats"/></label>
      <div className="dai-history-label">YOUR CHATS</div>
      {syncReady && chats.length === 0 && legacyChats.length > 0 && <button className="dai-import-history" onClick={importLegacyChats}>Import {legacyChats.length} saved chat{legacyChats.length === 1 ? "" : "s"} from this device</button>}
      <div className="dai-history">{filteredChats.map(c=><div key={c.id} className={"dai-history-item "+(c.id===activeId?"active":"")}><button onClick={()=>{setActiveId(c.id);setSidebarOpen(false);}}><span>◷</span><span>{c.title}</span></button><button className="dai-delete-chat" title="Delete chat" onClick={()=>deleteChat(c.id)}>×</button></div>)}{!filteredChats.length&&<p className="dai-history-empty">Your conversations will appear here.</p>}</div>
      <div className="dai-sidebar-bottom"><div className="dai-plan-card"><span>✦</span><div><b>DuKu AI workspace</b><small>Four original DuKu Versions</small></div><i>●</i></div><button className="dai-account" onClick={()=>setMenuOpen(!menuOpen)}><span className="dai-avatar">{(user.email||"U").slice(0,1).toUpperCase()}</span><span><b>{user.email?.split("@")[0]}</b><small>Personal workspace</small></span><span className="dai-more">···</span></button>{menuOpen&&<div className="dai-account-menu"><button onClick={()=>supabase.auth.signOut()}>Sign out</button></div>}</div>
    </aside>
    {sidebarOpen&&<button className="dai-mobile-scrim" onClick={()=>setSidebarOpen(false)} aria-label="Close navigation"/>}
    <main className="dai-main">
      <header className="dai-topbar"><div className="dai-top-left"><button className="dai-icon-btn dai-mobile-menu" onClick={()=>setSidebarOpen(true)}>☰</button><button className="dai-model-select" onClick={()=>setMenuOpen(!menuOpen)}><span className="dai-model-gem">✦</span>{selectedModel.label}<span className="dai-chevron">⌄</span></button>{menuOpen&&<div className="dai-model-menu">{MODELS.map(m=><button key={m.id} className={m.id===model?"selected":""} onClick={()=>{setModel(m.id);setMenuOpen(false);}}><span className="dai-model-gem">✦</span><span><b>{m.label}</b><small>{m.note}</small></span>{m.id===model&&<i>✓</i>}</button>)}</div>}</div><div className="dai-top-right"><nav className="dai-studio-tabs"><button className={toolMode==="chat"?"active":""} onClick={()=>setToolMode("chat")}>Chat</button><button className={toolMode==="image"?"active":""} onClick={()=>{setToolMode("image");setMediaError("");}}>Images</button><button className={toolMode==="video"?"active":""} onClick={()=>{setToolMode("video");setMediaError("");}}>Video</button><button className={toolMode==="library"?"active":""} onClick={()=>{setToolMode("library");loadMediaLibrary();}}>Library</button></nav><span className="dai-secure-dot"></span><span>{syncStatus}</span><button className="dai-icon-btn" title="Export current conversation" onClick={exportChat} disabled={!activeChat?.messages?.length}>⇩</button><button className="dai-icon-btn" title="New chat" onClick={newChat}>＋</button></div></header>
      {toolMode==="library"&&<section className="dai-studio dai-library"><div className="dai-studio-heading"><span className="dai-studio-kicker">YOUR PRIVATE MEDIA VAULT</span><h1>Media Library</h1><p>Your generated images and videos, saved to your DuKu account and available across your signed-in devices.</p></div><div className="dai-library-toolbar"><span>{mediaLibrary.length} saved {mediaLibrary.length===1?"asset":"assets"}</span><button onClick={loadMediaLibrary} disabled={libraryLoading}>{libraryLoading?"Refreshing…":"↻ Refresh"}</button></div>{libraryError&&<p className="dai-studio-error">{libraryError}</p>}{libraryLoading&&<div className="dai-studio-progress"><span></span><b>Loading your library…</b></div>}{!libraryLoading&&!mediaLibrary.length&&<div className="dai-library-empty"><span>▧</span><h2>Your library is ready</h2><p>Generate an image or video and it will appear here automatically.</p><button onClick={()=>setToolMode("image")}>Create your first image</button></div>}<div className="dai-library-grid">{mediaLibrary.map(asset=><article className="dai-library-item" key={asset.id}><div className="dai-library-preview">{asset.asset_type==="image"?<img src={asset.previewUrl} alt={asset.name}/>:<div className="dai-library-video">▶ VIDEO</div>}</div><div className="dai-library-info"><b>{asset.name}</b><small>{asset.asset_type.toUpperCase()} · {new Date(asset.created_at).toLocaleDateString()}</small><p>{asset.prompt||"No prompt saved"}</p><div><button onClick={()=>openLibraryAsset(asset)}>↗ Open</button><button onClick={()=>deleteLibraryAsset(asset)}>Delete</button></div></div></article>)}</div></section>}
      {toolMode==="chat"&&<div className={"dai-conversation "+(activeChat?.messages?.length?"has-messages":"")}>
        {!activeChat?.messages?.length?<div className="dai-welcome"><div className="dai-welcome-orb"><span>✦</span><i></i></div><p className="dai-eyebrow">YOUR AI WORKSPACE</p><h1>What can I help you <em>create?</em></h1><p className="dai-welcome-copy">Ask anything. Explore ideas, solve problems, write code and get things moving.</p><div className="dai-prompt-grid">{starterPrompts.map(([icon,title,prompt])=><button key={title} onClick={()=>send(prompt)}><span>{icon}</span><b>{title}</b><small>{prompt}</small><i>↗</i></button>)}</div></div>:<div className="dai-messages">{activeChat.messages.map((m,i)=><article className={"dai-message "+m.role} key={m.id}><div className="dai-message-avatar">{m.role==="user"?(user.email||"U").slice(0,1).toUpperCase():"✦"}</div><div className="dai-message-body"><div className="dai-message-name">{m.role==="user"?"You":"DuKu AI"}{m.role==="assistant"&&<span>{selectedModel.label}</span>}</div><div className="dai-message-content">{m.content|| (busy&&i===activeChat.messages.length-1?<span className="dai-thinking"><i></i><i></i><i></i> Thinking…</span>:"")}{m.files?.length>0&&<div className="dai-sent-files">{m.files.map((f,j)=><span key={j}>▧ {f.name}</span>)}</div>}</div>{m.role==="assistant"&&m.content&&<div className="dai-message-actions"><button onClick={()=>copyMessage(m.content,m.id)}>{copied===m.id?"✓ Copied":"▢ Copy"}</button><button onClick={()=>speakMessage(m.content,m.id)}>{speakingId===m.id?"■ Stop voice":"◖)) Read aloud"}</button><button onClick={()=>send("Please continue from your previous answer.")}>↻ Continue</button></div>}</div></article>)}<div ref={bottomRef}/></div>}
      </div>}{toolMode!=="chat"&&<section className="dai-studio"><div className="dai-studio-heading"><span className="dai-studio-kicker">DUKU AI CREATION STUDIO</span><h1>{toolMode==="image"?"Create images with AI":"Turn your ideas into videos"}</h1><p>{toolMode==="image"?"Describe the image you want. DuKu AI will generate it for you.":"Describe a scene, camera movement and mood. Video generation may take several minutes."}</p></div><div className="dai-studio-card"><label className="dai-studio-label">YOUR PROMPT</label><textarea className="dai-studio-prompt" value={mediaPrompt} onChange={e=>setMediaPrompt(e.target.value)} placeholder={toolMode==="image"?"A cinematic product photograph of a futuristic electric car in a rainy neon city…":"A cinematic tracking shot of a hot air balloon floating above mountains at sunrise…"} rows={5}/>{toolMode==="image"&&<div className="dai-media-reference"><label className="dai-studio-label">REFERENCE IMAGE (OPTIONAL — EDIT AN EXISTING IMAGE)</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{readMediaImage(e.target.files?.[0]);e.target.value="";}}/>{mediaReferenceImage&&<div className="dai-media-reference-preview"><img src={mediaReferenceImage.dataUrl} alt="Image selected for editing"/><span>{mediaReferenceImage.name}</span><button type="button" onClick={()=>setMediaReferenceImage(null)}>Remove</button></div>}</div>}{toolMode==="video"&&<div className="dai-media-reference"><label className="dai-studio-label">VIDEO INPUT MODE</label><input type="url" value={videoReferenceUrl} onChange={e=>setVideoReferenceUrl(e.target.value)} placeholder="Optional HTTPS image URL for image-to-video"/><small>Choose Wan Image-to-Video below and provide a public image URL to animate a still image.</small></div>}{toolMode==="video"&&<div className="dai-video-options"><label>Model<select value={videoModel} onChange={e=>setVideoModel(e.target.value)}><option value="google/veo-3.1-generate-001">DuKu Motion 1 · Text to video</option><option value="spacexai/grok-imagine-video">DuKu Motion 2 · Text to video</option><option value="alibaba/wan-v2.6-i2v-flash">DuKu Motion 3 · Image to video</option></select></label><label>Duration<select value={videoDuration} onChange={e=>setVideoDuration(Number(e.target.value))}><option value={4}>4 seconds</option><option value={6}>6 seconds</option><option value={8}>8 seconds</option></select></label></div>}<div className="dai-studio-actions"><span>Generations may use paid AI Gateway credits.</span><button disabled={!mediaPrompt.trim()||mediaBusy} onClick={toolMode==="image"?generateImage:generateVideo}>{mediaBusy?"Working…":toolMode==="image"?(mediaReferenceImage?"✦ Edit image":"✦ Generate image"):(videoModel==="alibaba/wan-v2.6-i2v-flash"?"▶ Animate image":"▶ Generate video")}</button></div></div>{mediaError&&<p className="dai-studio-error">{mediaError}</p>}{mediaBusy&&<div className="dai-studio-progress"><span></span><b>{toolMode==="image"?"Creating your image…":"Submitting video job…"}</b></div>}{mediaImages.length>0&&<div className="dai-generated-grid">{mediaImages.map((src,i)=><div key={i}><img src={src} alt="AI generated result"/><a href={src} download={"duku-ai-image-"+(i+1)+".png"}>↓ Download image</a></div>)}</div>}{videoJob&&<div className="dai-video-job"><b>{videoStatus?.status==="completed"?"Video ready":"Video job submitted"}</b><p>{videoStatus?.status==="completed"?"Your video has finished generating.":"Video generation runs in the background. Check again in a moment."}</p>{videoStatus?.status==="completed"&&videoStatus.videos?.map((v,i)=><div key={i}>{v.url&&<video controls playsInline src={v.url}/>}{v.base64&&<video controls playsInline src={"data:video/mp4;base64,"+v.base64}/>}</div>)}{videoStatus?.status!=="completed"&&<button onClick={checkVideo} disabled={mediaBusy}>Check generation status</button>}</div>}</section>}<div className="dai-composer-wrap" style={{display:toolMode==="chat"?"":"none"}}><div className="dai-composer" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();attachFiles(e.dataTransfer.files);}}>{attached.length>0&&<div className="dai-attachments">{attached.map((f,i)=><span key={i}>{f.type.startsWith("image/")?"▧":f.type==="application/pdf"?"PDF":"▤"} {f.name}<button onClick={()=>setAttached(v=>v.filter((_,j)=>j!==i))}>×</button></span>)}</div>}<textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={e=>{const files=Array.from(e.clipboardData.files||[]);if(files.length){e.preventDefault();attachFiles(files);}}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message DuKu AI… (paste or drop a file)" rows={1}/><div className="dai-composer-tools"><div><label className="dai-attach-btn" title="Attach images, PDFs, documents or code">＋<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.docx,.xlsx,.xls,.pptx,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml" multiple onChange={e=>{attachFiles(e.target.files);e.target.value="";}}/></label><button className={"dai-voice-btn "+(listening?"active":"")} title="Live voice typing" onClick={startVoice}>{listening?"●":"♩"} <span>{listening?"Listening":"Voice"}</span></button><button className={"dai-voice-btn "+(recording?"active":"")} title="Record audio and transcribe" onClick={toggleRecording} disabled={transcribing}>{recording?"■":"🎙"} <span>{recording?"Stop recording":transcribing?"Transcribing…":"Record"}</span></button><span className="dai-tool-divider"></span><span className="dai-model-hint">DuKu Version</span></div><div><small>Enter to send · Shift + Enter for new line</small>{busy?<button className="dai-stop-btn" onClick={stop}>■ Stop</button>:<button className="dai-send-btn" disabled={!input.trim()&&!attached.length} onClick={()=>send()}>↑</button>}</div></div></div><p className="dai-disclaimer">{error||"DuKu AI can make mistakes. Check important information."}</p></div>
      <footer className="dai-footer">DuKu AI · Built under Upreti Industries Limited <span>•</span> <a href="https://dukubusiness.online">DuKu Business</a></footer>
    </main>
  </div>;
}
