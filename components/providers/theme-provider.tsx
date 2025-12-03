"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    const applyAccent = (name: string | null) => {
      const root = document.documentElement
      const known = ["orange", "rose", "violet"]
      known.forEach((cls) => root.classList.remove(cls))
      if (name && known.includes(name)) {
        root.classList.add(name)
      }
    }
    const curr = localStorage.getItem("accent_theme")
    applyAccent(curr)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "accent_theme") applyAccent(e.newValue)
    }
    const onCustom = (e: Event) => {
      try { applyAccent(localStorage.getItem("accent_theme")) } catch {}
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener("accent-theme-change", onCustom as any)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("accent-theme-change", onCustom as any)
    }
  }, [])
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
