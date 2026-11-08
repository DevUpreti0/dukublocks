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
const promptLibrary = [
  {category:"Writing",title:"Professional email",prompt:"Write a professional email about [topic]. Keep it clear, polite and concise."},
  {category:"Writing",title:"Improve my writing",prompt:"Rewrite the text below to make it clearer and more engaging while keeping my original meaning:\n\n[Paste text]"},
  {category:"Coding",title:"Debug my code",prompt:"Find the bug in this code, explain why it happens, and provide a corrected version:\n\n[Paste code]"},
  {category:"Coding",title:"Build a feature",prompt:"Plan and build [feature] using [technology]. Include responsive UI, accessibility and error handling."},
  {category:"Study",title:"Explain simply",prompt:"Teach me [topic] in very simple language with examples, key points and a short revision summary."},
  {category:"Study",title:"Quiz me",prompt:"Create a 10-question quiz on [topic]. Ask one question at a time and explain my mistakes."},
  {category:"Business",title:"Business plan",prompt:"Create a practical business plan for [idea], including target customers, pricing, costs, marketing and risks."},
  {category:"Business",title:"Marketing ideas",prompt:"Give me 15 original marketing ideas for [business/product]. Include low-budget options and a clear action plan."},
  {category:"Creative",title:"Image concept",prompt:"Create a detailed visual concept for [subject], including composition, lighting, color palette, mood and style."},
  {category:"Planning",title:"Action plan",prompt:"Turn this goal into a realistic step-by-step plan with milestones, priorities and a weekly schedule:\n\n[Goal]"}
];
const makeId = () => "chat-" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const readChats = () => { try { const value = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
const renderInlineMarkdown = (text) => {
 const pattern=/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_|\x60[^\x60]+\x60)/g;
 return String(text||"").split(pattern).map((part,index)=>{
  const link=part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if(link)return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
  if(/^(\*\*|__)[\s\S]+(\*\*|__)$/.test(part))return <strong key={index}>{part.slice(2,-2)}</strong>;
  if(/^~~[\s\S]+~~$/.test(part))return <del key={index}>{part.slice(2,-2)}</del>;
  if(/^(\*|_)[^*_]+(\*|_)$/.test(part))return <em key={index}>{part.slice(1,-1)}</em>;
  if(part.charCodeAt(0)===96&&part.charCodeAt(part.length-1)===96)return <code className="dai-inline-code" key={index}>{part.slice(1,-1)}</code>;
  return part;
 });
};
const detectCodeLanguage = (code, declared = "") => {
 const lang=String(declared||"").toLowerCase().replace(/^language-/,"");
 const aliases={js:"javascript",jsx:"jsx",ts:"typescript",tsx:"tsx",py:"python",sh:"bash",shell:"bash",yml:"yaml",html:"xml",svg:"xml",md:"markdown",jsonc:"json",csharp:"csharp",cs:"csharp"};
 if(lang&&lang!=="code")return aliases[lang]||lang;
 const sample=String(code||"").trim();
 if((sample[0]==="["||sample[0]==="{")&&/["'][\w-]+["']\s*:/.test(sample))return "json";
 if(/^\s*(import\s+React|export\s+default|const\s+\w+\s*=|function\s+\w+\s*\()/m.test(sample))return "javascript";
 if(/^\s*(def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import)/m.test(sample))return "python";
 if(/^\s*(SELECT|CREATE TABLE|INSERT INTO|UPDATE\s+\w+)/im.test(sample))return "sql";
 if(/^\s*<\/?[a-z][\s\S]*>/i.test(sample))return "xml";
 if(/^\s*(body|html|\.?[#\w-]+\s*\{)/m.test(sample)&&/[{}:;]/.test(sample))return "css";
 if(/^\s*(npm |yarn |git |cd |sudo )/m.test(sample))return "bash";
 return "text";
};
const splitMarkdownTableRow = (line) => {
 let value=String(line||"").trim();
 if(value.startsWith("|"))value=value.slice(1);
 if(value.endsWith("|"))value=value.slice(0,-1);
 return value.split("|").map(cell=>cell.trim());
};
const isMarkdownTableDivider = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line||"");
const MarkdownMessage=({content,onCopyCode,onDownloadCode,copied})=>{
 const lines=String(content||"").replace(/\r\n?/g,"\n").split("\n"),blocks=[];let paragraph=[],i=0;
 const flush=()=>{if(paragraph.length){blocks.push(<p key={"p"+i++}>{paragraph.map((line,n)=><React.Fragment key={n}>{n>0&&<br/>}{renderInlineMarkdown(line)}</React.Fragment>)}</p>);paragraph=[];}};
 while(i<lines.length){
  const line=lines[i],fence=line.match(/^\s*(\x60{3}|~~~)\s*([\w#+.-]*)\s*$/);
  if(fence){flush();const marker=fence[1],language=fence[2]||"code",codeLines=[];i++;while(i<lines.length&&!new RegExp("^\\s*"+marker+"\\s*$").test(lines[i]))codeLines.push(lines[i++]);if(i<lines.length)i++;const code=codeLines.join("\n"),detectedLanguage=detectCodeLanguage(code,language);blocks.push(<div className="dai-code-block" key={"code"+i}><div className="dai-code-header"><span>{detectedLanguage==="text"?"Plain text":detectedLanguage}<small>{codeLines.length} {codeLines.length===1?"line":"lines"}</small></span><div className="dai-code-actions"><button type="button" onClick={()=>onCopyCode(code)}>{copied==="code"?"✓ Copied":"▢ Copy code"}</button><button type="button" onClick={()=>onDownloadCode(code,detectedLanguage)}>↓ Download</button></div></div><pre className="dai-code-pre"><code>{code}</code></pre></div>);continue;}
  if(i+1<lines.length&&lines[i].includes("|")&&isMarkdownTableDivider(lines[i+1])){
   flush();const headers=splitMarkdownTableRow(lines[i]),alignments=splitMarkdownTableRow(lines[i+1]).map(cell=>cell.startsWith(":")&&cell.endsWith(":")?"center":cell.endsWith(":")?"right":"left");i+=2;const rows=[];
   while(i<lines.length&&lines[i].includes("|")&&lines[i].trim()){rows.push(splitMarkdownTableRow(lines[i]));i++;}
   blocks.push(<div className="dai-table-wrap" key={"table"+i}><table className="dai-md-table"><thead><tr>{headers.map((cell,n)=><th key={n} style={{textAlign:alignments[n]||"left"}}>{renderInlineMarkdown(cell)}</th>)}</tr></thead><tbody>{rows.map((row,n)=><tr key={n}>{headers.map((_,c)=><td key={c} style={{textAlign:alignments[c]||"left"}}>{renderInlineMarkdown(row[c]||"")}</td>)}</tr>)}</tbody></table></div>);continue;
  }
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading){flush();const Tag="h"+heading[1].length;blocks.push(<Tag className="dai-md-heading" key={"h"+i++}>{renderInlineMarkdown(heading[2])}</Tag>);continue;}
  if(/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)){flush();blocks.push(<hr className="dai-md-rule" key={"hr"+i++}/>);continue;}
  if(/^\s*>\s?/.test(line)){flush();const quote=[];while(i<lines.length&&/^\s*>\s?/.test(lines[i]))quote.push(lines[i++].replace(/^\s*>\s?/,""));blocks.push(<blockquote className="dai-md-quote" key={"q"+i}>{quote.map((q,n)=><React.Fragment key={n}>{n>0&&<br/>}{renderInlineMarkdown(q)}</React.Fragment>)}</blockquote>);continue;}
  const unordered=line.match(/^\s*[-*+]\s+(.+)$/),ordered=line.match(/^\s*\d+[.)]\s+(.+)$/);
  if(unordered||ordered){flush();const isOrdered=!!ordered,items=[];while(i<lines.length){const m=lines[i].match(isOrdered?/^\s*\d+[.)]\s+(.+)$/:/^\s*[-*+]\s+(.+)$/);if(!m)break;items.push(m[1]);i++;}const Tag=isOrdered?"ol":"ul";blocks.push(<Tag className="dai-md-list" key={"list"+i}>{items.map((item,n)=><li key={n}>{renderInlineMarkdown(item)}</li>)}</Tag>);continue;}
  if(!line.trim()){flush();i++;continue;}paragraph.push(line);i++;
 }
 flush();return <div className="dai-markdown">{blocks}</div>;
};

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
  const [responseStyle,setResponseStyle] = useState(() => localStorage.getItem("duku-ai-response-style-v1") || "balanced");
  const [webSearch,setWebSearch] = useState(false);
  const [input,setInput] = useState("");
  const [editingMessageId,setEditingMessageId] = useState("");
  const [previewImage,setPreviewImage] = useState(null);
  const [voiceMode,setVoiceMode] = useState(false);
  const [voiceListening,setVoiceListening] = useState(false);
  const [voiceTranscript,setVoiceTranscript] = useState("");
  const [busy,setBusy] = useState(false);
  const [thinkingStage,setThinkingStage] = useState(0);
  const [thinkingElapsed,setThinkingElapsed] = useState(0);
  const [thinkingReceiving,setThinkingReceiving] = useState(false);
  const thinkingStageTimerRef = useRef(null);
  const [thinkingDetailsOpen,setThinkingDetailsOpen] = useState(false);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [promptOpen,setPromptOpen] = useState(false);
  const [promptSearch,setPromptSearch] = useState("");
  const [pinnedIds,setPinnedIds] = useState(() => { try { return JSON.parse(localStorage.getItem("duku-ai-pinned-v1") || "[]"); } catch { return []; } });
  const [folders,setFolders] = useState(() => { try { const value=JSON.parse(localStorage.getItem("duku-ai-folders-v1")||"[]"); return Array.isArray(value)?value:[]; } catch { return []; } });
  const [chatFolders,setChatFolders] = useState(() => { try { const value=JSON.parse(localStorage.getItem("duku-ai-chat-folders-v1")||"{}"); return value&&typeof value==="object"?value:{}; } catch { return {}; } });
  const [folderColors,setFolderColors] = useState(() => { try { const value=JSON.parse(localStorage.getItem("duku-ai-folder-colors-v1")||"{}"); return value&&typeof value==="object"?value:{}; } catch { return {}; } });
  const [draggingChatId,setDraggingChatId] = useState("");
  const [selectedFolder,setSelectedFolder] = useState("");
  const [bulkSelectedIds,setBulkSelectedIds] = useState([]);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [menuOpen,setMenuOpen] = useState(false);
  const [instructionsOpen,setInstructionsOpen] = useState(false);
  const [attached,setAttached] = useState([]);
  const [listening,setListening] = useState(false);
  const [recording,setRecording] = useState(false);
  const [transcribing,setTranscribing] = useState(false);
  const [speakingId,setSpeakingId] = useState("");
  const [toolMode,setToolMode] = useState("chat");
  const [mediaPrompt,setMediaPrompt] = useState("");
  const [imageModel,setImageModel] = useState("google/gemini-3.1-flash-image");
  const [imageAspectRatio,setImageAspectRatio] = useState("1:1");
  const [imageSize,setImageSize] = useState("2K");
  const [imageCount,setImageCount] = useState(1);
  const [imageStyle,setImageStyle] = useState("none");
  const [chatImageUrls,setChatImageUrls] = useState({});
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
  const voiceModeRef = useRef(false);
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [copied,setCopied] = useState("");
  const bottomRef = useRef(null);
  const backupInputRef = useRef(null);
  const abortRef = useRef(null);
  const activeChat = chats.find(c=>c.id===activeId) || null;
  const activeModelId = activeChat?.model || model;
  const selectedModel = MODELS.find(m=>m.id===activeModelId) || MODELS[0];
  useEffect(()=>{
    const ids=[...new Set((activeChat?.messages||[]).flatMap(message=>message.images||[]).map(image=>image.assetId).filter(Boolean))];
    if(!ids.length||!supabase){setChatImageUrls({});return;}
    let cancelled=false;
    (async()=>{const {data}=await supabase.from("duku_ai_media_assets").select("id,bucket_path").in("id",ids);const entries=await Promise.all((data||[]).map(async asset=>{const {data:signed}=await supabase.storage.from("duku-ai-library").createSignedUrl(asset.bucket_path,3600);return [asset.id,signed?.signedUrl||""];}));if(!cancelled)setChatImageUrls(Object.fromEntries(entries));})();
    return ()=>{cancelled=true;};
  },[activeChat?.id,activeChat?.messages,user?.id]);

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
      .select("id,title,model,custom_instructions,messages,updated_at")
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
          customInstructions: row.custom_instructions || "",
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
    if (syncReady) localStorage.setItem(STORE_KEY, JSON.stringify(chats.filter(chat=>!chat.temporary)));
  }, [chats, syncReady]);
  useEffect(() => { localStorage.setItem("duku-ai-pinned-v1", JSON.stringify(pinnedIds)); }, [pinnedIds]);
  useEffect(() => { localStorage.setItem("duku-ai-response-style-v1", responseStyle); }, [responseStyle]);
  useEffect(() => { localStorage.setItem("duku-ai-folders-v1", JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem("duku-ai-chat-folders-v1", JSON.stringify(chatFolders)); }, [chatFolders]);
  useEffect(() => { localStorage.setItem("duku-ai-folder-colors-v1", JSON.stringify(folderColors)); }, [folderColors]);
  useEffect(() => {
    if (!user?.id || !syncReady || !chats.some(chat=>!chat.temporary) || !supabase) return;
    setSyncStatus("Saving…");
    const timer = setTimeout(async () => {
      const rows = chats.filter(chat=>!chat.temporary).map(chat => ({
        id: chat.id,
        user_id: user.id,
        title: String(chat.title || "New chat").slice(0, 160),
        model: chat.model || MODELS[0].id,
        custom_instructions: String(chat.customInstructions || "").slice(0,3000),
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
  const thinkingStages = ["Understanding your request", "Planning the best approach", "Working through the details", "Checking the response", "Preparing a clear answer", "Polishing the final response"];
  useEffect(() => {
    if (!busy) { setThinkingStage(0); setThinkingElapsed(0); setThinkingReceiving(false); setThinkingDetailsOpen(false); return; }
    setThinkingStage(0);
    setThinkingElapsed(0);
    setThinkingReceiving(false);
    const stageTimer = setInterval(() => setThinkingStage(value => (value + 1) % thinkingStages.length), 1850);
    thinkingStageTimerRef.current = stageTimer;
    const elapsedTimer = setInterval(() => setThinkingElapsed(value => value + 1), 1000);
    return () => { clearInterval(stageTimer); clearInterval(elapsedTimer); thinkingStageTimerRef.current = null; };
  }, [busy]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[activeChat?.messages?.length,latestMessageContent]);
  const newChat = useCallback(()=>{const id=makeId();setChats(prev=>[{id,title:"New chat",model,updatedAt:Date.now(),messages:[]},...prev]);setActiveId(id);setInput("");setError("");setAttached([]);setSidebarOpen(false);},[model]);
  const newTemporaryChat = useCallback(()=>{const id=makeId();setChats(prev=>[{id,title:"Temporary chat",model,temporary:true,updatedAt:Date.now(),messages:[]},...prev]);setActiveId(id);setInput("");setError("");setAttached([]);setSidebarOpen(false);setInstructionsOpen(false);},[model]);
  useEffect(() => {
    const handleShortcuts = (event) => {
      const target = event.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        newChat();
      } else if (event.key === "Escape") {
        setPreviewImage(null);
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
  const send = async (overrideText, options = {}) => {
    const text = String(overrideText ?? input).trim();
    const requestModel = options.model || activeChat?.model || model;
    if((!text && !attached.length) || busy) return;
    if(!user){setError("Sign in to start a private AI conversation.");return;}
    const chatId=ensureChat();
    const outgoingFiles = attached.slice();
    const promptText = (text + outgoingFiles.filter(f=>f.extractedText).map(f=>"\n\n[File: "+f.name+"]\n"+f.extractedText).join("")).slice(0,18000);
    const existingMessages=chats.find(c=>c.id===chatId)?.messages||[];
    const editId=options.editMessageId||editingMessageId;
    const baseMessages=options.regenerate?existingMessages.slice(0,-1):existingMessages;
    let nextMessages;
    if(options.regenerate) nextMessages=[...baseMessages,{id:makeId(),role:"assistant",content:""}];
    else if(editId){const editIndex=existingMessages.findIndex(message=>message.id===editId&&message.role==="user");if(editIndex<0){setError("That message can no longer be edited. Please try again.");return;}nextMessages=[...existingMessages.slice(0,editIndex),{...existingMessages[editIndex],content:promptText,files:outgoingFiles.length?outgoingFiles.map(file=>({name:file.name,type:file.type})):existingMessages[editIndex].files||[]},{id:makeId(),role:"assistant",content:""}];}
    else nextMessages=[...baseMessages,{id:makeId(),role:"user",content:promptText || "Please analyze the attached image(s).",files:outgoingFiles.map(f=>({name:f.name,type:f.type,preview:f.extractedText?.slice(0,700)||""}))},{id:makeId(),role:"assistant",content:""}];
    setChats(prev=>prev.map(c=>c.id===chatId?{...c,title:c.messages.length?c.title:(text||"New chat").slice(0,42)+(text.length>42?"…":""),model:requestModel,updatedAt:Date.now(),messages:nextMessages}:c));
    setInput("");setAttached([]);setEditingMessageId("");setBusy(true);setError("");
    const controller=new AbortController();abortRef.current=controller;
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error("Your sign-in session expired. Please sign in again.");
      const imageIntent = !options.regenerate && !editId && (!outgoingFiles.length || outgoingFiles.some(file=>file.dataUrl)) && /\b(create|generate|make|draw|design|render|paint|i want|give me)\b[\s\S]{0,110}\b(image|picture|photo|photograph|poster|wallpaper|illustration|portrait|artwork|logo|thumbnail|cover art|banner)\b/i.test(text) && !/\b(how to|code|html|svg|react|python)\b/i.test(text);
      if(imageIntent){
        const referenceImage=outgoingFiles.find(file=>file.dataUrl);
        const imageOptions={aspectRatio:imageAspectRatio,imageSize,imageCount,imageStyle};
        const result=await mediaRequest(referenceImage?{action:"edit_image",model:imageModel,prompt:text,image:referenceImage.dataUrl,...imageOptions}:{action:"generate_image",model:imageModel,prompt:text,...imageOptions});
        if(!Array.isArray(result.images)||!result.images.length)throw new Error("The image provider returned no image. Please try again.");
        const temporary=!!chats.find(chat=>chat.id===chatId)?.temporary;
        const generated=[];
        for(let i=0;i<result.images.length;i++){
          if(temporary) generated.push({dataUrl:result.images[i],name:"Temporary DuKu AI image "+(i+1),mimeType:"image/png"});
          else { const asset=await saveMediaAsset({source:result.images[i],type:"image",name:"DuKu AI image "+new Date().toLocaleString()+" "+(i+1),prompt:text,model:imageModel,metadata:imageOptions}); if(!asset?.id)throw new Error("An image was generated but could not be saved to your private Media Library."); generated.push({assetId:asset.id,name:asset.name||"DuKu AI image",mimeType:asset.mime_type||"image/png"}); }
        }
        setChats(prev=>prev.map(chat=>chat.id===chatId?{...chat,messages:chat.messages.map((message,index)=>index===chat.messages.length-1?{...message,content:generated.length===1?"Your image is ready. Preview it or download the original file below.":generated.length+" images are ready. Preview or download each original file below.",images:generated}:message),updatedAt:Date.now()}:chat));
        return;
      }
      const styleInstructions = { concise:"Keep answers concise and direct. Prioritize the key result and avoid unnecessary detail.", balanced:"Use a balanced level of detail. Explain important points clearly without being unnecessarily long.", detailed:"Give thorough explanations, useful context, examples, and practical caveats.", steps:"Prefer clear numbered steps, actionable instructions, and a short final checklist when useful." };
      const chatInstructions = String(chats.find(c=>c.id===chatId)?.customInstructions||"").trim();
      const conversationMessages=[{role:"system",content:"You are DuKu AI, a helpful and accurate assistant. Response preference: "+styleInstructions[responseStyle]+" Follow the user’s requested format when it differs."+(chatInstructions?"\n\nAdditional instructions for this conversation:\n"+chatInstructions:"")},...nextMessages.filter(m=>m.content).map((m,i)=>({
        role:m.role,
        content:m.role==="user" && i===nextMessages.length-2
          ? [{type:"text",text:m.content},...outgoingFiles.filter(f=>f.dataUrl).map(f=>({type:"image_url",image_url:{url:f.dataUrl}}))]
          : m.content
      }))];
      const response=await fetch(process.env.REACT_APP_SUPABASE_URL+"/functions/v1/duku-ai-chat",{
        method:"POST",signal:controller.signal,
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY},
        body:JSON.stringify({model:requestModel,messages:conversationMessages,webSearch})
      });
      if(!response.ok){
        let detail="AI service request failed ("+response.status+").";
        try{
          const payload=await response.json();
          detail=payload.error||detail;
          if(payload.detail && !/credit card|gateway is locked|gemini_api_key/i.test(detail)) detail+=" Details: "+String(payload.detail).slice(0,180);
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
        if(typeof delta==="string"&&delta){if(!answer){setThinkingReceiving(true);if(thinkingStageTimerRef.current)clearInterval(thinkingStageTimerRef.current);setThinkingStage(5);}answer+=delta;updateAssistantMessage(answer);}
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
      if(typeof options.onComplete==="function")options.onComplete(answer);
    } catch(err) {
      if(err.name!=="AbortError"){setError(err.message||"Something went wrong. Please try again.");setChats(prev=>prev.map(c=>c.id===chatId?{...c,messages:c.messages.filter((m,i)=>!(i===c.messages.length-1&&!m.content))}:c));}
    } finally {setBusy(false);abortRef.current=null;}
  };
  const stop = () => abortRef.current?.abort();

  const loadMediaLibrary = useCallback(async () => {
    if (!user?.id || !supabase) return;
    setLibraryLoading(true); setLibraryError("");
    const {data,error: listError} = await supabase.from("duku_ai_media_assets").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
    if (listError) setLibraryError(listError.message);
    else { const enriched = await Promise.all((data||[]).map(async asset => { const {data:signed} = await supabase.storage.from("duku-ai-library").createSignedUrl(asset.bucket_path,3600); return {...asset,previewUrl:signed?.signedUrl||""}; })); setMediaLibrary(enriched); }
    setLibraryLoading(false);
  }, [user?.id]);
  useEffect(() => { if (user?.id) loadMediaLibrary(); else setMediaLibrary([]); }, [user?.id, loadMediaLibrary]);
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
    const {data:row,error: rowError} = await supabase.from("duku_ai_media_assets").insert({user_id:user.id,asset_type:type,name,prompt,model,bucket_path:path,mime_type:finalType,file_size:blob.size,metadata}).select().single();
    if (rowError) { await supabase.storage.from("duku-ai-library").remove([path]); throw rowError; }
    setMediaLibrary(prev=>[row,...prev]);
    return row;
  };
  const downloadGeneratedImage = async (source,index=0) => {
    try {
      const response=await fetch(source);if(!response.ok)throw new Error("Could not download the generated image.");
      const blob=await response.blob();const url=URL.createObjectURL(blob);const extension=(blob.type||"image/png").split("/")[1]||"png";
      const link=document.createElement("a");link.href=url;link.download="duku-ai-image-"+(index+1)+"."+extension;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
    } catch(err){setMediaError(err.message||"Image download failed.");}
  };
  const downloadChatImage = async (image,index=0) => {
    try {
      let source=image?.dataUrl||"";
      let mime=image?.mimeType||"image/png";
      if(!source){
        const {data:asset,error:assetError}=await supabase.from("duku_ai_media_assets").select("bucket_path,mime_type").eq("id",image?.assetId).single();
        if(assetError||!asset)throw new Error(assetError?.message||"Image file was not found.");
        const {data:signed,error:signedError}=await supabase.storage.from("duku-ai-library").createSignedUrl(asset.bucket_path,300);
        if(signedError||!signed?.signedUrl)throw new Error(signedError?.message||"Could not prepare the download.");
        source=signed.signedUrl;mime=asset.mime_type||mime;
      }
      const response=await fetch(source);if(!response.ok)throw new Error("Could not download the image.");
      const blob=await response.blob();const url=URL.createObjectURL(blob);const extension=(mime||blob.type||"image/png").split("/")[1]||"png";
      const link=document.createElement("a");link.href=url;link.download="duku-ai-image-"+(index+1)+"."+extension;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
    } catch(err){setError(err.message||"Image download failed.");}
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
      const imageOptions={aspectRatio:imageAspectRatio,imageSize,imageCount,imageStyle};
      const data = mediaReferenceImage
        ? await mediaRequest({action:"edit_image",model:imageModel,prompt:mediaPrompt.trim(),image:mediaReferenceImage.dataUrl,...imageOptions})
        : await mediaRequest({action:"generate_image",model:imageModel,prompt:mediaPrompt.trim(),...imageOptions});
      setMediaImages(data.images||[]);
      for (let i=0;i<(data.images||[]).length;i++) { try { await saveMediaAsset({source:data.images[i],type:"image",name:"AI image "+new Date().toLocaleString(),prompt:mediaPrompt.trim(),model:imageModel}); } catch(saveErr) { setMediaError("Image generated, but saving to Library failed: "+saveErr.message); } }
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

  const exportMarkdown = () => {
    if (!activeChat?.messages?.length) return;
    const transcript = activeChat.messages.map(message => {
      const heading = message.role === "user" ? "## You" : "## DuKu AI";
      const files = message.files?.length ? "\n\n_Attachments: " + message.files.map(file => file.name).join(", ") + "_" : "";
      return heading + "\n\n" + (message.content || "_No text content_") + files;
    }).join("\n\n---\n\n");
    const markdown = "# " + (activeChat.title || "DuKu AI conversation") + "\n\n" + transcript + "\n";
    const blob = new Blob([markdown], {type:"text/markdown;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (activeChat.title || "duku-ai-chat").replace(/[^a-z0-9-_]+/gi,"-").slice(0,60) + ".md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const shareConversation = async () => {
    if(!activeChat?.messages?.length)return;
    const transcript=(activeChat.title||"DuKu AI conversation")+"\\n\\n"+activeChat.messages.map(message=>(message.role==="user"?"You":"DuKu AI")+":\\n"+(message.content||"")+(message.files?.length?"\\nAttachments: "+message.files.map(file=>file.name).join(", "):"")).join("\\n\\n");
    try{
      if(navigator.share)await navigator.share({title:activeChat.title||"DuKu AI conversation",text:transcript});
      else {await navigator.clipboard.writeText(transcript);setCopied("conversation");setTimeout(()=>setCopied(""),1800);}
    }catch(error){if(error?.name!=="AbortError")setError("Could not share this conversation. Try exporting it instead.");}
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
  const renameChat = (id) => {
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    const nextTitle = window.prompt("Rename conversation", chat.title || "New chat");
    if (nextTitle === null || !nextTitle.trim()) return;
    setChats(prev => prev.map(item => item.id === id ? { ...item, title: nextTitle.trim().slice(0, 80), updatedAt: Date.now() } : item));
  };
  const deleteChat = async (id) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId("");
    if (user?.id && supabase) {
      const { error: deleteError } = await supabase.from("duku_ai_conversations").delete().eq("id", id).eq("user_id", user.id);
      if (deleteError) { setError("Could not delete the cloud copy: " + deleteError.message); setSyncStatus("Sync error"); }
    }
  };
  const importConversationBackup=async(event)=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw new Error("Backup file must be 10 MB or smaller.");const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed)||!parsed.length)throw new Error("This file does not contain a valid DuKu conversation backup.");if(parsed.length>200)throw new Error("A backup can contain up to 200 conversations at a time.");const restored=parsed.map((chat,index)=>{if(!chat||typeof chat!=="object"||!Array.isArray(chat.messages))throw new Error("One conversation in this backup is invalid.");return{id:makeId()+"-"+index,title:String(chat.title||"Imported conversation").slice(0,80),model:MODELS.some(item=>item.id===chat.model)?chat.model:MODELS[0].id,customInstructions:typeof chat.customInstructions==="string"?chat.customInstructions.slice(0,3000):"",updatedAt:Number(chat.updatedAt)||Date.now(),messages:chat.messages.slice(0,1000).map(message=>({role:["user","assistant","system"].includes(message?.role)?message.role:"assistant",content:typeof message?.content==="string"?message.content:"",files:Array.isArray(message?.files)?message.files:[]}))};});setChats(prev=>[...restored,...prev]);setActiveId(restored[0].id);setBulkSelectedIds([]);setSyncStatus(user?.id?"Importing backup…":"Backup restored on this device");setError("");}catch(err){setError("Could not import backup: "+(err.message||"Invalid file"));}finally{event.target.value="";}};
  const toggleBulkChat=(id)=>setBulkSelectedIds(prev=>prev.includes(id)?prev.filter(value=>value!==id):[...prev,id]);
  const selectVisibleChats=()=>setBulkSelectedIds(prev=>{const visible=filteredChats.map(chat=>chat.id);return visible.every(id=>prev.includes(id))?prev.filter(id=>!visible.includes(id)):[...new Set([...prev,...visible])];});
  const exportSelectedChats=()=>{const selected=chats.filter(chat=>bulkSelectedIds.includes(chat.id));if(!selected.length)return;const payload=selected.map(chat=>({title:chat.title,updatedAt:chat.updatedAt,model:chat.model,customInstructions:chat.customInstructions||"",messages:(chat.messages||[]).map(message=>({role:message.role,content:message.content,files:message.files||[]}))}));const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="duku-selected-conversations.json";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);};
  const deleteSelectedChats=async()=>{const ids=bulkSelectedIds.slice();if(!ids.length)return;if(!window.confirm("Delete "+ids.length+" selected conversation"+(ids.length===1?"":"s")+"? This cannot be undone."))return;setChats(prev=>prev.filter(chat=>!ids.includes(chat.id)));setPinnedIds(prev=>prev.filter(id=>!ids.includes(id)));setChatFolders(prev=>Object.fromEntries(Object.entries(prev).filter(([id])=>!ids.includes(id))));if(ids.includes(activeId))setActiveId("");setBulkSelectedIds([]);if(user?.id&&supabase){const {error:deleteError}=await supabase.from("duku_ai_conversations").delete().in("id",ids).eq("user_id",user.id);if(deleteError){setError("Some cloud conversations could not be deleted: "+deleteError.message);setSyncStatus("Sync error");}}};
  const copyMessage = async (value,id) => {try{await navigator.clipboard.writeText(value);setCopied(id);setTimeout(()=>setCopied(""),1400);}catch{setError("Clipboard access was blocked by your browser.");}};
  const copyCodeBlock = async (value) => { try { await navigator.clipboard.writeText(value); setCopied("code"); setTimeout(()=>setCopied(""),1400); } catch { setError("Clipboard access was blocked by your browser."); } };
  const downloadCodeBlock = (value,language) => {
    const extensions={javascript:"js",jsx:"jsx",typescript:"ts",tsx:"tsx",python:"py",bash:"sh",shell:"sh",json:"json",html:"html",xml:"xml",css:"css",sql:"sql",yaml:"yaml",markdown:"md",java:"java",c:"c",cpp:"cpp",csharp:"cs",go:"go",rust:"rs",php:"php",ruby:"rb",swift:"swift",kotlin:"kt",text:"txt"};
    const extension=extensions[language]||"txt";
    const blob=new Blob([value],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="duku-code."+extension;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  };
  const filteredChats=useMemo(()=>chats.filter(c=>!c.temporary&&((c.title||"")+" "+(c.messages||[]).map(m=>m.content||"").join(" ")).toLowerCase().includes(search.toLowerCase())&&(!selectedFolder||(chatFolders[c.id]||"")===selectedFolder)).sort((a,b)=>Number(pinnedIds.includes(b.id))-Number(pinnedIds.includes(a.id)) || (b.updatedAt||0)-(a.updatedAt||0)),[chats,search,pinnedIds,selectedFolder,chatFolders]);
  const groupedChats=useMemo(()=>{const groups=new Map();const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();for(const chat of filteredChats){const stamp=chat.updatedAt||0;const day=new Date(stamp);const dayStart=new Date(day.getFullYear(),day.getMonth(),day.getDate()).getTime();let label=pinnedIds.includes(chat.id)?"Pinned":dayStart===today?"Today":dayStart===today-86400000?"Yesterday":dayStart>=today-6*86400000?"Previous 7 days":"Older";if(!groups.has(label))groups.set(label,[]);groups.get(label).push(chat);}return Array.from(groups,([label,items])=>({label,items}));},[filteredChats,pinnedIds]);
  const createFolder=()=>{const name=window.prompt("Name this folder");if(!name?.trim())return;const clean=name.trim().slice(0,40);setFolders(prev=>prev.some(folder=>folder.toLowerCase()===clean.toLowerCase())?prev:[...prev,clean]);setSelectedFolder(clean);};
  const assignChatFolder=(id,folder)=>setChatFolders(prev=>({...prev,[id]:folder}));
  const changeFolderColor=(folder,color)=>setFolderColors(prev=>({...prev,[folder]:color}));
  const dropChatInFolder=(event,folder)=>{event.preventDefault();const id=event.dataTransfer.getData("text/duku-chat-id")||draggingChatId;if(id)assignChatFolder(id,folder);setDraggingChatId("");};
  const regenerateLastResponse=(chat)=>{if(busy||!chat?.messages?.length)return;const last=chat.messages[chat.messages.length-1];const previous=chat.messages[chat.messages.length-2];if(last?.role!=="assistant"||previous?.role!=="user")return;if(previous.files?.some(file=>file.type?.startsWith("image/"))){setError("This message included an image. Please attach it again before regenerating.");return;}setActiveId(chat.id);setModel(chat.model||model);send(previous.content,{regenerate:true,model:chat.model||model});}
  const filteredPrompts=useMemo(()=>promptLibrary.filter(p=>(p.title+" "+p.category+" "+p.prompt).toLowerCase().includes(promptSearch.toLowerCase())),[promptSearch]);
  const togglePinned=(id)=>setPinnedIds(prev=>prev.includes(id)?prev.filter(item=>item!==id):[id,...prev]);
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
  const transcribeAudioFile = async (file) => {
    const extension = file.name.toLowerCase().split(".").pop();
    const mimeByExtension = { mp3: "audio/mpeg", m4a: "audio/mp4", mp4: "audio/mp4", ogg: "audio/ogg", oga: "audio/ogg", webm: "audio/webm" };
    const mediaType = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"].includes(file.type)
      ? file.type
      : mimeByExtension[extension];
    if (!mediaType) throw new Error("Supported audio files: MP3, M4A, OGG and WEBM.");
    if (file.size > 4 * 1024 * 1024) throw new Error("Audio files must be 4 MB or smaller.");
    if (!file.size) throw new Error("The selected audio file is empty.");
    setTranscribing(true);
    setError("Transcribing " + file.name + "…");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the audio file."));
        reader.readAsDataURL(file);
      });
      const audio = String(dataUrl).split(",")[1] || "";
      const result = await mediaRequest({ action: "transcribe_audio", audio, mediaType });
      if (!result.text?.trim()) throw new Error("No speech was detected in " + file.name + ".");
      setInput(prev => (prev ? prev + "\\n\\n" : "") + result.text.trim());
      setError("Audio transcribed. Review the text, then send it.");
    } finally {
      setTranscribing(false);
    }
  };
  const attachFiles=async(files)=>{
    for(const file of Array.from(files||[]).slice(0,5)){
      const type=file.type||"";
      if(file.size>8*1024*1024){setError(file.name+" exceeds the 8 MB file limit.");continue;}
      try{
        if(type.startsWith("audio/")||/\\.(mp3|m4a|mp4|ogg|oga|webm)$/i.test(file.name)){
          await transcribeAudioFile(file);
        }else if(type.startsWith("image/")&&["image/png","image/jpeg","image/webp","image/gif"].includes(type)){
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
  const startVoiceConversation=(forceListen=false)=>{
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){setError("Voice conversations need speech recognition support. Please use the latest Chrome.");return;}
    if(voiceListening&&!forceListen){recognitionRef.current?.stop();setVoiceListening(false);return;}
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    const recognition=new SpeechRecognition();recognition.lang=navigator.language||"en-IN";recognition.interimResults=true;recognition.continuous=false;
    let finalText="";
    recognition.onresult=event=>{let interim="";for(let i=event.resultIndex;i<event.results.length;i++){const part=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=part+" ";else interim+=part;}setVoiceTranscript((finalText+interim).trim());};
    recognition.onerror=()=>{setVoiceListening(false);setError("Microphone stopped. Check microphone permission and try again.");};
    recognition.onend=()=>{setVoiceListening(false);const prompt=finalText.trim();if(prompt){setVoiceTranscript(prompt);send(prompt,{onComplete:answer=>{if(window.speechSynthesis){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(answer);utterance.lang=navigator.language||"en-IN";utterance.onend=()=>{setSpeakingId("");if(voiceModeRef.current)startVoiceConversation(true);};utterance.onerror=()=>{setSpeakingId("");if(voiceModeRef.current)startVoiceConversation(true);};setSpeakingId("voice-mode");window.speechSynthesis.speak(utterance);}}});}};
    recognitionRef.current=recognition;voiceModeRef.current=true;setVoiceMode(true);setVoiceTranscript("");setError("");recognition.start();setVoiceListening(true);
  };
  const closeVoiceConversation=()=>{voiceModeRef.current=false;recognitionRef.current?.stop();setVoiceListening(false);setVoiceMode(false);setVoiceTranscript("");if(window.speechSynthesis)window.speechSynthesis.cancel();setSpeakingId("");};

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
      <label className="dai-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search titles and messages"/></label>
      <div className="dai-history-label dai-folders-heading"><span>FOLDERS</span><button onClick={createFolder} title="Create folder">＋</button></div><div className="dai-folder-list"><button className={!selectedFolder?"active":""} onClick={()=>setSelectedFolder("")} onDragOver={e=>e.preventDefault()} onDrop={e=>dropChatInFolder(e,"")}>All chats</button>{folders.map(folder=><div className={"dai-folder-row "+(selectedFolder===folder?"active":"")} key={folder} onDragOver={e=>e.preventDefault()} onDrop={e=>dropChatInFolder(e,folder)}><button onClick={()=>setSelectedFolder(folder)}><i style={{background:folderColors[folder]||"#8b9bb4"}}/>{folder}</button><input type="color" aria-label={"Color for "+folder} title="Folder color" value={folderColors[folder]||"#8b9bb4"} onChange={e=>changeFolderColor(folder,e.target.value)}/><span onClick={()=>{if(window.confirm("Delete folder: "+folder+"? Chats will remain in All chats.")){setFolders(prev=>prev.filter(item=>item!==folder));setFolderColors(prev=>{const next={...prev};delete next[folder];return next;});setChatFolders(prev=>Object.fromEntries(Object.entries(prev).filter(([,value])=>value!==folder)));if(selectedFolder===folder)setSelectedFolder("");}}}>×</span></div>)}</div><div className="dai-history-label">YOUR CHATS</div><div className="dai-backup-actions"><button onClick={()=>backupInputRef.current?.click()}>↑ Import backup</button><input ref={backupInputRef} type="file" accept="application/json,.json" onChange={importConversationBackup} hidden/></div>
      {syncReady && chats.length === 0 && legacyChats.length > 0 && <button className="dai-import-history" onClick={importLegacyChats}>Import {legacyChats.length} saved chat{legacyChats.length === 1 ? "" : "s"} from this device</button>}
      <div className="dai-bulk-toolbar"><label><input type="checkbox" checked={filteredChats.length>0&&filteredChats.every(chat=>bulkSelectedIds.includes(chat.id))} onChange={selectVisibleChats}/> Select visible</label>{bulkSelectedIds.length>0&&<><span>{bulkSelectedIds.length} selected</span><button onClick={exportSelectedChats}>Export JSON</button><button className="dai-bulk-delete" onClick={deleteSelectedChats}>Delete selected</button><button onClick={()=>setBulkSelectedIds([])}>Clear</button></>}</div><div className="dai-history">{groupedChats.map(group=><section className="dai-history-group" key={group.label}><div className="dai-history-group-title">{group.label}</div>{group.items.map(c=><div key={c.id} draggable onDragStart={e=>{setDraggingChatId(c.id);e.dataTransfer.setData("text/duku-chat-id",c.id);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>setDraggingChatId("")} className={"dai-history-item "+(c.id===activeId?"active":"")+(bulkSelectedIds.includes(c.id)?" selected":"")+(draggingChatId===c.id?" dragging":"")}><input className="dai-chat-select" type="checkbox" aria-label={"Select "+c.title} checked={bulkSelectedIds.includes(c.id)} onChange={()=>toggleBulkChat(c.id)}/><button onClick={()=>{setActiveId(c.id);setSidebarOpen(false);}}><span>◷</span><span>{c.title}</span></button><select className="dai-chat-folder-select" title="Move chat to folder" value={chatFolders[c.id]||""} onChange={e=>assignChatFolder(c.id,e.target.value)}><option value="">Folder</option>{folders.map(folder=><option key={folder} value={folder}>{folder}</option>)}</select><button className="dai-rename-chat" title="Rename conversation" aria-label="Rename conversation" onClick={()=>renameChat(c.id)}>✎</button><button className={"dai-pin-chat "+(pinnedIds.includes(c.id)?"pinned":"")} title={pinnedIds.includes(c.id)?"Unpin chat":"Pin chat"} onClick={()=>togglePinned(c.id)}>⌖</button><button className="dai-delete-chat" title="Delete chat" onClick={()=>deleteChat(c.id)}>×</button></div>)}</section>)}{!filteredChats.length&&<p className="dai-history-empty">No matching conversations.</p>}</div>
      <div className="dai-sidebar-bottom"><div className="dai-plan-card"><span>✦</span><div><b>DuKu AI workspace</b><small>Four original DuKu Versions</small></div><i>●</i></div><button className="dai-account" onClick={()=>setMenuOpen(!menuOpen)}><span className="dai-avatar">{(user.email||"U").slice(0,1).toUpperCase()}</span><span><b>{user.email?.split("@")[0]}</b><small>Personal workspace</small></span><span className="dai-more">···</span></button>{menuOpen&&<div className="dai-account-menu"><button onClick={()=>supabase.auth.signOut()}>Sign out</button></div>}</div>
    </aside>
    {sidebarOpen&&<button className="dai-mobile-scrim" onClick={()=>setSidebarOpen(false)} aria-label="Close navigation"/>}
    <main className="dai-main">
      <header className="dai-topbar"><div className="dai-top-left"><button className="dai-icon-btn dai-mobile-menu" onClick={()=>setSidebarOpen(true)}>☰</button><button className="dai-model-select" onClick={()=>setMenuOpen(!menuOpen)}><span className="dai-model-gem">✦</span>{selectedModel.label}<span className="dai-chevron">⌄</span></button><button className={"dai-temp-chat-btn "+(activeChat?.temporary?"active":"")} onClick={newTemporaryChat} title="Start a temporary chat">◌ Temporary</button><button className={"dai-chat-instructions-btn "+(instructionsOpen?"active":"")} onClick={()=>setInstructionsOpen(value=>!value)} title="Set instructions for this conversation">✎ Instructions</button><label className="dai-response-style" title="Choose how DuKu AI responds"><span>Style</span><select value={responseStyle} onChange={e=>setResponseStyle(e.target.value)} aria-label="AI response style"><option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option><option value="steps">Step-by-step</option></select></label>{menuOpen&&<div className="dai-model-menu">{MODELS.map(m=><button key={m.id} className={m.id===activeModelId?"selected":""} onClick={()=>{setModel(m.id);if(activeId)setChats(prev=>prev.map(chat=>chat.id===activeId?{...chat,model:m.id,updatedAt:Date.now()}:chat));setMenuOpen(false);}}><span className="dai-model-gem">✦</span><span><b>{m.label}</b><small>{m.note}</small></span>{m.id===model&&<i>✓</i>}</button>)}</div>}</div><div className="dai-top-right"><nav className="dai-studio-tabs"><button className={toolMode==="chat"?"active":""} onClick={()=>setToolMode("chat")}>Chat</button><button className={toolMode==="image"?"active":""} onClick={()=>{setToolMode("image");setMediaError("");}}>Images</button><button className={toolMode==="video"?"active":""} onClick={()=>{setToolMode("video");setMediaError("");}}>Video</button><button className={toolMode==="library"?"active":""} onClick={()=>{setToolMode("library");loadMediaLibrary();}}>Library</button></nav><span className="dai-secure-dot"></span><span>{syncStatus}</span><button className="dai-icon-btn dai-prompt-library-btn" title="Open Prompt Library" onClick={()=>setPromptOpen(true)}>✧ <span>Prompts</span></button><button className="dai-icon-btn" title="Start voice conversation" onClick={()=>setVoiceMode(true)}>◖))</button><button className="dai-icon-btn" title="Share conversation" onClick={shareConversation} disabled={!activeChat?.messages?.length}>{copied==="conversation"?"✓":"↗"}</button><button className="dai-icon-btn" title="Export conversation as Markdown" onClick={exportMarkdown} disabled={!activeChat?.messages?.length}>MD</button><button className="dai-icon-btn" title="Export current conversation as text" onClick={exportChat} disabled={!activeChat?.messages?.length}>⇩</button><button className="dai-icon-btn" title="New chat" onClick={newChat}>＋</button></div>{activeChat?.temporary&&<div className="dai-temporary-banner"><span>◌ <b>Temporary chat</b> · This conversation will not appear in history or be saved to your device or cloud.</span><button onClick={newChat}>＋ Regular chat</button></div>}<div className={"dai-chat-instructions-panel "+(instructionsOpen?"open":"")}><div><b>Conversation instructions</b><button onClick={()=>setInstructionsOpen(false)} aria-label="Close instructions">×</button></div><textarea value={activeChat?.customInstructions||""} disabled={!activeChat} placeholder="Example: Keep answers short, use simple English, and focus on React..." onChange={e=>{const value=e.target.value.slice(0,3000);if(activeId)setChats(prev=>prev.map(chat=>chat.id===activeId?{...chat,customInstructions:value,updatedAt:Date.now()}:chat));}}/><small>These instructions apply only to this conversation. Up to 3,000 characters.</small></div></header>
      {toolMode==="library"&&<section className="dai-studio dai-library"><div className="dai-studio-heading"><span className="dai-studio-kicker">YOUR PRIVATE MEDIA VAULT</span><h1>Media Library</h1><p>Your generated images and videos, saved to your DuKu account and available across your signed-in devices.</p></div><div className="dai-library-toolbar"><span>{mediaLibrary.length} saved {mediaLibrary.length===1?"asset":"assets"}</span><button onClick={loadMediaLibrary} disabled={libraryLoading}>{libraryLoading?"Refreshing…":"↻ Refresh"}</button></div>{libraryError&&<p className="dai-studio-error">{libraryError}</p>}{libraryLoading&&<div className="dai-studio-progress"><span></span><b>Loading your library…</b></div>}{!libraryLoading&&!mediaLibrary.length&&<div className="dai-library-empty"><span>▧</span><h2>Your library is ready</h2><p>Generate an image or video and it will appear here automatically.</p><button onClick={()=>setToolMode("image")}>Create your first image</button></div>}<div className="dai-library-grid">{mediaLibrary.map(asset=><article className="dai-library-item" key={asset.id}><div className="dai-library-preview">{asset.asset_type==="image"?<img src={asset.previewUrl} alt={asset.name}/>:<div className="dai-library-video">▶ VIDEO</div>}</div><div className="dai-library-info"><b>{asset.name}</b><small>{asset.asset_type.toUpperCase()} · {new Date(asset.created_at).toLocaleDateString()}</small><p>{asset.prompt||"No prompt saved"}</p><div><button onClick={()=>openLibraryAsset(asset)}>↗ Open</button><button onClick={()=>deleteLibraryAsset(asset)}>Delete</button></div></div></article>)}</div></section>}
      {toolMode==="chat"&&<div className={"dai-conversation "+(activeChat?.messages?.length?"has-messages":"")}>
        {!activeChat?.messages?.length?<div className="dai-welcome"><div className="dai-welcome-orb"><span>✦</span><i></i></div><p className="dai-eyebrow">YOUR AI WORKSPACE</p><h1>What can I help you <em>create?</em></h1><p className="dai-welcome-copy">Ask anything. Explore ideas, solve problems, write code and get things moving.</p><div className="dai-prompt-grid">{starterPrompts.map(([icon,title,prompt])=><button key={title} onClick={()=>send(prompt)}><span>{icon}</span><b>{title}</b><small>{prompt}</small><i>↗</i></button>)}</div></div>:<div className="dai-messages">{activeChat.messages.map((m,i)=><article className={"dai-message "+m.role} key={m.id}><div className="dai-message-avatar">{m.role==="user"?(user.email||"U").slice(0,1).toUpperCase():"✦"}</div><div className="dai-message-body"><div className="dai-message-name">{m.role==="user"?"You":"DuKu AI"}{m.role==="assistant"&&<span>{selectedModel.label}</span>}</div><div className="dai-message-content">{m.content?<MarkdownMessage content={m.content} onCopyCode={copyCodeBlock} onDownloadCode={downloadCodeBlock} copied={copied}/>: (busy&&i===activeChat.messages.length-1?<span className="dai-thinking-wrap" role="status" aria-live="polite"><span className="dai-thinking-orb"><i></i><i></i><i></i><b></b></span><span className="dai-thinking-panel"><span className="dai-thinking-topline"><strong className="dai-thinking-label">{thinkingStages[thinkingStage]}</strong><span className="dai-thinking-live"><i></i> LIVE</span></span><span className="dai-thinking-subrow"><span className="dai-thinking-subline">{thinkingElapsed<4?"DuKu is getting things ready…":thinkingElapsed<12?"Taking a careful look at the details…":thinkingElapsed<25?"Working on a thoughtful response…":"This request is taking a little longer. Still waiting for the model…"}</span><span className="dai-thinking-wave" aria-hidden="true">{Array.from({length:17},(_,index)=><i key={index} style={{animationDelay:(index*0.055)+"s"}} />)}</span></span><span className="dai-thinking-progress"><i style={{animationDuration:"2.8s"}} /></span><span className="dai-thinking-hint">{thinkingElapsed<8?"You can keep this panel open while DuKu works.":thinkingElapsed<20?"Larger prompts and attached files can take extra time.":"If the response gets stuck, you can stop it and try again."}</span><span className="dai-thinking-meta"><span><i className="dai-thinking-spark">✦</i> {selectedModel.label}</span><span>{Math.floor(thinkingElapsed/60)}:{String(thinkingElapsed%60).padStart(2,"0")} elapsed</span></span><button className="dai-thinking-details-toggle" type="button" onClick={()=>setThinkingDetailsOpen(value=>!value)} aria-expanded={thinkingDetailsOpen}>{thinkingDetailsOpen?"Hide activity":"Show activity"} <span>{thinkingDetailsOpen?"⌃":"⌄"}</span></button>{thinkingDetailsOpen&&<span className="dai-thinking-activity"><span className={"dai-thinking-activity-step "+(thinkingStage>=0?"done":"")}><i>✓</i><span><b>Request received</b><small>Your message is ready for the AI model.</small></span></span><span className={"dai-thinking-activity-step "+(thinkingStage>=2?"done":"active")}><i>{thinkingStage>=2?"✓":"✦"}</i><span><b>Response in progress</b><small>DuKu is preparing the answer. The animation is a status indicator.</small></span></span><span className="dai-thinking-activity-step"><i>○</i><span><b>Ready to display</b><small>The response will appear here when received.</small></span></span></span>}</span></span>:"")}{m.images?.length>0&&<div className="dai-chat-generated-images">{m.images.map((image,j)=><div className="dai-chat-generated-image" key={image.assetId||j}>{image.dataUrl||chatImageUrls[image.assetId]?<img src={image.dataUrl||chatImageUrls[image.assetId]} alt={image.name||"AI generated image"}/>:<div className="dai-chat-image-loading">Loading image preview…</div>}<button onClick={()=>downloadChatImage(image,j)} disabled={!image.dataUrl&&!chatImageUrls[image.assetId]}>↓ Download image</button></div>)}</div>}{busy&&m.role==="assistant"&&i===activeChat.messages.length-1&&m.content&&<><span className="dai-stream-live" role="status"><i></i><b>Receiving response</b><span className="dai-stream-wave">{Array.from({length:9},(_,index)=><i key={index} style={{animationDelay:(index*.07)+"s"}} />)}</span></span><span className="dai-stream-cursor" aria-label="Generating response"></span></>}{m.files?.length>0&&<div className="dai-sent-files">{m.files.map((f,j)=><details className="dai-sent-file" key={j}><summary><span className="dai-sent-file-type">{f.type==="application/pdf"?"PDF":f.type.startsWith("image/")?"IMG":f.type.includes("word")?"DOC":f.type.includes("sheet")?"XLS":"FILE"}</span><span>{f.name}</span><span className="dai-file-expand">Details⌄</span></summary>{f.preview&&<div className="dai-sent-file-preview"><small>EXTRACTED TEXT PREVIEW · {f.preview.length} characters</small><p>{f.preview}{f.preview.length>=700?"…":""}</p></div>}</details>)}</div>}</div>{m.role==="user"&&m.content&&!busy&&!m.files?.some(file=>file.type?.startsWith("image/"))&&<div className="dai-message-actions"><button onClick={()=>{setInput(m.content);setEditingMessageId(m.id);setError("");setToolMode("chat");setSidebarOpen(false);}}>✎ Edit message</button><button onClick={()=>copyMessage(m.content,"user-"+m.id)}>{copied==="user-"+m.id?"✓ Copied":"▢ Copy"}</button></div>}{m.role==="assistant"&&m.content&&<div className="dai-message-actions"><button onClick={()=>copyMessage(m.content,m.id)}>{copied===m.id?"✓ Copied":"▢ Copy"}</button><button onClick={()=>speakMessage(m.content,m.id)}>{speakingId===m.id?"■ Stop voice":"◖)) Read aloud"}</button><button onClick={()=>send("Please continue from your previous answer.")}>↻ Continue</button>{i===activeChat.messages.length-1&&<button onClick={()=>regenerateLastResponse(activeChat)} disabled={busy}>⟲ Regenerate</button>}</div>}</div></article>)}<div ref={bottomRef}/></div>}
      </div>}{toolMode!=="chat"&&<section className="dai-studio"><div className="dai-studio-heading"><span className="dai-studio-kicker">DUKU AI CREATION STUDIO</span><h1>{toolMode==="image"?"Create images with AI":"Turn your ideas into videos"}</h1><p>{toolMode==="image"?"Describe the image you want. DuKu AI will generate it for you.":"Describe a scene, camera movement and mood. Video generation may take several minutes."}</p></div><div className="dai-studio-card"><label className="dai-studio-label">YOUR PROMPT</label><textarea className="dai-studio-prompt" value={mediaPrompt} onChange={e=>setMediaPrompt(e.target.value)} placeholder={toolMode==="image"?"A cinematic product photograph of a futuristic electric car in a rainy neon city…":"A cinematic tracking shot of a hot air balloon floating above mountains at sunrise…"} rows={5}/>{toolMode==="image"&&<><div className="dai-image-model-select"><label className="dai-studio-label">IMAGE MODEL</label><select value={imageModel} onChange={e=>{setImageModel(e.target.value);if(e.target.value==="google/gemini-3-pro-image"&&imageSize==="512")setImageSize("1K");}}><option value="google/gemini-3.1-flash-image">DuKu Image 1 · Gemini Flash</option><option value="google/gemini-3-pro-image">DuKu Image Pro · Gemini Pro</option></select><small>Real image generation and editing. Higher resolution and more images may use more API quota.</small></div><div className="dai-image-controls"><label>Aspect ratio<select value={imageAspectRatio} onChange={e=>setImageAspectRatio(e.target.value)}><option value="1:1">Square · 1:1</option><option value="3:2">Landscape · 3:2</option><option value="4:3">Photo · 4:3</option><option value="16:9">Widescreen · 16:9</option><option value="9:16">Story · 9:16</option><option value="2:3">Portrait · 2:3</option><option value="3:4">Portrait · 3:4</option><option value="4:5">Social · 4:5</option><option value="21:9">Ultrawide · 21:9</option></select></label><label>Resolution<select value={imageSize} onChange={e=>setImageSize(e.target.value)}><option value="1K">1K · Standard</option><option value="2K">2K · High detail</option><option value="4K">4K · Ultra detail</option>{imageModel==="google/gemini-3.1-flash-image"&&<option value="512">512 · Faster draft</option>}</select></label><label>Number of images<select value={imageCount} onChange={e=>setImageCount(Number(e.target.value))}><option value={1}>1 image</option><option value={2}>2 images</option><option value={3}>3 images</option><option value={4}>4 images</option></select></label><label>Visual style<select value={imageStyle} onChange={e=>setImageStyle(e.target.value)}><option value="none">Auto · follow prompt</option><option value="photorealistic">Photorealistic</option><option value="cinematic">Cinematic</option><option value="3d">3D render</option><option value="illustration">Digital illustration</option><option value="anime">Anime</option><option value="watercolor">Watercolor</option><option value="minimal">Minimal / clean</option></select></label></div></>}<div className="dai-media-reference"><label className="dai-studio-label">REFERENCE IMAGE (OPTIONAL — EDIT AN EXISTING IMAGE)</label><div className="dai-image-quick-edits"><span className="dai-studio-label">QUICK EDIT TOOLS</span><div className="dai-image-quick-edit-grid"><button type="button" disabled={!mediaReferenceImage||mediaBusy} onClick={()=>setMediaPrompt("Remove the entire background from the provided image. Keep the main subject exactly recognizable with clean, precise edges, preserve fine details such as hair and transparent objects, and return the subject isolated on a transparent background. Do not add shadows, text, or new objects.")}>Remove background</button><button type="button" disabled={!mediaReferenceImage||mediaBusy} onClick={()=>setMediaPrompt("Edit the provided image by replacing [DESCRIBE THE OBJECT TO REPLACE] with [DESCRIBE THE NEW OBJECT]. Preserve the rest of the image, camera angle, perspective, lighting, composition and subject identity. Make the replacement blend naturally.")}>Replace object</button><button type="button" disabled={!mediaReferenceImage||mediaBusy} onClick={()=>setMediaPrompt("Expand the provided image beyond its current borders. Continue the scene naturally with matching perspective, lighting, textures and details. Keep the original subject and existing image area unchanged. Create a seamless generative outpainting result.")}>Expand image</button><button type="button" disabled={!mediaReferenceImage||mediaBusy} onClick={()=>setMediaPrompt("Enhance and upscale the provided image. Preserve the exact subject, identity, composition and colors. Improve fine details, edges, texture clarity and sharpness, reduce compression artifacts and noise, and avoid artificial details or changes.")}>Upscale & sharpen</button><button type="button" disabled={!mediaReferenceImage||mediaBusy} onClick={()=>setMediaPrompt("Remove [DESCRIBE THE OBJECT TO REMOVE] from the provided image. Reconstruct the area behind it naturally, matching surrounding textures, perspective, lighting and shadows. Keep everything else unchanged.")}>Erase object</button><button type="button" disabled={!mediaReferenceImage||mediaBusy} onClick={()=>setMediaPrompt("Improve the lighting of the provided image with natural, balanced, professional lighting. Preserve the subject, identity, composition and colors. Correct exposure and white balance, recover visible details in shadows and highlights, and avoid an artificial or over-processed look.")}>Relight photo</button></div><small>Upload a reference image first. These are AI-assisted edits; exact transparency and pixel-perfect upscaling depend on the image model.</small></div><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{readMediaImage(e.target.files?.[0]);e.target.value="";}}/>{mediaReferenceImage&&<div className="dai-media-reference-preview"><img src={mediaReferenceImage.dataUrl} alt="Selected file"/><span>{mediaReferenceImage.name}</span><button type="button" onClick={()=>setMediaReferenceImage(null)}>Remove</button></div>}</div>}{toolMode==="video"&&<div className="dai-media-reference"><label className="dai-studio-label">VIDEO INPUT MODE</label><input type="url" value={videoReferenceUrl} onChange={e=>setVideoReferenceUrl(e.target.value)} placeholder="Optional HTTPS image URL for image-to-video"/><small>Choose Wan Image-to-Video below and provide a public image URL to animate a still image.</small></div>}{toolMode==="video"&&<div className="dai-video-options"><label>Model<select value={videoModel} onChange={e=>setVideoModel(e.target.value)}><option value="google/veo-3.1-generate-001">DuKu Motion 1 · Text to video</option><option value="spacexai/grok-imagine-video">DuKu Motion 2 · Text to video</option><option value="alibaba/wan-v2.6-i2v-flash">DuKu Motion 3 · Image to video</option></select></label><label>Duration<select value={videoDuration} onChange={e=>setVideoDuration(Number(e.target.value))}><option value={4}>4 seconds</option><option value={6}>6 seconds</option><option value={8}>8 seconds</option></select></label></div>}<div className="dai-studio-actions"><span>Uses your connected Gemini API key; Google may charge for usage.</span><button disabled={!mediaPrompt.trim()||mediaBusy} onClick={toolMode==="image"?generateImage:generateVideo}>{mediaBusy?"Working…":toolMode==="image"?(mediaReferenceImage?"✦ Edit image":"✦ Generate image"):(videoModel==="alibaba/wan-v2.6-i2v-flash"?"▶ Animate image":"▶ Generate video")}</button></div></div>{mediaError&&<p className="dai-studio-error">{mediaError}</p>}{mediaBusy&&<div className="dai-studio-progress"><span></span><b>{toolMode==="image"?"Creating your image…":"Submitting video job…"}</b></div>}{mediaImages.length>0&&<div className="dai-generated-grid">{mediaImages.map((src,i)=><div key={i}><img src={src} alt="AI generated result"/><button type="button" onClick={()=>downloadGeneratedImage(src,i)}>↓ Download image</button></div>)}</div>}{videoJob&&<div className="dai-video-job"><b>{videoStatus?.status==="completed"?"Video ready":"Video job submitted"}</b><p>{videoStatus?.status==="completed"?"Your video has finished generating.":"Video generation runs in the background. Check again in a moment."}</p>{videoStatus?.status==="completed"&&videoStatus.videos?.map((v,i)=><div key={i}>{v.url&&<video controls playsInline src={v.url}/>}{v.base64&&<video controls playsInline src={"data:video/mp4;base64,"+v.base64}/>}</div>)}{videoStatus?.status!=="completed"&&<button onClick={checkVideo} disabled={mediaBusy}>Check generation status</button>}</div>}</section>}<div className="dai-composer-wrap" style={{display:toolMode==="chat"?"":"none"}}>{voiceMode&&<div className="dai-voice-panel"><div className="dai-voice-panel-top"><div><strong>DuKu Voice</strong><span>Talk, pause for DuKu to reply, then speak again. The microphone reopens after each spoken reply.</span></div><button onClick={closeVoiceConversation} aria-label="Close voice conversation">×</button></div><div className={"dai-voice-orb "+(voiceListening?"is-listening":"")}><span>◖))</span></div><p>{voiceListening?"Listening… speak now":busy?"DuKu AI is preparing your reply":speakingId==="voice-mode"?"Speaking your reply":"Tap the microphone to speak"}</p>{voiceTranscript&&<div className="dai-voice-transcript">{voiceTranscript}</div>}<button className="dai-voice-start" onClick={()=>{if(speakingId==="voice-mode"){window.speechSynthesis?.cancel();setSpeakingId("");startVoiceConversation(true);}else startVoiceConversation();}} disabled={busy}>{voiceListening?"Stop listening":speakingId==="voice-mode"?"Interrupt and speak":"🎙 Speak to DuKu"}</button></div>}<div className="dai-composer" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();attachFiles(e.dataTransfer.files);}}>{editingMessageId&&<div className="dai-editing-banner"><span>✎ Editing your message · the following reply will be regenerated</span><button type="button" onClick={()=>{setEditingMessageId("");setInput("");}}>Cancel</button></div>}{attached.length>0&&<div className="dai-attachments">{attached.map((f,i)=><div className={"dai-attachment-card "+(f.type.startsWith("image/")?"is-image":"")} key={i}>{f.type.startsWith("image/")&&f.dataUrl?<button type="button" className="dai-attachment-thumb" onClick={()=>setPreviewImage({src:f.dataUrl,name:f.name})} title="Preview image"><img src={f.dataUrl} alt={f.name}/><span>⌕ Preview</span></button>:<span className="dai-attachment-file-icon">{f.type==="application/pdf"?"PDF":"▤"}</span>}<span className="dai-attachment-name" title={f.name}>{f.name}</span><button className="dai-attachment-remove" aria-label={"Remove "+f.name} onClick={()=>setAttached(v=>v.filter((_,j)=>j!==i))}>×</button></div>)}</div>}<textarea value={input} onChange={e=>setInput(e.target.value)} onPaste={e=>{const files=Array.from(e.clipboardData.files||[]);if(files.length){e.preventDefault();attachFiles(files);}}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message DuKu AI… (paste or drop a file)" rows={1}/><div className="dai-composer-tools"><div><label className="dai-attach-btn" title="Attach images, PDFs, documents or code">＋<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/mp4,audio/ogg,audio/webm,.mp3,.m4a,.ogg,.oga,.webm,application/pdf,.docx,.xlsx,.xls,.pptx,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml" multiple onChange={e=>{attachFiles(e.target.files);e.target.value="";}}/></label><button className={"dai-voice-btn "+(listening?"active":"")} title="Live voice typing" onClick={startVoice}>{listening?"●":"♩"} <span>{listening?"Listening":"Voice"}</span></button><button className={"dai-voice-btn "+(recording?"active":"")} title="Record audio and transcribe" onClick={toggleRecording} disabled={transcribing}>{recording?"■":"🎙"} <span>{recording?"Stop recording":transcribing?"Transcribing…":"Record"}</span></button><button type="button" className={"dai-voice-btn dai-web-search-btn "+(webSearch?"active":"")} aria-pressed={webSearch} title="Search the web for current information and cite sources" onClick={()=>setWebSearch(value=>!value)}>⌕ <span>Search web</span></button><span className="dai-tool-divider"></span><span className="dai-model-hint">DuKu Version</span></div><div><small>Enter to send · Shift + Enter for new line</small>{busy?<button className="dai-stop-btn" onClick={stop}>■ Stop</button>:<button className="dai-send-btn" disabled={!input.trim()&&!attached.length} onClick={()=>send()}>↑</button>}</div></div></div><p className={"dai-disclaimer "+(error?"has-error":"")}>{error||"DuKu AI can make mistakes. Check important information."}</p></div>
      {promptOpen&&<div className="dai-prompt-overlay" role="dialog" aria-modal="true" aria-label="Prompt Library"><section className="dai-prompt-modal"><div className="dai-prompt-modal-head"><div><span>DUKU AI TOOLKIT</span><h2>Prompt Library</h2><p>Choose a ready-made prompt and customise it in your composer.</p></div><button onClick={()=>setPromptOpen(false)} aria-label="Close Prompt Library">×</button></div><label className="dai-prompt-search">⌕ <input value={promptSearch} onChange={e=>setPromptSearch(e.target.value)} placeholder="Search writing, coding, study, business…"/></label><div className="dai-prompt-list">{filteredPrompts.map((p,i)=><button key={p.title} onClick={()=>{setInput(p.prompt);setToolMode("chat");setPromptOpen(false);setPromptSearch("");}}><span>{p.category}</span><b>{p.title}</b><small>{p.prompt}</small><i>Use prompt →</i></button>)}{!filteredPrompts.length&&<p>No matching prompts. Try another search.</p>}</div><div className="dai-prompt-modal-foot">{filteredPrompts.length} prompts · Edit any prompt before sending</div></section></div>}
      <footer className="dai-footer">DuKu AI · Built under Upreti Industries Limited <span>•</span> <a href="https://dukubusiness.online">DuKu Business</a></footer>
    </main>
    {previewImage&&<div className="dai-image-lightbox" role="dialog" aria-modal="true" aria-label="Image preview" onClick={()=>setPreviewImage(null)}><div className="dai-image-lightbox-panel" onClick={event=>event.stopPropagation()}><div className="dai-image-lightbox-head"><span title={previewImage.name}>{previewImage.name}</span><button onClick={()=>setPreviewImage(null)} aria-label="Close image preview">×</button></div><img src={previewImage.src} alt={previewImage.name}/><div className="dai-image-lightbox-foot"><button onClick={()=>{const link=document.createElement("a");link.href=previewImage.src;link.download=previewImage.name||"duku-image";link.click();}}>↓ Download image</button><button onClick={()=>setPreviewImage(null)}>Close</button></div></div></div>}
  </div>;
}
