import React from "react";
import { Globe, Bell, Sun, Moon } from "lucide-react";

export function TopBar({ darkMode, setDarkMode, lang, setLang }: {
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  lang: "en" | "am"; setLang: (l: "en" | "am") => void;
}) {
  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-end px-5 gap-2.5 shrink-0">
      <button onClick={() => setLang(lang === "en" ? "am" : "en")} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
        <Globe className="w-3.5 h-3.5" />{lang === "en" ? "አማርኛ" : "English"}
      </button>
      <button className="relative p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
      </button>
      <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
