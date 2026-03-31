"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const shouldUseDark = saved === "dark";
    document.documentElement.classList.toggle("dark", shouldUseDark);
    setDark(shouldUseDark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="glass smooth-hover rounded-full p-2.5"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      type="button"
    >
      {mounted && dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
