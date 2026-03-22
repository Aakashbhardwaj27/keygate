import { useState, useCallback, useEffect } from "react";
import {
  LayoutDashboard, FolderKanban, Users, Key, Shield, ScrollText, Settings,
  ChevronRight, Sun, Moon, Plus, Search, MoreHorizontal, ArrowUpRight,
  AlertTriangle, CheckCircle2, XCircle, RotateCw, UserPlus, Trash2, Pencil,
  Lock, Activity, TrendingUp, X, LogOut, Eye, EyeOff, Copy, Check,
  RefreshCw, Building2, Zap, Clock, Filter, Download, ChevronDown,
  Server, ArrowLeft, SlidersHorizontal, Database, ExternalLink, Info,
  ChevronLeft,
} from "lucide-react";
import "./App.css";
// ─── API Layer ───────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || "";
let _token = localStorage.getItem("kg_token") || null;
const setTok = (t) => { _token = t; localStorage.setItem("kg_token", t); };
const clearTok = () => { _token = null; localStorage.removeItem("kg_token"); };
export const getToken = () => _token;

async function req(method, path, body = null) {
  const h = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  const r = await fetch(`${BASE}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : null });
  if (r.status === 401) { clearTok(); window.location.reload(); throw new Error("Unauthorized"); }
  if (!r.ok) { const e = await r.json().catch(() => ({ detail: r.statusText })); throw new Error(e.detail || "Request failed"); }
  return r.json();
}

const api = {
  login:       (e, p)   => req("POST", "/api/v1/auth/login", { email: e, password: p }).then(d => { setTok(d.access_token); return d; }),
  stats:       ()       => req("GET",  "/api/v1/dashboard/stats"),
  workspaces:  ()       => req("GET",  "/api/v1/workspaces"),
  workspace:   (id)     => req("GET",  `/api/v1/workspaces/${id}`),
  createWs:    (d)      => req("POST", "/api/v1/workspaces", d),
  updateWs:    (id, d)  => req("PUT",  `/api/v1/workspaces/${id}`, d),
  archiveWs:   (id)     => req("POST", `/api/v1/workspaces/${id}/archive`),
  wsMembers:   (id)     => req("GET",  `/api/v1/workspaces/${id}/members`),
  addWsMember: (id, d)  => req("POST", `/api/v1/workspaces/${id}/members`, d),
  rmWsMember:  (id, uid)=> req("DELETE",`/api/v1/workspaces/${id}/members/${uid}`),
  setWsMemberRole:(wsId,devId,role)=>req("PUT",`/api/v1/workspaces/${wsId}/members/${devId}/role`,{role}),
  members:     ()       => req("GET",  "/api/v1/members"),
  invite:      (d)      => req("POST", "/api/v1/members/invite", d),
  setRole:     (id, r)  => req("PUT",  `/api/v1/members/${id}/role`, { role: r }),
  suspend:     (id)     => req("POST", `/api/v1/members/${id}/suspend`),
  vendors:     ()       => req("GET",  "/api/v1/vendors"),
  configVendor:(d)      => req("POST", "/api/v1/vendors/configure", d),
  keys:        (p="")   => req("GET",  `/api/v1/keys?${p}`),
  provision:   (d)      => req("POST", "/api/v1/keys/provision", d),
  revoke:      (id)     => req("POST", `/api/v1/keys/${id}/revoke`),
  rotate:      (id)     => req("POST", `/api/v1/keys/${id}/rotate`),
  audit:       (n=100)  => req("GET",  `/api/v1/audit?limit=${n}`),
};

// ─── Constants ───────────────────────────────────────────────
const VENDORS = {
  openai:       { label:"OpenAI",       color:"#10a37f", desc:"The most popular set of models for text, chat, image and voice.", models:[
    {id:"gpt-4o",name:"GPT-4o",type:"chat",context:"128K",pricing:"$2.50 / $10"},{id:"gpt-4o-mini",name:"GPT-4o Mini",type:"chat",context:"128K",pricing:"$0.15 / $0.60"},
    {id:"gpt-4.1",name:"GPT-4.1",type:"chat",context:"1M",pricing:"$2 / $8"},{id:"gpt-4.1-mini",name:"GPT-4.1 Mini",type:"chat",context:"1M",pricing:"$0.40 / $1.60"},
    {id:"o1",name:"o1",type:"reasoning",context:"200K",pricing:"$15 / $60"},{id:"o3-mini",name:"o3 Mini",type:"reasoning",context:"200K",pricing:"$1.10 / $4.40"},
    {id:"text-embedding-3-large",name:"Embedding 3 Large",type:"embedding",context:"8K",pricing:"$0.13 / 1M"},{id:"dall-e-3",name:"DALL·E 3",type:"image",context:"—",pricing:"$0.04–0.12"},
    {id:"whisper-1",name:"Whisper",type:"audio",context:"—",pricing:"$0.006 / min"},
  ]},
  anthropic:    { label:"Anthropic",    color:"#d97706", desc:"Anthropic offers models for text generation like Claude & more.", models:[
    {id:"claude-opus-4",name:"Claude Opus 4",type:"chat",context:"200K",pricing:"$15 / $75",flagship:true},{id:"claude-sonnet-4",name:"Claude Sonnet 4",type:"chat",context:"200K",pricing:"$3 / $15",flagship:true},
    {id:"claude-haiku-3.5",name:"Claude Haiku 3.5",type:"chat",context:"200K",pricing:"$0.80 / $4"},
  ]},
  azure_openai: { label:"Azure OpenAI", color:"#0078d4", desc:"Azure OpenAI provides SOTA models deployed on Microsoft Azure.", models:[
    {id:"gpt-4o",name:"GPT-4o (Azure)",type:"chat",context:"128K",pricing:"region pricing"},{id:"gpt-4o-mini",name:"GPT-4o Mini (Azure)",type:"chat",context:"128K",pricing:"region pricing"},
  ]},
  google_vertex:{ label:"Vertex AI",    color:"#4285f4", desc:"Vertex AI lets you train and deploy ML models on Google Cloud.", models:[
    {id:"gemini-2.5-pro",name:"Gemini 2.5 Pro",type:"chat",context:"1M",pricing:"$1.25 / $10",flagship:true},{id:"gemini-2.5-flash",name:"Gemini 2.5 Flash",type:"chat",context:"1M",pricing:"$0.15 / $0.60"},
    {id:"text-embedding-004",name:"Embedding 004",type:"embedding",context:"2K",pricing:"$0.0001 / 1K"},
  ]},
  mistral:      { label:"Mistral",      color:"#ff7000", desc:"Mistral AI — frontier models from Europe.", models:[
    {id:"mistral-large",name:"Mistral Large 2",type:"chat",context:"128K",pricing:"$2 / $6"},{id:"codestral",name:"Codestral",type:"code",context:"256K",pricing:"$0.30 / $0.90"},
  ]},
  cohere:       { label:"Cohere",       color:"#39594d", desc:"Cohere offers models for text generation & more.", models:[
    {id:"command-r-plus",name:"Command R+",type:"chat",context:"128K",pricing:"$2.50 / $10"},{id:"embed-v3",name:"Embed v3",type:"embedding",context:"512",pricing:"$0.10 / 1M"},
  ]},
};
const MODEL_TYPES = {chat:{label:"Chat",color:"#6366f1"},reasoning:{label:"Reasoning",color:"#8b5cf6"},embedding:{label:"Embedding",color:"#0ea5e9"},image:{label:"Image",color:"#ec4899"},audio:{label:"Audio",color:"#f59e0b"},code:{label:"Code",color:"#10b981"}};
const ROLES = {
  owner:    { label:"Owner",     color:"#dc2626" },
  admin:    { label:"Admin",     color:"#f59e0b" },
  developer:{ label:"Developer", color:"#6366f1" },
  viewer:   { label:"Viewer",    color:"#6b7280" },
};
const COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
const RBAC_PERMS = [
  ["View workspaces",    [1,1,1,1]],["Create workspace",  [1,1,0,0]],["Archive workspace",[1,0,0,0]],
  ["View keys",          [1,1,1,1]],["Provision keys",    [1,1,1,0]],["Revoke keys",      [1,1,0,0]],
  ["Rotate keys",        [1,1,1,0]],["View members",      [1,1,1,1]],["Invite members",   [1,1,0,0]],
  ["Change org roles",   [1,0,0,0]],["Suspend members",   [1,1,0,0]],["View audit log",   [1,1,1,1]],
  ["Configure vendors",  [1,0,0,0]],["Configure billing", [1,0,0,0]],
];

const fmt    = (n)   => n?.toLocaleString() ?? "—";
const fmtD   = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
const fmtT   = (iso) => iso ? new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtRel = (iso) => { if(!iso) return "—"; const d=Date.now()-new Date(iso).getTime(),m=Math.floor(d/60000); if(m<60) return `${m}m ago`; const h=Math.floor(m/60); if(h<24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; };
const pct    = (a,b) => b ? Math.round(a/b*100) : 0;
const initials = (n) => (n||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

// ─── Data hook ───────────────────────────────────────────────
function useApi(fn, deps=[]) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fn()); } catch(e) { setError(e.message); } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}



// ─── Tiny components ─────────────────────────────────────────
const VBadge = ({v}) => { const d=VENDORS[v]||{label:v,color:"#888"}; return <span className="vbadge" style={{background:d.color+"10",color:d.color}}><span style={{width:6,height:6,borderRadius:2,background:d.color,display:"inline-block"}}/>{d.label}</span>; };
const SBadge = ({s}) => { const m={active:{c:"var(--ok)",bg:"rgba(5,150,105,.07)"},revoked:{c:"var(--err)",bg:"rgba(220,38,38,.07)"},rotated:{c:"var(--warn)",bg:"rgba(217,119,6,.07)"},suspended:{c:"var(--warn)",bg:"rgba(217,119,6,.07)"},archived:{c:"var(--t3)",bg:"var(--bg2)"}}[s]||{c:"var(--t3)",bg:"var(--bg2)"}; return <span className="badge" style={{background:m.bg,color:m.c}}><span style={{width:5,height:5,borderRadius:"50%",background:m.c}}/>{s}</span>; };
const RBadge = ({r}) => { const d=ROLES[r]||ROLES.viewer; return <span className="rbadge" style={{background:d.color+"10",color:d.color}}>{d.label}</span>; };
const Pill   = ({on,children,...p}) => <button className={`pl${on?" on":""}`} {...p}>{children}</button>;
const Spin   = () => <RefreshCw size={14} className="spin" style={{color:"var(--t3)"}}/>;
const ErrBox = ({msg}) => <div className="err-box"><AlertTriangle size={13}/>{msg}</div>;
const Empty  = ({msg="No data yet."}) => <div className="empty">{msg}</div>;

function Toast({msg,ok}) {
  return <div style={{position:"fixed",bottom:20,right:20,zIndex:999,background:ok?"var(--ok)":"var(--err)",color:"#fff",padding:"8px 16px",borderRadius:8,fontSize:12.5,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,.2)",display:"flex",alignItems:"center",gap:6,animation:"su .2s ease"}}>{ok?<CheckCircle2 size={14}/>:<AlertTriangle size={14}/>}{msg}</div>;
}

function useToast() {
  const [t,setT] = useState(null);
  const show = (msg,ok=true) => { setT({msg,ok}); setTimeout(()=>setT(null),3200); };
  return [t, show];
}

function Modal({title,onClose,footer,wide,children}) {
  return <div className="mo" onClick={onClose}><div className="md sun" style={wide?{width:640}:{}} onClick={e=>e.stopPropagation()}><div className="md-h"><h3>{title}</h3><button className="btn btn-g btn-xs" onClick={onClose}><X size={14}/></button></div><div className="md-b">{children}</div>{footer&&<div className="md-f">{footer}</div>}</div></div>;
}

function AvatarCircle({name, size=28}) {
  return <div style={{width:size,height:size,borderRadius:Math.floor(size*0.2),background:"var(--acc)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,flexShrink:0}}>{initials(name)}</div>;
}

// ─── Login ───────────────────────────────────────────────────
function Login({onLogin}) {
  const [email,setEmail]   = useState("admin@keygate.dev");
  const [pass,setPass]     = useState("changeme");
  const [loading,setLoad]  = useState(false);
  const [err,setErr]       = useState(null);
  const submit = async(e) => { e.preventDefault(); setLoad(true); setErr(null); try{await onLogin(email,pass);}catch(x){setErr(x.message);} finally{setLoad(false);} };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg0)"}}>
      <div style={{width:360,background:"var(--card)",border:"1px solid var(--brd)",borderRadius:12,padding:32,boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}><span style={{width:8,height:8,borderRadius:"50%",background:"var(--acc)"}}/><span style={{fontWeight:700,fontSize:16}}>KeyGate</span></div>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:6}}>Sign in</h2>
        <p style={{fontSize:12.5,color:"var(--t2)",marginBottom:20}}>API key management console</p>
        {err&&<div style={{marginBottom:12}}><ErrBox msg={err}/></div>}
        <form onSubmit={submit}>
          <div className="fg"><label className="fl">Email</label><input className="fi" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={pass} onChange={e=>setPass(e.target.value)} required/></div>
          <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:4}} disabled={loading}>{loading?<><Spin/>Signing in…</>:"Sign in"}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────
function Dashboard() {
  const {data,loading,error,refetch} = useApi(api.stats);
  if (loading) return <div className="fin empty"><Spin/></div>;
  if (error)   return <div className="fin"><ErrBox msg={error}/></div>;
  const d = data||{};
  const vEntries = Object.entries(d.keys_by_vendor||{});
  const tEntries = Object.entries(d.keys_by_team||{});
  return (
    <div className="fin">
      <div className="ph"><div><h2>Dashboard</h2><p>Organization health at a glance</p></div><button className="btn btn-g btn-s" onClick={refetch}><RefreshCw size={12}/>Refresh</button></div>
      <div className="sg sg5">
        <div className="sc"><div className="sc-l">Workspaces<FolderKanban size={13}/></div><div className="sc-v">{fmt(d.total_workspaces)}</div><div className="sc-d">active environments</div></div>
        <div className="sc"><div className="sc-l">Developers<Users size={13}/></div><div className="sc-v">{fmt(d.active_developers)}</div><div className="sc-d">{fmt(d.total_developers)} total registered</div></div>
        <div className="sc"><div className="sc-l">Active Keys<Key size={13}/></div><div className="sc-v">{fmt(d.active_keys)}</div><div className="sc-d">{fmt(d.total_keys_issued)} total issued</div></div>
        <div className="sc"><div className="sc-l">Budget Alloc<TrendingUp size={13}/></div><div className="sc-v">${fmt(d.total_budget_allocated)}</div><div className="sc-d">across active keys</div></div>
        <div className="sc"><div className="sc-l">Revoked<XCircle size={13}/></div><div className="sc-v">{fmt(d.revoked_keys)}</div><div className="sc-d">{d.total_keys_issued?pct(d.revoked_keys,d.total_keys_issued):0}% of all keys</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        <div className="tw"><div className="tw-hd"><h3>Keys by Vendor</h3></div><div style={{padding:16}}>{vEntries.length===0?<Empty msg="No keys yet"/>:vEntries.map(([v,c])=><div key={v} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--brd-s)"}}><VBadge v={v}/><span className="mono">{c}</span></div>)}</div></div>
        <div className="tw"><div className="tw-hd"><h3>Keys by Team</h3></div><div style={{padding:16}}>{tEntries.length===0?<Empty msg="No teams yet"/>:tEntries.map(([t,c])=><div key={t} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--brd-s)"}}><span style={{fontWeight:550}}>{t}</span><span className="mono">{c}</span></div>)}</div></div>
        <div className="tw"><div className="tw-hd"><h3>Vendors</h3></div><div style={{padding:16}}>{(d.vendors_configured||[]).length===0?<div style={{fontSize:12,color:"var(--t3)"}}>No vendors configured. Go to Settings.</div>:(d.vendors_configured||[]).map(v=><div key={v} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--brd-s)"}}><VBadge v={v}/><span style={{marginLeft:"auto"}}><SBadge s="active"/></span></div>)}</div></div>
      </div>
      <div className="tw"><div className="tw-hd"><h3>Recent Activity</h3></div>{(d.recent_activity||[]).length===0?<Empty msg="No activity yet"/>:(d.recent_activity||[]).map((e,i)=><div className="al" key={i}><div className="al-ic" style={{background:"#6366f110",color:"#6366f1"}}><Activity size={13}/></div><div className="al-c"><div className="al-a">{e.action.replace(/_/g," · ")}</div><div className="al-d">{e.actor}{e.details&&Object.keys(e.details).length>0?" — "+JSON.stringify(e.details):""}</div></div><div className="al-t">{fmtRel(e.created_at)}</div></div>)}</div>
    </div>
  );
}

// ─── Workspaces list ─────────────────────────────────────────
function WorkspacesPage({onOpen}) {
  const {data:wsList,loading,error,refetch} = useApi(api.workspaces);
  const [modal,setModal] = useState(false);
  const [form,setForm]   = useState({name:"",description:"",color:"#6366f1",spend_limit:1000,rate_limit_rpm:200});
  const [saving,setSaving]= useState(false);
  const [toast,showToast]= useToast();

  const create = async() => {
    if(!form.name) return showToast("Name required",false);
    setSaving(true);
    try { await api.createWs({...form,spend_limit:Number(form.spend_limit),rate_limit_rpm:Number(form.rate_limit_rpm)}); setModal(false); setForm({name:"",description:"",color:"#6366f1",spend_limit:1000,rate_limit_rpm:200}); showToast("Workspace created"); refetch(); }
    catch(e){showToast(e.message,false);} finally{setSaving(false);}
  };

  return (
    <div className="fin">
      {toast&&<Toast msg={toast.msg} ok={toast.ok}/>}
      <div className="ph"><div><h2>Workspaces</h2><p>Isolated environments with separate keys, members, and spend limits</p></div><div className="ph-a"><button className="btn btn-g btn-s" onClick={refetch}><RefreshCw size={12}/></button><button className="btn btn-p" onClick={()=>setModal(true)}><Plus size={13}/>New Workspace</button></div></div>
      {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:(
        <div className="wg">
          {(wsList||[]).map(ws=>(
            <div className="wc" key={ws.id} onClick={()=>onOpen(ws.id)}>
              <div className="wc-bar" style={{background:ws.color}}/>
              <div style={{fontWeight:650,fontSize:14,marginTop:2}}>{ws.name}</div>
              <div style={{fontSize:11.5,color:"var(--t2)",marginTop:2}}>{ws.description||"No description"}</div>
              <div style={{display:"flex",gap:12,marginTop:10,fontSize:11,color:"var(--t2)"}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}><Key size={11}/>{ws.key_count} keys</span>
                <span style={{display:"flex",alignItems:"center",gap:3}}><Users size={11}/>{ws.member_count} members</span>
              </div>
              <div style={{marginTop:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:"var(--t2)",marginBottom:4}}><span>Budget allocated</span><span className="mono">${fmt(ws.total_budget_allocated)} / ${fmt(ws.spend_limit)}</span></div>
                <div className="pr"><div className="pf" style={{width:`${Math.min(pct(ws.total_budget_allocated,ws.spend_limit),100)}%`,background:pct(ws.total_budget_allocated,ws.spend_limit)>80?"var(--err)":ws.color}}/></div>
              </div>
            </div>
          ))}
          {(wsList||[]).length===0&&<div style={{gridColumn:"1/-1"}}><Empty msg="No workspaces yet. Create one to get started."/></div>}
        </div>
      )}
      {modal&&<Modal title="Create Workspace" onClose={()=>setModal(false)} footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-p" onClick={create} disabled={saving}>{saving?<><Spin/>Creating…</>:"Create"}</button></>}>
        <div className="fg"><label className="fl">Name</label><input className="fi" placeholder="Production" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="fg"><label className="fl">Description</label><input className="fi" placeholder="What is this workspace for?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div className="fg"><label className="fl">Spend Limit ($)</label><input className="fi" type="number" value={form.spend_limit} onChange={e=>setForm({...form,spend_limit:e.target.value})}/></div>
          <div className="fg"><label className="fl">Rate Limit (RPM)</label><input className="fi" type="number" value={form.rate_limit_rpm} onChange={e=>setForm({...form,rate_limit_rpm:e.target.value})}/></div>
        </div>
        <div className="fg"><label className="fl">Color</label><div style={{display:"flex",gap:6}}>{COLORS.map(c=><div key={c} onClick={()=>setForm({...form,color:c})} style={{width:24,height:24,borderRadius:5,background:c,cursor:"pointer",border:c===form.color?"2px solid var(--t0)":"2px solid transparent"}}/> )}</div></div>
      </Modal>}
    </div>
  );
}

// ─── Workspace Detail ────────────────────────────────────────
function WorkspaceDetail({wsId,onBack}) {
  const {data:ws,loading,error,refetch} = useApi(()=>api.workspace(wsId),[wsId]);
  const [tab,setTab] = useState("overview");
  const [toast,showToast] = useToast();
  if(loading) return <div className="fin empty"><Spin/></div>;
  if(error)   return <div className="fin"><ErrBox msg={error}/><button className="btn btn-g btn-s" style={{marginTop:12}} onClick={onBack}>← Back</button></div>;
  if(!ws) return null;

  const tabs = [
    {id:"overview",label:"Overview",Ic:LayoutDashboard},
    {id:"keys",label:"Keys",Ic:Key},
    {id:"members",label:"Members",Ic:Users},
    {id:"policies",label:"Policies",Ic:Shield},
    {id:"audit",label:"Activity",Ic:ScrollText},
    {id:"settings",label:"Settings",Ic:Settings},
  ];

  return (
    <div className="fin">
      {toast&&<Toast msg={toast.msg} ok={toast.ok}/>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,fontSize:12.5,color:"var(--t2)"}}>
        <button className="btn btn-g btn-s" onClick={onBack}><ChevronRight size={12} style={{transform:"rotate(180deg)"}}/>All Workspaces</button>
      </div>
      <div className="ph">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:8,background:ws.color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><FolderKanban size={20} style={{color:ws.color}}/></div>
          <div><h2>{ws.name}</h2><p>{ws.description||"No description"}</p></div>
        </div>
        <div className="ph-a"><button className="btn btn-g btn-s" onClick={refetch}><RefreshCw size={12}/></button></div>
      </div>
      <div className="tabs">{tabs.map(t=><button key={t.id} className={`tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}><t.Ic size={13}/>{t.label}</button>)}</div>
      {tab==="overview" && <WsOverview ws={ws}/>}
      {tab==="keys"     && <WsKeys ws={ws} showToast={showToast}/>}
      {tab==="members"  && <WsMembers ws={ws} showToast={showToast}/>}
      {tab==="policies" && <WsPolicies ws={ws} showToast={showToast} refetch={refetch}/>}
      {tab==="audit"    && <WsAudit ws={ws}/>}
      {tab==="settings" && <WsSettings ws={ws} showToast={showToast} refetch={refetch} onBack={onBack}/>}
    </div>
  );
}

