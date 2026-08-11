import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--text-primary)",
        surface: "rgba(30, 41, 59, 0.7)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "text-muted": "var(--text-muted)",
      },
    },
  },
  plugins: [],
};
export default config;
