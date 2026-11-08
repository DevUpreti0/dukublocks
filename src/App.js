import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

async function copyToClipboard(value) {
  const text = String(value ?? "");
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard copy was blocked");
    return true;
  } catch (error) {
    console.error("Unable to copy text", error);
    return false;
  }
}

const templates = [{"name":"Studio","type":"Portfolio","color":"violet","shape":"studio","tag":"Popular"},{"name":"Forma","type":"Business","color":"blue","shape":"forma","tag":"New"},{"name":"Morrow","type":"Store","color":"orange","shape":"morrow","tag":"E-commerce"},{"name":"Northstar","type":"Agency","color":"green","shape":"north","tag":"Minimal"},{"name":"Atelier","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Meridian","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Cobalt","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Monograph","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Aster","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Canvas","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Lumen","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Fieldnote","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Arc Studio","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Foundry","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Sable","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Verve","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"North Co","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Horizon","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Kindred","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Slate","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Maison","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Avenue","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Mosaic","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Bloom","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Cedar","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Olive","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Juniper","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Solstice","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Harbor","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Summit","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Evergreen","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Pioneer","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Craftline","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Commerce One","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Market House","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Cartwell","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Goods Co","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Supply","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Maison Shop","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Daily Edit","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Curated","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Basket","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Retail Studio","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Pixel Works","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Signal","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Orbit","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Vector","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Layer","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Syntax","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Cloudline","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Launchpad","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Nexus","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Stack","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Northstar Pro","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Studio Grid","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Common Ground","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Frame","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Mono","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Sunday","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Gather","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Field Form","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Studio West","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Table Thyme","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Saffron","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Cafe Society","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"The Bakehouse","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Olive Kitchen","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Casa Verde","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Bistro Lane","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Roastery","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Supper Club","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Market Table","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Learnwell","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Brightpath","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Campus","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Scholar","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Mentor","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Academy","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Coursecraft","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Skillhouse","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Next Chapter","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Openbook","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Wellness Co","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Forma Health","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Motion","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Balance","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Vitality","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Careline","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Pulse","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"Mindful","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Active Life","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Studio Fit","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Estate One","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"Haven Homes","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"},{"name":"Urban Nest","type":"Store","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Key Co","type":"Agency","color":"green","shape":"north","tag":"Animated"},{"name":"Blueprint","type":"Restaurant","color":"violet","shape":"studio","tag":"Animated"},{"name":"The Agency","type":"Education","color":"blue","shape":"forma","tag":"Animated"},{"name":"Studio North","type":"Technology","color":"orange","shape":"morrow","tag":"Animated"},{"name":"Creative Dept","type":"Landing Page","color":"green","shape":"north","tag":"Animated"},{"name":"Brand Assembly","type":"Business","color":"violet","shape":"studio","tag":"Featured"},{"name":"The Collective","type":"Portfolio","color":"blue","shape":"forma","tag":"Animated"}];


function createTemplateStarter(category) {
  const id=()=> "template-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
  const intro={id:id(),type:"Text",title:"A clear promise for your visitors",content:"Introduce your brand, explain what makes you different and invite visitors to take the next step."};
  const features={id:id(),type:"Columns",title:"What makes us different",items:[{title:"Thoughtful design",content:"A considered experience, made around your audience."},{title:"Built for people",content:"Clear information and simple ways to connect."},{title:"Ready to grow",content:"A flexible foundation for what comes next."}]};
  const proof={id:id(),type:"Stats",title:"A track record that matters",items:[{value:"01",label:"Purposeful approach"},{value:"100%",label:"Made for your audience"},{value:"24/7",label:"Your online presence"}]};
  const reviews={id:id(),type:"Testimonials",title:"What people say",items:[{name:"Client name",role:"Customer",quote:"A thoughtful experience from the first conversation to the final result."},{name:"Partner name",role:"Business partner",quote:"Clear communication, strong attention to detail and a great outcome."}]};
  const contact={id:id(),type:"Form",title:"Start a conversation",content:"Tell us what you need and our team will get back to you."};
  const gallery={id:id(),type:"Gallery",title:"A closer look",items:[{assetId:"",caption:"Featured image"},{assetId:"",caption:"More to explore"},{assetId:"",caption:"Made with care"}]};
  const pricing={id:id(),type:"Pricing",title:"Simple options",items:[{name:"Essential",price:"₹499",period:"/ month",features:"Core features\\nResponsive design\\nEmail support",featured:false},{name:"Professional",price:"₹1,999",period:"/ month",features:"Everything in Essential\\nMore flexibility\\nPriority support",featured:true}]};
  const faq={id:id(),type:"FAQ",title:"Frequently asked questions",items:[{question:"How do I get started?",answer:"Contact our team or choose the option that best fits your needs."},{question:"Can I customise this experience?",answer:"Yes. Update the content, colours, sections and imagery in the editor."}]};
  if(category==="Store")return [intro,gallery,pricing,reviews,faq,contact];
  if(category==="Restaurant")return [intro,gallery,{id:id(),type:"Columns",title:"Our menu",items:[{title:"Small plates",content:"Seasonal favourites made for sharing."},{title:"Main courses",content:"Fresh ingredients and thoughtful cooking."},{title:"Something sweet",content:"A little finish to make the day."}]},reviews,contact];
  if(category==="Portfolio")return [intro,gallery,features,reviews,contact];
  if(category==="Agency")return [intro,features,proof,gallery,reviews,contact];
  if(category==="Education")return [intro,features,{id:id(),type:"Columns",title:"Explore learning paths",items:[{title:"Foundation",content:"Build strong fundamentals."},{title:"Practical learning",content:"Apply ideas through guided projects."},{title:"Career growth",content:"Develop skills for your next step."}]},faq,contact];
  if(category==="Technology")return [intro,proof,features,faq,contact];
  if(category==="Landing Page")return [intro,proof,features,reviews,contact];
  return [intro,features,proof,reviews,faq,contact];
}

function safeTenantLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  if (/^\/(?!\/)/.test(raw)) return raw;
  return "";
}

function safeEmbedUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return "";
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) : "";
    }
    if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
      const id = url.searchParams.get("v") || (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : "");
      return id ? "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) : "";
    }
    if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? "https://player.vimeo.com/video/" + id : "";
    }
    return "";
  } catch (error) { return ""; }
}



function AdminPortal() {
  const [sessionUser,setSessionUser]=useState(null),[email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[notice,setNotice]=useState(""),[role,setRole]=useState("");
  const [tab,setTab]=useState("Overview"),[page,setPage]=useState(null),[pageSaving,setPageSaving]=useState(false);
  const [posts,setPosts]=useState([]),[post,setPost]=useState(null),[postSaving,setPostSaving]=useState(false);
  const [members,setMembers]=useState([]),[stats,setStats]=useState({sites:0,users:0,posts:0});
  const [sectionOrder,setSectionOrder]=useState(["hero","features","templates","pricing","careers","blog","footer"]);
  const [dragSection,setDragSection]=useState("");
  const defaults={hero_title:"Build a website that works as hard as you do.",hero_subtitle:"A professional website builder for ambitious people and growing businesses.",announcement:"DuKu Business is an official subsidiary of Upreti Industries Limited (UIL).",popup_enabled:false,popup_title:"Welcome to DuKu FCA",popup_body:"Start building your next idea today.",footer_text:"© DuKu Business. All rights reserved.",seo_title:"DuKu FCA — Professional Website Builder",seo_description:"Create, customise and publish professional websites with DuKu FCA.",sections:["hero","features","templates","pricing","careers","blog","footer"]};
  const [draft,setDraft]=useState({page_key:"homepage",title:"Homepage",content:defaults,custom_html:"",custom_css:"",custom_js:"",seo:{title:defaults.seo_title,description:defaults.seo_description}});
  const [blogTitle,setBlogTitle]=useState(""),[blogSlug,setBlogSlug]=useState(""),[blogExcerpt,setBlogExcerpt]=useState(""),[blogBody,setBlogBody]=useState(""),[blogCategory,setBlogCategory]=useState("Company news"),[blogImage,setBlogImage]=useState(""),[blogStatus,setBlogStatus]=useState("draft");
  const verifyAdmin=async(user)=>{if(!user){setSessionUser(null);setRole("");setChecking(false);return;}const {data,error}=await supabase.from("profiles").select("display_name,platform_role").eq("id",user.id).maybeSingle();if(error){setNotice("Could not verify administrator permissions.");setSessionUser(null);setRole("");}else if(!data||!["admin","super_admin"].includes(data.platform_role)){setNotice("This account does not have administrator access.");await supabase.auth.signOut();setSessionUser(null);setRole("");}else{setSessionUser(user);setRole(data.platform_role);setNotice("");}setChecking(false);};
  useEffect(()=>{let active=true;supabase.auth.getSession().then(({data})=>{if(active)verifyAdmin(data.session?.user||null);});const {data:listener}=supabase.auth.onAuthStateChange((_e,session)=>{if(active)verifyAdmin(session?.user||null);});return()=>{active=false;listener.subscription.unsubscribe();};},[]);
  useEffect(()=>{if(!sessionUser)return;let active=true;(async()=>{const [p,b,s,u]=await Promise.all([supabase.from("platform_pages").select("*").eq("page_key","homepage").maybeSingle(),supabase.from("blog_posts").select("*").order("created_at",{ascending:false}).limit(100),supabase.from("sites").select("id",{count:"exact",head:true}),supabase.from("profiles").select("id",{count:"exact",head:true})]);if(!active)return;if(p.data){setPage(p.data);setDraft(p.data);setSectionOrder(p.data.content?.sections||defaults.sections);}setPosts(b.data||[]);setStats({sites:s.count||0,users:u.count||0,posts:b.data?.length||0});})();const channel=supabase.channel("admin-platform-live").on("postgres_changes",{event:"*",schema:"public",table:"platform_pages"},payload=>{if(payload.new?.page_key==="homepage"){setPage(payload.new);setDraft(payload.new);setSectionOrder(payload.new.content?.sections||defaults.sections);}}).on("postgres_changes",{event:"*",schema:"public",table:"blog_posts"},()=>{supabase.from("blog_posts").select("*").order("created_at",{ascending:false}).limit(100).then(({data})=>setPosts(data||[]));}).subscribe();return()=>{active=false;supabase.removeChannel(channel);};},[sessionUser]);
  const signIn=async()=>{if(!email.trim()||!password){setNotice("Enter your administrator email and password.");return;}setBusy(true);setNotice("");try{const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;await verifyAdmin(data.user);}catch(e){setNotice(e.message||"Sign in failed.");}finally{setBusy(false);}};
  const signOut=async()=>{await supabase.auth.signOut();setSessionUser(null);setRole("");setPassword("");};
  const savePage=async(publish)=>{setPageSaving(true);setNotice("");const next={...draft,content:{...draft.content,sections:sectionOrder},is_published:publish,updated_by:sessionUser.id,revision:(page?.revision||0)+1,updated_at:new Date().toISOString()};try{const {data,error}=await supabase.from("platform_pages").upsert(next,{onConflict:"page_key"}).select().single();if(error)throw error;setPage(data);setDraft(data);setNotice(publish?"Homepage changes published. Visitors will receive the latest version.":"Homepage draft saved.");}catch(e){setNotice(e.message||"Could not save homepage.");}finally{setPageSaving(false);}};
  const moveSection=(target)=>{if(!dragSection||dragSection===target)return;const next=[...sectionOrder];const from=next.indexOf(dragSection),to=next.indexOf(target);if(from<0||to<0)return;next.splice(from,1);next.splice(to,0,dragSection);setSectionOrder(next);setDragSection("");};
  const editPost=(p)=>{setPost(p);setBlogTitle(p.title);setBlogSlug(p.slug);setBlogExcerpt(p.excerpt||"");setBlogBody(p.body||"");setBlogCategory(p.category||"Company news");setBlogImage(p.cover_image_url||"");setBlogStatus(p.status||"draft");setTab("Blog");};
  const newPost=()=>{setPost(null);setBlogTitle("");setBlogSlug("");setBlogExcerpt("");setBlogBody("");setBlogCategory("Company news");setBlogImage("");setBlogStatus("draft");};
  const savePost=async()=>{if(!blogTitle.trim()||!blogSlug.trim()||!blogBody.trim()){setNotice("Blog title, URL slug and article body are required.");return;}setPostSaving(true);try{const row={title:blogTitle.trim(),slug:blogSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,""),excerpt:blogExcerpt,body:blogBody,category:blogCategory,cover_image_url:blogImage,status:blogStatus,author_name:"DuKu Editorial",created_by:sessionUser.id,published_at:blogStatus==="published"?(post?.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};const q=post?supabase.from("blog_posts").update(row).eq("id",post.id):supabase.from("blog_posts").insert(row);const {data,error}=await q.select().single();if(error)throw error;setPosts(cur=>post?cur.map(x=>x.id===data.id?data:x):[data,...cur]);setPost(data);setNotice("Article saved.");}catch(e){setNotice(e.message||"Could not save article.");}finally{setPostSaving(false);}};
  const deletePost=async(p)=>{if(!window.confirm("Delete this blog post permanently?"))return;const {error}=await supabase.from("blog_posts").delete().eq("id",p.id);if(error)setNotice(error.message);else{setPosts(cur=>cur.filter(x=>x.id!==p.id));if(post?.id===p.id)newPost();setNotice("Article deleted.");}};
  if(checking)return <div className="admin-screen"><div className="admin-login">Verifying administrator session…</div></div>;
  if(!sessionUser)return <div className="admin-screen"><div className="admin-login"><div className="admin-logo">D</div><div className="eyebrow">DUKU BUSINESS · CONTROL CENTRE</div><h1>Administrator <em>sign in</em></h1><label>Work email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@dukubusiness.online"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&signIn()}/></label><button className="primary-btn full" disabled={busy} onClick={signIn}>{busy?"Signing in…":"Sign in securely"}</button>{notice&&<div className="admin-notice">{notice}</div>}</div></div>;
  const tabs=["Overview","Main website editor","Blog & news","Members","Websites","Platform settings","Audit log"];
  return <div className="admin-dashboard"><header><div className="brand"><span className="brand-mark">D</span>DuKu <b>FCA CONTROL CENTRE</b></div><div className="admin-session"><span>{sessionUser.email} · {role.replace("_"," ")}</span><button className="ghost-btn" onClick={signOut}>Sign out</button></div></header><div className="admin-layout"><aside><div className="eyebrow">ADMIN NAVIGATION</div>{tabs.map((t,i)=><button key={t} className={tab===t?"selected":""} onClick={()=>setTab(t)}>{["◫","▣","▤","♙","▦","⚙","≡"][i]}　{t}</button>)}</aside><main>
  <div className="eyebrow">DUKU FCA · LIVE PLATFORM OPERATIONS</div><h1>{tab==="Overview"?"Platform overview":tab}</h1><p>Manage the DuKu FCA experience, publishing and platform content from one control centre.</p>
  {notice&&<div className="admin-notice admin-live-notice" role="status">{notice}</div>}
  {tab==="Overview"&&<><div className="admin-metrics"><div><small>Access level</small><b>{role==="super_admin"?"Super admin":"Administrator"}</b><span>Verified from platform profile</span></div><div><small>Websites</small><b>{stats.sites}</b><span>Platform-wide count</span></div><div><small>Members</small><b>{stats.users}</b><span>Registered profiles</span></div><div><small>Articles</small><b>{stats.posts}</b><span>Blog and news posts</span></div></div><section><h2>Live administration</h2><div className="admin-panels"><article><b>Website CMS</b><p>Edit homepage content, sections, SEO, header, footer, banners and custom code.</p><button className="ghost-btn" onClick={()=>setTab("Main website editor")}>Open editor ↗</button></article><article><b>Newsroom</b><p>Write, edit, publish and archive company news and updates.</p><button className="ghost-btn" onClick={()=>setTab("Blog & news")}>Manage articles ↗</button></article><article><b>Real-time updates</b><p>Homepage and newsroom changes subscribe to Supabase realtime events.</p><span className="admin-status-live">● Live sync enabled</span></article></div></section></>}
  {tab==="Main website editor"&&<section className="cms-editor"><div className="cms-heading"><div><h2>Full website control</h2><p>Manage homepage sections visually or edit HTML, CSS and JavaScript directly.</p></div><div><button className="ghost-btn" onClick={()=>savePage(false)} disabled={pageSaving}>Save draft</button> <button className="primary-btn" onClick={()=>savePage(true)} disabled={pageSaving}>{pageSaving?"Saving…":"Publish live ↗"}</button></div></div>
  <div className="cms-grid"><div className="cms-fields"><h3>Visual content editor</h3><label>Hero heading<input value={draft.content?.hero_title||""} onChange={e=>setDraft(d=>({...d,content:{...d.content,hero_title:e.target.value}}))}/></label><label>Hero description<textarea rows="3" value={draft.content?.hero_subtitle||""} onChange={e=>setDraft(d=>({...d,content:{...d.content,hero_subtitle:e.target.value}}))}/></label><label>Announcement banner<input value={draft.content?.announcement||""} onChange={e=>setDraft(d=>({...d,content:{...d.content,announcement:e.target.value}}))}/></label><label>Footer copyright<input value={draft.content?.footer_text||""} onChange={e=>setDraft(d=>({...d,content:{...d.content,footer_text:e.target.value}}))}/></label><h3>SEO controls</h3><label>Meta title<input value={draft.seo?.title||""} onChange={e=>setDraft(d=>({...d,seo:{...d.seo,title:e.target.value}}))}/></label><label>Meta description<textarea rows="2" value={draft.seo?.description||""} onChange={e=>setDraft(d=>({...d,seo:{...d.seo,description:e.target.value}}))}/></label><h3>Popup promotion</h3><label className="cms-check"><input type="checkbox" checked={!!draft.content?.popup_enabled} onChange={e=>setDraft(d=>({...d,content:{...d.content,popup_enabled:e.target.checked}}))}/> Enable homepage popup</label><label>Popup heading<input value={draft.content?.popup_title||""} onChange={e=>setDraft(d=>({...d,content:{...d.content,popup_title:e.target.value}}))}/></label><label>Popup message<textarea rows="2" value={draft.content?.popup_body||""} onChange={e=>setDraft(d=>({...d,content:{...d.content,popup_body:e.target.value}}))}/></label></div>
  <div className="cms-visual"><h3>Drag and drop page structure</h3><p>Drag sections to change their order. Toggle visibility for the homepage.</p>{sectionOrder.map(key=><div className="cms-section-row" key={key} draggable onDragStart={()=>setDragSection(key)} onDragOver={e=>e.preventDefault()} onDrop={()=>moveSection(key)} onDragEnd={()=>setDragSection("")}><span>⠿</span><b>{key.charAt(0).toUpperCase()+key.slice(1)}</b><small>{draft.content?.hidden_sections?.includes(key)?"Hidden":"Visible"}</small><button onClick={()=>setDraft(d=>({...d,content:{...d.content,hidden_sections:(d.content?.hidden_sections||[]).includes(key)?d.content.hidden_sections.filter(x=>x!==key):[...(d.content?.hidden_sections||[]),key]}}))}>{(draft.content?.hidden_sections||[]).includes(key)?"Show":"Hide"}</button></div>)}
  <h3>Global HTML</h3><textarea className="cms-code" spellCheck="false" value={draft.custom_html||""} onChange={e=>setDraft(d=>({...d,custom_html:e.target.value}))} placeholder="<!-- Add custom HTML snippets -->"/>
  <h3>Global CSS</h3><textarea className="cms-code" spellCheck="false" value={draft.custom_css||""} onChange={e=>setDraft(d=>({...d,custom_css:e.target.value}))} placeholder="/* Custom CSS */"/>
  <h3>Global JavaScript</h3><textarea className="cms-code" spellCheck="false" value={draft.custom_js||""} onChange={e=>setDraft(d=>({...d,custom_js:e.target.value}))} placeholder="// Custom JavaScript"/>
  </div></div></section>}
  {tab==="Blog & news"&&<section className="cms-editor"><div className="cms-heading"><div><h2>DuKu newsroom</h2><p>Publish company news, product updates, engineering stories and announcements.</p></div><button className="primary-btn" onClick={newPost}>＋ New article</button></div><div className="blog-admin-layout"><div className="blog-admin-list">{posts.map(p=><article key={p.id} className="blog-admin-item"><div><b>{p.title}</b><small>{p.category} · {p.status} · {new Date(p.created_at).toLocaleDateString()}</small></div><button className="ghost-btn" onClick={()=>editPost(p)}>Edit</button><button className="ghost-btn" onClick={()=>deletePost(p)}>Delete</button></article>)}</div><div className="blog-admin-form"><h3>{post?"Edit article":"Create article"}</h3><label>Title<input value={blogTitle} onChange={e=>{setBlogTitle(e.target.value);if(!post)setBlogSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));}}/></label><label>URL slug<input value={blogSlug} onChange={e=>setBlogSlug(e.target.value)}/></label><label>Category<input value={blogCategory} onChange={e=>setBlogCategory(e.target.value)}/></label><label>Cover image URL<input value={blogImage} onChange={e=>setBlogImage(e.target.value)} placeholder="https://…"/></label><label>Short summary<textarea rows="2" value={blogExcerpt} onChange={e=>setBlogExcerpt(e.target.value)}/></label><label>Article body<textarea rows="12" value={blogBody} onChange={e=>setBlogBody(e.target.value)} placeholder="Write your news article…"/></label><label>Status<select value={blogStatus} onChange={e=>setBlogStatus(e.target.value)}><option value="draft">Draft</option><option value="published">Published now</option><option value="archived">Archived</option></select></label><button className="primary-btn" disabled={postSaving} onClick={savePost}>{postSaving?"Saving…":"Save article"}</button></div></div></section>}
  {tab==="Members"&&<section><h2>Member management</h2><p>Member records are protected by Supabase row-level security. Role changes should be made only through a privileged audited action.</p></section>}
  {tab==="Websites"&&<section><h2>Website operations</h2><p>Manage sites and publishing status from the platform database.</p></section>}
  {tab==="Platform settings"&&<section><h2>Platform settings</h2><p>Use the homepage editor for SEO, banners, popups, custom HTML, CSS and JavaScript. Sensitive API credentials remain server-side.</p></section>}
  {tab==="Audit log"&&<section><h2>Audit log</h2><p>Administrative changes are recorded in the platform audit log when performed by audited actions.</p></section>}
  </main></div></div>;
}

