import { ChevronRight, Search, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function TopBar({ breadcrumb, userInitials = "AB" }) {
  const { theme, toggle } = useTheme();

  const btnStyle = {
    width: 32, height: 32, borderRadius: 6, border: "1px solid var(--brd)",
    background: "var(--bg1)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "var(--t2)", transition: "all .1s",
  };

  return (
    <div style={{
      height: 48, background: "var(--tb-bg)", borderBottom: "1px solid var(--tb-brd)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--t2)" }}>
        {breadcrumb.map((item, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {i > 0 && <ChevronRight size={12} />}
            <span style={i === breadcrumb.length - 1 ? { color: "var(--t0)", fontWeight: 600 } : {}}>{item}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button style={btnStyle} title="Search"><Search size={14} /></button>
        <button style={btnStyle} title="Notifications"><Bell size={14} /></button>
        <button style={btnStyle} onClick={toggle} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <div style={{
          width: 30, height: 30, borderRadius: 6, background: "var(--acc)", color: "#fff",
          fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {userInitials}
        </div>
      </div>
    </div>
  );
}
