"use client"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

type Lang = "en" | "ru"

type I18nContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: keyof typeof DICT["en"]) => string
}

const defaultLang: Lang = "en"

const DICT = {
  en: {
    title: "Personalized Offers",
    subtitle: "marketing contacts optimization",
    contacts: "Contacts",
    channel: "Channel for communication with clients",
    amount: "Max num of communications",
    cost: "Cost (₽)",
    add_channel: "Add channel",
    ltv_title: "LTV",
    product: "Product",
    ltv_label: "LTV (₽)",
    add_product: "Add product",
    select_channel: "Select channel",
    select_product: "Select product",
    settings: "Settings",
    budget: "Budget",
    which_model: "Model selection",
    model1: "Model 1",
    model2: "Model 2",
    get_results: "Get results",
    results: "Results",
    campaign_results: "Campaign results",
    available_budget: "Available budget:",
    actual_spend: "Actual spend:",
    expected_revenue: "Expected revenue:",
    expected_roi: "Expected ROI:",
    reach_clients: "Reach (clients):",
    channel_usage: "Channel usage",
    col_channel: "Channel",
    col_offers_count: "Offers count",
    col_total_cost: "Total cost",
    col_total_revenue: "Total revenue",
    product_distribution: "Product distribution",
    col_product: "Product",
    col_avg_affinity_revenue: "Average affinity revenue",
    empty_dash: "-",
    loading_message: "Please, be patient, it may take some time",
  },
  ru: {
    title: "Персональные предложения",
    subtitle: "оптимизация контактов маркетинга",
    contacts: "Контакты",
    channel: "Канал связи с клиентом",
    amount: "Макс кол-во коммуникаций",
    cost: "Цена (₽)",
    add_channel: "Добавить канал связи",
    ltv_title: "LTV",
    product: "Продукт",
    ltv_label: "LTV (₽)",
    add_product: "Добавить продукт",
    settings: "Настройки",
    budget: "Бюджет",
    which_model: "Выбор модели",
    model1: "Модель 1",
    model2: "Модель 2",
    get_results: "Получить результаты",
    results: "Результаты",
    campaign_results: "Итоги кампании",
    available_budget: "Доступный бюджет:",
    actual_spend: "Фактические затраты:",
    expected_revenue: "Ожидаемая выручка:",
    expected_roi: "Ожидаемый ROI:",
    reach_clients: "Охват (клиенты):",
    channel_usage: "Использование каналов",
    col_channel: "Канал связи",
    col_offers_count: "Количество коммуникаций",
    col_total_cost: "Общая стоимость",
    col_total_revenue: "Общая выручка",
    product_distribution: "Распределение по продуктам",
    col_product: "Продукт",
    col_avg_affinity_revenue: "Средний доход от привлечения клиентов",
    empty_dash: "-",
    loading_message: "Пожалуйста, проявите терпение, это может занять некоторое время",
    select_channel: "Выбрать канал",
    select_product: "Выбрать продукт",
  },
} as const

const I18nContext = createContext<I18nContextType | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(defaultLang)

  useEffect(() => {
    // On mount, read persisted language and sync once to avoid SSR/CSR mismatch
    try {
      const saved = localStorage.getItem("lang") as Lang | null
      if (saved && (saved === "en" || saved === "ru")) {
        setLangState(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang)
    } catch {}
  }, [lang])

  const setLang = (l: Lang) => setLangState(l)

  const t = useMemo(() => {
    const dict = DICT[lang]
    return (k: keyof typeof DICT["en"]) => dict[k]
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider")
  return ctx
}