function WsOverview({ws}) {
  const {data:keys} = useApi(()=>api.keys(`workspace_id=${ws.id}&status=active`),[ws.id]);
  const {data:mems} = useApi(()=>api.wsMembers(ws.id),[ws.id]);
  const ks = keys||[]; const ms = mems||[];
  return <>
    <div className="sg sg4">
      <div className="sc"><div className="sc-l">Active Keys<Key size={13}/></div><div className="sc-v">{ws.key_count}</div><div className="sc-d">in this workspace</div></div>
      <div className="sc"><div className="sc-l">Members<Users size={13}/></div><div className="sc-v">{ws.member_count}</div><div className="sc-d">assigned</div></div>
      <div className="sc"><div className="sc-l">Budget Used<TrendingUp size={13}/></div><div className="sc-v">${fmt(ws.total_budget_allocated)}</div><div className="sc-d">of ${fmt(ws.spend_limit)} limit</div></div>
      <div className="sc"><div className="sc-l">Rate Limit<Zap size={13}/></div><div className="sc-v">{fmt(ws.rate_limit_rpm)}</div><div className="sc-d">requests / minute</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div className="tw"><div className="tw-hd"><h3>Top Keys</h3></div><div style={{padding:16}}>
        {ks.length===0?<Empty msg="No active keys"/>:ks.slice(0,5).map(k=><div key={k.key_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--brd-s)"}}><div><div style={{fontSize:12.5,fontWeight:550}}>{k.project_name}</div><div style={{fontSize:10.5,color:"var(--t3)"}}>{k.developer_name}</div></div><VBadge v={k.vendor}/></div>)}
      </div></div>
      <div className="tw"><div className="tw-hd"><h3>Members</h3></div><div style={{padding:16}}>
        {ms.length===0?<Empty msg="No members"/>:ms.slice(0,5).map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--brd-s)"}}><AvatarCircle name={m.name} size={26}/><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:550}}>{m.name}</div><div style={{fontSize:10.5,color:"var(--t3)"}}>{m.email}</div></div><RBadge r={m.workspace_role}/></div>)}
      </div></div>
    </div>
  </>;
}

function WsKeys({ws,showToast}) {
  const {data:keys,loading,error,refetch} = useApi(()=>api.keys(`workspace_id=${ws.id}`),[ws.id]);
  const {data:allDevs} = useApi(api.members);
  const [modal,setModal] = useState(false);
  const [form,setForm]   = useState({developer_id:"",vendor:"openai",budget_limit_usd:100,rate_limit_rpm:60,expires_in_days:90,models_allowed:"",description:""});
  const [saving,setSaving]= useState(false);
  const [newKey,setNewKey]= useState(null);
  const [copied,setCopied]= useState(false);

  const provision = async() => {
    if(!form.developer_id) return showToast("Select a developer",false);
    setSaving(true);
    try {
      const r = await api.provision({...form,workspace_id:ws.id,budget_limit_usd:Number(form.budget_limit_usd),rate_limit_rpm:Number(form.rate_limit_rpm),expires_in_days:Number(form.expires_in_days),models_allowed:form.models_allowed?form.models_allowed.split(",").map(s=>s.trim()).filter(Boolean):null});
      setModal(false); setNewKey(r); refetch();
    } catch(e){showToast(e.message,false);} finally{setSaving(false);}
  };
  const doRevoke = async(id) => { if(!confirm("Revoke this key?")) return; try{await api.revoke(id);showToast("Revoked");refetch();}catch(e){showToast(e.message,false);} };
  const doRotate = async(id) => { if(!confirm("Rotate this key?")) return; try{const r=await api.rotate(id);setNewKey(r);showToast("Rotated");refetch();}catch(e){showToast(e.message,false);} };
  const copy = () => { navigator.clipboard.writeText(newKey.api_key||""); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return <>
    {newKey&&<Modal title="🔑 Key Provisioned — Copy Now" onClose={()=>setNewKey(null)} footer={<button className="btn btn-p" onClick={()=>setNewKey(null)}>I've saved it</button>}>
      <div className="info-box" style={{marginBottom:12}}><strong>⚠️ Shown only once.</strong> KeyGate never stores the full key.</div>
      <div className="mono" style={{background:"var(--bg2)",padding:"10px 12px",borderRadius:6,wordBreak:"break-all",fontSize:11.5,border:"1px solid var(--brd)",marginBottom:8}}>{newKey.api_key}</div>
      <button className="btn btn-g btn-s" onClick={copy}>{copied?<><Check size={12}/>Copied!</>:<><Copy size={12}/>Copy Key</>}</button>
      {newKey.project_name&&<p style={{fontSize:12,color:"var(--t2)",marginTop:8}}>Project: <strong>{newKey.project_name}</strong> · Expires: {fmtD(newKey.expires_at)}</p>}
    </Modal>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <span style={{fontSize:12.5,color:"var(--t2)"}}>{(keys||[]).filter(k=>k.status==="active").length} active keys</span>
      <button className="btn btn-p btn-s" onClick={()=>setModal(true)}><Plus size={12}/>Provision Key</button>
    </div>
    {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:(
      <div className="tw"><table><thead><tr><th>Project</th><th>Developer</th><th>Vendor</th><th>Hint</th><th>Budget</th><th>Expires</th><th>Status</th><th style={{width:70}}></th></tr></thead>
      <tbody>{(keys||[]).length===0?<tr><td colSpan={8}><Empty msg="No keys in this workspace"/></td></tr>:(keys||[]).map(k=><tr key={k.key_id}>
        <td><div style={{fontWeight:550,fontSize:12.5}}>{k.project_name}</div><div style={{fontSize:10.5,color:"var(--t3)"}}>{k.description}</div></td>
        <td><div style={{fontSize:12.5}}>{k.developer_name}</div><div className="mono" style={{fontSize:10.5,color:"var(--t3)"}}>{k.team}</div></td>
        <td><VBadge v={k.vendor}/></td>
        <td className="mono" style={{color:"var(--t2)"}}>{k.key_hint}</td>
        <td className="mono" style={{fontSize:11}}>${fmt(k.budget_limit_usd)}</td>
        <td style={{fontSize:11.5,color:"var(--t2)"}}>{fmtD(k.expires_at)}</td>
        <td><SBadge s={k.status}/></td>
        <td>{k.status==="active"&&<div style={{display:"flex",gap:2}}><button className="btn btn-g btn-xs" onClick={()=>doRotate(k.key_id)} title="Rotate"><RotateCw size={10}/></button><button className="btn btn-d btn-xs" onClick={()=>doRevoke(k.key_id)} title="Revoke"><Trash2 size={10}/></button></div>}</td>
      </tr>)}</tbody></table></div>
    )}
    {modal&&<Modal title={`Provision Key — ${ws.name}`} onClose={()=>setModal(false)} footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-p" onClick={provision} disabled={saving}>{saving?<><Spin/>Provisioning…</>:"Provision"}</button></>}>
      <div className="fg"><label className="fl">Developer</label><select className="fs" value={form.developer_id} onChange={e=>setForm({...form,developer_id:e.target.value})}><option value="">Select…</option>{(allDevs||[]).filter(d=>d.is_active).map(d=><option key={d.id} value={d.id}>{d.name} ({d.team})</option>)}</select></div>
      <div className="fg"><label className="fl">Vendor</label><select className="fs" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}>{Object.entries(VENDORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
      <div className="fg"><label className="fl">Description</label><input className="fi" placeholder="What is this key for?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <div className="fg"><label className="fl">Budget ($)</label><input className="fi" type="number" value={form.budget_limit_usd} onChange={e=>setForm({...form,budget_limit_usd:e.target.value})}/></div>
        <div className="fg"><label className="fl">RPM</label><input className="fi" type="number" value={form.rate_limit_rpm} onChange={e=>setForm({...form,rate_limit_rpm:e.target.value})}/></div>
        <div className="fg"><label className="fl">Expires (days)</label><input className="fi" type="number" value={form.expires_in_days} onChange={e=>setForm({...form,expires_in_days:e.target.value})}/></div>
      </div>
      <div className="fg"><label className="fl">Allowed Models (comma-sep, blank=all)</label><input className="fi" placeholder="gpt-4o, claude-sonnet-4" value={form.models_allowed} onChange={e=>setForm({...form,models_allowed:e.target.value})}/></div>
    </Modal>}
  </>;
}

function WsMembers({ws,showToast}) {
  const {data:mems,loading,error,refetch} = useApi(()=>api.wsMembers(ws.id),[ws.id]);
  const {data:allDevs} = useApi(api.members);
  const [modal,setModal] = useState(false);
  const [form,setForm]   = useState({developer_id:"",role:"developer"});
  const [saving,setSaving]= useState(false);

  const addMember = async() => {
    if(!form.developer_id) return showToast("Select a developer",false);
    setSaving(true);
    try{await api.addWsMember(ws.id,form);setModal(false);showToast("Member added");refetch();}
    catch(e){showToast(e.message,false);}finally{setSaving(false);}
  };
  const remove = async(devId) => { if(!confirm("Remove from workspace?")) return; try{await api.rmWsMember(ws.id,devId);showToast("Removed");refetch();}catch(e){showToast(e.message,false);} };
  const changeRole = async(devId,role) => { try{await api.setWsMemberRole(ws.id,devId,role);refetch();}catch(e){showToast(e.message,false);} };

  const assignedIds = new Set((mems||[]).map(m=>m.id));
  const unassigned  = (allDevs||[]).filter(d=>d.is_active&&!assignedIds.has(d.id));

  return <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <span style={{fontSize:12.5,color:"var(--t2)"}}>{(mems||[]).length} members in this workspace</span>
      <button className="btn btn-p btn-s" onClick={()=>setModal(true)}><UserPlus size={12}/>Add Member</button>
    </div>
    {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:(
      <div className="tw"><table><thead><tr><th>Member</th><th>Org Role</th><th>Workspace Role</th><th>Active Keys</th><th>Added</th><th style={{width:60}}></th></tr></thead>
      <tbody>{(mems||[]).length===0?<tr><td colSpan={6}><Empty msg="No members assigned"/></td></tr>:(mems||[]).map(m=><tr key={m.id}>
        <td><div style={{display:"flex",alignItems:"center",gap:8}}><AvatarCircle name={m.name} size={28}/><div><div style={{fontWeight:550,fontSize:13}}>{m.name}</div><div className="mono" style={{fontSize:10.5,color:"var(--t3)"}}>{m.email}</div></div></div></td>
        <td><RBadge r={m.org_role}/></td>
        <td><select className="fs" style={{width:"auto",padding:"2px 8px",fontSize:10.5,background:"transparent",border:"1px solid var(--brd)",borderRadius:4}} defaultValue={m.workspace_role} onChange={e=>changeRole(m.id,e.target.value)}>{Object.keys(ROLES).filter(r=>r!=="owner").map(r=><option key={r} value={r}>{ROLES[r].label}</option>)}</select></td>
        <td className="mono" style={{fontSize:11}}>{m.keys_in_workspace}</td>
        <td style={{fontSize:12,color:"var(--t2)"}}>{fmtD(m.added_at)}</td>
        <td><button className="btn btn-d btn-xs" onClick={()=>remove(m.id)}><X size={10}/></button></td>
      </tr>)}</tbody></table></div>
    )}
    {modal&&<Modal title={`Add Member — ${ws.name}`} onClose={()=>setModal(false)} footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-p" onClick={addMember} disabled={saving}>{saving?<><Spin/>Adding…</>:"Add"}</button></>}>
      <div className="fg"><label className="fl">Developer</label><select className="fs" value={form.developer_id} onChange={e=>setForm({...form,developer_id:e.target.value})}><option value="">Select…</option>{unassigned.map(d=><option key={d.id} value={d.id}>{d.name} ({d.email})</option>)}</select></div>
      <div className="fg"><label className="fl">Workspace Role</label><select className="fs" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{Object.entries(ROLES).filter(([r])=>r!=="owner").map(([r,v])=><option key={r} value={r}>{v.label} — {r==="admin"?"Full workspace control":r==="developer"?"Create & use keys":"Read-only"}</option>)}</select></div>
    </Modal>}
  </>;
}

function WsPolicies({ws,showToast,refetch}) {
  const [spendLimit,setSpendLimit]   = useState(ws.spend_limit);
  const [rpm,setRpm]                 = useState(ws.rate_limit_rpm);
  const [saving,setSaving]           = useState(false);
  const save = async() => { setSaving(true); try{await api.updateWs(ws.id,{spend_limit:Number(spendLimit),rate_limit_rpm:Number(rpm)});showToast("Policies saved");refetch();}catch(e){showToast(e.message,false);}finally{setSaving(false);} };
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div className="tw"><div className="tw-hd"><h3>Spend Limits</h3></div><div style={{padding:16}}>
        <div className="fg"><label className="fl">Monthly Spend Limit ($)</label><input className="fi" type="number" value={spendLimit} onChange={e=>setSpendLimit(e.target.value)}/></div>
        <div style={{fontSize:12,color:"var(--t2)",marginBottom:12}}>Current usage: <strong>${fmt(ws.total_budget_allocated)}</strong> ({pct(ws.total_budget_allocated,ws.spend_limit)}%)</div>
        <div className="pr" style={{height:8,borderRadius:4,marginBottom:12}}><div className="pf" style={{height:"100%",borderRadius:4,width:`${Math.min(pct(ws.total_budget_allocated,ws.spend_limit),100)}%`,background:pct(ws.total_budget_allocated,ws.spend_limit)>80?"var(--err)":ws.color}}/></div>
      </div></div>
      <div className="tw"><div className="tw-hd"><h3>Rate Limits</h3></div><div style={{padding:16}}>
        <div className="fg"><label className="fl">Workspace RPM</label><input className="fi" type="number" value={rpm} onChange={e=>setRpm(e.target.value)}/></div>
        <div style={{fontSize:11.5,color:"var(--t2)",marginBottom:12}}>Limits requests per minute across all keys in this workspace.</div>
      </div></div>
      <div style={{gridColumn:"1/-1"}}><button className="btn btn-p" onClick={save} disabled={saving}>{saving?<><Spin/>Saving…</>:"Save Policies"}</button></div>
    </div>
  );
}

function WsAudit({ws}) {
  const {data:events,loading,error} = useApi(api.audit,[]);
  const wsEvents = (events||[]).filter(e=>{
    const d=e.details||{};
    return e.resource_id===ws.id || d.workspace===ws.name || (e.resource_type==="workspace"&&e.resource_id===ws.id);
  });
  return (
    <div className="tw">
      <div className="tw-hd"><h3>{wsEvents.length} events for {ws.name}</h3></div>
      {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:wsEvents.length===0?<Empty msg="No activity recorded for this workspace"/>:
      wsEvents.map(e=><div className="al" key={e.id}><div className="al-ic" style={{background:"#6366f110",color:"#6366f1"}}><Activity size={13}/></div><div className="al-c"><div className="al-a">{e.action.replace(/_/g," · ")}</div><div className="al-d"><strong>{e.actor}</strong>{e.details&&Object.keys(e.details).length>0?" — "+JSON.stringify(e.details):""}</div></div><div className="al-t">{fmtT(e.created_at)}</div></div>)}
    </div>
  );
}

function WsSettings({ws,showToast,refetch,onBack}) {
  const [name,setName]       = useState(ws.name);
  const [desc,setDesc]       = useState(ws.description||"");
  const [color,setColor]     = useState(ws.color);
  const [saving,setSaving]   = useState(false);

  const save = async() => { setSaving(true); try{await api.updateWs(ws.id,{name,description:desc,color});showToast("Saved");refetch();}catch(e){showToast(e.message,false);}finally{setSaving(false);} };
  const archive = async() => { if(!confirm("Archive this workspace? All keys will be disabled.")) return; try{await api.archiveWs(ws.id);showToast("Archived");onBack();}catch(e){showToast(e.message,false);} };

  return <div style={{maxWidth:480}}>
    <div className="tw"><div className="tw-hd"><h3>Workspace Settings</h3></div><div style={{padding:16}}>
      <div className="fg"><label className="fl">Name</label><input className="fi" value={name} onChange={e=>setName(e.target.value)}/></div>
      <div className="fg"><label className="fl">Description</label><input className="fi" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
      <div className="fg"><label className="fl">Color</label><div style={{display:"flex",gap:6}}>{COLORS.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:24,height:24,borderRadius:5,background:c,cursor:"pointer",border:c===color?"2px solid var(--t0)":"2px solid transparent"}}/>)}</div></div>
      <button className="btn btn-p" onClick={save} disabled={saving}>{saving?<><Spin/>Saving…</>:"Save Changes"}</button>
    </div></div>
    <div className="tw" style={{marginTop:10,borderColor:"var(--err)"}}><div className="tw-hd"><h3 style={{color:"var(--err)"}}>Danger Zone</h3></div><div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:13,fontWeight:550}}>Archive Workspace</div><div style={{fontSize:11,color:"var(--t2)"}}>Disables all keys. Reversible from the API.</div></div>
        <button className="btn btn-d btn-s" onClick={archive}><Trash2 size={11}/>Archive</button>
      </div>
    </div></div>
  </div>;
}

