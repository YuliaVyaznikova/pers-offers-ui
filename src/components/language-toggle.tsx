"use client"
import { useI18n } from "./language-provider"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { lang, setLang } = useI18n()
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
