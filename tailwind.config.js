/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0e1a",
        panel: "#111827",
        line: "#23304a",
        mist: "#93a4bf",
        coral: "#f87171",
        amber: "#f59e0b",
        teal: "#22d3ee",
        mint: "#34d399",
        calm: "#818cf8"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(4, 8, 20, 0.48)",
        glow: "0 0 24px rgba(34, 211, 238, 0.18)"
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      backgroundImage: {
        grid:
          "linear-gradient(to right, rgba(147,164,191,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,164,191,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