// ─── Members Page ────────────────────────────────────────────
function MembersPage() {
  const {data:members,loading,error,refetch} = useApi(api.members);
  const {data:wsList} = useApi(api.workspaces);
  const [modal,setModal] = useState(false);
  const [search,setSearch]= useState("");
  const [form,setForm]   = useState({name:"",email:"",team:"default",role:"developer"});
  const [saving,setSaving]= useState(false);
  const [toast,showToast]= useToast();

  const invite = async() => {
    if(!form.name||!form.email) return showToast("Name and email required",false);
    setSaving(true);
    try{await api.invite(form);setModal(false);setForm({name:"",email:"",team:"default",role:"developer"});showToast("Member invited");refetch();}
    catch(e){showToast(e.message,false);}finally{setSaving(false);}
  };
  const suspend = async(id) => { if(!confirm("Suspend and revoke all keys?")) return; try{await api.suspend(id);showToast("Suspended");refetch();}catch(e){showToast(e.message,false);} };
  const changeRole = async(id,role) => { try{await api.setRole(id,role);refetch();}catch(e){showToast(e.message,false);} };

  const filtered = (members||[]).filter(m=>!search||m.name.toLowerCase().includes(search.toLowerCase())||m.email.toLowerCase().includes(search.toLowerCase())||m.team.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fin">
      {toast&&<Toast msg={toast.msg} ok={toast.ok}/>}
      <div className="ph"><div><h2>Members</h2><p>Manage access, roles, and workspace assignments</p></div><div className="ph-a"><button className="btn btn-g btn-s" onClick={refetch}><RefreshCw size={12}/></button><button className="btn btn-p" onClick={()=>setModal(true)}><UserPlus size={13}/>Invite Member</button></div></div>
      <div className="tw">
        <div className="tw-hd"><h3>{filtered.length} members</h3><div className="tw-fl"><div style={{position:"relative"}}><Search size={13} style={{position:"absolute",left:9,top:7,color:"var(--t3)"}}/><input className="srch" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div></div>
        {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:filtered.length===0?<Empty/>:(
          <table><thead><tr><th>Member</th><th>Team</th><th>Org Role</th><th>Workspaces</th><th>Active Keys</th><th>Status</th><th style={{width:80}}></th></tr></thead>
          <tbody>{filtered.map(m=><tr key={m.id}>
            <td><div style={{display:"flex",alignItems:"center",gap:9}}><AvatarCircle name={m.name} size={30}/><div><div style={{fontWeight:550,fontSize:13}}>{m.name}</div><div className="mono" style={{color:"var(--t2)",fontSize:11}}>{m.email}</div></div></div></td>
            <td><span style={{fontSize:12,padding:"2px 8px",borderRadius:4,background:"var(--bg2)",color:"var(--t2)"}}>{m.team}</span></td>
            <td><select className="fs" style={{width:"auto",padding:"2px 8px",fontSize:10.5,background:"transparent",border:"1px solid var(--brd)",borderRadius:4}} defaultValue={m.role} onChange={e=>changeRole(m.id,e.target.value)}>{Object.keys(ROLES).map(r=><option key={r} value={r}>{ROLES[r].label}</option>)}</select></td>
            <td><div style={{display:"flex",gap:3}}>{(m.workspace_ids||[]).map(wid=>{const w=(wsList||[]).find(x=>x.id===wid);return w?<span key={wid} title={w.name} style={{width:7,height:7,borderRadius:2,background:w.color,display:"inline-block"}}/>:null;})}</div></td>
            <td className="mono">{m.active_key_count}</td>
            <td><SBadge s={m.is_active?"active":"suspended"}/></td>
            <td>{m.is_active&&<button className="btn btn-d btn-xs" onClick={()=>suspend(m.id)} title="Suspend"><Trash2 size={11}/></button>}</td>
          </tr>)}</tbody></table>
        )}
      </div>
      {modal&&<Modal title="Invite Member" onClose={()=>setModal(false)} footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-p" onClick={invite} disabled={saving}>{saving?<><Spin/>Inviting…</>:"Send Invite"}</button></>}>
        <div className="fg"><label className="fl">Full Name</label><input className="fi" placeholder="Alex Chen" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="alex@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div className="fg"><label className="fl">Team</label><input className="fi" placeholder="ml, backend…" value={form.team} onChange={e=>setForm({...form,team:e.target.value})}/></div>
          <div className="fg"><label className="fl">Role</label><select className="fs" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{Object.entries(ROLES).filter(([r])=>r!=="owner").map(([r,v])=><option key={r} value={r}>{v.label}</option>)}</select></div>
        </div>
        <div className="info-box"><Shield size={12} style={{display:"inline",verticalAlign:-2,marginRight:4}}/>They'll be able to sign in with these credentials and appear in workspace member lists.</div>
      </Modal>}
    </div>
  );
}

