import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Cores específicas da clínica médica
        "primary-blue": {
          DEFAULT: "hsl(var(--primary-blue))",
          foreground: "hsl(var(--primary-blue-foreground))",
        },
        "accent-blue": {
          DEFAULT: "hsl(var(--accent-blue))",
          foreground: "hsl(var(--accent-blue-foreground))",
        },
        "accent-gold": {
          DEFAULT: "hsl(var(--accent-gold))",
          foreground: "hsl(var(--accent-gold-foreground))",
        },

        // Cores de sistema
        primary: {
          DEFAULT: "hsl(var(--primary-blue))",
          foreground: "hsl(var(--primary-blue-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-blue))",
          foreground: "hsl(var(--accent-blue-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Fundo de Popover, Command (dropdowns com busca), DropdownMenu e
        // Tooltip. Sem este token `bg-popover` não gera CSS e esses painéis
        // ficam transparentes, com o texto da página aparecendo por trás.
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        focus: "hsl(var(--focus))",

        // Sidebar
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
      boxShadow: {
        "elegant":
          "0 4px 24px -4px hsl(var(--primary-blue) / 0.12), 0 2px 8px -2px hsl(var(--accent-gold) / 0.08)",
        "card":
          "0 2px 16px -4px hsl(220 15% 9% / 0.08), 0 1px 4px -1px hsl(220 15% 9% / 0.04)",
        "glow":
          "0 0 32px hsl(var(--primary-blue) / 0.25), 0 0 16px hsl(var(--accent-gold) / 0.15)",
        "soft":
          "0 1px 3px hsl(220 15% 9% / 0.06), 0 1px 2px hsl(220 15% 9% / 0.04)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
