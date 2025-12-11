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
    advanced_opt: "Try advanced optimization",
    advanced_settings: "Advanced settings",
    advanced_settings_hint: "Use if you need to set per-channel response rates and/or want to try improved optimization",
    enable_rr: "Set response rate per channel",
    enable_rr_hint: "Enable if you want to manually provide response rate for each channel (0..1)",
    response_rate: "Response rate",
    potential_gain: "Potential extra revenue:",
    advanced_opt_hint: "Use it if you want to try to increase the possible profit",
    settings: "Settings",
    budget: "Budget",
    which_model: "Model selection",
    model1: "Model 1",
    model2: "Model 2",
    model3: "Model 3",
    get_results: "Get results",
    download_report: "Download report",
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
    validation_title: "Please fix the following:",
    err_no_channels: "Add at least one communication channel",
    err_no_products: "Add at least one product",
    err_invalid_numbers: "All numeric fields must be valid non-negative numbers",
    err_all_fields_required: "All input fields must be filled",
    err_budget_too_small_min_cost: "Budget is too small. Minimum feasible is ≥",
    err_budget_vs_volume: "Budget is significantly lower than required for the planned volume. Consider raising it to ≥",
    api_error_prefix: "Request cannot be processed:",
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
    model3: "Модель 3",
    get_results: "Получить результаты",
    download_report: "Скачать отчёт",
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
    advanced_opt: "Попробовать улучшенную оптимизацию",
    advanced_settings: "Дополнительные настройки",
    advanced_settings_hint: "Используйте, если Вам нужно задать вероятность отклика по каналам коммуникации и/или если Вы хотите попробовать улучшенную оптимизацию",
    enable_rr: "Задать вероятность отклика",
    enable_rr_hint: "Включите, если хотите вручную задать вероятность отклика по каждому каналу (0..1)",
    response_rate: "Вероятность отклика",
    potential_gain: "Потенциальная доп. выручка:",
    advanced_opt_hint: "Используйте, если хотите попробовать увеличить возможную прибыль",
    validation_title: "Пожалуйста, исправьте ошибки:",
    err_no_channels: "Добавьте хотя бы один канал связи",
    err_no_products: "Добавьте хотя бы один продукт",
    err_invalid_numbers: "Все числовые поля должны быть корректными неотрицательными значениями",
    err_all_fields_required: "Все поля для ввода должны быть заполнены",
    err_budget_too_small_min_cost: "Бюджет слишком маленький. Минимально возможно ≥",
    err_budget_vs_volume: "Бюджет заметно меньше требуемого под запланированный объём. Рекомендуем увеличить до ≥",
    api_error_prefix: "Запрос не может быть обработан:",
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
