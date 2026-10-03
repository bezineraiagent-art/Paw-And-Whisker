import { useEffect, useState } from "react";
import { Menu, Moon as MoonIcon, Sun, X } from "lucide-react";
import { Mark } from "@/components/Art";

const links = [
  { href: "/guides", label: "Guides" },
  { href: "/find-a-vet", label: "Find a vet" },
  { href: "/tools", label: "Tools" },
  { href: "/tools/symptom-check", label: "Symptom check" },
  { href: "/tools/toxic-food-checker", label: "Food checker" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("pw-theme", next ? "dark" : "light"); } catch { /* theme still applies for this visit */ }
  }
  return (
    <button type="button" className="pw-icon-btn" onClick={toggle} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to night mode"} data-testid="button-theme">
      {dark ? <Sun size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState("");
  useEffect(() => { setLocation(window.location.pathname); }, []);
  useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLAnchorElement>("#pw-nav a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.querySelector<HTMLButtonElement>('[data-testid="button-menu"]')?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const here = location.replace(/\/$/, "") || "/";
  return (
    <header className="content-header">
      <a className="pw-skip" href="#main">Skip to content</a>
      <div className="pw-head-in">
        <a href="/" className="site-wordmark"><Mark /> Paw &amp; Whisker</a>
        <nav aria-label="Main navigation" id="pw-nav" className={"pw-nav" + (open ? " open" : "")}>
          {links.map(l => (
            <a key={l.href} href={l.href} aria-current={here === l.href ? "page" : undefined} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <a href="/#free-chat" className="pw-nav-cta" onClick={() => setOpen(false)}>Ask free</a>
        </nav>
        <div className="pw-head-tools">
          <ThemeToggle />
          <button type="button" className="pw-icon-btn pw-menu-btn" aria-expanded={open} aria-controls="pw-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(o => !o)} data-testid="button-menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
