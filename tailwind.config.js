/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111e",
        panel: "#0f1b2d",
        line: "#1d3148",
        mist: "#8ea6c4",
        coral: "#ff6b57",
        amber: "#f8b84e",
        teal: "#32c6b7",
        mint: "#8cd17d"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(3, 10, 19, 0.28)"
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      backgroundImage: {
        grid:
          "linear-gradient(to right, rgba(142,166,196,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(142,166,196,0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
