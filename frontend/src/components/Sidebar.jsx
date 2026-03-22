import {
  LayoutDashboard, FolderKanban, Users, Key, Shield,
  ScrollText, Settings, LogOut, Building2
} from "lucide-react";

const NAV = [
  { section: "Overview" },
  { id: "overview", label: "Dashboard", Ic: LayoutDashboard },
  { section: "Management" },
  { id: "workspaces", label: "Workspaces", Ic: FolderKanban },
  { id: "members", label: "Members", Ic: Users },
  { id: "keys", label: "API Keys", Ic: Key },
  { section: "Security" },
  { id: "rbac", label: "Access Control", Ic: Shield },
  { id: "audit", label: "Audit Log", Ic: ScrollText },
  { section: "Config" },
  { id: "settings", label: "Settings", Ic: Settings },
];

export function Sidebar({ page, onNavigate, org, badges = {}, onLogout }) {
  return (
    <nav style={{ width: 228, background: "var(--sb-bg)", position: "fixed", top: 0, left: 0, bottom: 0, display: "flex", flexDirection: "column", zIndex: 100, borderRight: "1px solid rgba(255,255,255,.06)" }}>
      {/* Brand */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-.03em" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8" }} />
          KeyGate
        </div>
        <div style={{ fontSize: 11, color: "var(--sb-t)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <Building2 size={10} />{org.name} · {org.plan}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "4px 0", overflowY: "auto" }}>
        {NAV.map((item, i) =>
          item.section ? (
            <div key={i} style={{ padding: "18px 14px 5px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--sb-t)", opacity: .45 }}>
              {item.section}
            </div>
          ) : (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", margin: "1px 6px", borderRadius: 5,
                color: page === item.id ? "var(--sb-a)" : "var(--sb-t)",
                background: page === item.id ? "var(--sb-abg)" : "transparent",
                fontWeight: page === item.id ? 600 : 450,
                cursor: "pointer", fontSize: 13, transition: "all .1s",
              }}
            >
              <item.Ic size={15} style={{ opacity: page === item.id ? .9 : .55, flexShrink: 0 }} />
              {item.label}
              {badges[item.id] != null && (
                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, padding: "0 6px", borderRadius: 8, background: "rgba(255,255,255,.07)", color: "var(--sb-t)", lineHeight: "18px" }}>
                  {badges[item.id]}
                </span>
              )}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 5, color: "var(--sb-t)", cursor: "pointer", fontSize: 13, opacity: .6 }}>
          <LogOut size={14} />Sign out
        </div>
      </div>
    </nav>
  );
}
