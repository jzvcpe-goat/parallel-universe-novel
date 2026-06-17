/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Quantum Theme Colors
        deep: {
          space: "#0b0f1f",
          void: "#070a15",
          navy: "#11162a",
        },
        quantum: {
          cyan: "#00d4ff",
          violet: "#8b5cf6",
          gold: "#f2b824",
          teal: "#14b8a6",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
        tier: {
          s: "#f2b824",
          a: "#f59e0b",
          b: "#8b5cf6",
          c: "#00d4ff",
          d: "#14b8a6",
        },
      },
      fontFamily: {
        space: ["Space Grotesk", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        glow: {
          cyan: "0 0 20px rgba(0, 212, 255, 0.4)",
          violet: "0 0 20px rgba(139, 92, 246, 0.4)",
          gold: "0 0 20px rgba(242, 184, 36, 0.4)",
          rose: "0 0 20px rgba(244, 63, 94, 0.4)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "node-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.15)", opacity: "0.8" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "connection-flow": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "particle-drift": {
          "0%": { transform: "translate(0, 0)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translate(var(--drift-x, 100px), var(--drift-y, -100px))", opacity: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 212, 255, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.2)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "typewriter": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "node-pulse": "node-pulse 2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        "connection-flow": "connection-flow 1.5s linear infinite",
        "particle-drift": "particle-drift 8s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "typewriter": "typewriter 0.8s steps(40) forwards",
        "blink": "blink 1s step-end infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "rotate-slow": "rotate-slow 20s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}