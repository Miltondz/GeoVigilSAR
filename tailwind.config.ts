import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "hud-bg":     "#000A0F",
        "hud-panel":  "#001A24",
        "hud-green":  "#00FF88",
        "hud-cyan":   "#00B4FF",
        "hud-red":    "#FF4444",
        "hud-amber":  "#FFB800",
        "hud-slate":  "#1A3A4A",
        "hud-text":   "#E0E8F0",
        "hud-muted":  "#607080",
      },
      fontFamily: {
        mono:     ["Share Tech Mono", "monospace"],
        headline: ["Exo 2", "sans-serif"],
        body:     ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config