// ─── Keys Page (global) ──────────────────────────────────────
function KeysPage() {
  const {data:keys,loading,error,refetch} = useApi(()=>api.keys("status=active"),[]);
  const {data:allKeys,refetch:refetchAll}  = useApi(api.keys,[]);
  const {data:devs}    = useApi(api.members);
  const {data:wsList}  = useApi(api.workspaces);
  const [vf,setVf]     = useState("all");
  const [wf,setWf]     = useState("all");
  const [search,setSearch]= useState("");
  const [statusF,setStatusF]= useState("active");
  const [modal,setModal]= useState(false);
  const [newKey,setNewKey]= useState(null);
  const [form,setForm]  = useState({developer_id:"",vendor:"openai",workspace_id:"",budget_limit_usd:100,rate_limit_rpm:60,expires_in_days:90,models_allowed:"",description:""});
  const [saving,setSaving]= useState(false);
  const [toast,showToast]= useToast();
  const [copied,setCopied]= useState(false);

  const loadKeys = statusF==="active" ? keys : allKeys;

  const filtered = (loadKeys||[]).filter(k=>
    (vf==="all"||k.vendor===vf)&&
    (wf==="all"||k.workspace_id===wf)&&
    (!search||(k.project_name||"").toLowerCase().includes(search.toLowerCase())||(k.developer_name||"").toLowerCase().includes(search.toLowerCase()))
  );

  const provision = async() => {
    if(!form.developer_id) return showToast("Select a developer",false);
    setSaving(true);
    try{const r=await api.provision({...form,workspace_id:form.workspace_id||null,budget_limit_usd:Number(form.budget_limit_usd),rate_limit_rpm:Number(form.rate_limit_rpm),expires_in_days:Number(form.expires_in_days),models_allowed:form.models_allowed?form.models_allowed.split(",").map(s=>s.trim()).filter(Boolean):null});setModal(false);setNewKey(r);refetch();refetchAll();}
    catch(e){showToast(e.message,false);}finally{setSaving(false);}
  };
  const doRevoke = async(id)=>{ if(!confirm("Revoke?")) return; try{await api.revoke(id);showToast("Revoked");refetch();refetchAll();}catch(e){showToast(e.message,false);} };
  const doRotate = async(id)=>{ if(!confirm("Rotate?")) return; try{const r=await api.rotate(id);setNewKey(r);showToast("Rotated");refetch();refetchAll();}catch(e){showToast(e.message,false);} };
  const copy = ()=>{ navigator.clipboard.writeText(newKey.api_key||""); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const vendorList = [...new Set((allKeys||[]).map(k=>k.vendor))];

  return (
    <div className="fin">
      {toast&&<Toast msg={toast.msg} ok={toast.ok}/>}
      {newKey&&<Modal title="🔑 Key Provisioned — Copy Now" onClose={()=>setNewKey(null)} footer={<button className="btn btn-p" onClick={()=>setNewKey(null)}>I've saved it</button>}>
        <div className="info-box" style={{marginBottom:12}}><strong>⚠️ Shown only once.</strong> KeyGate never stores the full key.</div>
        <div className="mono" style={{background:"var(--bg2)",padding:"10px 12px",borderRadius:6,wordBreak:"break-all",fontSize:11.5,border:"1px solid var(--brd)",marginBottom:8}}>{newKey.api_key}</div>
        <button className="btn btn-g btn-s" onClick={copy}>{copied?<><Check size={12}/>Copied!</>:<><Copy size={12}/>Copy Key</>}</button>
        {newKey.project_name&&<p style={{fontSize:12,color:"var(--t2)",marginTop:8}}>Project: <strong>{newKey.project_name}</strong> · Expires: {fmtD(newKey.expires_at)}</p>}
      </Modal>}
      <div className="ph"><div><h2>API Keys</h2><p>Provision and manage vendor API keys across all workspaces</p></div><div className="ph-a"><button className="btn btn-g btn-s" onClick={()=>{refetch();refetchAll();}}><RefreshCw size={12}/></button><button className="btn btn-p" onClick={()=>setModal(true)}><Plus size={13}/>Provision Key</button></div></div>
      <div className="tw">
        <div className="tw-hd"><h3>{filtered.length} keys</h3><div className="tw-fl">
          <div style={{position:"relative"}}><Search size={13} style={{position:"absolute",left:9,top:6,color:"var(--t3)"}}/><input className="srch" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:150}}/></div>
          <Pill on={statusF==="active"} onClick={()=>setStatusF("active")}>Active</Pill>
          <Pill on={statusF===""} onClick={()=>setStatusF("")}>All</Pill>
          <span style={{width:1,height:14,background:"var(--brd)",margin:"0 2px"}}/>
          <Pill on={vf==="all"} onClick={()=>setVf("all")}>All Vendors</Pill>
          {vendorList.map(v=><Pill key={v} on={vf===v} onClick={()=>setVf(v)}>{VENDORS[v]?.label||v}</Pill>)}
          <span style={{width:1,height:14,background:"var(--brd)",margin:"0 2px"}}/>
          <Pill on={wf==="all"} onClick={()=>setWf("all")}>All WS</Pill>
          {(wsList||[]).map(w=><Pill key={w.id} on={wf===w.id} onClick={()=>setWf(w.id)}>{w.name}</Pill>)}
        </div></div>
        {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:filtered.length===0?<Empty msg="No keys found"/>:(
          <table><thead><tr><th>Project</th><th>Developer</th><th>Workspace</th><th>Vendor</th><th>Hint</th><th>Budget</th><th>Expires</th><th>Status</th><th style={{width:70}}></th></tr></thead>
          <tbody>{filtered.map(k=><tr key={k.key_id}>
            <td><div style={{fontWeight:550,fontSize:12.5}}>{k.project_name}</div><div style={{fontSize:10.5,color:"var(--t3)"}}>{k.description}</div></td>
            <td><div style={{fontSize:12.5}}>{k.developer_name}</div><div className="mono" style={{fontSize:10.5,color:"var(--t3)"}}>{k.team}</div></td>
            <td style={{fontSize:12,color:"var(--t2)"}}>{k.workspace_name||<span style={{color:"var(--t3)"}}>—</span>}</td>
            <td><VBadge v={k.vendor}/></td>
            <td className="mono" style={{color:"var(--t2)"}}>{k.key_hint}</td>
            <td className="mono" style={{fontSize:11}}>${fmt(k.budget_limit_usd)}</td>
            <td style={{fontSize:11.5,color:"var(--t2)"}}>{fmtD(k.expires_at)}</td>
            <td><SBadge s={k.status}/></td>
            <td>{k.status==="active"&&<div style={{display:"flex",gap:2}}><button className="btn btn-g btn-xs" onClick={()=>doRotate(k.key_id)}><RotateCw size={10}/></button><button className="btn btn-d btn-xs" onClick={()=>doRevoke(k.key_id)}><Trash2 size={10}/></button></div>}</td>
          </tr>)}</tbody></table>
        )}
      </div>
      {modal&&<Modal title="Provision API Key" onClose={()=>setModal(false)} wide footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-p" onClick={provision} disabled={saving}>{saving?<><Spin/>Provisioning…</>:"Provision"}</button></>}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div className="fg"><label className="fl">Developer</label><select className="fs" value={form.developer_id} onChange={e=>setForm({...form,developer_id:e.target.value})}><option value="">Select…</option>{(devs||[]).filter(d=>d.is_active).map(d=><option key={d.id} value={d.id}>{d.name} ({d.team})</option>)}</select></div>
          <div className="fg"><label className="fl">Vendor</label><select className="fs" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}>{Object.entries(VENDORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
        <div className="fg"><label className="fl">Workspace (optional)</label><select className="fs" value={form.workspace_id} onChange={e=>setForm({...form,workspace_id:e.target.value})}><option value="">No workspace</option>{(wsList||[]).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
        <div className="fg"><label className="fl">Description</label><input className="fi" placeholder="What is this key for?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div className="fg"><label className="fl">Budget ($)</label><input className="fi" type="number" value={form.budget_limit_usd} onChange={e=>setForm({...form,budget_limit_usd:e.target.value})}/></div>
          <div className="fg"><label className="fl">RPM</label><input className="fi" type="number" value={form.rate_limit_rpm} onChange={e=>setForm({...form,rate_limit_rpm:e.target.value})}/></div>
          <div className="fg"><label className="fl">Expires (days)</label><input className="fi" type="number" value={form.expires_in_days} onChange={e=>setForm({...form,expires_in_days:e.target.value})}/></div>
        </div>
        <div className="fg"><label className="fl">Allowed Models (comma-sep, blank=all)</label><input className="fi" placeholder="gpt-4o, claude-sonnet-4" value={form.models_allowed} onChange={e=>setForm({...form,models_allowed:e.target.value})}/></div>
      </Modal>}
    </div>
  );
}

// ─── RBAC Page ───────────────────────────────────────────────
function RBACPage() {
  const roles = ["owner","admin","developer","viewer"];
  return (
    <div className="fin">
      <div className="ph"><div><h2>Access Control (RBAC)</h2><p>Role-based permissions matrix for your organization</p></div></div>
      <div className="tw">
        <div className="tw-hd"><h3>Permission Matrix</h3><div className="tw-fl">{roles.map(r=><span key={r} style={{display:"flex",alignItems:"center",gap:4,fontSize:11}}><span style={{width:8,height:8,borderRadius:3,background:ROLES[r].color}}/>{ROLES[r].label}</span>)}</div></div>
        <table><thead><tr><th style={{width:240}}>Permission</th>{roles.map(r=><th key={r} style={{textAlign:"center"}}>{ROLES[r].label}</th>)}</tr></thead>
        <tbody>{RBAC_PERMS.map(([perm,matrix],i)=><tr key={i}><td style={{fontSize:12}}>{perm}</td>{roles.map((_,ri)=><td key={ri} style={{textAlign:"center"}}>{matrix[ri]?<CheckCircle2 size={14} style={{color:"var(--ok)"}}/>:<XCircle size={14} style={{color:"var(--t3)"}}/>}</td>)}</tr>)}</tbody></table>
      </div>
      <div style={{marginTop:12,padding:"12px 16px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--brd)",fontSize:12,color:"var(--t2)"}}>
        <Shield size={12} style={{display:"inline",verticalAlign:-2,marginRight:4}}/>
        Role assignments apply org-wide. Workspace-level roles can override per-workspace access independently.
      </div>
    </div>
  );
}

// ─── Audit Page ──────────────────────────────────────────────
function AuditPage() {
  const {data:events,loading,error,refetch} = useApi(()=>api.audit(200),[]);
  const [filter,setFilter]= useState("all");
  const sevOf = (a) => { if(a.includes("revoke")||a.includes("deactivate")||a.includes("suspend")||a.includes("delete")||a.includes("archive")) return "critical"; if(a.includes("rotate")||a.includes("configure")||a.includes("role")) return "warn"; return "info"; };
  const SEV = {info:{c:"#6366f1",bg:"#6366f110"},warn:{c:"#f59e0b",bg:"#f59e0b10"},critical:{c:"#dc2626",bg:"#dc262610"}};
  const all = events||[];
  const filtered = filter==="all"?all:all.filter(e=>sevOf(e.action)===filter);
  return (
    <div className="fin">
      <div className="ph"><div><h2>Audit Log</h2><p>Immutable record of all organization activity</p></div><button className="btn btn-g btn-s" onClick={refetch}><RefreshCw size={12}/></button></div>
      <div className="tw">
        <div className="tw-hd"><h3>{filtered.length} events</h3><div className="tw-fl">
          <Pill on={filter==="all"} onClick={()=>setFilter("all")}>All</Pill>
          <Pill on={filter==="info"} onClick={()=>setFilter("info")}>Info</Pill>
          <Pill on={filter==="warn"} onClick={()=>setFilter("warn")}>Warnings</Pill>
          <Pill on={filter==="critical"} onClick={()=>setFilter("critical")}>Critical</Pill>
        </div></div>
        {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:filtered.length===0?<Empty/>:
        filtered.map(e=>{const s=sevOf(e.action);const sv=SEV[s];return(
          <div className="al" key={e.id}>
            <div className="al-ic" style={{background:sv.bg,color:sv.c}}>{s==="critical"?<AlertTriangle size={13}/>:s==="warn"?<AlertTriangle size={13}/>:<CheckCircle2 size={13}/>}</div>
            <div className="al-c"><div className="al-a">{e.action.replace(/_/g," · ")}</div>
              <div className="al-d"><strong>{e.actor}</strong>{e.resource_type&&<> → {e.resource_type}{e.resource_id?` #${String(e.resource_id).slice(0,8)}`:""}</>}{e.details&&Object.keys(e.details).length>0&&<span style={{marginLeft:6,fontSize:10.5,color:"var(--t3)"}}>{JSON.stringify(e.details)}</span>}</div>
            </div>
            <div className="al-t">{fmtT(e.created_at)}<br/><span style={{fontSize:9,color:"var(--t3)"}}>{fmtRel(e.created_at)}</span></div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────
function SettingsPage() {
  const {data:vendors,loading,error,refetch} = useApi(api.vendors);
  const [modal,setModal]   = useState(false);
  const [form,setForm]     = useState({vendor:"openai",admin_api_key:"",org_id:""});
  const [saving,setSaving] = useState(false);
  const [showKey,setShowKey]= useState(false);
  const [toast,showToast]  = useToast();
  const save = async()=>{ if(!form.admin_api_key) return showToast("Enter an API key",false); setSaving(true); try{await api.configVendor(form);setModal(false);setForm({vendor:"openai",admin_api_key:"",org_id:""});showToast("Vendor configured");refetch();}catch(e){showToast(e.message,false);}finally{setSaving(false);} };
  return (
    <div className="fin">
      {toast&&<Toast msg={toast.msg} ok={toast.ok}/>}
      <div className="ph"><div><h2>Settings</h2><p>Configure vendor credentials for key provisioning</p></div><button className="btn btn-p" onClick={()=>setModal(true)}><Plus size={13}/>Configure Vendor</button></div>
      <div className="tw">
        <div className="tw-hd"><h3>Vendor Credentials</h3></div>
        {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:(vendors||[]).length===0?<Empty msg="No vendors configured. Add one to start provisioning keys."/>:(
          <table><thead><tr><th>Vendor</th><th>Admin Key</th><th>Org ID</th><th>Configured</th><th>Status</th><th style={{width:80}}></th></tr></thead>
          <tbody>{(vendors||[]).map(v=><tr key={v.vendor}>
            <td><VBadge v={v.vendor}/></td>
            <td className="mono" style={{color:"var(--t2)"}}>{v.admin_key_hint}</td>
            <td className="mono" style={{fontSize:11,color:"var(--t2)"}}>{v.org_id||"—"}</td>
            <td style={{fontSize:12,color:"var(--t2)"}}>{fmtD(v.configured_at)}</td>
            <td><SBadge s="active"/></td>
            <td><button className="btn btn-g btn-xs" onClick={()=>{setForm({vendor:v.vendor,admin_api_key:"",org_id:v.org_id||""});setModal(true);}}><Pencil size={10}/>Update</button></td>
          </tr>)}</tbody></table>
        )}
      </div>
      <div className="tw" style={{marginTop:12}}>
        <div className="tw-hd"><h3>Supported Vendors</h3></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,padding:16}}>
          {Object.entries(VENDORS).map(([k,v])=>{const cfg=(vendors||[]).find(x=>x.vendor===k); return(
            <div key={k} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",border:"1px solid var(--brd)",borderRadius:8,background:"var(--bg2)"}}>
              <div style={{width:36,height:36,borderRadius:8,background:v.color+"15",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{width:12,height:12,borderRadius:3,background:v.color,display:"inline-block"}}/></div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{v.label}</div><div style={{fontSize:11,color:"var(--t2)"}}><span className="mono">{k}</span></div></div>
              {cfg?<SBadge s="active"/>:<button className="btn btn-g btn-xs" onClick={()=>{setForm({vendor:k,admin_api_key:"",org_id:""});setModal(true);}}>Configure</button>}
            </div>
          );})}
        </div>
      </div>
      {modal&&<Modal title="Configure Vendor" onClose={()=>setModal(false)} footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-p" onClick={save} disabled={saving}>{saving?<><Spin/>Saving…</>:"Save"}</button></>}>
        <div className="fg"><label className="fl">Vendor</label><select className="fs" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}>{Object.entries(VENDORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="fg"><label className="fl">Admin API Key</label><div style={{position:"relative"}}><input className="fi" type={showKey?"text":"password"} placeholder="sk-admin-..." value={form.admin_api_key} onChange={e=>setForm({...form,admin_api_key:e.target.value})} style={{paddingRight:36}}/><button onClick={()=>setShowKey(s=>!s)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--t3)"}}>{showKey?<EyeOff size={14}/>:<Eye size={14}/>}</button></div></div>
        <div className="fg"><label className="fl">Org / Project ID (optional)</label><input className="fi" placeholder="org-..." value={form.org_id} onChange={e=>setForm({...form,org_id:e.target.value})}/></div>
        <div className="info-box"><Shield size={12} style={{display:"inline",verticalAlign:-2,marginRight:4}}/>Stored encrypted server-side and used only to provision sub-keys.</div>
      </Modal>}
    </div>
  );
}

// ─── LLM Integrations Page (with Model Catalog + Admin Keys) ─
const TypeBadge = ({type}) => { const t=MODEL_TYPES[type]||{label:type,color:"#888"}; return <span style={{fontSize:9.5,padding:"1px 6px",borderRadius:3,background:t.color+"12",color:t.color,fontWeight:600}}>{t.label}</span>; };

function LLMPage() {
  const {data:vendors,loading,error,refetch} = useApi(api.vendors);
  const [selected,setSelected] = useState(null);
  if(selected) return <LLMDetailPage vendorKey={selected} configured={vendors||[]} onBack={()=>setSelected(null)} onRefetch={refetch}/>;
  return <LLMListPage configured={vendors||[]} loading={loading} error={error} onSelect={setSelected} onRefetch={refetch}/>;
}

function LLMListPage({configured,loading,error,onSelect,onRefetch}) {
  const [filter,setFilter] = useState("all");
  const [search,setSearch] = useState("");
  const configuredSet = new Set((configured||[]).map(v=>v.vendor));
  const entries = Object.entries(VENDORS).filter(([k,v])=>{
    if(filter==="connected"&&!configuredSet.has(k)) return false;
    if(search&&!v.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="fin">
      <div className="ph"><div><h2>LLM Integrations</h2><p>Connect vendor admin keys and browse model catalogs</p></div><div className="ph-a"><button className="btn btn-g btn-s" onClick={onRefetch}><RefreshCw size={12}/></button></div></div>
      {/* Filter tabs */}
      <div style={{display:"flex",gap:0,borderBottom:"2px solid var(--brd)",marginBottom:16}}>
        {[["all","All"],["connected","Connected"]].map(([id,label])=><div key={id} onClick={()=>setFilter(id)} style={{padding:"9px 18px",fontSize:13.5,fontWeight:filter===id?600:450,cursor:"pointer",color:filter===id?"var(--acc)":"var(--t2)",borderBottom:filter===id?"2px solid var(--acc)":"2px solid transparent",marginBottom:-2,transition:"all .12s"}}>{label}</div>)}
      </div>
      <input className="srch" style={{width:"100%",padding:"10px 14px",borderRadius:8,fontSize:13.5,marginBottom:16,paddingLeft:14}} placeholder="Search vendors..." value={search} onChange={e=>setSearch(e.target.value)}/>
      {loading?<div className="empty"><Spin/></div>:error?<ErrBox msg={error}/>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {entries.map(([key,vendor])=>{
            const cfg = (configured||[]).find(c=>c.vendor===key);
            const isConnected = !!cfg;
            return (
              <div key={key} onClick={()=>onSelect(key)} style={{background:"var(--card)",border:"1px solid var(--brd)",borderRadius:10,padding:20,cursor:"pointer",transition:"all .12s",borderTop:`3px solid ${vendor.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:vendor.color+"12",display:"flex",alignItems:"center",justifyContent:"center"}}><Server size={18} style={{color:vendor.color}}/></div>
                  <button style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:600,border:`1px solid ${isConnected?"var(--ok)":"var(--brd)"}`,background:isConnected?"rgba(5,150,105,.06)":"var(--bg1)",color:isConnected?"var(--ok)":"var(--t1)",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}} onClick={e=>{e.stopPropagation();onSelect(key)}}>
                    {isConnected?<><CheckCircle2 size={12}/>Connected</>:<><SlidersHorizontal size={12}/>Connect</>}
                  </button>
                </div>
                <div style={{fontSize:16,fontWeight:700,marginTop:10}}>{vendor.label}</div>
                <div style={{fontSize:12.5,color:"var(--t2)",marginTop:4,lineHeight:1.4}}>{vendor.desc}</div>
                <div style={{display:"flex",gap:16,marginTop:14,paddingTop:12,borderTop:"1px solid var(--brd-s)",fontSize:11.5,color:"var(--t2)"}}>
                  <div><div className="mono" style={{fontSize:15,fontWeight:700,color:"var(--t0)"}}>{vendor.models.length}</div>Models</div>
                  {isConnected&&<><div><div className="mono" style={{fontSize:15,fontWeight:700,color:"var(--t0)"}}>1</div>Admin key</div></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LLMDetailPage({vendorKey,configured,onBack,onRefetch}) {
  const vendor = VENDORS[vendorKey];
  const cfg = (configured||[]).find(c=>c.vendor===vendorKey);
  const [tab,setTab] = useState("catalog");
  const [showAdd,setShowAdd] = useState(false);
  const [typeFilter,setTypeFilter] = useState("all");
  const [form,setForm] = useState({vendor:vendorKey,admin_api_key:"",org_id:"",extra_config:null});
  const [saving,setSaving] = useState(false);
  const [showKey,setShowKey] = useState(false);
  const [toast,showToast] = useToast();

  if(!vendor) return null;
  const types = [...new Set(vendor.models.map(m=>m.type))];
  const filteredModels = typeFilter==="all" ? vendor.models : vendor.models.filter(m=>m.type===typeFilter);

  const save = async()=>{
    if(!form.admin_api_key) return showToast("Enter an admin API key",false);
    setSaving(true);
    try {
      const payload = {vendor:vendorKey,admin_api_key:form.admin_api_key,org_id:form.org_id||null};
      if(vendorKey==="azure_openai") payload.extra_config = {subscription_id:form.subscription_id,resource_group:form.resource_group};
      if(vendorKey==="google_vertex") payload.extra_config = {project_id:form.project_id,region:form.region||"us-central1"};
      await api.configVendor(payload);
      setShowAdd(false); showToast("Vendor configured successfully"); onRefetch();
      setForm({vendor:vendorKey,admin_api_key:"",org_id:""});
    } catch(e){showToast(e.message,false);} finally{setSaving(false);}
  };

  return (
    <div className="fin">
      {toast&&<Toast msg={toast.msg} ok={toast.ok}/>}
      <button className="btn btn-g btn-s" onClick={onBack} style={{marginBottom:10}}><ArrowLeft size={12}/>All Integrations</button>
      <div className="ph">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:12,background:vendor.color+"12",display:"flex",alignItems:"center",justifyContent:"center"}}><Server size={22} style={{color:vendor.color}}/></div>
          <div><h2>{vendor.label}</h2><p>{vendor.desc}</p></div>
        </div>
        <div className="ph-a">
          <button className="btn btn-p" onClick={()=>{setTab("keys");setShowAdd(true)}}><Plus size={13}/>{cfg?"Update Admin Key":"Connect"}</button>
        </div>
      </div>
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${tab==="catalog"?" on":""}`} onClick={()=>setTab("catalog")}><Database size={13}/>Model Catalog<span className="tab-n" style={{background:tab==="catalog"?"var(--acc-bg)":"var(--bg2)",color:tab==="catalog"?"var(--acc-t)":"var(--t3)"}}>{vendor.models.length}</span></button>
        <button className={`tab${tab==="keys"?" on":""}`} onClick={()=>setTab("keys")}><Key size={13}/>Admin Keys<span className="tab-n" style={{background:tab==="keys"?"var(--acc-bg)":"var(--bg2)",color:tab==="keys"?"var(--acc-t)":"var(--t3)"}}>{cfg?1:0}</span></button>
      </div>

      {/* Model Catalog */}
      {tab==="catalog"&&<div>
        <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
          <Pill on={typeFilter==="all"} onClick={()=>setTypeFilter("all")}>All ({vendor.models.length})</Pill>
          {types.map(t=>{const mt=MODEL_TYPES[t]||{label:t,color:"#888"};return<Pill key={t} on={typeFilter===t} onClick={()=>setTypeFilter(t)}>{mt.label} ({vendor.models.filter(m=>m.type===t).length})</Pill>})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10}}>
          {filteredModels.map(model=>(
            <div key={model.id} style={{background:"var(--card)",border:"1px solid var(--brd)",borderRadius:8,padding:"14px 16px",borderLeft:model.flagship?"3px solid var(--acc)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontSize:14,fontWeight:650}}>{model.name}</div><div className="mono" style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{model.id}</div></div>
                <TypeBadge type={model.type}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10}}>
                <div><div style={{fontSize:9.5,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".04em",fontWeight:600}}>Context</div><div className="mono" style={{fontSize:12,marginTop:1}}>{model.context}</div></div>
                <div><div style={{fontSize:9.5,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".04em",fontWeight:600}}>Pricing</div><div style={{fontSize:11,marginTop:1,color:"var(--t2)"}}>{model.pricing}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* Admin Keys Tab */}
      {tab==="keys"&&<div>
        {!cfg?(
          <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
            <Key size={36} style={{opacity:.25,marginBottom:14}}/>
            <div style={{fontSize:15,fontWeight:600,color:"var(--t1)",marginBottom:4}}>No admin key configured</div>
            <div style={{fontSize:13,marginBottom:16}}>Add your {vendor.label} admin key to start provisioning API keys.</div>
            <button className="btn btn-p" onClick={()=>setShowAdd(true)}><Plus size={13}/>Add Admin Key</button>
          </div>
        ):(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:13,color:"var(--t2)"}}>1 admin key instance configured</span>
              <button className="btn btn-p btn-s" onClick={()=>setShowAdd(true)}><Pencil size={12}/>Update Key</button>
            </div>
            <div className="tw">
              <div className="tw-hd">
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:"var(--ok)"}}/>
                  <h3>{vendor.label} Admin Key</h3>
                  <SBadge s="active"/>
                </div>
                <button className="btn btn-g btn-xs" onClick={()=>setShowAdd(true)}><Pencil size={10}/>Edit</button>
              </div>
              <div style={{padding:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                  <div><div style={{fontSize:10,color:"var(--t3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>Admin Key</div><div className="mono" style={{fontSize:12,marginTop:4,color:"var(--t2)"}}>{cfg.admin_key_hint}</div></div>
                  <div><div style={{fontSize:10,color:"var(--t3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>Org / Project</div><div className="mono" style={{fontSize:12,marginTop:4,color:"var(--t2)"}}>{cfg.org_id||"—"}</div></div>
                  <div><div style={{fontSize:10,color:"var(--t3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>Configured</div><div style={{fontSize:12,marginTop:4,color:"var(--t2)"}}>{fmtD(cfg.configured_at)}</div></div>
                </div>
                <div style={{borderTop:"1px solid var(--brd-s)",paddingTop:12,marginTop:12}}>
                  <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Available Models</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{vendor.models.map(m=><span key={m.id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:5,background:"var(--bg2)",fontSize:11,fontWeight:500}}><TypeBadge type={m.type}/>{m.name}</span>)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>}

      {/* Add/Update side panel */}
      {showAdd&&<div className="mo" onClick={()=>setShowAdd(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:460,height:"100vh",background:"var(--bg1)",borderLeft:"1px solid var(--brd)",overflow:"auto",marginLeft:"auto",animation:"su .2s ease"}}>
          <div style={{padding:"18px 22px",borderBottom:"1px solid var(--brd-s)",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"var(--bg1)",zIndex:1}}>
            <h3 style={{fontSize:16,fontWeight:700}}>{cfg?"Update":"Connect"} {vendor.label}</h3>
            <button className="btn btn-g btn-xs" onClick={()=>setShowAdd(false)}><X size={14}/></button>
          </div>
          <div style={{padding:"20px 22px"}}>
            <div className="info-box" style={{marginBottom:16}}><Info size={14} style={{flexShrink:0,marginTop:1}}/><div>This admin key is used by KeyGate to create scoped projects/workspaces and provision API keys for developers. It is stored encrypted.</div></div>
            <div className="fg"><label className="fl">Admin API Key</label><div style={{position:"relative"}}><input className="fi" type={showKey?"text":"password"} placeholder={vendorKey==="openai"?"sk-admin-...":vendorKey==="anthropic"?"sk-ant-admin-...":"Enter admin key"} value={form.admin_api_key} onChange={e=>setForm({...form,admin_api_key:e.target.value})} style={{paddingRight:36}}/><button onClick={()=>setShowKey(s=>!s)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--t3)"}}>{showKey?<EyeOff size={14}/>:<Eye size={14}/>}</button></div></div>
            <div className="fg"><label className="fl">Organization / Project ID</label><input className="fi" placeholder="org-... (optional)" value={form.org_id||""} onChange={e=>setForm({...form,org_id:e.target.value})}/></div>
            {vendorKey==="azure_openai"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div className="fg"><label className="fl">Subscription ID</label><input className="fi" value={form.subscription_id||""} onChange={e=>setForm({...form,subscription_id:e.target.value})}/></div>
              <div className="fg"><label className="fl">Resource Group</label><input className="fi" value={form.resource_group||""} onChange={e=>setForm({...form,resource_group:e.target.value})}/></div>
            </div>}
            {vendorKey==="google_vertex"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div className="fg"><label className="fl">GCP Project</label><input className="fi" value={form.project_id||""} onChange={e=>setForm({...form,project_id:e.target.value})}/></div>
              <div className="fg"><label className="fl">Region</label><input className="fi" placeholder="us-central1" value={form.region||""} onChange={e=>setForm({...form,region:e.target.value})}/></div>
            </div>}
            <div className="fg"><label className="fl">Available Models</label><div style={{fontSize:12,color:"var(--t2)",marginBottom:8}}>These models will be available for key provisioning</div>
              {vendor.models.map(m=><label key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:12.5,cursor:"pointer",borderBottom:"1px solid var(--brd-s)"}}><input type="checkbox" defaultChecked/><span style={{fontWeight:500}}>{m.name}</span><TypeBadge type={m.type}/><span className="mono" style={{marginLeft:"auto",color:"var(--t3)",fontSize:10.5}}>{m.id}</span></label>)}
            </div>
          </div>
          <div style={{padding:"14px 22px",borderTop:"1px solid var(--brd-s)",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"var(--bg1)"}}>
            <button className="btn btn-g" onClick={()=>setShowAdd(false)}>Cancel</button>
            <button className="btn btn-p" onClick={save} disabled={saving}>{saving?<><Spin/>Saving…</>:"Connect"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────
const NAV = [
  {s:"Overview"},
  {id:"dashboard",   label:"Dashboard",       Ic:LayoutDashboard},
  {s:"Management"},
  {id:"workspaces",  label:"Workspaces",      Ic:FolderKanban},
  {id:"members",     label:"Members",         Ic:Users},
  {id:"keys",        label:"API Keys",        Ic:Key},
  {s:"Integrations"},
  {id:"llm",         label:"LLM Integrations",Ic:Server},
  {s:"Security"},
  {id:"rbac",        label:"Access Control",  Ic:Shield},
  {id:"audit",       label:"Audit Log",       Ic:ScrollText},
  {s:"Config"},
  {id:"settings",    label:"Settings",        Ic:Settings},
];
const TITLES = {dashboard:"Dashboard",workspaces:"Workspaces",members:"Members",keys:"API Keys",llm:"LLM Integrations",rbac:"Access Control",audit:"Audit Log",settings:"Settings"};

// ─── App Shell ───────────────────────────────────────────────
export default function App() {
  const [theme,  setTheme]  = useState(localStorage.getItem("kg_theme")||"light");
  const [page,   setPage]   = useState("dashboard");
  const [authed, setAuthed] = useState(!!getToken());
  const [wsId,   setWsId]   = useState(null); // workspace drill-down

  const toggle = () => { const t=theme==="light"?"dark":"light"; setTheme(t); localStorage.setItem("kg_theme",t); };
  const doLogin = async(e,p)  => { await api.login(e,p); setAuthed(true); };
  const doLogout = ()          => { clearTok(); setAuthed(false); };
  const nav = (id)             => { setPage(id); setWsId(null); };

  const isWsDetail = page==="workspaces" && wsId;
  const title = isWsDetail ? `Workspaces / ${wsId}` : TITLES[page]||"Dashboard";

  return (
    <div className={theme==="light"?"lt":"dk"}>
      {!authed ? <Login onLogin={doLogin}/> : (
        <div className="app">
          <nav className="sb">
            <div className="sb-hd"><div className="sb-logo"><img src="/logo.svg" width="30px" /> KeyGate</div></div>
            <div style={{flex:1,padding:"4px 0",overflowY:"auto"}}>
              {NAV.map((item,i)=>item.s
                ?<div key={i} className="sb-sec">{item.s}</div>
                :<div key={item.id} className={`sb-i${page===item.id?" on":""}`} onClick={()=>nav(item.id)}><item.Ic size={15}/>{item.label}</div>
              )}
            </div>
            <div className="sb-ft"><div className="sb-i" onClick={doLogout} style={{opacity:.6}}><LogOut size={14}/>Sign out</div></div>
          </nav>
          <div className="mn">
            <div className="topbar">
              <div className="bc"><span>KeyGate</span><ChevronRight size={12}/><b>{title}</b></div>
              <div className="tb-r">
                <button className="ico-btn" onClick={toggle}>{theme==="light"?<Moon size={14}/>:<Sun size={14}/>}</button>
                <div className="av">KG</div>
              </div>
            </div>
            <div className="ct">
              {page==="dashboard"  && <Dashboard/>}
              {page==="workspaces" && !wsId && <WorkspacesPage onOpen={id=>setWsId(id)}/>}
              {page==="workspaces" && wsId  && <WorkspaceDetail wsId={wsId} onBack={()=>setWsId(null)}/>}
              {page==="members"    && <MembersPage/>}
              {page==="keys"       && <KeysPage/>}
              {page==="llm"        && <LLMPage/>}
              {page==="rbac"       && <RBACPage/>}
              {page==="audit"      && <AuditPage/>}
              {page==="settings"   && <SettingsPage/>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
