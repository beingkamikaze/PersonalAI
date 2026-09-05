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
        border: "var(--border)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-figtree)", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
