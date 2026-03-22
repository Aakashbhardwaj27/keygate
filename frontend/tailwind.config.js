/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
      },
      colors: {
        surface: {
          0: "#0a0a0c",
          1: "#111114",
          2: "#18181c",
          3: "#1e1e24",
          4: "#131316",
        },
        border: {
          DEFAULT: "#25252b",
          subtle: "#1c1c22",
        },
        text: {
          primary: "#e8e8ec",
          secondary: "#8888a0",
          muted: "#55556a",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          bg: "rgba(99, 102, 241, 0.07)",
        },
        vendor: {
          openai: "#10a37f",
          anthropic: "#d97706",
          azure: "#0078d4",
          google: "#4285f4",
        },
      },
    },
  },
  plugins: [],
};
