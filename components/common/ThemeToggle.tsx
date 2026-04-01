"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let ignore = false;

    const hydrateTheme = async () => {
      const applyTheme = (nextLight: boolean) => {
        document.documentElement.classList.toggle("light", nextLight);
        localStorage.setItem("theme", nextLight ? "light" : "dark");
        if (!ignore) {
          setLight(nextLight);
          setMounted(true);
        }
      };

      try {
        const saved = localStorage.getItem("theme");
        if (saved) {
          applyTheme(saved === "light");
        }

        const response = await fetch("/api/preferences");
        const json = await response.json().catch(() => ({}));

        if (response.ok && (json.theme === "dark" || json.theme === "light")) {
          applyTheme(json.theme === "light");
          return;
        }

        if (!saved) {
          applyTheme(false);
        }
      } catch {
        const saved = localStorage.getItem("theme");
        applyTheme(saved === "light");
      }
    };

    void hydrateTheme();

    return () => {
      ignore = true;
    };
  }, []);

  const toggle = async () => {
    const nextLight = !light;
    setLight(nextLight);
    document.documentElement.classList.toggle("light", nextLight);
    localStorage.setItem("theme", nextLight ? "light" : "dark");

    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextLight ? "light" : "dark" })
      });
    } catch {
      return;
    }
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
