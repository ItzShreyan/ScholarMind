"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const shouldUseLight = saved === "light";
    document.documentElement.classList.toggle("light", shouldUseLight);
    setLight(shouldUseLight);
    setMounted(true);
  }, []);

  const toggle = () => {
    const nextLight = !light;
    setLight(nextLight);
    document.documentElement.classList.toggle("light", nextLight);
    localStorage.setItem("theme", nextLight ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      className="glass smooth-hover rounded-full p-2.5"
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      type="button"
    >
      {mounted && light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
