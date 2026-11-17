import type { Config } from "tailwindcss";

// Paleta da identidade Aços F Sacchelli (logo: círculo azul, setas amarela e verde)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B2A5B", 900: "#071C3E", 800: "#0B2A5B", 700: "#123A78", 600: "#1F4E99", 100: "#DCE6F5", 50: "#EEF3FB" },
        sac: { azul: "#1F4E99", amarelo: "#F2C200", verde: "#1F9D55", vermelho: "#C62828" },
        fundo: "#F2F5FA",
        borda: "#D5DEEB",
        tinta: "#1E2633",
        suave: "#5A6577",
      },
      fontFamily: {
        sans: ["var(--fonte-texto)", "system-ui", "sans-serif"],
        marca: ["var(--fonte-marca)", "var(--fonte-texto)", "sans-serif"],
      },
      boxShadow: { cartao: "0 1px 2px rgba(11,42,91,.06), 0 4px 16px rgba(11,42,91,.06)" },
    },
  },
  plugins: [],
};
export default config;