function TenantSite() {
  const tenant = window.location.hostname.split(".")[0];
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageSlug = window.location.pathname.split("/").filter(Boolean)[0] || "";
  const [formValues, setFormValues] = useState({});
  const [formStatus, setFormStatus] = useState({});

  const submitPublishedForm = async (event, block) => {
    event.preventDefault();
    const values = formValues[block.id] || {};
    setFormStatus(current => ({ ...current, [block.id]: "Sending…" }));
    const { error } = await supabase.rpc("submit_site_form", {
      p_subdomain: tenant,
      p_form_title: block.title || "Website form",
      p_sender_name: values.name || "",
      p_sender_email: values.email || "",
      p_message: values.message || ""
    });
    setFormStatus(current => ({ ...current, [block.id]: error ? (error.message || "Could not send. Please try again.") : "Thanks! Your message has been sent." }));
    if (!error) setFormValues(current => ({ ...current, [block.id]: { name: "", email: "", message: "" } }));
  };
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) { setLoading(false); return () => { active = false; }; }
    supabase.rpc("get_published_site", { p_subdomain: tenant }).then(({ data, error }) => {
      if (!active) return;
      if (!error && data) setSite(data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [tenant]);
  const pages = site && Array.isArray(site.pages) ? site.pages : [];
  const currentPage = pages.find(page => page.slug === pageSlug) || pages.find(page => page.is_homepage) || pages[0];
  const content = currentPage && currentPage.content ? currentPage.content : {};
  const blocks = Array.isArray(content.sections) ? content.sections : [];
  useEffect(() => {
    if (!site || !currentPage || !isSupabaseConfigured) return;
    let referrerHost = null;
    try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch (error) { referrerHost = null; }
    supabase.rpc("track_site_page_view", { p_subdomain: tenant, p_page_slug: currentPage.slug || "", p_referrer_host: referrerHost });
  }, [site, currentPage, tenant]);
  useEffect(() => {
    if (!site || !currentPage) return;
    document.title = (currentPage.seo && currentPage.seo.title) || (site.seo_settings && site.seo_settings.title) || site.name;
    const description = (currentPage.seo && currentPage.seo.description) || (site.seo_settings && site.seo_settings.description) || "";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
  }, [site, currentPage]);
  if (loading) return <div className="tenant-site"><div className="tenant-loading">Loading published website…</div></div>;
  if (!site || !currentPage) return <div className="tenant-site"><div className="tenant-nav"><b>✦ {tenant}</b><a href="https://dukubusiness.online">DuKu FCA</a></div><div className="tenant-hero"><div className="eyebrow">DUKU FCA WEBSITE</div><h1>This website is <em>not available.</em></h1><p>It may not have been published yet, or the address may be incorrect.</p><a href="https://dukubusiness.online">Create your own website ↗</a></div><footer>Built with DuKu FCA · Free Website Builder</footer></div>;
  const appearance=site.site_settings||{};
  const tenantStyle={"--tenant-accent":appearance.brandColor||"#7c5ce0","--tenant-surface":appearance.surfaceColor||"#ffffff",fontFamily:appearance.siteFont||"Inter,Arial,sans-serif","--tenant-heading-size":(appearance.headingSize||48)+"px","--tenant-body-size":(appearance.bodySize||16)+"px","--tenant-line-height":appearance.textLineHeight||1.65};
  return <div className={"tenant-site tenant-published tenant-header-"+(appearance.headerStyle||"standard")+" tenant-button-"+(appearance.buttonStyle||"rounded")} style={tenantStyle}>
    <div className="tenant-nav"><b>{appearance.logoText||site.name}</b><nav>{pages.map(page => <a key={page.id} href={page.is_homepage ? "/" : "/" + page.slug}>{page.title}</a>)}{(()=>{const rows=String(appearance.customNavText||"").split("\n").map(line=>{const parts=line.replace(/^\s*-\s*/,"").split("|");const rawHref=(parts.slice(1).join("|")||"").trim();return {child:/^\s*-/.test(line),label:(parts[0]||"").trim(),href:rawHref==="#"?"#":safeTenantLink(rawHref)};}).filter(row=>row.label&&row.href);const output=[];for(let i=0;i<rows.length;i++){const row=rows[i];if(!row.child&&rows[i+1]?.child){const children=[];while(rows[i+1]?.child){children.push(rows[++i]);}output.push(<details className="tenant-nav-dropdown" key={"menu-"+i}><summary>{row.label}</summary><div className="tenant-nav-dropdown-menu">{children.map((child,j)=><a key={j} href={child.href} target={/^https:\/\//i.test(child.href)?"_blank":undefined} rel={/^https:\/\//i.test(child.href)?"noopener noreferrer":undefined}>{child.label}</a>)}</div></details>);}else if(!row.child){output.push(<a key={"custom-"+i} href={row.href} target={/^https:\/\//i.test(row.href)?"_blank":undefined} rel={/^https:\/\//i.test(row.href)?"noopener noreferrer":undefined}>{row.label}</a>);}}return output;})()}</nav></div>
    <main className="tenant-published-main">
      <section className="tenant-published-hero"><div className="eyebrow">POWERED BY DUKU FCA</div><h1>{content.headline || site.name}</h1><p>{content.subline || ""}</p></section>
      {blocks.map((block,index) => {
        const type = String(block.type || "Text").toLowerCase();
        const asset = type === "image" ? (site.assets || []).find(item => item.id === block.assetId) : null;
        const link = safeTenantLink(block.linkUrl);
        const embed = type === "embed code" ? safeEmbedUrl(block.content) : "";
        const values = formValues[block.id] || { name: "", email: "", message: "" };
        return <section className={"tenant-content-block tenant-block-" + type.replace(/[^a-z]/g,"")} key={block.id || index} style={{maxWidth:block.widthMode==="standard"?"760px":block.widthMode==="wide"?"1100px":"none",width:block.widthMode==="full"?"100%":"calc(100% - 48px)",margin:block.widthMode==="full"?"20px 0":"20px auto",background:block.gradientStyle&&block.gradientStyle!=="none"?({sunset:"linear-gradient(135deg,#ff9966,#ff5e62)",ocean:"linear-gradient(135deg,#2193b0,#6dd5ed)",violet:"linear-gradient(135deg,#654ea3,#eaafc8)",forest:"linear-gradient(135deg,#134e5e,#71b280)",midnight:"linear-gradient(135deg,#232526,#414345)"}[block.gradientStyle]):(block.backgroundColor||undefined),textAlign:block.textAlign||"left",padding:(block.padding||24)+"px",border:block.borderWidth?`${block.borderWidth}px solid ${block.borderColor||"#777777"}`:undefined,borderRadius:(block.borderRadius||0)+"px",boxShadow:({none:"none",soft:"0 8px 24px #00000022",medium:"0 14px 36px #00000038",strong:"0 22px 55px #00000055"}[block.shadowStyle||"none"])}}>
          <div className="eyebrow">{String(index+1).padStart(2,"0")} · {(block.type || "CONTENT").toUpperCase()}</div>
          {type !== "button" && <h2>{block.title}</h2>}
          {type === "image" ? (asset && asset.public_url ? <img className="tenant-published-image" src={asset.public_url} alt={asset.alt_text || block.title || asset.file_name || "Website image"} loading="lazy" /> : <div className="tenant-image-placeholder">This image is not available yet.</div>) :
          type === "button" ? <div className="tenant-button-wrap">{link ? <a className="tenant-action-button" href={link} target={/^https:\/\//i.test(link) ? "_blank" : undefined} rel={/^https:\/\//i.test(link) ? "noopener noreferrer" : undefined}>{block.content || "Learn more"} ↗</a> : <span className="tenant-disabled-button">{block.content || "Button link not configured"}</span>}</div> :
          type === "form" ? <form className="tenant-contact-form" onSubmit={event => submitPublishedForm(event, block)}>
            <label>Your name<input required maxLength="120" value={values.name} onChange={event => setFormValues(current => ({ ...current, [block.id]: { ...values, name: event.target.value } }))} /></label>
            <label>Email address<input required type="email" maxLength="254" value={values.email} onChange={event => setFormValues(current => ({ ...current, [block.id]: { ...values, email: event.target.value } }))} /></label>
            <label>Message<textarea required maxLength="5000" rows="4" value={values.message} onChange={event => setFormValues(current => ({ ...current, [block.id]: { ...values, message: event.target.value } }))} /></label>
            <button type="submit" disabled={String(formStatus[block.id] || "").startsWith("Sending")}>Send message ↗</button>
            {formStatus[block.id] && <p className="tenant-form-status" role="status">{formStatus[block.id]}</p>}
          </form> :
          type === "embed code" ? (embed ? <div className="tenant-embed-frame"><iframe src={embed} title={block.title || "Embedded video"} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className="tenant-image-placeholder">Add a valid YouTube or Vimeo URL in the editor to display this embed.</div>) :
          type === "gallery" ? <div className="tenant-gallery-grid">{(block.items||[]).map((item,i)=>{const image=(site.assets||[]).find(asset=>asset.id===item.assetId);return image?.public_url?<figure key={i}><img src={image.public_url} alt={item.caption||image.alt_text||"Gallery image"} loading="lazy"/>{item.caption&&<figcaption>{item.caption}</figcaption>}</figure>:null;})}</div> :
          type === "testimonials" ? <div className="tenant-testimonial-grid">{(block.items||[]).map((item,i)=><article key={i}><div className="tenant-stars">★★★★★</div><blockquote>{item.quote}</blockquote><b>{item.name}</b><small>{item.role}</small></article>)}</div> :
          type === "pricing" ? <div className="tenant-pricing-grid">{(block.items||[]).map((item,i)=><article className={item.featured?"featured":""} key={i}><h3>{item.name}</h3><strong>{item.price}<small>{item.period}</small></strong><ul>{String(item.features||"").split("\\n").filter(Boolean).map((feature,j)=><li key={j}>{feature}</li>)}</ul></article>)}</div> :
          type === "faq" ? <div className="tenant-faq-list">{(block.items||[]).map((item,i)=><details key={i}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div> :
          type === "stats" ? <div className="tenant-stats-grid">{(block.items||[]).map((item,i)=><article key={i}><strong>{item.value}</strong><span>{item.label}</span></article>)}</div> :
          type === "team" ? <div className="tenant-team-grid">{(block.items||[]).map((item,i)=><article key={i}><div className="tenant-team-avatar">{String(item.name||"T").trim().charAt(0).toUpperCase()}</div><h3>{item.name}</h3><b>{item.role}</b><p>{item.bio}</p></article>)}</div> :
          type === "logo strip" ? <div className="tenant-logo-strip">{(block.items||[]).map((item,i)=><span key={i}>{item.name}</span>)}</div> :
          type === "columns" ? <div className={"tenant-columns-grid tenant-columns-"+Math.min(4,Math.max(1,(block.items||[]).length))}>{(block.items||[]).map((item,i)=><article key={i}><h3>{item.title}</h3><p>{item.content}</p>{item.linkLabel&&safeTenantLink(item.linkUrl)&&<a href={safeTenantLink(item.linkUrl)}>{item.linkLabel} ↗</a>}</article>)}</div> :
          type === "container" ? <div className={"tenant-nested-container tenant-nested-"+(block.containerStyle||"card")} style={{gap:(Number(block.containerGap)||14)+"px",borderRadius:(Number(block.containerRadius)||18)+"px",borderWidth:(Number(block.containerBorderWidth)||1)+"px"}}>{(block.children||[]).map(child=><div className={"tenant-nested-child tenant-nested-child-"+child.type} key={child.id}>{child.type==="heading"?<h3>{child.title}</h3>:child.type==="button"?(safeTenantLink(child.linkUrl)?<a className="tenant-action-button" href={safeTenantLink(child.linkUrl)}>{child.content||"Learn more"} ↗</a>:<span>{child.content}</span>):child.type==="image"?(()=>{const media=(site.assets||[]).find(item=>item.id===child.assetId);return media&&media.public_url?<img className="tenant-nested-image" src={media.public_url} alt={child.alt||media.file_name||"Section image"} loading="lazy"/>:<div className="tenant-image-placeholder">Image unavailable</div>;})():child.type==="gallery"?<div className="tenant-nested-gallery">{(child.assetIds||[]).map(id=>{const media=(site.assets||[]).find(item=>item.id===id);return media&&media.public_url?<img key={id} src={media.public_url} alt={media.file_name||"Gallery image"} loading="lazy"/>:null;})}</div>:child.type==="columns"?<div className="tenant-nested-columns">{(child.columns||[]).map((col,i)=><article key={i}><h4>{col.title}</h4><p>{col.content}</p></article>)}</div>:<p>{child.content}</p>}</div>)}</div> :
          type === "callout" ? <div className="tenant-callout"><p>{block.content}</p>{link&&<a className="tenant-action-button" href={link}>{block.linkLabel||"Get started"} ↗</a>}</div> :
          <p>{block.content}</p>}
        </section>;
      })}
    </main>
    <footer className={"tenant-footer-"+(appearance.footerLayout||"standard")}><div className="tenant-footer-copy">{appearance.footerText||("© "+new Date().getFullYear()+" "+site.name+". All rights reserved.")}</div><div className="tenant-social-links">{String(appearance.socialLinksText||"").split("\n").map((line,index)=>{const parts=line.split("|");const label=(parts[0]||"").trim();const href=safeTenantLink((parts.slice(1).join("|")||"").trim());return label&&href&&/^https:\/\//i.test(href)?<a key={"social-"+index} href={href} target="_blank" rel="noopener noreferrer">{label}</a>:null;})}</div><span>Built with <a href="https://dukubusiness.online">DuKu FCA</a></span></footer>
  </div>;
}

function readLocalDraft() {
  try { return JSON.parse(window.localStorage.getItem("duku-fca-editor-draft") || "null") || {}; } catch (error) { return {}; }
}

function MainApp() {
  const [active, setActive] = useState("Overview");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("Create your free account");
  const [showEditor, setShowEditor] = useState(false);
  const [siteName, setSiteName] = useState(() => readLocalDraft().siteName || "My first website");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [mobileNav, setMobileNav] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [siteSubdomain, setSiteSubdomain] = useState(() => readLocalDraft().siteSubdomain || "");
  const [brandColor,setBrandColor]=useState(()=>readLocalDraft().brandColor||"#7c5ce0");
  const [surfaceColor,setSurfaceColor]=useState(()=>readLocalDraft().surfaceColor||"#ffffff");
  const [siteFont,setSiteFont]=useState(()=>readLocalDraft().siteFont||"Inter");
  const [headerStyle,setHeaderStyle]=useState(()=>readLocalDraft().headerStyle||"standard");
  const [logoText,setLogoText]=useState(()=>readLocalDraft().logoText||"");
  const [footerText,setFooterText]=useState(()=>readLocalDraft().footerText||"");
  const [customNavText,setCustomNavText]=useState(()=>readLocalDraft().customNavText||"");
  const [socialLinksText,setSocialLinksText]=useState(()=>readLocalDraft().socialLinksText||"");
  const [footerLayout,setFooterLayout]=useState(()=>readLocalDraft().footerLayout||"standard");
  const [savedDesignPresets,setSavedDesignPresets]=useState(()=>readLocalDraft().savedDesignPresets||[]);
  const [designPresetName,setDesignPresetName]=useState("");
  const [designPresetNotice,setDesignPresetNotice]=useState("");
  const [headingSize,setHeadingSize]=useState(()=>readLocalDraft().headingSize||48);
  const [bodySize,setBodySize]=useState(()=>readLocalDraft().bodySize||16);
  const [textLineHeight,setTextLineHeight]=useState(()=>readLocalDraft().textLineHeight||1.65);
  const [buttonStyle,setButtonStyle]=useState(()=>readLocalDraft().buttonStyle||"rounded");


  const [headline, setHeadline] = useState(() => readLocalDraft().headline || "Make your next idea unforgettable.");
  const [subline, setSubline] = useState(() => readLocalDraft().subline || "A beautiful online home for everything you do.");
  const [blocks, setBlocks] = useState(() => readLocalDraft().blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [reusableSections, setReusableSections] = useState(() => readLocalDraft().reusableSections || []);
  const [sectionNotice, setSectionNotice] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [seoTitle, setSeoTitle] = useState(() => readLocalDraft().seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(() => readLocalDraft().seoDescription || "");
  const [siteSlug, setSiteSlug] = useState(() => readLocalDraft().siteSlug || "my-website");
  const [pages, setPages] = useState(() => {
    const saved = readLocalDraft();
    return saved.pages && saved.pages.length ? saved.pages : [{ id: "home", name: "Home", slug: "home", headline: saved.headline || "Make your next idea unforgettable.", subline: saved.subline || "A beautiful online home for everything you do.", blocks: saved.blocks || [], seoTitle: saved.seoTitle || "", seoDescription: saved.seoDescription || "" }];
  });
  const [activePageId, setActivePageId] = useState(() => readLocalDraft().activePageId || "home");
  const [mediaAssets, setMediaAssets] = useState(() => readLocalDraft().mediaAssets || []);
  const [mediaNotice, setMediaNotice] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authCompany, setAuthCompany] = useState("");
  const [authJobTitle, setAuthJobTitle] = useState("");
  const [authCountry, setAuthCountry] = useState("India");
  const [authAccountType, setAuthAccountType] = useState("individual");
  const [authWebsite, setAuthWebsite] = useState("");
  const [profileForm, setProfileForm] = useState({display_name:"",phone:"",company_name:"",job_title:"",country:"India",account_type:"individual",website_url:"",onboarding_completed:false});
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [aiOpen,setAiOpen]=useState(false),[aiInput,setAiInput]=useState(""),[aiBusy,setAiBusy]=useState(false);
  const [aiMessages,setAiMessages]=useState([{role:"model",text:"Hi, I’m DuKu AI. Share the exact website-builder error and I’ll help you troubleshoot it."}]);
  const [careerForm,setCareerForm]=useState({full_name:"",email:"",phone:"",role:"Frontend Engineer",experience:"Entry level",location:"",portfolio_url:"",resume_url:"",cover_note:""});
  const [careerBusy,setCareerBusy]=useState(false),[careerNotice,setCareerNotice]=useState("");
  const [platformContent,setPlatformContent]=useState({announcement:"DuKu Business is an official subsidiary of Upreti Industries Limited (UIL).",banner_enabled:true,hero_title:"Build a website that works as hard as you do.",hero_subtitle:"A professional website builder for ambitious people and growing businesses.",header_brand:"DuKu FCA",footer_text:"© DuKu Business. All rights reserved.",popup_enabled:false,custom_html:"",custom_css:"",custom_js:"",seo_title:"DuKu FCA — Professional Website Builder",seo_description:"Create, customise and publish professional websites with DuKu FCA."});
  const [codeLanguage,setCodeLanguage]=useState("html"),[codeProjectName,setCodeProjectName]=useState("My code website"),[codeProjectId,setCodeProjectId]=useState(null),[codeProjects,setCodeProjects]=useState([]),[codeNotice,setCodeNotice]=useState("");
  const [codeFiles,setCodeFiles]=useState({"index.html":"<!doctype html>\\n<html><head><meta charset='utf-8'><title>My website</title></head><body><h1>Hello from DuKu Code Studio</h1></body></html>","styles.css":"body{font-family:Arial,sans-serif;margin:0;padding:48px;color:#203040}h1{color:#17364b}","script.js":"console.log('Built with DuKu FCA');"});
  const [androidFramework,setAndroidFramework]=useState("expo"),[androidName,setAndroidName]=useState("My Android App"),[androidPackage,setAndroidPackage]=useState("com.dukubusiness.myapp"),[androidSource,setAndroidSource]=useState("import { Text, View } from 'react-native';\\nexport default function App(){ return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Hello from DuKu App Studio</Text></View>; }"),[androidProjects,setAndroidProjects]=useState([]),[androidNotice,setAndroidNotice]=useState("");
  const [blogArticles,setBlogArticles]=useState([]);
  const [popupDismissed,setPopupDismissed]=useState(false);


  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [cloudSiteId, setCloudSiteId] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudNotice, setCloudNotice] = useState("");
  const [cloudSites, setCloudSites] = useState([]);
  const [cloudSitesLoading, setCloudSitesLoading] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState([]);
  const [formInboxLoading, setFormInboxLoading] = useState(false);
  const [formInboxError, setFormInboxError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("30");
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [analyticsSites, setAnalyticsSites] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [marketplaceAccount,setMarketplaceAccount]=useState(null);
  const [marketplaceOrders,setMarketplaceOrders]=useState([]);
  const [marketplaceLedger,setMarketplaceLedger]=useState([]);
  const [marketplacePayouts,setMarketplacePayouts]=useState([]);
  const [marketplaceLoading,setMarketplaceLoading]=useState(false);
  const [marketplaceError,setMarketplaceError]=useState("");
  const [domainRows, setDomainRows] = useState([]);
  const [domainSites, setDomainSites] = useState([]);
  const [domainInput, setDomainInput] = useState("");
  const [domainSiteId, setDomainSiteId] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [domainNotice, setDomainNotice] = useState("");
  const [domainVerifying, setDomainVerifying] = useState("");

  useEffect(()=>{let active=true;supabase.from("platform_pages").select("*").eq("page_key","homepage").eq("is_published",true).maybeSingle().then(({data})=>{if(active&&data?.content)setPlatformContent(v=>({...v,...data.content,custom_html:data.custom_html||"",custom_css:data.custom_css||"",custom_js:data.custom_js||"",seo_title:data.seo?.title||v.seo_title,seo_description:data.seo?.description||v.seo_description}));});const ch=supabase.channel("public-homepage-live").on("postgres_changes",{event:"*",schema:"public",table:"platform_pages",filter:"page_key=eq.homepage"},payload=>{if(payload.new?.is_published)setPlatformContent(v=>({...v,...payload.new.content,custom_html:payload.new.custom_html||"",custom_css:payload.new.custom_css||"",custom_js:payload.new.custom_js||"",seo_title:payload.new.seo?.title||v.seo_title,seo_description:payload.new.seo?.description||v.seo_description}));}).subscribe();return()=>{active=false;supabase.removeChannel(ch);};},[]);

  useEffect(()=>{document.title=platformContent.seo_title||"DuKu FCA";let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement("meta");meta.name="description";document.head.appendChild(meta);}meta.content=platformContent.seo_description||"";const oldStyle=document.getElementById("duku-platform-custom-css");if(oldStyle)oldStyle.remove();if(platformContent.custom_css){const el=document.createElement("style");el.id="duku-platform-custom-css";el.textContent=platformContent.custom_css;document.head.appendChild(el);}const oldScript=document.getElementById("duku-platform-custom-js");if(oldScript)oldScript.remove();if(platformContent.custom_js){const script=document.createElement("script");script.id="duku-platform-custom-js";script.text=platformContent.custom_js;document.body.appendChild(script);}return()=>{const el=document.getElementById("duku-platform-custom-css");if(el)el.remove();const js=document.getElementById("duku-platform-custom-js");if(js)js.remove();};},[platformContent.seo_title,platformContent.seo_description,platformContent.custom_css,platformContent.custom_js]);
  useEffect(()=>{if(!authUser||!workspace)return;supabase.from("code_projects").select("*").eq("workspace_id",workspace.id).order("updated_at",{ascending:false}).then(({data})=>setCodeProjects(data||[]));supabase.from("android_projects").select("*").eq("workspace_id",workspace.id).order("updated_at",{ascending:false}).then(({data})=>setAndroidProjects(data||[]));},[authUser,workspace]);
  useEffect(()=>{if(active!=="Blog & News")return;supabase.from("blog_posts").select("id,slug,title,excerpt,cover_image_url,category,author_name,published_at").eq("status","published").order("published_at",{ascending:false}).limit(20).then(({data})=>setBlogArticles(data||[]));},[active]);
  const saveCodeProject=async()=>{if(!authUser||!workspace){setCodeNotice("Sign in to save code projects to your cloud workspace.");return;}setCodeNotice("Saving project…");const row={workspace_id:workspace.id,name:codeProjectName,language:codeLanguage,framework:codeLanguage==="typescript"?"react":"vanilla",files:codeFiles,created_by:authUser.id,updated_at:new Date().toISOString()};const q=codeProjectId?supabase.from("code_projects").update(row).eq("id",codeProjectId):supabase.from("code_projects").insert(row);const {data,error}=await q.select().single();if(error){setCodeNotice(error.message);return;}setCodeProjectId(data.id);setCodeProjects(cur=>[data,...cur.filter(x=>x.id!==data.id)]);setCodeNotice("Code project saved to your workspace.");};
  const openCodeProject=(p)=>{setCodeProjectId(p.id);setCodeProjectName(p.name);setCodeLanguage(p.language);setCodeFiles(p.files||{});setCodeNotice("Project loaded.");};
  const saveAndroidProject=async()=>{if(!authUser||!workspace){setAndroidNotice("Sign in to save Android projects to your cloud workspace.");return;}const files=androidFramework==="flutter"?{"lib/main.dart":androidSource}:androidFramework==="kotlin"?{"app/src/main/java/MainActivity.kt":androidSource}:androidFramework==="java"?{"app/src/main/java/MainActivity.java":androidSource}:{"App.tsx":androidSource,"app.json":JSON.stringify({expo:{name:androidName,slug:androidName.toLowerCase().replace(/[^a-z0-9]+/g,"-"),android:{package:androidPackage}}},null,2)};const {data,error}=await supabase.from("android_projects").insert({workspace_id:workspace.id,name:androidName,package_name:androidPackage,framework:androidFramework,language:androidFramework==="flutter"?"dart":androidFramework==="kotlin"?"kotlin":androidFramework==="java"?"java":"typescript",files,app_config:{platform:"android",starter:"blank"},created_by:authUser.id}).select().single();if(error){setAndroidNotice(error.message);return;}setAndroidProjects(cur=>[data,...cur]);setAndroidNotice("Android project saved. Source workspace is ready; cloud APK/AAB builds require a configured Android build runner.");};
  const exportAndroidProject=(project)=>{const blob=new Blob([JSON.stringify({project:project.name,framework:project.framework,package:project.package_name,files:project.files},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(project.name||"android-project").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".json";a.click();URL.revokeObjectURL(url);};
  const loadDomains = async () => {
    if (!workspace) return;
    setDomainLoading(true); setDomainError("");
    try {
      const { data: sites, error: sitesError } = await supabase.from("sites").select("id,name,subdomain,status").eq("workspace_id", workspace.id);
      if (sitesError) throw sitesError;
      setDomainSites(sites || []);
      if (!sites?.length) { setDomainRows([]); return; }
      const { data, error } = await supabase.from("site_domains").select("*").in("site_id", sites.map(site=>site.id)).eq("domain_type","custom").order("created_at",{ascending:false});
      if (error) throw error;
      setDomainRows((data || []).map(row=>({...row,siteName:sites.find(site=>site.id===row.site_id)?.name || "Website"})));
      if (!domainSiteId && sites[0]) setDomainSiteId(sites[0].id);
    } catch (error) { setDomainError(error.message || "Could not load domains."); }
    finally { setDomainLoading(false); }
  };
  const addCustomDomain = async () => {
    setDomainError(""); setDomainNotice("");
    if (!domainSiteId) { setDomainError("Create or select a website first."); return; }
    let domain = domainInput.trim().toLowerCase();
    if (domain.startsWith("https://")) domain = domain.slice(8);
    else if (domain.startsWith("http://")) domain = domain.slice(7);
    if (domain.startsWith("www.")) domain = domain.slice(4);
    if (domain.endsWith("/")) domain = domain.slice(0,-1);
    const labels = domain.split(".");
    const validDomain = domain.length >= 4 && domain.length <= 253 && labels.length >= 2 && labels.every(label => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) && /^[a-z]{2,63}$/.test(labels[labels.length-1]);
    if (!validDomain) { setDomainError("Enter a valid domain name, such as example.com. Do not include a path."); return; }
    setDomainLoading(true);
    try {
      const token = "duku-fca=" + (window.crypto?.randomUUID ? window.crypto.randomUUID().replace(/-/g,"") : Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
      const { error } = await supabase.from("site_domains").insert({site_id:domainSiteId,domain,domain_type:"custom",verification_status:"pending",verification_token:token,dns_record_name:"_duku-verification."+domain});
      if (error) throw error;
      setDomainInput(""); setDomainNotice("Domain added. Publish the TXT record below, then verify ownership.");
      await loadDomains();
    } catch (error) { setDomainError(error.message || "Could not add this domain."); }
    finally { setDomainLoading(false); }
  };
  const verifyCustomDomain = async (row) => {
    setDomainVerifying(row.id); setDomainError(""); setDomainNotice("");
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-domain",{body:{domain_id:row.id}});
      if (error) throw error;
      if (data?.verified) setDomainNotice(row.domain+" ownership verified successfully.");
      else setDomainNotice(data?.message || "DNS record is not visible yet. Try again after propagation.");
      await loadDomains();
    } catch (error) { setDomainError(error.message || "Could not verify domain."); }
    finally { setDomainVerifying(""); }
  };

  const saveDesignPreset = () => {
    const name=designPresetName.trim();
    if(!name){setDesignPresetNotice("Give this design preset a name first.");return;}
    const preset={id:"preset-"+Date.now(),name,brandColor,surfaceColor,siteFont,headerStyle,footerLayout,headingSize,bodySize,textLineHeight,buttonStyle};
    setSavedDesignPresets(current=>[preset,...current.filter(item=>item.name.toLowerCase()!==name.toLowerCase())].slice(0,20));
    setDesignPresetName("");setDesignPresetNotice("Preset saved. Save the website to sync it across devices.");
  };
  const applyDesignPreset = (preset) => {
    setBrandColor(preset.brandColor||"#7c5ce0");setSurfaceColor(preset.surfaceColor||"#ffffff");
    setSiteFont(preset.siteFont||"Inter");setHeaderStyle(preset.headerStyle||"standard");
    setFooterLayout(preset.footerLayout||"standard");setHeadingSize(preset.headingSize||48);setBodySize(preset.bodySize||16);setTextLineHeight(preset.textLineHeight||1.65);setButtonStyle(preset.buttonStyle||"rounded");setDesignPresetNotice("Applied “"+preset.name+"”. Save your website to sync the changes.");
  };
  const deleteDesignPreset = (id) => setSavedDesignPresets(current=>current.filter(item=>item.id!==id));
  const loadMarketplace = async () => {
    if (!workspace) return;
    setMarketplaceLoading(true); setMarketplaceError("");
    try {
      const [accountResult,ordersResult,ledgerResult,payoutResult] = await Promise.all([
        supabase.from("marketplace_accounts").select("*").eq("workspace_id",workspace.id).maybeSingle(),
        supabase.from("marketplace_orders").select("id,site_id,provider_order_id,buyer_email,currency,gross_amount_paise,commission_amount_paise,gateway_fee_paise,refund_amount_paise,seller_net_amount_paise,status,created_at").eq("workspace_id",workspace.id).order("created_at",{ascending:false}).limit(100),
        supabase.from("marketplace_ledger").select("id,entry_type,amount_paise,currency,description,created_at").eq("workspace_id",workspace.id).order("created_at",{ascending:false}).limit(100),
        supabase.from("marketplace_payout_requests").select("id,amount_paise,status,requested_at,processed_at,failure_reason").eq("workspace_id",workspace.id).order("requested_at",{ascending:false}).limit(50)
      ]);
      for (const result of [accountResult,ordersResult,ledgerResult,payoutResult]) if(result.error) throw result.error;
      setMarketplaceAccount(accountResult.data||null); setMarketplaceOrders(ordersResult.data||[]); setMarketplaceLedger(ledgerResult.data||[]); setMarketplacePayouts(payoutResult.data||[]);
    } catch(error) { setMarketplaceError(error.message||"Could not load payment earnings."); }
    finally { setMarketplaceLoading(false); }
  };
  const exportMarketplaceReport = () => {
    const rows = [
      ["Record type","Reference","Date","Status","Currency","Gross amount","DuKu commission","Gateway fee","Refund amount","Seller net / amount","Description"],
      ...marketplaceOrders.map(order=>["Order",order.provider_order_id||order.id,order.created_at,order.status,order.currency||"INR",Number(order.gross_amount_paise||0)/100,Number(order.commission_amount_paise||0)/100,Number(order.gateway_fee_paise||0)/100,Number(order.refund_amount_paise||0)/100,Number(order.seller_net_amount_paise||0)/100,""]),
      ...marketplaceLedger.map(entry=>["Ledger",entry.id,entry.created_at,entry.entry_type,entry.currency||"INR","","","","",Number(entry.amount_paise||0)/100,entry.description||""]),
      ...marketplacePayouts.map(payout=>["Payout",payout.id,payout.requested_at,payout.status,"INR","","","","",Number(payout.amount_paise||0)/100,payout.failure_reason||""])
    ];
    const csv = rows.map(row=>row.map(value=>{const cell=String(value??"");return /[",\n]/.test(cell)?'"'+cell.replace(/"/g,'""')+'"':cell;}).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "duku-marketplace-financial-report-"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const loadAnalytics = async (range = analyticsRange) => {
    if (!workspace) return;
    setAnalyticsLoading(true); setAnalyticsError("");
    try {
      const { data: ownedSites, error: sitesError } = await supabase.from("sites").select("id,name,subdomain,status").eq("workspace_id", workspace.id);
      if (sitesError) throw sitesError;
      const ids = (ownedSites || []).map(site => site.id);
      setAnalyticsSites(ownedSites || []);
      if (!ids.length) { setAnalyticsEvents([]); return; }
      const since = new Date(Date.now() - Number(range) * 86400000).toISOString();
      const { data, error } = await supabase.from("site_analytics_events").select("id,site_id,page_slug,referrer_host,created_at").in("site_id", ids).gte("created_at", since).order("created_at", { ascending: false }).limit(10000);
      if (error) throw error;
      setAnalyticsEvents(data || []);
    } catch (error) { setAnalyticsError(error.message || "Could not load analytics."); }
    finally { setAnalyticsLoading(false); }
  };


  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setAuthUser(data.session ? data.session.user : null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setAuthUser(session ? session.user : null); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!authUser || !isSupabaseConfigured) { setShowProfileSetup(false); return; }
    let active = true;
    supabase.from("profiles").select("display_name,phone,company_name,job_title,country,account_type,website_url,onboarding_completed").eq("id",authUser.id).maybeSingle().then(({data}) => {
      if (!active) return;
      const profile = data || {};
      const next = {display_name:profile.display_name || authUser.user_metadata?.display_name || "",phone:profile.phone || authUser.user_metadata?.phone || "",company_name:profile.company_name || authUser.user_metadata?.company_name || "",job_title:profile.job_title || authUser.user_metadata?.job_title || "",country:profile.country || authUser.user_metadata?.country || "India",account_type:profile.account_type || authUser.user_metadata?.account_type || "individual",website_url:profile.website_url || authUser.user_metadata?.website_url || "",onboarding_completed:!!profile.onboarding_completed};
      setProfileForm(next);
      setShowProfileSetup(!next.onboarding_completed);
    });
    return () => { active = false; };
  }, [authUser]);


  const sendDuKuAiMessage=async()=>{const message=aiInput.trim();if(!message||aiBusy)return;const next=[...aiMessages,{role:"user",text:message}];setAiMessages(next);setAiInput("");setAiBusy(true);try{const {data,error}=await supabase.functions.invoke("duku-ai-support",{body:{message,history:next.slice(-8)}});if(error)throw error;setAiMessages(current=>[...current,{role:"model",text:data?.answer||data?.error||"I could not prepare a reply."}]);}catch(error){setAiMessages(current=>[...current,{role:"model",text:error.message||"DuKu AI is not connected. Please email support@dukubusiness.online."}]);}finally{setAiBusy(false);}};
  const submitCareerApplication=async(event)=>{event.preventDefault();setCareerNotice("");if(careerForm.cover_note.trim().length<20){setCareerNotice("Please add a cover note of at least 20 characters.");return;}setCareerBusy(true);try{const {error}=await supabase.from("career_applications").insert({...careerForm,full_name:careerForm.full_name.trim(),email:careerForm.email.trim().toLowerCase(),status:"new"});if(error)throw error;setCareerNotice("Application received. Thank you for your interest in joining DuKu Business.");setCareerForm({full_name:"",email:"",phone:"",role:"Frontend Engineer",experience:"Entry level",location:"",portfolio_url:"",resume_url:"",cover_note:""});}catch(error){setCareerNotice(error.message||"We could not submit your application. Please try again.");}finally{setCareerBusy(false);}};
  const saveProfileSetup = async () => {
    if (!authUser) return;
    if (!profileForm.display_name.trim() || !profileForm.country) { setAuthNotice("Please add your name and country to continue."); return; }
    setProfileSaving(true); setAuthNotice("");
    try {
      const payload = {...profileForm,display_name:profileForm.display_name.trim(),onboarding_completed:true,updated_at:new Date().toISOString()};
      const {error}=await supabase.from("profiles").update(payload).eq("id",authUser.id);
      if(error) throw error;
      setProfileForm(payload); setShowProfileSetup(false); setAuthNotice("Your DuKu profile has been saved.");
    } catch(error) { setAuthNotice(error.message || "Could not save your profile."); }
    finally { setProfileSaving(false); }
  };

  useEffect(() => {
    if (!authUser || !isSupabaseConfigured) { setWorkspace(null); return; }
    let active = true;
    supabase.from("workspaces").select("*").eq("owner_id", authUser.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setCloudNotice("Account connected, but workspace could not load: " + error.message);
      else setWorkspace(data || null);
    });
    return () => { active = false; };
  }, [authUser]);
  useEffect(() => {
    if (!workspace || !authUser) { setCloudSites([]); return; }
    let active = true;
    setCloudSitesLoading(true);
    supabase.from("sites").select("id,name,slug,status,updated_at,created_at").eq("workspace_id", workspace.id).order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setCloudNotice("Could not load saved websites: " + error.message);
        else setCloudSites(data || []);
        setCloudSitesLoading(false);
      });
    return () => { active = false; };
  }, [workspace, authUser]);
  const loadFormInbox = async () => {
    if (!workspace) return;
    setFormInboxLoading(true); setFormInboxError("");
    try {
      const { data: ownedSites, error: sitesError } = await supabase.from("sites").select("id,name,subdomain").eq("workspace_id", workspace.id);
      if (sitesError) throw sitesError;
      const ids = (ownedSites || []).map(site => site.id);
      if (!ids.length) { setFormSubmissions([]); setFormInboxLoading(false); return; }
      const { data, error } = await supabase.from("form_submissions").select("*").in("site_id", ids).order("created_at", { ascending: false }).limit(250);
      if (error) throw error;
      const siteMap = Object.fromEntries((ownedSites || []).map(site => [site.id, site]));
      setFormSubmissions((data || []).map(item => ({ ...item, site: siteMap[item.site_id] || null })));
    } catch (error) { setFormInboxError(error.message || "Could not load form submissions."); }
    finally { setFormInboxLoading(false); }
  };
  const markSubmissionRead = async (submission) => {
    const { error } = await supabase.from("form_submissions").update({ is_read: !submission.is_read }).eq("id", submission.id);
    if (error) { setFormInboxError(error.message || "Could not update submission."); return; }
    setFormSubmissions(current => current.map(item => item.id === submission.id ? { ...item, is_read: !submission.is_read } : item));
    setSelectedSubmission(current => current && current.id === submission.id ? { ...current, is_read: !submission.is_read } : current);
  };
  const openCloudSite = async (site) => {
    setCloudNotice("");
    try {
      const [{ data: siteData, error: siteError }, { data: pageRows, error: pageError }, { data: assetRows, error: assetError }] = await Promise.all([
        supabase.from("sites").select("*").eq("id", site.id).single(),
        supabase.from("site_pages").select("*").eq("site_id", site.id).order("sort_order"),
        supabase.from("site_assets").select("*").eq("site_id", site.id)
      ]);
      if (siteError) throw siteError;
      if (pageError) throw pageError;
      if (assetError) throw assetError;
      const restoredPages = (pageRows || []).map((row,index) => ({
        id: row.id, name: row.title, slug: row.slug,
        headline: (row.content && row.content.headline) || "",
        subline: (row.content && row.content.subline) || "",
        blocks: (row.content && row.content.sections) || [],
        seoTitle: (row.seo && row.seo.title) || "",
        seoDescription: (row.seo && row.seo.description) || ""
      }));
      const restoredAssets = await Promise.all((assetRows || []).map(async row => {
        const { data, error } = await supabase.storage.from("duku-fca-media").createSignedUrl(row.storage_path, 3600);
        return { id: row.client_asset_key || row.id, name: row.file_name, type: row.mime_type || "image/*", size: row.file_size || 0, dataUrl: (data && data.signedUrl) || "", cloudUploaded: true, storagePath: row.storage_path, signedUrlError: error ? error.message : null };
      }));
      const first = restoredPages[0] || { id:"home", name:"Home", slug:"home", headline:"", subline:"", blocks:[], seoTitle:"", seoDescription:"" };
      setSiteName(siteData.name); setSiteSubdomain(siteData.subdomain || siteData.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); setBrandColor(siteData.site_settings?.brandColor||"#7c5ce0"); setSurfaceColor(siteData.site_settings?.surfaceColor||"#ffffff"); setSiteFont(siteData.site_settings?.siteFont||"Inter"); setHeaderStyle(siteData.site_settings?.headerStyle||"standard"); setLogoText(siteData.site_settings?.logoText||""); setFooterText(siteData.site_settings?.footerText||""); setCustomNavText(siteData.site_settings?.customNavText||""); setSocialLinksText(siteData.site_settings?.socialLinksText||""); setFooterLayout(siteData.site_settings?.footerLayout||"standard"); setSavedDesignPresets(siteData.site_settings?.savedDesignPresets||[]); setHeadingSize(siteData.site_settings?.headingSize||48); setBodySize(siteData.site_settings?.bodySize||16); setTextLineHeight(siteData.site_settings?.textLineHeight||1.65); setButtonStyle(siteData.site_settings?.buttonStyle||"rounded"); setHeadline(first.headline || siteData.site_settings?.headline || ""); setSubline(first.subline || siteData.site_settings?.subline || "");
      setBlocks(first.blocks || []); setSeoTitle(first.seoTitle || ""); setSeoDescription(first.seoDescription || ""); setSiteSlug(first.slug || siteData.slug || "home");
      setPages(restoredPages.length ? restoredPages : [first]); setActivePageId(first.id); setMediaAssets(restoredAssets); setCloudSiteId(siteData.id); setShowEditor(true);
    } catch (error) { setCloudNotice("Could not open this website: " + (error.message || "Please try again.")); }
  };
  const submitAuth = async () => {
    if (!isSupabaseConfigured) { setAuthNotice("Account services are not configured yet. Please try again shortly."); return; }
    if (!authEmail.trim() || !authPassword) { setAuthNotice("Enter your email and password to continue."); return; }
    if (authMode !== "Welcome back" && (!authFullName.trim() || !authPhone.trim())) { setAuthNotice("Please enter your full name and phone number."); return; }
    setAuthBusy(true); setAuthNotice("");
    try {
      if (authMode === "Welcome back") {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setShowAuth(false);
      } else {
        const metadata = {display_name:authFullName.trim(),phone:authPhone.trim(),company_name:authCompany.trim(),job_title:authJobTitle.trim(),country:authCountry,account_type:authAccountType,website_url:authWebsite.trim()};
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: metadata, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setProfileForm({...metadata,onboarding_completed:false});
        if (data.session) { setAuthUser(data.user); setShowAuth(false); setShowProfileSetup(true); setAuthNotice("Your account has been created. Complete your profile to get started."); }
        else setAuthNotice("Account created. Check your email to verify your address. You can complete your profile after signing in.");
      }
    } catch (error) { setAuthNotice(error.message || "Authentication failed. Please try again."); }
    finally { setAuthBusy(false); }
  };
  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setCloudNotice(error.message);
    else { setAuthUser(null); setWorkspace(null); setCloudSiteId(null); setCloudNotice("Signed out."); }
  };
  const saveCloudDraft = async () => {
    if (!authUser) { setAuthMode("Welcome back"); setShowAuth(true); return; }
    if (!workspace) { setCloudNotice("Your workspace is still loading. Please try again in a moment."); return; }
    setCloudBusy(true); setCloudNotice("");
    try {
      let siteId = cloudSiteId;
      if (!siteId) {
        const { data: found, error } = await supabase.from("sites").select("id").eq("workspace_id", workspace.id).eq("name", siteName).limit(1).maybeSingle();
        if (error) throw error;
        if (found) siteId = found.id;
      }
      const keepPublished = cloudSites.some(item => item.id === siteId && item.status === "published");
      const sitePayload = { workspace_id: workspace.id, name: siteName, slug: (siteSlug || "my-website").toLowerCase().replace(/[^a-z0-9-]/g,"-"), status: keepPublished ? "published" : "draft", site_settings: { headline, subline, template: "custom", brandColor, surfaceColor, siteFont, headerStyle, logoText, footerText, customNavText, socialLinksText, footerLayout, savedDesignPresets, headingSize, bodySize, textLineHeight, buttonStyle }, seo_settings: { title: seoTitle, description: seoDescription } };
      if (siteId) {
        const { error } = await supabase.from("sites").update(sitePayload).eq("id", siteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("sites").insert(sitePayload).select("id").single();
        if (error) throw error;
        siteId = data.id;
      }
      setCloudSiteId(siteId);
      const { data: existingPages, error: pageLoadError } = await supabase.from("site_pages").select("id,slug").eq("site_id", siteId);
      if (pageLoadError) throw pageLoadError;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const current = page.id === activePageId ? { ...page, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : page;
        const slug = (current.slug || current.name || "page").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"") || "page";
        const payload = { site_id: siteId, title: current.name, slug, is_homepage: index === 0, is_published: keepPublished, sort_order: index, content: { headline: current.headline || headline, subline: current.subline || subline, sections: current.blocks || [] }, seo: { title: current.seoTitle || "", description: current.seoDescription || "" } };
        const existing = existingPages.find(item => item.slug === slug);
        const result = existing ? await supabase.from("site_pages").update(payload).eq("id", existing.id) : await supabase.from("site_pages").insert(payload);
        if (result.error) throw result.error;
      }
      const desiredSlugs = pages.map(page => (page.id === activePageId ? siteSlug : page.slug || page.name || "page").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"") || "page");
      const stalePageIds = existingPages.filter(row => !desiredSlugs.includes(row.slug)).map(row => row.id);
      if (stalePageIds.length) {
        const { error } = await supabase.from("site_pages").delete().in("id", stalePageIds);
        if (error) throw error;
      }
      for (const asset of mediaAssets) {
        if (asset.cloudUploaded) continue;
        const blob = await fetch(asset.dataUrl).then(response => response.blob());
        const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g,"-");
        const path = workspace.id + "/" + siteId + "/" + asset.id + "-" + safeName;
        const { error: uploadError } = await supabase.storage.from("duku-fca-media").upload(path, blob, { upsert: true, contentType: asset.type });
        if (uploadError) throw uploadError;
        const { error: assetError } = await supabase.from("site_assets").insert({ site_id: siteId, storage_path: path, file_name: asset.name, mime_type: asset.type, file_size: asset.size, client_asset_key: asset.id });
        if (assetError) throw assetError;
        setMediaAssets(current => current.map(item => item.id === asset.id ? { ...item, cloudUploaded: true, storagePath: path } : item));
      }
      setCloudSites(current => [{ id: siteId, name: siteName, slug: sitePayload.slug, status: sitePayload.status, updated_at: new Date().toISOString() }, ...current.filter(item => item.id !== siteId)]);
      setCloudNotice("Saved to your DuKu FCA cloud workspace. Your website is still a draft and is not public.");
    } catch (error) { setCloudNotice("Cloud save failed: " + (error.message || "Please try again.")); }
    finally { setCloudBusy(false); }
  };
  const publishSite = async () => {
    if (!authUser) { setAuthMode("Welcome back"); setShowAuth(true); return; }
    if (!cloudSiteId) { setCloudNotice("Save this website to your cloud workspace first, then publish it."); return; }
    setCloudBusy(true); setCloudNotice("");
    try {
      const chosenSubdomain = (siteSubdomain || siteName).toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");
      const { data: assets, error: assetsError } = await supabase.from("site_assets").select("id,storage_path,file_name,mime_type,client_asset_key,public_url").eq("site_id", cloudSiteId);
      if (assetsError) throw assetsError;
      for (const asset of (assets || [])) {
        if (asset.public_url) continue;
        const { data: signed, error: signedError } = await supabase.storage.from("duku-fca-media").createSignedUrl(asset.storage_path, 300);
        if (signedError || !signed?.signedUrl) throw signedError || new Error("Could not access a saved media file.");
        const response = await fetch(signed.signedUrl);
        if (!response.ok) throw new Error("Could not download " + asset.file_name + " from your private media library.");
        const blob = await response.blob();
        const safeName = (asset.file_name || "image").replace(/[^a-zA-Z0-9._-]/g,"-");
        const publicPath = workspace.id + "/" + cloudSiteId + "/" + (asset.client_asset_key || asset.id) + "-" + safeName;
        const { error: uploadError } = await supabase.storage.from("duku-fca-public-media").upload(publicPath, blob, { upsert: true, contentType: asset.mime_type || blob.type || "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("duku-fca-public-media").getPublicUrl(publicPath);
        const { error: updateError } = await supabase.from("site_assets").update({ public_storage_path: publicPath, public_url: publicData.publicUrl }).eq("id", asset.id);
        if (updateError) throw updateError;
      }
      const { data, error } = await supabase.rpc("publish_site", { p_site_id: cloudSiteId, p_subdomain: chosenSubdomain });
      if (error) throw error;
      setPublished(true); setPublishedUrl(data.url);
      setCloudSites(current => current.map(item => item.id === cloudSiteId ? { ...item, status: "published", slug: data.subdomain } : item));
      setCloudNotice("Your website is live: " + data.url);
    } catch (error) { setCloudNotice("Publishing failed: " + (error.message || "Please try again.")); }
    finally { setCloudBusy(false); }
  };
  useEffect(() => {
    if (!showEditor) return;
    try { const updatedPages = pages.map(page => page.id === activePageId ? { ...page, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : page); setPages(updatedPages); window.localStorage.setItem("duku-fca-editor-draft", JSON.stringify({ siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, pages: updatedPages, activePageId, mediaAssets, siteSubdomain, brandColor, surfaceColor, siteFont, headerStyle, logoText, footerText, customNavText, socialLinksText, footerLayout, reusableSections, savedDesignPresets, headingSize, bodySize, textLineHeight, buttonStyle, updatedAt: new Date().toISOString() })); } catch (error) { /* Local storage may be unavailable in private browsing. */ }
  // pages is read to merge the current editor state; adding it here would create a state-update loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor, siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, activePageId, mediaAssets, siteSubdomain, brandColor, surfaceColor, siteFont, headerStyle, logoText, footerText, customNavText, socialLinksText, footerLayout, reusableSections, savedDesignPresets, headingSize, bodySize, textLineHeight, buttonStyle]);
  const filtered = useMemo(() => templates.filter(t => (filter === "All" || t.type === filter) && (t.name+" "+t.type).toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const switchPage = (page) => {
    const current = { headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug };
    setPages(list => list.map(item => item.id === activePageId ? { ...item, ...current } : item));
    setActivePageId(page.id);
    setHeadline(page.headline || "Make your next idea unforgettable.");
    setSubline(page.subline || "A beautiful online home for everything you do.");
    setBlocks(page.blocks || []);
    setSeoTitle(page.seoTitle || "");
    setSeoDescription(page.seoDescription || "");
    setSiteSlug(page.slug || page.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"));
  };
  const addPage = () => {
    const name = window.prompt("Enter the new page name (for example, About):");
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    const id = "page-" + Date.now();
    const newPage = { id, name: cleanName, slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g,"-"), headline: cleanName, subline: "Add a short introduction for this page.", blocks: [], seoTitle: "", seoDescription: "" };
    setPages(list => [...list.map(item => item.id === activePageId ? { ...item, headline, subline, blocks, seoTitle, seoDescription, slug: siteSlug } : item), newPage]);
    setActivePageId(id); setHeadline(newPage.headline); setSubline(newPage.subline); setBlocks([]); setSeoTitle(""); setSeoDescription(""); setSiteSlug(newPage.slug);
  };
  const deletePage = (page) => {
    if (pages.length <= 1) { window.alert("A website must have at least one page."); return; }
    if (!window.confirm("Delete the " + page.name + " page?")) return;
    const remaining = pages.filter(item => item.id !== page.id);
    setPages(remaining);
    if (page.id === activePageId) switchPage(remaining[0]);
  };
  const addBlock = (label) => {
    const type = label.slice(2).trim();
    const defaults = {
      Text: ["A story worth sharing", "Write something meaningful for your visitors."],
      Image: ["Your visual story", "Add an image from your media library."],
      Button: ["Take the next step", "Explore more"],
      Section: ["A new section", "Introduce another part of your website."],
      Form: ["Get in touch", "Collect messages from your visitors."],
      "Embed code": ["Embedded content", "Add a trusted embed or widget."],
      Gallery: ["A visual collection", ""],
      Testimonials: ["Kind words from our clients", ""],
      Pricing: ["Simple, transparent pricing", ""],
      FAQ: ["Frequently asked questions", ""],
      Stats: ["Results that speak", ""],
      Team: ["Meet the people behind it", ""],
      "Logo strip": ["Trusted by teams", ""],
      Callout: ["Ready to get started?", "Tell visitors what to do next."],
      Columns: ["A flexible content layout", "Arrange related content side by side."],
      Container: ["Nested content section", "A flexible container for grouped content."]
    };
    const [title, content] = defaults[type] || ["New element", "Add your content here."];
    const items = type === "Gallery" ? [{assetId:"",caption:"Gallery image 1"},{assetId:"",caption:"Gallery image 2"},{assetId:"",caption:"Gallery image 3"}] :
      type === "Testimonials" ? [{name:"Alex Morgan",role:"Customer",quote:"An excellent experience from start to finish."},{name:"Jamie Lee",role:"Founder",quote:"The team made everything feel simple."}] :
      type === "Pricing" ? [{name:"Starter",price:"₹499",period:"/ month",features:"Essential features\\nEmail support",featured:false},{name:"Growth",price:"₹999",period:"/ month",features:"Everything in Starter\\nPriority support",featured:true}] :
      type === "FAQ" ? [{question:"How do I get started?",answer:"Choose a plan and contact our team."},{question:"Can I change my plan?",answer:"Yes, you can upgrade or downgrade at any time."}] :
      type === "Stats" ? [{value:"10+",label:"Years of experience"},{value:"250+",label:"Happy clients"},{value:"98%",label:"Satisfaction"}] :
      type === "Team" ? [{name:"Alex Morgan",role:"Creative Director",bio:"Focused on thoughtful, useful experiences."},{name:"Jamie Lee",role:"Product Lead",bio:"Turning ideas into clear solutions."}] :
      type === "Logo strip" ? [{name:"Brand One"},{name:"Brand Two"},{name:"Brand Three"},{name:"Brand Four"}] :
      type === "Columns" ? [{title:"First column",content:"Add your content here."},{title:"Second column",content:"Add your content here."}] :
      type === "Container" ? [{id:"child-"+Date.now()+"-1",type:"heading",title:"A clear heading",content:""},{id:"child-"+Date.now()+"-2",type:"text",title:"",content:"Add supporting details inside this container."}] : undefined;
    setBlocks(current => current.concat([{ id: Date.now()+Math.random(), type, title, content, items, children: type === "Container" ? items : undefined, containerStyle: type === "Container" ? "card" : undefined, linkUrl: type === "Button" ? "https://example.com" : "" }]));
  };
  const updateBlock = (id, field, value) => setBlocks(current => current.map(block => block.id===id ? { ...block, [field]: value } : block));
  const updateNestedChild = (blockId, childId, field, value) => setBlocks(current => current.map(block => block.id===blockId ? {...block,children:(block.children||[]).map(child=>child.id===childId?{...child,[field]:value}:child)} : block));
  const addNestedChild = (blockId, type) => setBlocks(current => current.map(block => block.id===blockId ? {...block,children:[...(block.children||[]),{id:"child-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),type,title:type==="heading"?"New heading":"",content:type==="button"?"Learn more":"",linkUrl:"",assetId:"",assetIds:[],columns:type==="columns"?[{title:"Column one",content:""},{title:"Column two",content:""}]:undefined}]} : block));
  const removeNestedChild = (blockId, childId) => setBlocks(current => current.map(block => block.id===blockId ? {...block,children:(block.children||[]).filter(child=>child.id!==childId)} : block));
  const reorderNestedChild = (blockId, sourceId, targetId) => setBlocks(current => current.map(block => { if(block.id!==blockId)return block; const children=[...(block.children||[])]; const from=children.findIndex(child=>child.id===sourceId); const to=children.findIndex(child=>child.id===targetId); if(from<0||to<0||from===to)return block; const [moved]=children.splice(from,1); children.splice(to,0,moved); return {...block,children}; }));
  const saveReusableSection = (block) => {
    const name = window.prompt("Name this reusable section:", block.title || block.type + " section");
    if (!name || !name.trim()) return;
    const snapshot = JSON.parse(JSON.stringify({ ...block, id: undefined }));
    setReusableSections(current => [{ id: "section-" + Date.now(), name: name.trim(), block: snapshot }, ...current]);
    setSectionNotice("\"" + name.trim() + "\" saved to your section library.");
  };
  const insertReusableSection = (section) => {
    const copy = JSON.parse(JSON.stringify(section.block));
    copy.id = Date.now() + Math.random();
    setBlocks(current => [...current, copy]);
    setSelectedBlockId(copy.id);
    setSectionNotice(section.name + " added to this page.");
  };
  const reorderBlocks = (sourceId, targetId) => setBlocks(current => {
    const from = current.findIndex(block => String(block.id) === String(sourceId));
    const to = current.findIndex(block => String(block.id) === String(targetId));
    if (from < 0 || to < 0 || from === to) return current;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  });
  const selectedBlock = blocks.find(block => String(block.id) === String(selectedBlockId)) || null;

  const uploadMedia = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) { setMediaNotice("Please choose an image file."); return; }
      if (file.size > 2 * 1024 * 1024) { setMediaNotice(file.name + " is larger than 2 MB. Choose a smaller image."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const asset = { id: "asset-" + Date.now() + "-" + Math.random().toString(36).slice(2,8), name: file.name, type: file.type, size: file.size, dataUrl: reader.result };
        setMediaAssets(current => [asset, ...current]);
        setMediaNotice(file.name + " added to this device's media library.");
      };
      reader.onerror = () => setMediaNotice("Could not read " + file.name + ". Please try again.");
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };
  const insertMedia = (asset) => {
    setBlocks(current => current.concat([{ id: Date.now()+Math.random(), type: "Image", title: asset.name, content: "Image added from your media library.", assetId: asset.id }]));
    setMediaNotice(asset.name + " added to the current page.");
  };
  const removeMedia = (assetId) => {
    setMediaAssets(current => current.filter(asset => asset.id !== assetId));
    setMediaNotice("Asset removed from this device's library. Existing page blocks are not changed.");
  };
  const moveBlock = (index, direction) => setBlocks(current => {
    const next = [...current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const duplicateBlock = (block) => setBlocks(current => {
    const index = current.findIndex(item => item.id === block.id);
    const copy = { ...block, id: Date.now()+Math.random(), title: (block.title || "Element") + " copy" };
    return [...current.slice(0,index+1), copy, ...current.slice(index+1)];
  });
  const exportDraft = () => { const payload = { product: "DuKu FCA", siteName, headline, subline, blocks, seoTitle, seoDescription, siteSlug, pages, activePageId, mediaAssets, siteSubdomain, exportedAt: new Date().toISOString() }; const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = (siteSlug || "duku-fca-site") + "-backup.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); };
  const startEditor = (name) => { const saved = readLocalDraft(); if (name) { const selectedTemplate=templates.find(item=>item.name===name); const starterBlocks=createTemplateStarter(selectedTemplate?.type||"Business"); const headlines={Business:"A better way to do business.",Portfolio:"Thoughtful work. Distinctive outcomes.",Store:"Discover your next favourite.",Agency:"Ideas built to move brands forward.",Restaurant:"Good food. Good company.",Education:"Learn with purpose.",Technology:"Technology that moves you forward.","Landing Page":"Make your next move count."}; const starterHeadline=headlines[selectedTemplate?.type]||"Make your next idea unforgettable."; const starterSubline="A professional online experience, ready for your brand and your next chapter."; setSiteName(name+" website"); setHeadline(starterHeadline); setSubline(starterSubline); setBlocks(starterBlocks); setSeoTitle(""); setSeoDescription(""); setSiteSlug("home"); setSiteSubdomain((name||"my-website").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); setPages([{id:"home",name:"Home",slug:"home",headline:starterHeadline,subline:starterSubline,blocks:starterBlocks,seoTitle:"",seoDescription:""}]); setActivePageId("home"); } else if (saved.siteName) { setSiteName(saved.siteName); setHeadline(saved.headline || "Make your next idea unforgettable."); setSubline(saved.subline || "A beautiful online home for everything you do."); setBlocks(saved.blocks || []); setSeoTitle(saved.seoTitle || ""); setSeoDescription(saved.seoDescription || ""); setSiteSlug(saved.siteSlug || "my-website"); setSiteSubdomain(saved.siteSubdomain || ""); } else { setSiteName("My first website"); setHeadline("Make your next idea unforgettable."); setSubline("A beautiful online home for everything you do."); setBlocks([]); setSiteSubdomain(""); } setShowEditor(true); setPublished(false); setPublishedUrl(""); };
  return <div className="app-shell">
    <div className="corporate-ticker"><span className="ticker-live"></span><b>DUKU BUSINESS GROUP</b><span>{platformContent.announcement||"DuKu Business is an official subsidiary of Upreti Industries Limited (UIL)."}</span><span>• Building practical digital products for businesses.</span></div>
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button>
      <a className="brand" href="/"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span><small>FREE WEBSITE BUILDER</small></a>
      <nav className="top-links"><a href="#features">Features</a><a href="#templates">Templates</a><a href="#pricing">Plans</a><a href="#careers">Careers</a><a href="/blog">News</a></nav>
      <div className="top-actions">{authUser?<><span className="signed-in-label">{authUser.email}</span><button className="text-btn" onClick={signOut}>Sign out</button></>:<><button className="text-btn" onClick={() => {setAuthMode("Welcome back");setShowAuth(true)}}>Log in</button><button className="primary-btn small" onClick={() => {setAuthMode("Create your free account");setShowAuth(true)}}>Start for free <span>↗</span></button></>}</div>
    </header>
    {platformContent.custom_html&&<div className="platform-custom-html" dangerouslySetInnerHTML={{__html:platformContent.custom_html}}/>}
    {platformContent.popup_enabled&&!popupDismissed&&<div className="platform-popup-backdrop"><section className="platform-popup"><button onClick={()=>setPopupDismissed(true)} aria-label="Close popup">×</button><div className="eyebrow">DUKU BUSINESS ANNOUNCEMENT</div><h2>{platformContent.popup_title||"Welcome to DuKu FCA"}</h2><p>{platformContent.popup_body||"Start building your next idea today."}</p><button className="primary-btn" onClick={()=>setPopupDismissed(true)}>Continue</button></section></div>}
    <div className="layout">
      <aside className={"sidebar " + (mobileNav ? "open" : "")}>
        <div className="workspace"><div className="workspace-icon">D</div><div><b>My workspace</b><small>Free plan</small></div><span className="chevron">⌄</span></div>
        <div className="side-label">WORKSPACE</div>
        {["Overview","My websites","Templates","Domains","Media library","Form submissions","Payments & earnings"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>{setActive(item);setMobileNav(false);if(item==="Templates")document.getElementById("templates")?.scrollIntoView({behavior:"smooth"});if(item==="Form submissions")loadFormInbox();if(item==="Analytics")loadAnalytics();if(item==="Domains")loadDomains();if(item==="Payments & earnings")loadMarketplace()}}><span>{["⌂","▣","▦","◎","▤","✉","₹"][i]}</span>{item}{item==="My websites" ? <i>0</i> : null}</button>)}
        <div className="side-label second">TOOLS</div>
        {["App integrations","Analytics","Help centre","Code Studio","Android App Studio","Blog & News"].map((item,i)=><button key={item} className={"side-link "+(active===item?"selected":"")} onClick={()=>{setActive(item);setMobileNav(false);}}><span>{["⌘","↗","?","{ }","▣","▤"][i]}</span>{item}</button>)}
        <div className="side-bottom"><div className="upgrade-card"><div className="spark">✦</div><b>Build without limits</b><p>Explore more ways to grow your online presence.</p><button onClick={()=>setShowAuth(true)}>Explore plans ↗</button></div><div className="profile-row"><div className="avatar">G</div><div><b>Guest workspace</b><small>Sign in to sync your work</small></div><span>···</span></div></div>
      </aside>
      <main className="main-content">

        {active==="Code Studio"&&<section className="dev-workspace"><div className="eyebrow">CODE-FIRST WEBSITE DEVELOPMENT</div><h1>DuKu <em>Code Studio.</em></h1><p>Build websites using your preferred language. Edit source files, preview changes and save projects to your cloud workspace.</p><div className="dev-toolbar"><input value={codeProjectName} onChange={e=>setCodeProjectName(e.target.value)} placeholder="Project name"/><select value={codeLanguage} onChange={e=>setCodeLanguage(e.target.value)}>{["html","css","javascript","typescript","python","php","vue","react"].map(x=><option key={x}>{x}</option>)}</select><button className="primary-btn" onClick={saveCodeProject}>Save project</button></div><div className="dev-project-list">{codeProjects.map(p=><button key={p.id} onClick={()=>openCodeProject(p)}>{p.name} · {p.language}</button>)}</div><div className="dev-code-grid"><div><label>index.html<textarea rows="10" spellCheck="false" value={codeFiles["index.html"]||""} onChange={e=>setCodeFiles(v=>({...v,"index.html":e.target.value}))}/></label><label>styles.css<textarea rows="8" spellCheck="false" value={codeFiles["styles.css"]||""} onChange={e=>setCodeFiles(v=>({...v,"styles.css":e.target.value}))}/></label><label>script.js<textarea rows="8" spellCheck="false" value={codeFiles["script.js"]||""} onChange={e=>setCodeFiles(v=>({...v,"script.js":e.target.value}))}/></label></div><div className="dev-preview"><b>Live preview</b><iframe title="Code project preview" sandbox="allow-scripts" srcDoc={codeFiles["index.html"]||""}/></div></div>{codeNotice&&<p className="dev-notice">{codeNotice}</p>}<small>HTML, CSS and JavaScript preview runs in an isolated frame. Other languages are stored as source projects.</small></section>}
        {active==="Android App Studio"&&<section className="dev-workspace"><div className="eyebrow">FREE ANDROID APP DEVELOPMENT WORKSPACE</div><h1>DuKu Android <em>App Studio.</em></h1><p>Start an Android project using modern cross-platform or native technologies.</p><div className="android-options">{[{id:"expo",title:"Expo / React Native",desc:"TypeScript and rapid iteration"},{id:"flutter",title:"Flutter",desc:"Dart and cross-platform UI"},{id:"kotlin",title:"Kotlin Native",desc:"Modern Android-first development"},{id:"java",title:"Java Native",desc:"Traditional Android development"}].map(x=><button className={androidFramework===x.id?"chosen":""} key={x.id} onClick={()=>setAndroidFramework(x.id)}><b>{x.title}</b><small>{x.desc}</small></button>)}</div><div className="dev-toolbar"><input value={androidName} onChange={e=>setAndroidName(e.target.value)} placeholder="App name"/><input value={androidPackage} onChange={e=>setAndroidPackage(e.target.value)} placeholder="com.example.app"/><button className="primary-btn" onClick={saveAndroidProject}>Create project</button></div><label className="source-label">Starter source · {androidFramework.toUpperCase()}<textarea className="android-source" rows="13" spellCheck="false" value={androidSource} onChange={e=>setAndroidSource(e.target.value)}/></label>{androidNotice&&<p className="dev-notice">{androidNotice}</p>}<div className="android-project-list"><h3>Your Android projects</h3>{androidProjects.map(p=><article key={p.id}><div><b>{p.name}</b><small>{p.framework} · {p.package_name} · {p.build_status}</small></div><button className="ghost-btn" onClick={()=>exportAndroidProject(p)}>Export project data</button></article>)}</div><p className="dev-disclaimer">Free source editing and project storage. APK/AAB cloud compilation, device emulators, signing and Play Store release automation need a build runner and signing setup that are not enabled yet.</p></section>}
        {active==="Blog & News"&&<section className="blog-listing"><div className="eyebrow">DUKU BUSINESS · NEWSROOM</div><h1>Ideas, updates & <em>company news.</em></h1><p>Product announcements, engineering stories and updates from DuKu Business.</p><div className="blog-card-grid">{blogArticles.map(a=><article key={a.id}>{a.cover_image_url&&<img src={a.cover_image_url} alt=""/>}<small>{a.category} · {a.published_at?new Date(a.published_at).toLocaleDateString():""}</small><h2>{a.title}</h2><p>{a.excerpt}</p><a href={"/blog/"+a.slug}>Read article ↗</a></article>)}</div>{!blogArticles.length&&<div className="empty-state">No articles have been published yet.</div>}</section>}
        {authUser&&<section className="cloud-websites-panel"><div><div className="eyebrow">YOUR CLOUD WORKSPACE</div><h2>My saved websites</h2><p>Open your projects from any device after signing in.</p></div>{cloudSitesLoading?<span>Loading your websites…</span>:cloudSites.length?<div className="cloud-site-list">{cloudSites.map(site=><div className="cloud-site-row" key={site.id}><div><b>{site.name}</b><small>{site.slug} · {site.status}</small></div><button onClick={()=>openCloudSite(site)}>Open editor ↗</button></div>)}</div>:<div className="cloud-empty">No cloud websites yet. Create a website and choose Save to cloud in the editor.</div>}</section>}
        {active === "Domains" ? <section className="analytics-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">DOMAIN MANAGEMENT</div><h1>Your custom <em>domains.</em></h1><p>Connect a domain you own and prove DNS ownership securely.</p></div><button className="ghost-btn" onClick={loadDomains} disabled={domainLoading}>{domainLoading?"Refreshing…":"↻ Refresh"}</button></div>
          <div className="domain-add-card"><h2>Add a custom domain</h2><div className="domain-add-fields"><input value={domainInput} onChange={event=>setDomainInput(event.target.value)} placeholder="example.com" aria-label="Custom domain"/><select value={domainSiteId} onChange={event=>setDomainSiteId(event.target.value)} aria-label="Website">{domainSites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select><button className="primary-btn" onClick={addCustomDomain} disabled={domainLoading}>Add domain</button></div><p>Use a domain you already own. DuKu FCA will provide a DNS TXT challenge to verify ownership.</p></div>
          {domainError&&<div className="form-inbox-error">{domainError}</div>}{domainNotice&&<div className="domain-notice">{domainNotice}</div>}
          {domainLoading&&!domainRows.length?<div className="cloud-empty">Loading domains…</div>:!domainRows.length?<div className="cloud-empty">{domainSites.length?"No custom domains added yet.":"Create and save a website before adding a domain."}</div>:<div className="domain-list">{domainRows.map(row=><article className="domain-card" key={row.id}><div className="domain-card-head"><div><b>{row.domain}</b><small>{row.siteName} · Added {new Date(row.created_at).toLocaleDateString()}</small></div><span className={"domain-status "+(row.verification_status==="verified"?"verified":"pending")}>{row.verification_status==="verified"?"DNS verified":"Verification pending"}</span></div><div className="domain-dns-record"><small>1. Add this TXT record in your domain DNS settings</small><div><span>Type</span><b>TXT</b></div><div><span>Name / Host</span><code>{row.dns_record_name || "_duku-verification."+row.domain}</code><button onClick={()=>copyToClipboard(row.dns_record_name || "_duku-verification."+row.domain)}>Copy</button></div><div><span>Value</span><code>{row.verification_token}</code><button onClick={()=>copyToClipboard(row.verification_token)}>Copy</button></div></div><div className="domain-card-footer"><span>{row.verified_at?"Verified "+new Date(row.verified_at).toLocaleString():"DNS may take time to propagate."}</span><button className="ghost-btn" onClick={()=>verifyCustomDomain(row)} disabled={domainVerifying===row.id}>{domainVerifying===row.id?"Checking DNS…":"Verify DNS ownership"}</button></div><p className="domain-routing-note">DNS ownership verification is separate from connecting traffic. Domain routing to your published website will be enabled after the domain is attached to DuKu FCA hosting.</p></article>)}</div>}
        </section> : active === "Analytics" ? <section className="analytics-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">WEBSITE PERFORMANCE</div><h1>Site <em>analytics.</em></h1><p>Privacy-conscious page-view reporting for your published websites.</p></div><div className="analytics-actions"><select value={analyticsRange} onChange={event=>{setAnalyticsRange(event.target.value);loadAnalytics(event.target.value)}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button className="ghost-btn" onClick={loadAnalytics} disabled={analyticsLoading}>{analyticsLoading?"Refreshing…":"↻ Refresh"}</button></div></div>
          {analyticsError&&<div className="form-inbox-error">{analyticsError}</div>}
          <div className="analytics-stats"><div><small>Page views</small><b>{analyticsEvents.length.toLocaleString()}</b><span>Recorded visits to pages</span></div><div><small>Published websites</small><b>{analyticsSites.filter(site=>site.status==="published").length}</b><span>Currently live</span></div><div><small>Top page</small><b>{analyticsEvents.length ? (analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{}) && Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1])[0][0]) : "—"}</b><span>By page views</span></div></div>
          {analyticsLoading&&!analyticsEvents.length?<div className="cloud-empty">Loading analytics…</div>:!analyticsSites.length?<div className="cloud-empty">Create and publish a website to start collecting analytics.</div>:<div className="analytics-grid"><article className="analytics-card"><h2>Views by website</h2>{analyticsSites.map(site=>{const count=analyticsEvents.filter(event=>event.site_id===site.id).length;return <div className="analytics-bar-row" key={site.id}><span>{site.name}</span><div><i style={{width:(analyticsEvents.length?Math.max(3,count/Math.max(1,...analyticsSites.map(s=>analyticsEvents.filter(e=>e.site_id===s.id).length))*100):0)+"%"}}/></div><b>{count}</b></div>})}</article><article className="analytics-card"><h2>Top pages</h2>{Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.page_slug||"home";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([slug,count])=><div className="analytics-list-row" key={slug}><span>/{slug}</span><b>{count}</b></div>)}{!analyticsEvents.length&&<p>No page views recorded in this period yet.</p>}</article><article className="analytics-card"><h2>Traffic sources</h2>{Object.entries(analyticsEvents.reduce((acc,event)=>{const key=event.referrer_host||"Direct / unknown";acc[key]=(acc[key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([source,count])=><div className="analytics-list-row" key={source}><span>{source}</span><b>{count}</b></div>)}{!analyticsEvents.length&&<p>Sources appear as visitors arrive from other websites.</p>}</article><article className="analytics-card"><h2>Recent activity</h2>{analyticsEvents.slice(0,8).map(event=><div className="analytics-list-row" key={event.id}><span>/{event.page_slug||"home"} · {analyticsSites.find(site=>site.id===event.site_id)?.name||"Website"}<small>{new Date(event.created_at).toLocaleString()}</small></span><b>View</b></div>)}{!analyticsEvents.length&&<p>Published page views will appear here.</p>}</article></div>}
          <p className="analytics-privacy-note">DuKu FCA records page views, page paths and referring hostnames only. It does not currently estimate unique visitors or collect visitor names, email addresses or IP addresses.</p>
        </section> : active === "Payments & earnings" ? <section className="analytics-panel marketplace-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">SELLER PAYMENTS</div><h1>Your <em>earnings.</em></h1><p>Track sales, DuKu commission, refunds and seller settlements from your published websites.</p></div><div className="analytics-actions"><button className="ghost-btn" onClick={exportMarketplaceReport} disabled={!marketplaceOrders.length&&!marketplaceLedger.length&&!marketplacePayouts.length}>↓ Export CSV</button><button className="ghost-btn" onClick={loadMarketplace} disabled={marketplaceLoading}>{marketplaceLoading?"Refreshing…":"↻ Refresh"}</button></div></div>
          {marketplaceError&&<div className="form-inbox-error">{marketplaceError}</div>}
          <div className="marketplace-banner"><div><b>Marketplace payments · Cashfree Easy Split</b><p>Customer payments are designed to split automatically: 2.1% DuKu platform commission and the remaining eligible amount to your verified seller account.</p></div><span className={"domain-status "+(marketplaceAccount?.onboarding_status==="verified"?"verified":"pending")}>{marketplaceAccount?.onboarding_status==="verified"?"KYC verified":"Gateway setup required"}</span></div>
          <div className="analytics-stats marketplace-stats">
            <div><small>Gross sales</small><b>₹{(marketplaceOrders.filter(o=>["paid","partially_refunded","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.gross_amount_paise||0),0)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><span>Successful customer payments</span></div>
            <div><small>DuKu commission (2.1%)</small><b>₹{(marketplaceOrders.filter(o=>["paid","partially_refunded","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.commission_amount_paise||0),0)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><span>Before reversals and refunds</span></div>
            <div><small>Seller net earnings</small><b>₹{(marketplaceOrders.filter(o=>["paid","partially_refunded","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.seller_net_amount_paise||0),0)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b><span>Before settlement adjustments</span></div>
          </div>
          <div className="marketplace-setup-card"><div><div className="eyebrow">BANK & KYC ONBOARDING</div><h2>{marketplaceAccount?.onboarding_status==="verified"?"Payout account connected":"Connect your payout account"}</h2><p>{marketplaceAccount?.onboarding_status==="verified"?"Your payment provider has marked your seller account as verified.": "Secure identity and bank verification will be completed on Cashfree’s hosted onboarding flow. DuKu will not store your full bank credentials, card details or identity documents."}</p><small>Account status: {marketplaceAccount?.onboarding_status||"Not started"} · KYC: {marketplaceAccount?.kyc_status||"Not started"} · Settlements: {marketplaceAccount?.settlement_status||"Not ready"}</small></div><button className="primary-btn" disabled>{marketplaceAccount?.onboarding_status==="verified"?"Account connected":"Available after DuKu gateway activation"}</button></div>
          <div className="analytics-grid marketplace-lists"><article className="analytics-card"><h2>Recent customer orders</h2>{marketplaceOrders.length?marketplaceOrders.slice(0,10).map(order=><div className="analytics-list-row" key={order.id}><span>{order.provider_order_id||"Order"}<small>{new Date(order.created_at).toLocaleString()} · {order.status}</small></span><b>₹{(Number(order.gross_amount_paise)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></div>):<p>No paid orders yet. Payments will appear here after the gateway is activated.</p>}</article><article className="analytics-card"><h2>Commission & activity ledger</h2>{marketplaceLedger.length?marketplaceLedger.slice(0,10).map(entry=><div className="analytics-list-row" key={entry.id}><span>{entry.description||entry.entry_type}<small>{new Date(entry.created_at).toLocaleString()}</small></span><b>{Number(entry.amount_paise)<0?"−":"+"}₹{(Math.abs(Number(entry.amount_paise))/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></div>):<p>Verified payment and settlement entries will be recorded here.</p>}</article><article className="analytics-card"><h2>Withdrawals & settlements</h2>{marketplacePayouts.length?marketplacePayouts.map(p=><div className="analytics-list-row" key={p.id}><span>{p.status}<small>{new Date(p.requested_at).toLocaleString()}</small></span><b>₹{(Number(p.amount_paise)/100).toLocaleString("en-IN",{minimumFractionDigits:2})}</b></div>):<p>Withdrawal requests will be enabled after Cashfree approves the marketplace and verifies your payout account. Settlements are processed by the payment provider.</p>}</article></div>
          <p className="analytics-privacy-note">Amounts shown are based on recorded payment records and are not a bank balance or guaranteed withdrawable amount. Actual settlements depend on provider fees, taxes, refunds, disputes, reserves and settlement status. No withdrawal is initiated from this dashboard until the provider integration is approved and connected.</p>
        </section> : active === "Form submissions" ? <section className="form-inbox-panel">
          <div className="form-inbox-heading"><div><div className="eyebrow">CUSTOMER MESSAGES</div><h1>Form <em>submissions.</em></h1><p>Messages sent through contact forms on your published websites.</p></div><button className="ghost-btn" onClick={loadFormInbox} disabled={formInboxLoading}>{formInboxLoading ? "Refreshing…" : "↻ Refresh"}</button></div>
          <div className="form-inbox-stats"><div><small>Total messages</small><b>{formSubmissions.length}</b></div><div><small>Unread</small><b>{formSubmissions.filter(item=>!item.is_read).length}</b></div><div><small>Websites</small><b>{new Set(formSubmissions.map(item=>item.site_id)).size}</b></div></div>
          {formInboxError && <div className="form-inbox-error">{formInboxError}</div>}
          {formInboxLoading && !formSubmissions.length ? <div className="cloud-empty">Loading your messages…</div> : !formSubmissions.length ? <div className="cloud-empty">No form submissions yet. Messages from your published website forms will appear here.</div> :
            <div className="form-inbox-layout"><div className="form-inbox-list">{formSubmissions.map(item=><button key={item.id} className={"form-inbox-item "+(!item.is_read?"unread ":"")+(selectedSubmission?.id===item.id?"selected":"")} onClick={()=>{setSelectedSubmission(item);if(!item.is_read)markSubmissionRead(item)}}><span className="form-inbox-item-top"><b>{item.sender_name}</b><small>{new Date(item.created_at).toLocaleString()}</small></span><span className="form-inbox-site">{item.site?.name || "Website"} · {item.form_title}</span><span className="form-inbox-preview">{item.message}</span></button>)}</div>
            {selectedSubmission ? <article className="form-inbox-detail"><div className="eyebrow">MESSAGE DETAILS</div><h2>{selectedSubmission.sender_name}</h2><a href={"mailto:"+selectedSubmission.sender_email}>{selectedSubmission.sender_email}</a><p className="form-inbox-meta">{selectedSubmission.site?.name || "Website"} · {selectedSubmission.form_title} · {new Date(selectedSubmission.created_at).toLocaleString()}</p><div className="form-inbox-message">{selectedSubmission.message}</div><button className="ghost-btn" onClick={()=>markSubmissionRead(selectedSubmission)}>{selectedSubmission.is_read?"Mark as unread":"Mark as read"}</button></article> : <div className="form-inbox-detail form-inbox-empty">Select a message to read it.</div>}</div>}
        </section> : <>
        <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"></span> YOUR CREATIVE SPACE</div><h1>{platformContent.hero_title||"Build something brilliant."}</h1><p className="welcome-copy">{platformContent.hero_subtitle||"Your ideas deserve a place on the internet. Make it happen with DuKu FCA."}</p></div><div className="welcome-orb"><div className="orb-inner">D<span>✦</span></div><i className="orbit-dot one"></i><i className="orbit-dot two"></i></div></div>
        <section className="launch-card"><div className="launch-copy"><div className="pill"><span></span> YOUR NEXT BIG THING STARTS HERE</div><h2>From blank canvas<br/>to <span>live website.</span></h2><p>Design, customise and publish a website that feels unmistakably yours. No code required.</p><div className="launch-actions"><button className="primary-btn" onClick={()=>startEditor()}>Create a website <span>↗</span></button><button className="ghost-btn" onClick={()=>document.getElementById("templates").scrollIntoView({behavior:"smooth"})}>Explore templates <span>→</span></button></div><div className="trust-line"><span>✦</span> Free to start <b>·</b> No credit card required <b>·</b> Your site, your rules</div></div><div className="launch-art"><div className="float-card card-a"><span className="mini-icon">✦</span><div><b>Creative freedom</b><small>Make it yours</small></div></div><div className="browser-mock"><div className="browser-bar"><i></i><i></i><i></i><span>yourbrand.dukubusiness.online</span></div><div className="mock-page"><div className="mock-nav"><b>STUDIO<span>®</span></b><small>WORK　 ABOUT　 CONTACT</small></div><div className="mock-hero"><div><small>DESIGN THAT MOVES YOU</small><strong>Ideas into<br/><i>experiences.</i></strong><span className="mock-button">DISCOVER MORE ↗</span></div><div className="mock-image"><div className="mock-sun"></div><div className="mock-arch"></div></div></div></div></div><div className="float-card card-b"><span className="check-icon">✓</span><div><b>Ready to publish</b><small>Your vision, online</small></div></div><div className="art-glow"></div></div></section>
        <div className="stats-strip"><div><b>01</b><span>Start with an idea</span></div><div><b>02</b><span>Make it your own</span></div><div><b>03</b><span>Publish to the world</span></div><div className="stats-note">A simpler way to build online <span>✳</span></div></div>
        <section className="templates-section" id="templates"><div className="section-heading"><div><div className="eyebrow">100+ PROFESSIONALLY CRAFTED STARTING POINTS</div><h2>Find your <em>starting point.</em></h2><p>Explore more than 100 responsive themes with refined motion and layouts for different industries.</p></div><button className="view-all" onClick={()=>setFilter("All")}>View all templates <span>↗</span></button></div><div className="template-tools"><div className="filter-pills">{["All","Business","Portfolio","Store","Agency","Restaurant","Education","Technology","Landing Page"].map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates"/></div></div><div className="template-grid">{filtered.map(t=><article className="template-card" key={t.name}><div className={"template-preview "+t.color}><div className="template-window"><div className="window-top"><span>● ● ●</span><small>{t.name.toLowerCase()}.studio</small></div><div className={"preview-design "+t.shape}><div className="preview-copy"><small>{t.type.toUpperCase()} TEMPLATE</small><b>{t.shape==="studio"?"Create with intention.":t.shape==="forma"?"Your work. Your world.":t.shape==="morrow"?"Everyday, elevated.":"Make good things happen."}</b><i></i></div><div className="preview-shape"></div></div></div><span className="template-tag">{t.tag}</span></div><div className="template-meta"><div><b>{t.name}</b><small>{t.type} · Animated · Responsive</small></div><button onClick={()=>startEditor(t.name)}>Use template <span>↗</span></button></div></article>)}</div>{filtered.length===0&&<div className="empty-state">No templates match that search. Try another name or category.</div>}</section>

        <section className="pricing-section" id="pricing">
          <div className="section-heading"><div><div className="eyebrow">CLEAR PLANS · ROOM TO GROW</div><h2>Choose the right <em>workspace.</em></h2><p>Four plans for creators and professionals, plus dedicated business packages.</p></div></div>
          <div className="pricing-category"><div className="eyebrow">DUKU PRO · CREATORS & PROFESSIONALS</div><div className="public-pricing-grid">
            {[{name:"Pro Launch",price:"₹499",features:["Premium theme access","Visual editor","Responsive publishing","Basic analytics"]},{name:"Pro Growth",price:"₹1,999",features:["Everything in Launch","Advanced design controls","Custom domain connection","Lead capture forms"],featured:true},{name:"Pro Studio",price:"₹5,999",features:["Everything in Growth","Multiple website projects","Priority support","Enhanced analytics"]},{name:"Pro Scale",price:"₹12,999",features:["Everything in Studio","Team collaboration","Advanced integrations","Dedicated onboarding"]}].map(p=><article className={p.featured?"public-plan featured":"public-plan"} key={p.name}>{p.featured&&<span className="plan-ribbon">MOST POPULAR</span>}<small>{p.name}</small><strong>{p.price}<i>/ month</i></strong><ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul><button className={p.featured?"primary-btn":"ghost-btn"} onClick={()=>{setAuthMode("Create your free account");setShowAuth(true)}}>Get started ↗</button></article>)}
          </div></div>
          <div className="pricing-category business-pricing"><div className="eyebrow">DUKU BUSINESS · ESTABLISHED TEAMS</div><div className="public-pricing-grid">
            {[{name:"Business Essential",price:"₹8,999",features:["Business website suite","Professional themes","Domain & SEO tools","Business setup guidance"]},{name:"Business Growth",price:"₹17,999",features:["Everything in Essential","Multiple team members","Lead workflows","Advanced reporting"],featured:true},{name:"Business Professional",price:"₹29,999",features:["Everything in Growth","Priority implementation","Custom integrations","Dedicated account support"]},{name:"Business Enterprise",price:"₹42,999",features:["Everything in Professional","Enterprise workspace","Advanced access controls","Launch planning session"]}].map(p=><article className={p.featured?"public-plan featured":"public-plan"} key={p.name}>{p.featured&&<span className="plan-ribbon">POPULAR</span>}<small>{p.name}</small><strong>{p.price}<i>/ month</i></strong><ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul><button className={p.featured?"primary-btn":"ghost-btn"} onClick={()=>{setAuthMode("Create your free account");setShowAuth(true)}}>Enquire now ↗</button></article>)}
          </div></div><p className="pricing-disclaimer">Prices are shown in INR. Final inclusions, taxes, billing terms and availability are confirmed during checkout or by the DuKu Business team.</p>
        </section>
        <section className="careers-section" id="careers">
          <div className="careers-intro"><div className="eyebrow">CAREERS · BUILD WITH US</div><h2>Build what comes <em>next.</em></h2><p>We welcome curious engineers and problem-solvers who want to build reliable digital products. Share your details and our team can review your application.</p><div className="career-roles"><span>Software Engineering</span><span>Frontend & UI</span><span>Backend & Cloud</span><span>QA & Automation</span><span>DevOps & Security</span><span>AI & Data</span></div></div>
          <form className="career-form" onSubmit={submitCareerApplication}><h3>Apply to DuKu Business</h3><div className="career-fields">
          <label>Full name<input required maxLength="120" value={careerForm.full_name} onChange={e=>setCareerForm(v=>({...v,full_name:e.target.value}))}/></label><label>Email address<input required type="email" value={careerForm.email} onChange={e=>setCareerForm(v=>({...v,email:e.target.value}))}/></label><label>Phone number<input required maxLength="40" value={careerForm.phone} onChange={e=>setCareerForm(v=>({...v,phone:e.target.value}))}/></label>
          <label>Engineering role<select value={careerForm.role} onChange={e=>setCareerForm(v=>({...v,role:e.target.value}))}>{["Frontend Engineer","Backend Engineer","Full-stack Engineer","Mobile App Engineer","Cloud / DevOps Engineer","QA Automation Engineer","Cybersecurity Engineer","AI / Machine Learning Engineer","Data Engineer","Embedded Systems Engineer","Engineering Intern","Other Engineering Role"].map(r=><option key={r}>{r}</option>)}</select></label>
          <label>Experience<select value={careerForm.experience} onChange={e=>setCareerForm(v=>({...v,experience:e.target.value}))}>{["Entry level","Internship","1–2 years","3–5 years","6–8 years","9+ years"].map(r=><option key={r}>{r}</option>)}</select></label><label>Current location<input required maxLength="120" value={careerForm.location} onChange={e=>setCareerForm(v=>({...v,location:e.target.value}))}/></label>
          <label>Portfolio / LinkedIn <span>Optional</span><input type="url" value={careerForm.portfolio_url} onChange={e=>setCareerForm(v=>({...v,portfolio_url:e.target.value}))} placeholder="https://"/></label><label>Resume link <span>Optional</span><input type="url" value={careerForm.resume_url} onChange={e=>setCareerForm(v=>({...v,resume_url:e.target.value}))} placeholder="https://"/></label></div>
          <label>Why would you like to join us?<textarea required minLength="20" maxLength="5000" rows="4" value={careerForm.cover_note} onChange={e=>setCareerForm(v=>({...v,cover_note:e.target.value}))} placeholder="Tell us about your skills, projects and interests."/></label><button className="primary-btn" type="submit" disabled={careerBusy}>{careerBusy?"Submitting…":"Submit application ↗"}</button>{careerNotice&&<p className="career-notice" role="status">{careerNotice}</p>}<small>By applying, you consent to DuKu Business reviewing your details for recruitment purposes.</small></form>
        </section>
        <section className="feature-section" id="features"><div className="eyebrow">EVERYTHING IN ONE PLACE</div><h2>Tools that make the<br/><em>hard part feel easy.</em></h2><div className="feature-grid"><div className="feature-card"><span>✥</span><h3>Visual website editor</h3><p>Arrange sections, update content and shape your site with a visual-first workflow.</p></div><div className="feature-card"><span>◈</span><h3>Responsive by design</h3><p>Create experiences that look considered on desktop, tablet and mobile.</p></div><div className="feature-card"><span>⌘</span><h3>Connect your stack</h3><p>Plan integrations for APIs, databases, forms and the tools your business already uses.</p></div><div className="feature-card"><span>↗</span><h3>Your own web address</h3><p>Publish on a DuKu subdomain and connect a domain you already own.</p></div></div></section>
        <section className="bottom-cta" id="how"><div><div className="eyebrow">YOUR NEXT CHAPTER IS ONLINE</div><h2>Good ideas look better<br/>on the <em>internet.</em></h2><p>Start building your website with DuKu FCA.</p></div><button className="primary-btn" onClick={()=>{setAuthMode("Create your free account");setShowAuth(true)}}>Create your free account ↗</button><div className="cta-star">✳</div></section>
        <footer><a className="brand footer-brand" href="/"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></a><span>© 2026 DuKu Business. Built for what's next.</span><div><a href="#features">Features</a><a href="#templates">Templates</a><a href="mailto:support@dukubusiness.online">Support</a></div></footer>
        </>}
      </main>
    </div>

    <div className={"duku-ai-widget "+(aiOpen?"open":"")}><button className="duku-ai-launcher" onClick={()=>setAiOpen(v=>!v)}><span>✦</span>{aiOpen?"Close support":"DuKu AI support"}</button>{aiOpen&&<section className="duku-ai-panel"><header><div><b>DuKu AI</b><small>Website builder support · AI assistant</small></div><button onClick={()=>setAiOpen(false)}>×</button></header><div className="duku-ai-messages">{aiMessages.map((m,i)=><div className={"duku-ai-message "+m.role} key={i}>{m.text}</div>)}{aiBusy&&<div className="duku-ai-message model">Checking this for you…</div>}</div><form onSubmit={e=>{e.preventDefault();sendDuKuAiMessage()}}><input value={aiInput} onChange={e=>setAiInput(e.target.value)} placeholder="Describe the error…" maxLength="4000"/><button disabled={aiBusy||!aiInput.trim()}>Send</button></form><small>Never share passwords or API keys.</small></section>}</div>
    {showAuth&&<div className="modal-backdrop" onClick={()=>setShowAuth(false)}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowAuth(false)}>×</button><div className="modal-mark">D</div><div className="eyebrow">WELCOME TO DUKU FCA</div><h2>{authMode}</h2><p>Save your projects, publish websites and manage everything in one place.</p><div className={authMode==="Welcome back"?"auth-fields":"auth-fields signup-fields"}>
{authMode!=="Welcome back"&&<><label>Full name<input value={authFullName} onChange={e=>setAuthFullName(e.target.value)} placeholder="Your full name" autoComplete="name"/></label><label>Phone number<input type="tel" value={authPhone} onChange={e=>setAuthPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel"/></label><label>Account type<select value={authAccountType} onChange={e=>setAuthAccountType(e.target.value)}><option value="individual">Individual</option><option value="business">Business</option><option value="agency">Agency</option><option value="creator">Creator</option><option value="developer">Developer</option></select></label><label>Company / brand name <span className="optional-label">Optional</span><input value={authCompany} onChange={e=>setAuthCompany(e.target.value)} placeholder="Your business or brand"/></label><label>Job title <span className="optional-label">Optional</span><input value={authJobTitle} onChange={e=>setAuthJobTitle(e.target.value)} placeholder="Founder, designer, student…"/></label><label>Country<select value={authCountry} onChange={e=>setAuthCountry(e.target.value)}><option>India</option><option>United States</option><option>United Kingdom</option><option>United Arab Emirates</option><option>Canada</option><option>Australia</option><option>Other</option></select></label><label>Website / portfolio <span className="optional-label">Optional</span><input type="url" value={authWebsite} onChange={e=>setAuthWebsite(e.target.value)} placeholder="https://"/></label></>}
<label>Email address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={authMode==="Welcome back"?"current-password":"new-password"}/></label></div><button className="primary-btn full" disabled={authBusy} onClick={submitAuth}>{authBusy?"Please wait…":authMode==="Welcome back"?"Log in":"Create account"} ↗</button>{authNotice&&<div className="auth-feedback">{authNotice}</div>}<small className="modal-legal">{isSupabaseConfigured?"Secure sign-in powered by DuKu FCA Supabase.":"Account service configuration is not available in this deployment yet."}</small><button className="switch-auth" onClick={()=>setAuthMode(authMode==="Welcome back"?"Create your free account":"Welcome back")}>{authMode==="Welcome back"?"New to DuKu FCA? Create an account":"Already have an account? Log in"}</button></div></div>}
    {showProfileSetup&&authUser&&<div className="modal-backdrop profile-setup-backdrop"><div className="auth-modal profile-setup-modal"><div className="modal-mark">D</div><div className="eyebrow">YOUR DUKU BUSINESS PROFILE</div><h2>Set up your profile.</h2><p>Tell us a little about yourself so we can tailor your workspace and account experience.</p><div className="profile-setup-grid"><label>Full name<input value={profileForm.display_name} onChange={e=>setProfileForm(v=>({...v,display_name:e.target.value}))} placeholder="Your full name"/></label><label>Phone number<input value={profileForm.phone} onChange={e=>setProfileForm(v=>({...v,phone:e.target.value}))} placeholder="+91…"/></label><label>Account type<select value={profileForm.account_type} onChange={e=>setProfileForm(v=>({...v,account_type:e.target.value}))}><option value="individual">Individual</option><option value="business">Business</option><option value="agency">Agency</option><option value="creator">Creator</option><option value="developer">Developer</option></select></label><label>Country<input value={profileForm.country} onChange={e=>setProfileForm(v=>({...v,country:e.target.value}))} placeholder="Country"/></label><label>Company / brand<input value={profileForm.company_name} onChange={e=>setProfileForm(v=>({...v,company_name:e.target.value}))} placeholder="Optional"/></label><label>Job title<input value={profileForm.job_title} onChange={e=>setProfileForm(v=>({...v,job_title:e.target.value}))} placeholder="Optional"/></label><label className="profile-wide">Website / portfolio<input type="url" value={profileForm.website_url} onChange={e=>setProfileForm(v=>({...v,website_url:e.target.value}))} placeholder="https://yourwebsite.com"/></label></div><button className="primary-btn full" disabled={profileSaving} onClick={saveProfileSetup}>{profileSaving?"Saving profile…":"Save profile and continue"}</button>{authNotice&&<div className="auth-feedback">{authNotice}</div>}<small className="modal-legal">Your profile details are private to your account and can be updated later.</small></div></div>}
    {showEditor&&<div className="editor-overlay"><div className="editor-top"><button className="brand editor-brand" onClick={()=>setShowEditor(false)}><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></button><div className="editor-site"><input value={siteName} onChange={e=>setSiteName(e.target.value)}/><span className="saved">{authUser?"● "+authUser.email:"● Auto-saved on this device"}</span></div><div className="editor-actions"><button className="ghost-btn" onClick={exportDraft}>Export backup ↓</button><button className="ghost-btn" disabled={!authUser||cloudBusy} onClick={saveCloudDraft}>{cloudBusy?"Saving…":"Save to cloud"}</button><button className="ghost-btn" onClick={()=>setShowEditor(false)}>Exit editor</button>{authUser&&<button className="ghost-btn" onClick={signOut}>Sign out</button>}<button className="primary-btn small" disabled={cloudBusy} onClick={publishSite}>{cloudBusy?"Publishing…":"Publish ↗"}</button></div>{cloudNotice&&<div className="cloud-save-notice">{cloudNotice}</div>}</div><div className="editor-workspace"><aside className="editor-tools"><b>PAGES</b><div className="page-manager">{pages.map(page=><div className={"page-manager-row "+(page.id===activePageId?"active":"")} key={page.id}><button className="page-select" onClick={()=>switchPage(page)}>{page.name}</button>{pages.length>1&&<button className="page-delete" onClick={()=>deletePage(page)} title={"Delete "+page.name}>×</button>}</div>)}<button className="add-page-btn" onClick={addPage}>＋ Add page</button></div><b>ADD ELEMENTS</b>{["＋ Text","▧ Image","▤ Button","▥ Section","▱ Form","⌘ Embed code","▧ Gallery","❝ Testimonials","＄ Pricing","？ FAQ","▥ Stats","♙ Team","✧ Logo strip","↗ Callout","▦ Columns","▣ Container"].map(x=><button key={x} onClick={()=>addBlock(x)}>{x}</button>)}<b className="media-heading">REUSABLE SECTIONS</b><div className="reusable-section-library"><button type="button" disabled={!selectedBlockId} onClick={()=>selectedBlock&&saveReusableSection(selectedBlock)}>＋ Save selected section</button>{reusableSections.length===0?<small>No saved sections yet. Select a block and save it here.</small>:reusableSections.map(section=><div className="reusable-section-row" key={section.id}><span><b>{section.name}</b><small>{section.block.type} · reusable</small></span><button type="button" onClick={()=>insertReusableSection(section)}>Insert</button><button type="button" title="Delete saved section" onClick={()=>setReusableSections(current=>current.filter(item=>item.id!==section.id))}>×</button></div>)}</div>{sectionNotice&&<div className="media-notice">{sectionNotice}</div>}<b className="media-heading">MEDIA LIBRARY</b><label className="media-upload">＋ Upload images<input type="file" accept="image/*" multiple onChange={uploadMedia}/></label><div className="media-note">Images are stored locally in this browser. Max 2 MB each.</div>{mediaNotice&&<div className="media-notice">{mediaNotice}</div>}<div className="media-grid">{mediaAssets.map(asset=><div className="media-item" key={asset.id}><img src={asset.dataUrl} alt={asset.name}/><div><span title={asset.name}>{asset.name}</span><button onClick={()=>insertMedia(asset)}>Add</button><button onClick={()=>removeMedia(asset.id)} title="Remove from library">×</button></div></div>)}</div><div className="editor-help">Select text in the preview to edit your content.</div></aside><div className="editor-canvas-wrap"><div className="canvas-toolbar"><span>Live preview · {previewDevice==="desktop"?"Desktop":previewDevice==="tablet"?"Tablet":"Mobile"}</span><div className="device-switch"><button className={previewDevice==="desktop"?"active":""} onClick={()=>setPreviewDevice("desktop")}>Desktop</button><button className={previewDevice==="tablet"?"active":""} onClick={()=>setPreviewDevice("tablet")}>Tablet</button><button className={previewDevice==="mobile"?"active":""} onClick={()=>setPreviewDevice("mobile")}>Mobile</button></div></div><div className={"site-canvas preview-"+previewDevice}><div className="canvas-nav"><b>{siteName.toUpperCase()}</b><span>{pages.map(page=>page.name.toUpperCase()).join("　 ")}</span><button>LET'S TALK ↗</button></div><div className="canvas-hero"><div className="canvas-copy"><small>{activePageId==="home"?"DESIGNED WITH DUKU FCA":activePageId.toUpperCase()+" · DUKU FCA"}</small><h1 contentEditable suppressContentEditableWarning onBlur={e=>setHeadline(e.currentTarget.textContent)}>{headline}</h1><p contentEditable suppressContentEditableWarning onBlur={e=>setSubline(e.currentTarget.textContent)}>{subline}</p><button>Explore more ↗</button></div><div className="canvas-art"><div className="canvas-disc"></div><div className="canvas-block"></div></div></div><div className="canvas-lower"><span>01 / WHAT WE DO</span><b>Thoughtful design. Clear purpose.</b><span>SCROLL TO EXPLORE ↓</span></div>{blocks.map((block,index)=><div className={"editor-added-block "+(selectedBlockId===block.id?"is-selected":"")+(draggedBlockId===block.id?" is-dragging":"")} key={block.id} draggable onClick={()=>setSelectedBlockId(block.id)} onDragStart={event=>{setDraggedBlockId(block.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",String(block.id));}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const source=event.dataTransfer.getData("text/plain")||draggedBlockId;reorderBlocks(source,block.id);setDraggedBlockId(null);}} onDragEnd={()=>setDraggedBlockId(null)} style={{background:block.gradientStyle&&block.gradientStyle!=="none"?({sunset:"linear-gradient(135deg,#ff9966,#ff5e62)",ocean:"linear-gradient(135deg,#2193b0,#6dd5ed)",violet:"linear-gradient(135deg,#654ea3,#eaafc8)",forest:"linear-gradient(135deg,#134e5e,#71b280)",midnight:"linear-gradient(135deg,#232526,#414345)"}[block.gradientStyle]):(block.backgroundColor||undefined),border:block.borderWidth?`${block.borderWidth}px solid ${block.borderColor||"#777777"}`:undefined,borderRadius:(block.borderRadius||0)+"px",boxShadow:({none:"none",soft:"0 8px 24px #00000022",medium:"0 14px 36px #00000038",strong:"0 22px 55px #00000055"}[block.shadowStyle||"none"]),textAlign:block.textAlign||"left",padding:(block.padding||24)+"px",maxWidth:block.widthMode==="standard"?"760px":block.widthMode==="wide"?"1100px":"none",width:block.widthMode==="full"?"100%":"calc(100% - 48px)",margin:block.widthMode==="full"?"0":"18px auto"}}><div className="block-editor-fields"><small>CONTENT BLOCK · {String(index+1).padStart(2,"0")} · {block.type.toUpperCase()}</small><input aria-label="Block heading" value={block.title||""} onChange={e=>updateBlock(block.id,"title",e.target.value)} placeholder="Block heading"/><textarea aria-label="Block content" value={block.content||""} onChange={e=>updateBlock(block.id,"content",e.target.value)} placeholder={block.type==="Embed code"?"Paste a YouTube or Vimeo URL here.":block.type==="Button"?"Button label":"Write your content here."}/>{(block.type==="Button"||block.type==="Embed code"||block.type==="Callout")&&<input aria-label={block.type==="Embed code"?"Embed URL":"Button destination URL"} value={block.type==="Embed code"?(block.content||""):(block.linkUrl||"")} onChange={e=>updateBlock(block.id,block.type==="Embed code"?"content":"linkUrl",e.target.value)} placeholder={block.type==="Embed code"?"https://youtu.be/…":"https://yourwebsite.com"} />}{block.type==="Callout"&&<input value={block.linkLabel||""} onChange={e=>updateBlock(block.id,"linkLabel",e.target.value)} placeholder="Button label"/>}{block.type==="Image"&&<div className="block-image-preview">{(()=>{const asset=mediaAssets.find(item=>item.id===block.assetId);return asset?<img src={asset.dataUrl} alt={block.title||asset.name}/>:<span>{block.assetId?"This image is no longer in your media library.":"Choose an image from the Media Library."}</span>;})()}</div>}
{block.type==="Container"&&<div className="nested-child-editor"><label>Container style<select value={block.containerStyle||"card"} onChange={e=>updateBlock(block.id,"containerStyle",e.target.value)}><option value="card">Card</option><option value="plain">Plain</option><option value="bordered">Bordered</option><option value="glass">Glass</option></select></label><label>Space between elements · {block.containerGap||14}px<input type="range" min="4" max="48" step="2" value={block.containerGap||14} onChange={e=>updateBlock(block.id,"containerGap",Number(e.target.value))}/></label><label>Corner radius · {block.containerRadius||18}px<input type="range" min="0" max="40" step="2" value={block.containerRadius||18} onChange={e=>updateBlock(block.id,"containerRadius",Number(e.target.value))}/></label><label>Border thickness · {block.containerBorderWidth||1}px<input type="range" min="0" max="6" step="1" value={block.containerBorderWidth||1} onChange={e=>updateBlock(block.id,"containerBorderWidth",Number(e.target.value))}/></label><b>INNER ELEMENTS · {(block.children||[]).length}</b>{(block.children||[]).map((child,childIndex)=><div className="nested-child-row" key={child.id} draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",String(child.id));e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}} onDrop={e=>{e.preventDefault();const source=e.dataTransfer.getData("text/plain");if(source)reorderNestedChild(block.id,source,child.id);}}><div className="nested-child-toolbar"><small>⠿ {child.type.toUpperCase()} · {childIndex+1}</small><div><button type="button" disabled={childIndex===0} onClick={()=>reorderNestedChild(block.id,child.id,(block.children||[])[childIndex-1].id)} aria-label="Move inner element up">↑</button><button type="button" disabled={childIndex===(block.children||[]).length-1} onClick={()=>reorderNestedChild(block.id,child.id,(block.children||[])[childIndex+1].id)} aria-label="Move inner element down">↓</button></div></div>{child.type==="heading"?<input value={child.title||""} placeholder="Heading" onChange={e=>updateNestedChild(block.id,child.id,"title",e.target.value)}/>:child.type==="image"?<><select value={child.assetId||""} onChange={e=>updateNestedChild(block.id,child.id,"assetId",e.target.value)}><option value="">Choose media image</option>{mediaAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><input value={child.alt||""} placeholder="Image alt text" onChange={e=>updateNestedChild(block.id,child.id,"alt",e.target.value)}/></>:child.type==="gallery"?<select multiple value={child.assetIds||[]} onChange={e=>updateNestedChild(block.id,child.id,"assetIds",Array.from(e.target.selectedOptions).map(option=>option.value))}>{mediaAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select>:child.type==="columns"?<div className="nested-columns-fields">{(child.columns||[{title:"Column one",content:""},{title:"Column two",content:""}]).map((col,i)=><div key={i}><input value={col.title||""} placeholder="Column heading" onChange={e=>updateNestedChild(block.id,child.id,"columns",(child.columns||[{title:"Column one",content:""},{title:"Column two",content:""}]).map((v,j)=>j===i?{...v,title:e.target.value}:v))}/><textarea value={col.content||""} placeholder="Column content" onChange={e=>updateNestedChild(block.id,child.id,"columns",(child.columns||[{title:"Column one",content:""},{title:"Column two",content:""}]).map((v,j)=>j===i?{...v,content:e.target.value}:v))}/></div>)}</div>:<textarea value={child.content||""} placeholder="Content" onChange={e=>updateNestedChild(block.id,child.id,"content",e.target.value)}/>}{child.type==="button"&&<input value={child.linkUrl||""} placeholder="Button URL" onChange={e=>updateNestedChild(block.id,child.id,"linkUrl",e.target.value)}/>}<button type="button" onClick={()=>removeNestedChild(block.id,child.id)}>Remove</button></div>)}<div className="nested-child-actions"><button type="button" onClick={()=>addNestedChild(block.id,"heading")}>＋ Heading</button><button type="button" onClick={()=>addNestedChild(block.id,"text")}>＋ Text</button><button type="button" onClick={()=>addNestedChild(block.id,"button")}>＋ Button</button><button type="button" onClick={()=>addNestedChild(block.id,"image")}>＋ Image</button><button type="button" onClick={()=>addNestedChild(block.id,"gallery")}>＋ Gallery</button><button type="button" onClick={()=>addNestedChild(block.id,"columns")}>＋ Columns</button></div></div>}{["Gallery","Testimonials","Pricing","FAQ","Stats","Team","Logo strip","Columns"].includes(block.type)&&<div className="structured-block-editor">{(block.items||[]).map((item,itemIndex)=><div className="structured-item-editor" key={itemIndex}><b>{block.type} item {itemIndex+1}</b>
{block.type==="Gallery"&&<><select aria-label="Gallery image" value={item.assetId||""} onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,assetId:e.target.value}:v))}><option value="">Choose image from media library</option>{mediaAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><input aria-label="Image caption" value={item.caption||""} placeholder="Image caption" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,caption:e.target.value}:v))}/></>}
{block.type==="Testimonials"&&<><input value={item.name||""} placeholder="Customer name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/><input value={item.role||""} placeholder="Role / company" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,role:e.target.value}:v))}/><textarea value={item.quote||""} placeholder="Testimonial" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,quote:e.target.value}:v))}/></>}
{block.type==="Pricing"&&<><input value={item.name||""} placeholder="Plan name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/><input value={item.price||""} placeholder="Price" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,price:e.target.value}:v))}/><input value={item.period||""} placeholder="Billing period" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,period:e.target.value}:v))}/><textarea value={item.features||""} placeholder="One feature per line" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,features:e.target.value}:v))}/><label className="featured-toggle"><input type="checkbox" checked={!!item.featured} onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,featured:e.target.checked}:v))}/> Featured plan</label></>}
{block.type==="FAQ"&&<><input value={item.question||""} placeholder="Question" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,question:e.target.value}:v))}/><textarea value={item.answer||""} placeholder="Answer" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,answer:e.target.value}:v))}/></>}
{block.type==="Stats"&&<><input value={item.value||""} placeholder="Statistic (e.g. 98%)" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,value:e.target.value}:v))}/><input value={item.label||""} placeholder="Label" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,label:e.target.value}:v))}/></>}
{block.type==="Team"&&<><input value={item.name||""} placeholder="Name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/><input value={item.role||""} placeholder="Role" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,role:e.target.value}:v))}/><textarea value={item.bio||""} placeholder="Short bio" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,bio:e.target.value}:v))}/></>}
{block.type==="Logo strip"&&<input value={item.name||""} placeholder="Brand / partner name" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,name:e.target.value}:v))}/>}{block.type==="Columns"&&<><input value={item.title||""} placeholder="Column heading" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,title:e.target.value}:v))}/><textarea value={item.content||""} placeholder="Column content" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,content:e.target.value}:v))}/><input value={item.linkLabel||""} placeholder="Optional link label" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,linkLabel:e.target.value}:v))}/><input value={item.linkUrl||""} placeholder="Optional link URL (https://…)" onChange={e=>updateBlock(block.id,"items",block.items.map((v,i)=>i===itemIndex?{...v,linkUrl:e.target.value}:v))}/></>}
<button type="button" onClick={()=>updateBlock(block.id,"items",block.items.filter((v,i)=>i!==itemIndex))}>Remove item</button></div>)}<button type="button" onClick={()=>updateBlock(block.id,"items",[...(block.items||[]),block.type==="Gallery"?{assetId:"",caption:"New image"}:block.type==="Testimonials"?{name:"Customer",role:"",quote:""}:block.type==="Pricing"?{name:"New plan",price:"",period:"",features:"",featured:false}:block.type==="FAQ"?{question:"New question",answer:""}:block.type==="Stats"?{value:"0",label:"New metric"}:block.type==="Team"?{name:"New member",role:"Role",bio:""}:block.type==="Logo strip"?{name:"New brand"}:block.type==="Columns"?{title:"New column",content:"Add your content here."}:{name:"New item"}])} disabled={block.type==="Columns"&&(block.items||[]).length>=4}>＋ Add {block.type==="FAQ"?"question":block.type==="Pricing"?"plan":block.type==="Columns"?"column":"item"}</button></div>}</div><div className="block-controls"><button disabled={index===0} onClick={()=>moveBlock(index,-1)} title="Move up">↑</button><button disabled={index===blocks.length-1} onClick={()=>moveBlock(index,1)} title="Move down">↓</button><button onClick={()=>duplicateBlock(block)}>Duplicate</button><button onClick={()=>setSelectedBlockId(block.id)}>Design</button><button onClick={()=>setBlocks(current=>current.filter(item=>item.id!==block.id))}>Remove</button></div></div>)}</div></div><aside className="properties">{selectedBlock&&<><b>SELECTED ELEMENT · {selectedBlock.type.toUpperCase()}</b><label>Background color<input type="color" value={selectedBlock.backgroundColor||"#ffffff"} onChange={e=>{updateBlock(selectedBlock.id,"backgroundColor",e.target.value);updateBlock(selectedBlock.id,"gradientStyle","none");}}/></label><label>Gradient preset<select value={selectedBlock.gradientStyle||"none"} onChange={e=>updateBlock(selectedBlock.id,"gradientStyle",e.target.value)}><option value="none">No gradient</option><option value="sunset">Sunset</option><option value="ocean">Ocean</option><option value="violet">Violet</option><option value="forest">Forest</option><option value="midnight">Midnight</option></select></label><label>Shadow<select value={selectedBlock.shadowStyle||"none"} onChange={e=>updateBlock(selectedBlock.id,"shadowStyle",e.target.value)}><option value="none">None</option><option value="soft">Soft</option><option value="medium">Medium</option><option value="strong">Strong</option></select></label><label>Border color<input type="color" value={selectedBlock.borderColor||"#777777"} onChange={e=>updateBlock(selectedBlock.id,"borderColor",e.target.value)}/></label><label>Border width · {selectedBlock.borderWidth||0}px<input type="range" min="0" max="8" step="1" value={selectedBlock.borderWidth||0} onChange={e=>updateBlock(selectedBlock.id,"borderWidth",Number(e.target.value))}/></label><label>Corner radius · {selectedBlock.borderRadius||0}px<input type="range" min="0" max="48" step="2" value={selectedBlock.borderRadius||0} onChange={e=>updateBlock(selectedBlock.id,"borderRadius",Number(e.target.value))}/></label><label>Text alignment<div className="block-align-options"><button className={(selectedBlock.textAlign||"left")==="left"?"active":""} onClick={()=>updateBlock(selectedBlock.id,"textAlign","left")}>Left</button><button className={selectedBlock.textAlign==="center"?"active":""} onClick={()=>updateBlock(selectedBlock.id,"textAlign","center")}>Center</button><button className={selectedBlock.textAlign==="right"?"active":""} onClick={()=>updateBlock(selectedBlock.id,"textAlign","right")}>Right</button></div></label><label>Layout width<select value={selectedBlock.widthMode||"standard"} onChange={e=>updateBlock(selectedBlock.id,"widthMode",e.target.value)}><option value="standard">Standard content</option><option value="wide">Wide section</option><option value="full">Full width</option></select></label><label>Section spacing <input type="range" min="8" max="72" step="4" value={selectedBlock.padding||24} onChange={e=>updateBlock(selectedBlock.id,"padding",Number(e.target.value))}/><span className="property-note">{selectedBlock.padding||24}px padding</span></label><button className="clear-selection-btn" onClick={()=>setSelectedBlockId(null)}>Close element settings</button><div className="property-divider"></div></>}<b>PAGE SETTINGS</b><label>Page title<input value={siteName} onChange={e=>setSiteName(e.target.value)}/></label><label>Hero headline<textarea value={headline} onChange={e=>setHeadline(e.target.value)}/></label><label>Hero description<textarea value={subline} onChange={e=>setSubline(e.target.value)}/></label><div className="property-divider"></div><b>BRAND & APPEARANCE</b><div className="design-system-box"><div className="design-system-title"><b>Saved design system</b><span>Reusable brand themes</span></div><div className="design-preset-create"><input value={designPresetName} onChange={e=>setDesignPresetName(e.target.value)} placeholder="Name this design · e.g. Midnight"/><button type="button" className="ghost-btn" onClick={saveDesignPreset}>Save preset</button></div>{designPresetNotice&&<small className="property-note">{designPresetNotice}</small>}{savedDesignPresets.length?<div className="design-preset-list">{savedDesignPresets.map(preset=><div className="design-preset-row" key={preset.id}><div className="design-preset-swatches"><i style={{background:preset.brandColor}}/><i style={{background:preset.surfaceColor}}/></div><span><b>{preset.name}</b><small>{preset.siteFont} · {preset.headerStyle}</small></span><button type="button" onClick={()=>applyDesignPreset(preset)}>Apply</button><button type="button" aria-label={"Delete "+preset.name} onClick={()=>deleteDesignPreset(preset.id)}>×</button></div>)}</div>:<p className="property-note">Save your current colors, font and layout as a reusable preset. Up to 20 presets.</p>}</div><label>Brand accent<input type="color" value={brandColor} onChange={e=>setBrandColor(e.target.value)}/></label><label>Section surface<input type="color" value={surfaceColor} onChange={e=>setSurfaceColor(e.target.value)}/></label><div className="property-divider"></div><b>TYPOGRAPHY & BUTTONS</b><label>Heading size · {headingSize}px<input type="range" min="30" max="76" step="2" value={headingSize} onChange={e=>setHeadingSize(Number(e.target.value))}/></label><label>Body text size · {bodySize}px<input type="range" min="12" max="22" step="1" value={bodySize} onChange={e=>setBodySize(Number(e.target.value))}/></label><label>Text line spacing · {Number(textLineHeight).toFixed(2)}<input type="range" min="1.2" max="2" step="0.05" value={textLineHeight} onChange={e=>setTextLineHeight(Number(e.target.value))}/></label><label>Button shape<select value={buttonStyle} onChange={e=>setButtonStyle(e.target.value)}><option value="rounded">Rounded</option><option value="pill">Pill</option><option value="square">Square</option></select></label><label>Website font<select value={siteFont} onChange={e=>setSiteFont(e.target.value)}><option>Inter</option><option>Arial</option><option>Georgia</option><option>Trebuchet MS</option><option>Verdana</option></select></label><label>Header layout<select value={headerStyle} onChange={e=>setHeaderStyle(e.target.value)}><option value="standard">Standard navigation</option><option value="centered">Centered brand</option><option value="minimal">Minimal</option></select></label><label>Logo / brand text<input value={logoText} onChange={e=>setLogoText(e.target.value)} placeholder={siteName}/></label><label>Footer text<input value={footerText} onChange={e=>setFooterText(e.target.value)} placeholder="© Your business. All rights reserved."/></label><label>Extra navigation links<textarea rows="4" value={customNavText} onChange={e=>setCustomNavText(e.target.value)} placeholder={"Services | /services\nBook now | https://example.com/book"}/><span className="property-note">One link per line: Label | URL. Use /page for internal pages.</span></label><label>Social media links<textarea rows="4" value={socialLinksText} onChange={e=>setSocialLinksText(e.target.value)} placeholder={"Instagram | https://instagram.com/yourbrand\nYouTube | https://youtube.com/@yourbrand"}/><span className="property-note">One link per line: Platform | Full https:// URL.</span></label><label>Footer layout<select value={footerLayout} onChange={e=>setFooterLayout(e.target.value)}><option value="standard">Standard</option><option value="centered">Centered footer</option><option value="columns">Three-part footer</option></select></label><div className="property-note">Dropdown menu: add a parent link using “Services | #”, then add child links on the next lines starting with “- ”, for example “- Web Design | /web-design”.</div><div className="property-divider"></div><b>PUBLISHING</b><label>Free subdomain<input value={siteSubdomain} onChange={e=>setSiteSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="your-brand"/></label><div className="property-note">Your public address: {(siteSubdomain || siteName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "your-site")}.dukubusiness.online</div><div className="property-divider"></div><b>SEO & SEARCH</b><label>Search title<input value={seoTitle} onChange={e=>setSeoTitle(e.target.value)} placeholder={siteName}/></label><label>Meta description<textarea value={seoDescription} onChange={e=>setSeoDescription(e.target.value)} placeholder="Describe this page for search engines."/></label><label>Page URL slug<input value={siteSlug} onChange={e=>setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))}/></label><div className="seo-preview"><small>SEARCH PREVIEW</small><b>{seoTitle||siteName}</b><span>dukubusiness.online/{siteSlug}</span><p>{seoDescription||"Your page description will appear here in search results."}</p></div><div className="property-note">Changes update the preview and save on this device. SEO settings are draft-only until publishing is connected.</div></aside></div>{published&&<div className="publish-toast">✓ Website published at <a href={publishedUrl} target="_blank" rel="noreferrer">{publishedUrl}</a></div>}</div>}
  </div>;
}

function BlogPage() {
 const [posts,setPosts]=useState([]),[post,setPost]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const path=window.location.pathname;const slug=path.startsWith("/blog/")?path.slice(6).replace(/\/$/,""):"";
 useEffect(()=>{let active=true;(async()=>{setLoading(true);try{if(slug){const {data,error}=await supabase.from("blog_posts").select("*").eq("slug",slug).eq("status","published").maybeSingle();if(error)throw error;if(active){setPost(data);if(!data)setError("This article is not available.");}}else{const {data,error}=await supabase.from("blog_posts").select("id,slug,title,excerpt,cover_image_url,category,author_name,published_at").eq("status","published").order("published_at",{ascending:false}).limit(50);if(error)throw error;if(active)setPosts(data||[]);}}catch(e){if(active)setError(e.message||"Unable to load the newsroom.");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[slug]);
 useEffect(()=>{document.title=post?post.title+" | DuKu Business":"Newsroom | DuKu Business";},[post]);
 return <div className="public-blog"><header><a className="brand" href="/"><span className="brand-mark">D</span><span>DuKu <b>FCA</b></span></a><nav><a href="/">Home</a><a href="/#templates">Templates</a><a href="/#pricing">Plans</a></nav></header><main>{post?<article className="public-blog-article"><a href="/blog">← Back to newsroom</a><div className="eyebrow">{post.category} · {post.published_at?new Date(post.published_at).toLocaleDateString():""}</div><h1>{post.title}</h1><p className="blog-excerpt">{post.excerpt}</p>{post.cover_image_url&&<img className="blog-cover" src={post.cover_image_url} alt=""/>}<div className="blog-body">{post.body.split("\n\n").map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div><small>By {post.author_name||"DuKu Editorial"}</small></article>:<><div className="eyebrow">DUKU BUSINESS · NEWSROOM</div><h1>News, ideas & <em>updates.</em></h1><p>Explore announcements, product releases and engineering stories.</p>{loading?<p>Loading articles…</p>:error?<p>{error}</p>:<div className="blog-card-grid">{posts.map(p=><article key={p.id}>{p.cover_image_url&&<img src={p.cover_image_url} alt=""/>}<small>{p.category} · {p.published_at?new Date(p.published_at).toLocaleDateString():""}</small><h2>{p.title}</h2><p>{p.excerpt}</p><a href={"/blog/"+p.slug}>Read article ↗</a></article>)}</div>}{!loading&&!posts.length&&!error&&<p>No articles published yet. Please check back soon.</p>}</>}</main><footer>DuKu Business is an official subsidiary of Upreti Industries Limited (UIL). · © DuKu Business. All rights reserved.</footer></div>;
}

function App() {
  const host = window.location.hostname;
  if (host.startsWith("admin.")) return <AdminPortal />;
  if (window.location.pathname==="/blog" || window.location.pathname.startsWith("/blog/")) return <BlogPage />;
  if (host !== "dukubusiness.online" && host !== "www.dukubusiness.online" && host.endsWith(".dukubusiness.online")) return <TenantSite />;
  return <MainApp />;
}

export default App;
