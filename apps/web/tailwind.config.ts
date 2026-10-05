import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        elevated: "var(--bg-elevated)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        border: "var(--border)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-figtree)", "ui-sans-serif", "sans-serif"],
      },
      keyframes: {
        "chat-dot": {
          "0%, 80%, 100%": { opacity: "0.3" },
          "40%": { opacity: "1" },
        },
        "chat-mark": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "status-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "companion-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "companion-shadow": {
          "0%, 100%": { transform: "scaleX(1)", opacity: "0.4" },
          "50%": { transform: "scaleX(0.84)", opacity: "0.2" },
        },
        "landing-caret": {
          "0%, 45%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "chat-dot": "chat-dot 1s ease-in-out infinite",
        "chat-mark": "chat-mark 1.2s ease-in-out infinite",
        "status-float": "status-float 3.6s ease-in-out infinite",
        "status-float-pill": "status-float 4.2s ease-in-out 0.7s infinite",
        "companion-float": "companion-float 3.6s ease-in-out infinite",
        "companion-shadow": "companion-shadow 3.6s ease-in-out infinite",
        "landing-caret": "landing-caret 1.05s steps(1, end) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
