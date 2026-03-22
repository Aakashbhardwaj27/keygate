import { createContext, useContext, useState, useEffect } from "react";

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("kg_theme") || "light");

  useEffect(() => {
    localStorage.setItem("kg_theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div className={theme === "light" ? "theme-light" : "theme-dark"}>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
