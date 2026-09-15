/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "bg-light": "#FAFAF7",
        "bg-dark": "#121214",
        "surface-light": "#FFFFFF",
        "surface-dark": "#1B1B1F",
        "ink-light": "#111111",
        "ink-dark": "#F5F3EE",
        "ink-muted-light": "#5A5A55",
        "ink-muted-dark": "#A8A6A0",
        "accent-crimson": "#D7263D",
        "accent-crimson-dark": "#FF5164",
        "accent-cobalt": "#1C4ED8",
        "accent-cobalt-dark": "#5B85FF",
        "accent-amber": "#F5B700",
        "accent-amber-dark": "#FFCB3C",
        "status-success": "#2BA84A",
        "status-warning": "#F5B700",
        "status-info": "#1C4ED8",
        "status-danger": "#D7263D",
        "status-neutral": "#8A8A85",
      },
      boxShadow: {
        brutalist: "4px 4px 0px #111111",
        "brutalist-sm": "3px 3px 0px #111111",
        "brutalist-xs": "2px 2px 0px #111111",
      },
    },
  },
  plugins: [],
};
