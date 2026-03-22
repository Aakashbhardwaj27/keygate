/**
 * Constants for KeyGate frontend.
 * Vendor definitions, role definitions, model catalogs, helpers.
 */

export const VENDORS = {
  openai: {
    label: "OpenAI", color: "#10a37f",
    description: "GPT-4, o1, o3, embeddings, and more",
    website: "https://platform.openai.com",
    models: [
      { id: "gpt-4o", name: "GPT-4o", type: "chat", context: "128K", pricing: "$2.50/$10 per 1M tokens" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", type: "chat", context: "128K", pricing: "$0.15/$0.60 per 1M tokens" },
      { id: "o1", name: "o1", type: "reasoning", context: "200K", pricing: "$15/$60 per 1M tokens" },
      { id: "o3-mini", name: "o3-mini", type: "reasoning", context: "200K", pricing: "$1.10/$4.40 per 1M tokens" },
      { id: "text-embedding-3-large", name: "Embedding 3 Large", type: "embedding", context: "8K", pricing: "$0.13 per 1M tokens" },
      { id: "dall-e-3", name: "DALL·E 3", type: "image", context: "—", pricing: "$0.04–$0.12 per image" },
      { id: "whisper-1", name: "Whisper", type: "audio", context: "—", pricing: "$0.006 per minute" },
    ],
  },
  anthropic: {
    label: "Anthropic", color: "#d97706",
    description: "Claude Opus, Sonnet, Haiku",
    website: "https://console.anthropic.com",
    models: [
      { id: "claude-opus-4", name: "Claude Opus 4", type: "chat", context: "200K", pricing: "$15/$75 per 1M tokens" },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", type: "chat", context: "200K", pricing: "$3/$15 per 1M tokens" },
      { id: "claude-haiku-3.5", name: "Claude Haiku 3.5", type: "chat", context: "200K", pricing: "$0.80/$4 per 1M tokens" },
    ],
  },
  azure_openai: {
    label: "Azure OpenAI", color: "#0078d4",
    description: "OpenAI models on Azure infrastructure",
    website: "https://portal.azure.com",
    models: [
      { id: "gpt-4o", name: "GPT-4o", type: "chat", context: "128K", pricing: "varies by region" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", type: "chat", context: "128K", pricing: "varies by region" },
      { id: "text-embedding-ada-002", name: "Ada Embedding v2", type: "embedding", context: "8K", pricing: "varies by region" },
    ],
  },
  google_vertex: {
    label: "Vertex AI", color: "#4285f4",
    description: "Gemini models on Google Cloud",
    website: "https://console.cloud.google.com",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", type: "chat", context: "1M", pricing: "$0.10/$0.40 per 1M tokens" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", type: "chat", context: "2M", pricing: "$1.25/$5 per 1M tokens" },
    ],
  },
  mistral: {
    label: "Mistral", color: "#ff7000",
    description: "Mistral Large, Small, and Codestral",
    website: "https://console.mistral.ai",
    models: [
      { id: "mistral-large", name: "Mistral Large", type: "chat", context: "128K", pricing: "$2/$6 per 1M tokens" },
      { id: "codestral", name: "Codestral", type: "code", context: "256K", pricing: "$0.30/$0.90 per 1M tokens" },
    ],
  },
  cohere: {
    label: "Cohere", color: "#39594d",
    description: "Command R+, Embed, Rerank",
    website: "https://dashboard.cohere.com",
    models: [
      { id: "command-r-plus", name: "Command R+", type: "chat", context: "128K", pricing: "$2.50/$10 per 1M tokens" },
      { id: "embed-v3", name: "Embed v3", type: "embedding", context: "512", pricing: "$0.10 per 1M tokens" },
    ],
  },
};

export const MODEL_TYPES = {
  chat: { label: "Chat", color: "#6366f1" },
  reasoning: { label: "Reasoning", color: "#8b5cf6" },
  embedding: { label: "Embedding", color: "#0ea5e9" },
  image: { label: "Image", color: "#ec4899" },
  audio: { label: "Audio", color: "#f59e0b" },
  code: { label: "Code", color: "#10b981" },
  rerank: { label: "Rerank", color: "#14b8a6" },
};

export const ROLES = {
  owner: { label: "Owner", color: "#dc2626" },
  admin: { label: "Admin", color: "#f59e0b" },
  developer: { label: "Developer", color: "#6366f1" },
  viewer: { label: "Viewer", color: "#6b7280" },
  billing: { label: "Billing", color: "#8b5cf6" },
};

export const SEVERITIES = {
  info: { color: "#6366f1", bg: "#6366f108" },
  warn: { color: "#f59e0b", bg: "#f59e0b08" },
  error: { color: "#dc2626", bg: "#dc262608" },
  critical: { color: "#dc2626", bg: "#dc262612" },
};

export const COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4"];

export const RBAC_PERMS = [
  { group: "Workspaces", perms: [["View",[1,1,1,1,0]],["Create",[1,1,0,0,0]],["Archive",[1,0,0,0,0]],["Edit settings",[1,1,0,0,0]],["Manage members",[1,1,0,0,0]]] },
  { group: "API Keys", perms: [["View",[1,1,1,1,0]],["Provision",[1,1,1,0,0]],["Revoke",[1,1,0,0,0]],["Rotate",[1,1,1,0,0]],["View usage",[1,1,1,1,0]]] },
  { group: "Members", perms: [["View",[1,1,1,1,0]],["Invite",[1,1,0,0,0]],["Change roles",[1,0,0,0,0]],["Suspend",[1,1,0,0,0]],["Remove",[1,0,0,0,0]]] },
  { group: "Vendors", perms: [["View",[1,1,1,0,0]],["Add instance",[1,1,0,0,0]],["Edit",[1,0,0,0,0]],["Rotate keys",[1,0,0,0,0]],["Remove",[1,0,0,0,0]]] },
  { group: "Organization", perms: [["View settings",[1,1,0,0,1]],["Edit settings",[1,0,0,0,0]],["Configure SSO",[1,0,0,0,0]],["View billing",[1,0,0,0,1]],["Manage billing",[1,0,0,0,1]],["View audit",[1,1,1,1,0]],["Export audit",[1,1,0,0,0]]] },
];
export const ROLE_KEYS = ["owner","admin","developer","viewer","billing"];

export const fmt = n => n?.toLocaleString() ?? "—";
export const fmtD = iso => iso ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
export const fmtT = iso => iso ? new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
export const fmtRel = iso => { if(!iso) return "—"; const d=Date.now()-new Date(iso).getTime(),m=Math.floor(d/60000); if(m<60) return `${m}m ago`; const h=Math.floor(m/60); if(h<24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; };
export const pct = (a,b) => b ? Math.round(a/b*100) : 0;
export const initials = n => (n||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
