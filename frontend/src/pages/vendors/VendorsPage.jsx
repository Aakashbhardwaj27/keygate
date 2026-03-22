/**
 * VendorsPage — LLM Vendor management.
 *
 * This page shows ALL supported LLM vendors as cards.
 * Clicking a vendor opens its detail page showing:
 *   1. Model Catalog — all models the vendor offers
 *   2. Admin Key Instances — multiple admin keys can be registered per vendor
 *   3. Keys issued through each instance
 *
 * Key concept: A "vendor instance" is a registered admin key for a vendor.
 * You can have MULTIPLE instances per vendor (e.g., separate OpenAI orgs
 * for prod vs dev, or Azure OpenAI in different regions).
 */

import { useState } from "react";
import {
  Server, Key, Plus, ChevronRight, ArrowLeft, Pencil, RotateCw,
  Trash2, ExternalLink, Eye, EyeOff, Shield, AlertTriangle,
  CheckCircle2, X, Search, Copy, Info, Zap, Database, Globe,
} from "lucide-react";
import { VENDORS, MODEL_TYPES, fmt, fmtD } from "../../lib/constants";

// ── Tiny UI helpers (import from components/ui.jsx in production) ──
const VBadge = ({ v }) => {
  const d = VENDORS[v] || { label: v, color: "#888" };
  return (
    <span className="vbadge" style={{ background: d.color + "10", color: d.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: d.color, display: "inline-block" }} />
      {d.label}
    </span>
  );
};

const SBadge = ({ s }) => {
  const m = { active: { c: "var(--ok)", bg: "rgba(5,150,105,.07)" }, inactive: { c: "var(--t3)", bg: "var(--bg2)" } }[s] || { c: "var(--t3)", bg: "var(--bg2)" };
  return <span className="badge" style={{ background: m.bg, color: m.c }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: m.c }} />{s}</span>;
};

const ModelTypeBadge = ({ type }) => {
  const t = MODEL_TYPES[type] || { label: type, color: "#888" };
  return <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: t.color + "12", color: t.color, fontWeight: 600 }}>{t.label}</span>;
};


/**
 * Main export: VendorsPage
 * Props:
 *   - vendorInstances: array of registered admin key instances from API
 *   - onRefetch: callback to refresh data
 */
export default function VendorsPage({ vendorInstances = [], onRefetch }) {
  const [selectedVendor, setSelectedVendor] = useState(null);

  // If a vendor is selected, show its detail page
  if (selectedVendor) {
    return (
      <VendorDetailPage
        vendorKey={selectedVendor}
        instances={vendorInstances.filter(vi => vi.vendor === selectedVendor)}
        onBack={() => setSelectedVendor(null)}
        onRefetch={onRefetch}
      />
    );
  }

  // Otherwise show the vendor grid
  return <VendorListPage onSelect={setSelectedVendor} vendorInstances={vendorInstances} />;
}


/**
 * VendorListPage — Grid of all supported LLM vendors
 */
