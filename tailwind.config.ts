import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#05070d"
        }
      },
      boxShadow: {
        glass: "0 12px 40px rgba(15, 23, 42, 0.18)"
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top right, rgba(99, 102, 241, 0.3), rgba(59, 130, 246, 0.06) 35%, transparent 65%)"
      }
    }
  },
  plugins: []
};

export default config;
