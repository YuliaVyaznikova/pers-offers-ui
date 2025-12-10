"use client"
import * as React from "react"
import { useI18n } from "./language-provider"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { lang, setLang } = useI18n()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const next = lang === "en" ? "ru" : "en"
  const label = lang === "en" ? "RU" : "EN"

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2"
      onClick={() => setLang(next as any)}
      aria-label="Toggle language"
      title={lang === "en" ? "Switch to Russian" : "Переключить на английский"}
    >
      {label}
    </Button>
  )
}
