@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --font-display: "Space Grotesk", sans-serif;
}

/* Custom scrolling classes */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.2);
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
}

/* Glowing aesthetic touches */
.glow-accent {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
}
