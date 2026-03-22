import { X, CheckCircle2, XCircle, Shield, Lock, AlertTriangle } from "lucide-react";
import { VENDORS, ROLE_META, SEVERITY } from "../lib/constants";

// ── Vendor Badge ──
export function VBadge({ v }) {
  const d = VENDORS[v] || { label: v, color: "#888" };
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, background: d.color + "10", color: d.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: d.color, display: "inline-block" }} />
      {d.label}
    </span>
  );
}

// ── Status Badge ──
export function SBadge({ s }) {
  const m = { active: { c: "var(--ok)", bg: "rgba(5,150,105,.07)" }, revoked: { c: "var(--err)", bg: "rgba(220,38,38,.07)" }, suspended: { c: "var(--warn)", bg: "rgba(217,119,6,.07)" }, expired: { c: "var(--t3)", bg: "var(--bg2)" } }[s] || {};
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600, background: m.bg, color: m.c }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.c }} />{s}
    </span>
  );
}

// ── Role Badge ──
export function RBadge({ r }) {
  const d = ROLE_META[r] || ROLE_META.viewer;
  return <span style={{ padding: "1px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: d.color + "10", color: d.color }}>{d.label}</span>;
}

// ── Filter Pill ──
export function Pill({ on, children, ...p }) {
  return (
    <button
      style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10.5, fontWeight: on ? 600 : 500, cursor: "pointer", transition: "all .1s", border: `1px solid ${on ? "var(--acc)" : "var(--brd)"}`, background: on ? "var(--acc-bg)" : "var(--bg1)", color: on ? "var(--acc-t)" : "var(--t2)", fontFamily: "inherit" }}
      {...p}
    >
      {children}
    </button>
  );
}

// ── Modal ──
export function Modal({ title, onClose, footer, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div className="sun" style={{ background: "var(--bg1)", border: "1px solid var(--brd)", borderRadius: 10, width: 500, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.12)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--brd-s)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button className="btn-g btn-xs" onClick={onClose} style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--brd)", background: "transparent", cursor: "pointer", color: "var(--t2)" }}><X size={14} /></button>
        </div>
        <div style={{ padding: "16px 20px" }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: "1px solid var(--brd-s)", display: "flex", justifyContent: "flex-end", gap: 6 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Buttons ──
const btnBase = { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 6, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all .1s", border: "1px solid transparent" };
export function BtnP({ children, size = "md", ...p }) {
  const s = size === "sm" ? { padding: "4px 8px", fontSize: 11 } : { padding: "6px 12px", fontSize: 12 };
  return <button style={{ ...btnBase, ...s, background: "var(--acc)", color: "#fff", borderColor: "var(--acc)" }} {...p}>{children}</button>;
}
export function BtnG({ children, size = "md", ...p }) {
  const s = size === "sm" ? { padding: "4px 8px", fontSize: 11 } : { padding: "6px 12px", fontSize: 12 };
  return <button style={{ ...btnBase, ...s, background: "transparent", color: "var(--t1)", borderColor: "var(--brd)" }} {...p}>{children}</button>;
}
export function BtnD({ children, size = "md", ...p }) {
  const s = size === "sm" ? { padding: "4px 8px", fontSize: 11 } : { padding: "6px 12px", fontSize: 12 };
  return <button style={{ ...btnBase, ...s, background: "transparent", color: "var(--err)", borderColor: "rgba(220,38,38,.15)" }} {...p}>{children}</button>;
}

// ── Form ──
const inputStyle = { width: "100%", padding: "7px 10px", background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", color: "var(--t0)", outline: "none" };
export function FGroup({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--t2)", marginBottom: 4 }}>{label}</label>{children}</div>;
}
export function FInput(p) { return <input style={inputStyle} {...p} />; }
export function FSelect({ children, ...p }) { return <select style={inputStyle} {...p}>{children}</select>; }

// ── Stat Card ──
export function StatCard({ icon: Icon, label, value, sub, trend }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 8, padding: "14px 16px", boxShadow: "var(--sh)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".04em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {label}{Icon && <Icon size={13} />}
      </div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.04em", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: trend === "up" ? "var(--ok)" : trend === "down" ? "var(--err)" : "var(--t3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Progress Bar ──
export function ProgressBar({ value, max, color = "var(--acc)", height = 4 }) {
  const p = max ? Math.round(value / max * 100) : 0;
  return (
    <div style={{ height, borderRadius: height / 2, background: "var(--bg3)", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: height / 2, width: `${p}%`, background: p > 80 ? "var(--err)" : color, transition: "width .3s" }} />
    </div>
  );
}

// ── Severity Icon ──
export function SeverityIcon({ severity, size = 13 }) {
  const sv = SEVERITY[severity];
  if (severity === "critical" || severity === "warn") return <AlertTriangle size={size} />;
  return <CheckCircle2 size={size} />;
}

// ── Table wrapper ──
export function TableWrap({ title, toolbar, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 8, overflow: "hidden", boxShadow: "var(--sh)" }}>
      {(title || toolbar) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--brd-s)" }}>
          {title && <h3 style={{ fontSize: 13, fontWeight: 600 }}>{title}</h3>}
          {toolbar}
        </div>
      )}
      {children}
    </div>
  );
}