function VendorListPage({ onSelect, vendorInstances }) {
  return (
    <div className="fin">
      <div className="ph">
        <div>
          <h2>LLM Vendors & Models</h2>
          <p>Configure vendor admin keys and browse available models</p>
        </div>
      </div>

      {/* Vendor Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {Object.entries(VENDORS).map(([key, vendor]) => {
          const instances = vendorInstances.filter(vi => vi.vendor === key);
          const activeInstances = instances.filter(vi => vi.status === "active");
          const totalKeys = instances.reduce((a, vi) => a + (vi.keys_issued || 0), 0);
          const totalSpend = instances.reduce((a, vi) => a + (vi.spend || 0), 0);
          const isConfigured = activeInstances.length > 0;

          return (
            <div
              key={key}
              onClick={() => onSelect(key)}
              style={{
                background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 10,
                padding: 20, cursor: "pointer", transition: "all .12s", position: "relative",
                boxShadow: "var(--sh)", borderTop: `3px solid ${vendor.color}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.08)"; e.currentTarget.style.borderColor = vendor.color; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--sh)"; e.currentTarget.style.borderColor = "var(--brd)"; e.currentTarget.style.borderTopColor = vendor.color; }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: vendor.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Server size={16} style={{ color: vendor.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{vendor.label}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>{vendor.description}</div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--t3)", marginTop: 4 }} />
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--brd-s)" }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>Admin Keys</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{activeInstances.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>API Keys</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{totalKeys}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600 }}>Models</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{vendor.models.length}</div>
                </div>
              </div>

              {/* Status */}
              {isConfigured ? (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ok)" }}>
                  <CheckCircle2 size={12} />{activeInstances.length} active instance{activeInstances.length > 1 ? "s" : ""} · ${fmt(totalSpend)} MTD
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t3)" }}>
                  <AlertTriangle size={12} />Not configured — add an admin key to start
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/**
 * VendorDetailPage — Full detail for a single LLM vendor
 * Shows: Model Catalog + Admin Key Instances + Usage
 */
function VendorDetailPage({ vendorKey, instances, onBack, onRefetch }) {
  const vendor = VENDORS[vendorKey];
  const [tab, setTab] = useState("models");
  const [showAdd, setShowAdd] = useState(false);
  const [modelFilter, setModelFilter] = useState("all");

  if (!vendor) return <div>Vendor not found</div>;

  const tabs = [
    { id: "models", label: "Model Catalog", icon: Database, count: vendor.models.length },
    { id: "instances", label: "Admin Keys", icon: Key, count: instances.length },
  ];

  const filteredModels = modelFilter === "all"
    ? vendor.models
    : vendor.models.filter(m => m.type === modelFilter);
  const modelTypes = [...new Set(vendor.models.map(m => m.type))];

  return (
    <div className="fin">
      {/* Back + Header */}
      <button className="btn btn-g btn-s" onClick={onBack} style={{ marginBottom: 8 }}>
        <ArrowLeft size={12} />All Vendors
      </button>

      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: vendor.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Server size={22} style={{ color: vendor.color }} />
          </div>
          <div>
            <h2>{vendor.label}</h2>
            <p>{vendor.description}</p>
          </div>
        </div>
        <div className="ph-a">
          <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="btn btn-g btn-s" style={{ textDecoration: "none" }}>
            <ExternalLink size={11} />Console
          </a>
          <button className="btn btn-p" onClick={() => { setTab("instances"); setShowAdd(true); }}>
            <Plus size={13} />Add Admin Key
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            <t.icon size={13} />{t.label}
            <span className="tab-n" style={{ background: tab === t.id ? "var(--acc-bg)" : "var(--bg2)", color: tab === t.id ? "var(--acc-t)" : "var(--t3)" }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Model Catalog Tab */}
      {tab === "models" && (
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            <button className={`pl${modelFilter === "all" ? " on" : ""}`} onClick={() => setModelFilter("all")}>
              All ({vendor.models.length})
            </button>
            {modelTypes.map(type => (
              <button key={type} className={`pl${modelFilter === type ? " on" : ""}`} onClick={() => setModelFilter(type)}>
                {MODEL_TYPES[type]?.label || type} ({vendor.models.filter(m => m.type === type).length})
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filteredModels.map(model => (
              <div key={model.id} style={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 8, padding: 16, boxShadow: "var(--sh)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 650 }}>{model.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{model.id}</div>
                  </div>
                  <ModelTypeBadge type={model.type} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Context</div>
                    <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{model.context}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Pricing</div>
                    <div style={{ fontSize: 11, marginTop: 2, color: "var(--t2)" }}>{model.pricing}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Key Instances Tab */}
      {tab === "instances" && (
        <div>
          {instances.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
              <Server size={32} style={{ opacity: .3, marginBottom: 12 }} />
              <div style={{ fontSize: 13, marginBottom: 12 }}>No admin keys configured for {vendor.label}</div>
              <button className="btn btn-p" onClick={() => setShowAdd(true)}>
                <Plus size={13} />Add First Admin Key
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--t2)" }}>
                  {instances.length} admin key instance{instances.length > 1 ? "s" : ""} for {vendor.label}
                </span>
                <button className="btn btn-p btn-s" onClick={() => setShowAdd(true)}>
                  <Plus size={12} />Add Instance
                </button>
              </div>

              {instances.map(inst => (
                <div key={inst.id} className="tw" style={{ marginBottom: 10 }}>
                  <div className="tw-hd">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: inst.status === "active" ? "var(--ok)" : "var(--t3)" }} />
                      <h3>{inst.name}</h3>
                      <SBadge s={inst.status} />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-g btn-xs"><Pencil size={10} />Edit</button>
                      <button className="btn btn-g btn-xs"><RotateCw size={10} />Rotate Key</button>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    {/* Instance details */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Admin Key</div>
                        <div className="mono" style={{ fontSize: 12, marginTop: 4, color: "var(--t2)" }}>{inst.admin_key_hint}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Org / Project</div>
                        <div className="mono" style={{ fontSize: 12, marginTop: 4, color: "var(--t2)" }}>{inst.org_id || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Keys Issued</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{inst.keys_issued}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Spend (MTD)</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>${fmt(inst.spend)}</div>
                      </div>
                    </div>

                    {/* Enabled models for this instance */}
                    <div style={{ borderTop: "1px solid var(--brd-s)", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Enabled Models</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(inst.models || []).map(modelId => {
                          const model = vendor.models.find(m => m.id === modelId);
                          return (
                            <span key={modelId} style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 4,
                              background: "var(--bg2)", color: "var(--t1)", fontWeight: 500,
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                              {model ? <ModelTypeBadge type={model.type} /> : null}
                              {model?.name || modelId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "var(--t3)" }}>
                      <span>Created {fmtD(inst.created)}</span>
                      {inst.org_id && <span>Org: {inst.org_id}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Instance Modal */}
      {showAdd && (
        <div className="mo" onClick={() => setShowAdd(false)}>
          <div className="md sun" onClick={e => e.stopPropagation()}>
            <div className="md-h">
              <h3>Add {vendor.label} Admin Key</h3>
              <button className="btn btn-g btn-xs" onClick={() => setShowAdd(false)}><X size={14} /></button>
            </div>
            <div className="md-b">
              <div className="info-box" style={{ marginBottom: 14 }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  Each admin key instance represents a separate {vendor.label} organization or project.
                  You can add multiple instances — for example, separate orgs for production and development.
                </div>
              </div>
              <div className="fg">
                <label className="fl">Instance Name</label>
                <input className="fi" placeholder={`e.g., ${vendor.label} Production`} />
              </div>
              <div className="fg">
                <label className="fl">Admin API Key</label>
                <input className="fi" type="password" placeholder={vendorKey === "openai" ? "sk-admin-..." : vendorKey === "anthropic" ? "sk-ant-admin-..." : "Enter admin key..."} />
              </div>
              <div className="fg">
                <label className="fl">Organization / Project ID (optional)</label>
                <input className="fi" placeholder="org-... or project ID" />
              </div>

              {vendorKey === "azure_openai" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div className="fg"><label className="fl">Subscription ID</label><input className="fi" /></div>
                  <div className="fg"><label className="fl">Resource Group</label><input className="fi" /></div>
                </div>
              )}
              {vendorKey === "google_vertex" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div className="fg"><label className="fl">GCP Project ID</label><input className="fi" /></div>
                  <div className="fg"><label className="fl">Region</label><input className="fi" placeholder="us-central1" /></div>
                </div>
              )}

              {/* Model selection */}
              <div className="fg">
                <label className="fl">Enabled Models</label>
                <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 6 }}>Select which models are available through this admin key</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {vendor.models.map(m => (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12, cursor: "pointer" }}>
                      <input type="checkbox" defaultChecked />
                      <span className="mono" style={{ fontSize: 11 }}>{m.name}</span>
                      <ModelTypeBadge type={m.type} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="md-f">
              <button className="btn btn-g" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-p">Add Instance</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
