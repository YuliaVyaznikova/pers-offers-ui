"use client"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, HelpCircle, ChevronDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useI18n } from "@/components/language-provider"

type ChannelType =
  | "Phone calls"
  | "SMS"
  | "Email"
  | "Push notifications"
  | "Social media"
  | "Website banner"

type ProductOption = { id: string; label: string }

type ChannelRow = {
  id: string
  type?: ChannelType
  max?: number
  cost?: number
  response_rate?: number
}

type ProductRow = {
  id: string
  product_id?: string
  ltv?: number
}

const CHANNEL_OPTIONS: ChannelType[] = [
  "Phone calls",
  "SMS",
  "Email",
  "Push notifications",
  "Social media",
  "Website banner",
]

const PRODUCT_OPTIONS: ProductOption[] = [
  { id: "debit_card", label: "Дебетовая карта" },
  { id: "deposit", label: "Вклад" },
  { id: "auto_loan", label: "Автокредит" },
  { id: "bank_subscription", label: "Банковская подписка" },
  { id: "credit_card", label: "Кредитная карта" },
  { id: "cash_loan", label: "Кредит наличными" },
]

type OptimizeResponse = {
  // [budget_available, actual_spend, actual_spend_percent, expected_revenue, expected_roi_percent, reach_clients]
  summary: [number, number, number, number, number, number]
  // channel_id -> [offers_count, total_cost, total_revenue]
  channels_usage: Record<string, [number, number, number]>
  // product_id -> [offers_count, avg_affinity_revenue]
  products_distribution: Record<string, [number, number]>
}

export default function Home() {
  const { t, lang } = useI18n()
  const preventInvalidNumberKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key
    if (k === '-' || k === '+' || k === 'e' || k === 'E' || k === ',') {
      e.preventDefault()
    }
  }
  const onDownloadCsv = async () => {
    try {
      const selectedChannels = channels.filter(c => !!c.type)
      const selectedProducts = products.filter(p => !!p.product_id)
      const bud = Number(budget ?? 0)
      const channelCode = (t?: ChannelType): string | undefined => {
        switch (t) {
          case "SMS": return "sms"
          case "Email": return "email"
          case "Push notifications": return "push"
          case "Phone calls": return "phone"
          case "Social media": return "social"
          case "Website banner": return "web_banner"
          default: return undefined
        }
      }
      const channelsMap = Object.fromEntries(
        selectedChannels
          .map(c => {
            const key = channelCode(c.type)
            if (!key) return [undefined, undefined]
            const hasRR = enableRR && typeof c.response_rate === 'number' && !Number.isNaN(c.response_rate)
            const tuple = hasRR ? [c.max ?? 0, c.cost ?? 0, c.response_rate] : [c.max ?? 0, c.cost ?? 0]
            return [key, tuple]
          })
          .filter(([k]) => !!k)
      ) as Record<string, number[]>
      const productsMap = Object.fromEntries(
        selectedProducts.map(p => [p.product_id, p.ltv ?? 0]).filter(([k]) => !!k)
      ) as Record<string, number>
      const payloadV2 = {
        budget: bud,
        model: model,
        advanced,
        enable_rr: enableRR,
        channels: channelsMap,
        products: productsMap,
      }
      const resp = await fetch('/api/optimize/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadV2),
      })
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'offers.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }
  const preventInvalidPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (text.includes('-') || text.includes('+') || /e/i.test(text) || text.includes(',')) {
      e.preventDefault()
    }
  }
  const [channels, setChannels] = useState<ChannelRow[]>([
    { id: crypto.randomUUID(), type: undefined, max: undefined, cost: undefined },
    { id: crypto.randomUUID(), type: undefined, max: undefined, cost: undefined },
    { id: crypto.randomUUID(), type: undefined, max: undefined, cost: undefined },
  ])

  const [products, setProducts] = useState<ProductRow[]>([
    { id: crypto.randomUUID(), product_id: undefined, ltv: undefined },
    { id: crypto.randomUUID(), product_id: undefined, ltv: undefined },
    { id: crypto.randomUUID(), product_id: undefined, ltv: undefined },
  ])

  const [budget, setBudget] = useState<number | undefined>(100000)
  const [model, setModel] = useState<"model1" | "model2" | "model3">("model1")
  const [results, setResults] = useState<OptimizeResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [advanced, setAdvanced] = useState<boolean>(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false)
  const [enableRR, setEnableRR] = useState<boolean>(false)
  const [errors, setErrors] = useState<string[]>([])

  // Temporary input buffers to allow partial decimals like "0." without clearing
  const [tempInputs, setTempInputs] = useState<Record<string, { cost?: string; rr?: string }>>({})
  const setTemp = (id: string, field: 'cost' | 'rr', val?: string) =>
    setTempInputs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }))

  const usedChannelTypes = useMemo(
    () => new Set(channels.map((c) => c.type).filter(Boolean) as ChannelType[]),
    [channels]
  )
  const availableChannelOptions = (current?: ChannelType) =>
    CHANNEL_OPTIONS.filter((o) => o === current || !usedChannelTypes.has(o))

  const channelLabel = (opt: ChannelType) => {
    if (lang === "ru") {
      switch (opt) {
        case "Phone calls": return "Телефонные звонки"
        case "SMS": return "SMS-рассылка"
        case "Email": return "Email-рассылка"
        case "Push notifications": return "Push-уведомления"
        case "Website banner": return "Баннер на сайте"
        case "Social media": return "Реклама в соцсетях"
        default: return opt
      }
    }
    return opt
  }

  // Localized label by backend channel id ("sms", "email", "push", "phone", "social", "web_banner")
  const channelLabelById = (id: string) => {
    const idNorm = (id || '').toLowerCase()
    if (lang === 'ru') {
      switch (idNorm) {
        case 'sms': return 'SMS-рассылка'
        case 'email': return 'Email-рассылка'
        case 'push': return 'Push-уведомления'
        case 'phone': return 'Телефонные звонки'
        case 'social': return 'Реклама в соцсетях'
        case 'web_banner': return 'Баннер на сайте'
        default: return id
      }
    }
    // EN
    switch (idNorm) {
      case 'sms': return 'SMS'
      case 'email': return 'Email'
      case 'push': return 'Push notifications'
      case 'phone': return 'Phone calls'
      case 'social': return 'Social media'
      case 'web_banner': return 'Website banner'
      default: return id
    }
  }

  const usedProductTypes = useMemo(
    () => new Set(products.map((p) => p.product_id).filter(Boolean) as string[]),
    [products]
  )
  const availableProductOptions = (current?: string) =>
    PRODUCT_OPTIONS.filter((o) => o.id === current || !usedProductTypes.has(o.id))

  // Localized product label by backend product id
  const productLabelById = (id: string) => {
    if (lang === 'ru') {
      const found = PRODUCT_OPTIONS.find(o => o.id === id)
      return found ? found.label : id
    }
    // EN mapping
    switch (id) {
      case 'debit_card': return 'Debit card'
      case 'deposit': return 'Deposit'
      case 'auto_loan': return 'Car loan'
      case 'bank_subscription': return 'Bank subscription'
      case 'credit_card': return 'Credit card'
      case 'cash_loan': return 'Cash loan'
      default: return id
    }
  }

  const updateChannel = (id: string, patch: Partial<ChannelRow>) =>
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const removeChannel = (id: string) =>
    setChannels((prev) => prev.filter((c) => c.id !== id))
  const addChannel = () =>
    setChannels((prev) => [...prev, { id: crypto.randomUUID(), type: undefined, max: undefined, cost: undefined }])

  const updateProduct = (id: string, patch: Partial<ProductRow>) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id))
  const addProduct = () =>
    setProducts((prev) => [...prev, { id: crypto.randomUUID(), product_id: undefined, ltv: undefined }])

  const onGetResults = () => {
    setLoading(true)
    const start = Date.now()
    setErrors([])
    // Client-side validation
    const selectedChannels = channels.filter(c => !!c.type)
    const selectedProducts = products.filter(p => !!p.product_id)
    const bud = Number(budget ?? 0)
    const numInvalid = [
      ...channels.map(c => [c.max, c.cost, c.response_rate]).flat(),
      ...products.map(p => [p.ltv]).flat(),
      bud,
    ].some(v => v !== undefined && (Number.isNaN(Number(v)) || Number(v as number) < 0))
    const msgs: string[] = []
    if (selectedChannels.length === 0) msgs.push(t("err_no_channels"))
    if (selectedProducts.length === 0) msgs.push(t("err_no_products"))
    if (numInvalid) msgs.push(t("err_invalid_numbers"))
    // budget checks
    const costs = selectedChannels.map(c => Number(c.cost ?? 0)).filter(v => v > 0)
    const minCost = costs.length ? Math.min(...costs) : 0
    if (minCost > 0 && bud > 0 && bud < minCost) {
      msgs.push(`${t("err_budget_too_small_min_cost")} ${minCost.toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽`)
    }
    const required = selectedChannels.reduce((sum, c) => sum + (Math.max(0, Number(c.max ?? 0)) * Math.max(0, Number(c.cost ?? 0))), 0)
    if (required > 0 && bud > 0 && bud < required) {
      msgs.push(`${t("err_budget_vs_volume")} ${Math.round(required).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽`)
    }
    // response rate policy driven by user's toggle
    if (enableRR) {
      const anyMissingRR = selectedChannels.some(c => c.response_rate === undefined || Number.isNaN(Number(c.response_rate)))
      const anyOutOfRange = selectedChannels.some(c => typeof c.response_rate === 'number' && (c.response_rate! < 0 || c.response_rate! > 1))
      if (anyMissingRR) msgs.push(lang === 'ru' ? 'Для каждого выбранного канала задайте вероятность отклика (0..1)' : 'Provide response rate (0..1) for every selected channel')
      if (anyOutOfRange) msgs.push(lang === 'ru' ? 'Вероятность отклика должна быть в диапазоне 0..1' : 'Response rate must be in range 0..1')
    }
    if (msgs.length > 0) {
      setErrors(msgs)
      setLoading(false)
      return
    }
    const channelCode = (t?: ChannelType): string | undefined => {
      switch (t) {
        case "SMS": return "sms"
        case "Email": return "email"
        case "Push notifications": return "push"
        case "Phone calls": return "phone"
        case "Social media": return "social"
        case "Website banner": return "web_banner"
        default: return undefined
      }
    }
    const channelsMap = Object.fromEntries(
      channels
        .map(c => {
          const key = channelCode(c.type)
          if (!key) return [undefined, undefined]
          const hasRR = enableRR && typeof c.response_rate === 'number' && !Number.isNaN(c.response_rate)
          const tuple = hasRR ? [c.max ?? 0, c.cost ?? 0, c.response_rate] : [c.max ?? 0, c.cost ?? 0]
          return [key, tuple]
        })
        .filter(([k]) => !!k)
    ) as Record<string, number[]>
    const productsMap = Object.fromEntries(
      products
        .map(p => [p.product_id, p.ltv ?? 0])
        .filter(([k]) => !!k)
    ) as Record<string, number>
    const payloadV2 = {
      budget: bud,
      model: model, // backend expects: model1 | model2 | model3
      advanced,
      enable_rr: enableRR,
      channels: channelsMap,
      products: productsMap,
    }
    fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadV2),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!r.ok) {
          const serverMsgs: string[] = Array.isArray((data as any)?.messages) ? (data as any).messages : [String((data as any)?.message || "Error")]
          setErrors([t("api_error_prefix"), ...serverMsgs])
          setResults(null)
          return null
        }
        return data
      })
      .then((data) => { if (data) setResults(data) })
      .catch((e) => console.error(e))
      .finally(() => {
        const MIN_LOADING_MS = 3000
        const elapsed = Date.now() - start
        const remain = Math.max(0, MIN_LOADING_MS - elapsed)
        window.setTimeout(() => setLoading(false), remain)
      })
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <h1 className="text-3xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Contacts */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>{t("contacts")}</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            {/* header row for columns */}
            <div className="hidden sm:grid grid-cols-12 gap-6 text-xs text-muted-foreground font-medium px-0 transition-all">
              <div className="sm:col-span-5">{t("channel")}</div>
              <div className={enableRR ? "sm:col-span-2" : "sm:col-span-4"}>{t("amount")}</div>
              {enableRR && (
                <div className="sm:col-span-2">{t("response_rate")}</div>
              )}
              <div className="sm:col-span-2">{t("cost")}</div>
              <div className="sm:col-span-1" />
            </div>

            {channels.map((row) => (
              <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-5">
                  <Select
                    value={row.type}
                    onValueChange={(v: ChannelType) => updateChannel(row.id, { type: v })}
                  >
                    <SelectTrigger className="h-9 w-full min-w-[176px]" aria-label="Channel">
                      <SelectValue placeholder={t("select_channel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannelOptions(row.type).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {channelLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={enableRR ? "sm:col-span-2" : "sm:col-span-4"}>
                  <Input
                    className="h-9 w-full min-w-[100px]"
                    type="number"
                    min={0}
                    lang="en"
                    onKeyDown={(e) => {
                      // amount must be integer: block '.', ',', exp, signs
                      const k = e.key
                      if (k === '.' || k === ',' || k === '-' || k === '+' || k === 'e' || k === 'E') e.preventDefault()
                    }}
                    onPaste={preventInvalidPaste}
                    onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                    value={row.max ?? ""}
                    onChange={(e) => {
                      const s = e.target.value
                      if (s === '') return updateChannel(row.id, { max: undefined })
                      // coerce to integer
                      const n = Math.floor(Number(String(s).replace(/[^0-9]/g, '')))
                      updateChannel(row.id, { max: Number.isFinite(n) ? n : undefined })
                    }}
                    placeholder="0"
                    aria-label="amount"
                  />
                </div>
                {enableRR && (
                  <div className="sm:col-span-2">
                    <Input
                      className="h-9 w-full min-w-[90px]"
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => {
                        const k = e.key
                        if (k === '-' || k === '+' || k === 'e' || k === 'E' || k === ',') {
                          e.preventDefault()
                          return
                        }
                        if (k === 'ArrowUp' || k === 'ArrowDown') {
                          e.preventDefault()
                          const raw = (e.currentTarget as HTMLInputElement).value
                          const curr = Number((raw || '0').replace(',', '.'))
                          const step = 0.001
                          const next = Math.min(1, Math.max(0, curr + (k === 'ArrowUp' ? step : -step)))
                          updateChannel(row.id, { response_rate: Number.isFinite(next) ? Number(next.toFixed(3)) : 0 })
                          setTemp(row.id, 'rr', undefined)
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text')
                        if (text.includes('-') || text.includes('+') || /e/i.test(text) || text.includes(',')) {
                          e.preventDefault()
                        }
                      }}
                      onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                      value={(tempInputs[row.id]?.rr ?? (row.response_rate ?? "")).toString()}
                      onChange={(e) => {
                        const sRaw = e.target.value
                        const s = sRaw.replace(',', '.')
                        if (s === '') {
                          setTemp(row.id, 'rr', undefined)
                          return updateChannel(row.id, { response_rate: undefined })
                        }
                        // allow arbitrary decimals with '.' during typing
                        if (/^\d*(?:\.)?\d*$/.test(s)) {
                          setTemp(row.id, 'rr', s)
                          const n = Number(s)
                          if (s === '.' || s.endsWith('.')) return
                          if (Number.isFinite(n)) {
                            const clamped = Math.min(1, Math.max(0, n))
                            updateChannel(row.id, { response_rate: clamped })
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const s = (e.currentTarget.value || '').replace(',', '.')
                        if (s === '') { setTemp(row.id, 'rr', undefined); return }
                        const n = Number(s)
                        if (Number.isFinite(n)) {
                          const clamped = Math.min(1, Math.max(0, n))
                          updateChannel(row.id, { response_rate: clamped })
                        }
                        setTemp(row.id, 'rr', undefined)
                      }}
                      placeholder="0"
                      aria-label="response rate"
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Input
                    className="h-9 w-full min-w-[82px]"
                    type="text"
                    inputMode="decimal"
                    onKeyDown={(e) => {
                      const k = e.key
                      if (k === '-' || k === '+' || k === 'e' || k === 'E' || k === ',') {
                        e.preventDefault()
                        return
                      }
                      if (k === 'ArrowUp' || k === 'ArrowDown') {
                        e.preventDefault()
                        const raw = (e.currentTarget as HTMLInputElement).value
                        const curr = Number((raw || '0').replace(',', '.'))
                        const step = 0.001
                        const next = Math.max(0, curr + (k === 'ArrowUp' ? step : -step))
                        updateChannel(row.id, { cost: Number.isFinite(next) ? Number(next.toFixed(3)) : 0 })
                        setTemp(row.id, 'cost', undefined)
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text')
                      if (text.includes('-') || text.includes('+') || /e/i.test(text) || text.includes(',')) {
                        e.preventDefault()
                      }
                    }}
                    onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                    value={(tempInputs[row.id]?.cost ?? (row.cost ?? "")).toString()}
                    onChange={(e) => {
                      const sRaw = e.target.value
                      const s = sRaw.replace(',', '.')
                      if (s === '') {
                        setTemp(row.id, 'cost', undefined)
                        return updateChannel(row.id, { cost: undefined })
                      }
                      if (/^\d*(?:\.)?\d*$/.test(s)) {
                        setTemp(row.id, 'cost', s)
                        if (s === '.' || s.endsWith('.')) return
                        const n = Number(s)
                        if (Number.isFinite(n)) {
                          updateChannel(row.id, { cost: n })
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const s = (e.currentTarget.value || '').replace(',', '.')
                      if (s === '') { setTemp(row.id, 'cost', undefined); return }
                      const n = Number(s)
                      if (Number.isFinite(n)) {
                        updateChannel(row.id, { cost: n })
                      }
                      setTemp(row.id, 'cost', undefined)
                    }}
                    placeholder="0"
                    aria-label="cost"
                  />
                </div>
                <div className="sm:col-span-1 flex items-center justify-end pl-1.5">
                  <Button
                    variant="ghost"
                    className="h-7 w-7 p-0 rounded-md"
                    onClick={() => removeChannel(row.id)}
                    aria-label="Remove channel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="pt-1">
              <Button variant="secondary" className="h-9 w-full" onClick={addChannel}>
                {t("add_channel")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LTV */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("ltv_title")}</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            {/* header row for columns */}
            <div className="hidden sm:grid grid-cols-12 gap-4 text-xs text-muted-foreground font-medium px-0">
              <div className="sm:col-span-7">{t("product")}</div>
              <div className="sm:col-span-4">{t("ltv_label")}</div>
            </div>

            {products.map((row) => (
              <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <Select
                    value={row.product_id}
                    onValueChange={(v: string) => updateProduct(row.id, { product_id: v })}
                  >
                    <SelectTrigger className="h-9 w-full min-w-[200px]" aria-label="Product">
                      <SelectValue placeholder={t("select_product")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProductOptions(row.product_id).map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {lang === "en" ?
                            (opt.id === "debit_card" ? "Debit card" :
                             opt.id === "deposit" ? "Deposit" :
                             opt.id === "auto_loan" ? "Car loan" :
                             opt.id === "bank_subscription" ? "Bank subscription" :
                             opt.id === "credit_card" ? "Credit card" :
                             opt.id === "cash_loan" ? "Cash loan" : opt.label)
                           : opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
                  <Input
                    className="h-9 w-full min-w-[110px]"
                    type="number"
                    min={0}
                    lang="en"
                    onKeyDown={preventInvalidNumberKey}
                    onPaste={preventInvalidPaste}
                    onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                    value={row.ltv ?? ""}
                    onChange={(e) => {
                      const s = e.target.value
                      if (s === '') return updateProduct(row.id, { ltv: undefined })
                      const n = Number(s.replace(',', '.'))
                      updateProduct(row.id, { ltv: Number.isFinite(n) ? n : undefined })
                    }}
                    placeholder="0"
                    aria-label="LTV ₽"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button
                    variant="ghost"
                    className="h-9 w-full p-0"
                    onClick={() => removeProduct(row.id)}
                    aria-label="Remove product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="pt-1">
              <Button variant="secondary" className="h-9 w-full" onClick={addProduct}>
                {t("add_product")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("settings")}</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>{t("budget")}</Label>
                <Input
                  className="h-9 w-full"
                  placeholder="100000"
                  type="number"
                  min={0}
                  lang="en"
                  onKeyDown={preventInvalidNumberKey}
                  onPaste={preventInvalidPaste}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                  value={budget ?? ''}
                  onChange={(e) => {
                    const s = e.target.value
                    if (s === '') return setBudget(undefined)
                    const n = Number(s.replace(',', '.'))
                    setBudget(Number.isFinite(n) ? n : undefined)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("which_model")}</Label>
                <Tabs
                  value={model}
                  onValueChange={(v) => setModel(v as "model1" | "model2" | "model3")}
                  className="mt-2"
                >
                  <TabsList className="bg-secondary/60 p-1 rounded-lg">
                    <TabsTrigger
                      value="model1"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {t("model1")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="model2"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {t("model2")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="model3"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {t("model3")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-1.5">
                <button type="button" onClick={() => setShowAdvancedSettings(v => !v)} className="w-full flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent/30">
                  <span className="inline-flex items-center gap-2">
                    {t("advanced_settings")}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-0.5 text-muted-foreground cursor-help inline-flex" aria-label="help">
                            <HelpCircle className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{t("advanced_settings_hint")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showAdvancedSettings && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input id="enable-rr" type="checkbox" className="h-4 w-4" checked={enableRR} onChange={(e) => setEnableRR(e.target.checked)} />
                    <div className="inline-flex items-center gap-1">
                      <Label htmlFor="enable-rr">{t("enable_rr")}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="ml-0.5 text-muted-foreground hover:text-foreground cursor-help inline-flex" aria-label="help">
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{t("enable_rr_hint")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="adv" type="checkbox" className="h-4 w-4" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
                    <div className="inline-flex items-center gap-1">
                      <Label htmlFor="adv">{t("advanced_opt")}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="ml-0.5 text-muted-foreground hover:text-foreground cursor-help inline-flex" aria-label="help">
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{t("advanced_opt_hint")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              )}
              {errors.length > 0 && (
                <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-2">
                  <div className="font-medium mb-1">{t("validation_title")}</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {errors.map((e, i) => (<li key={i}>{e}</li>))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button className="h-9 w-full" onClick={onGetResults} disabled={loading}>
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      {t("get_results")}
                    </span>
                  ) : (
                    t("get_results")
                  )}
                </Button>
                <Button variant="secondary" className="h-9 w-full" onClick={onDownloadCsv}>
                  {lang === 'ru' ? 'Скачать полный отчёт' : 'Download full report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span>{t("loading_message")}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {results && !loading && (
        <Card>
          <CardContent>
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <div className="font-medium mb-2">{t("results")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t("available_budget")}</span> {results.summary[0].toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽</div>
                  <div><span className="text-muted-foreground">{t("actual_spend")}</span> {results.summary[1].toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽ ({results.summary[2].toFixed(1)}%)</div>
                  <div><span className="text-muted-foreground">{t("expected_revenue")}</span> {results.summary[3].toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽</div>
                  <div><span className="text-muted-foreground">{t("expected_roi")}</span> {results.summary[4].toFixed(1)}%</div>
                  <div><span className="text-muted-foreground">{t("reach_clients")}</span> {results.summary[5].toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}</div>
                </div>
              </div>

              {/* Channels usage */}
              <div className="overflow-x-auto">
                <div className="font-medium mb-2">{t("channel_usage")}</div>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2">{t("col_channel")}</th>
                      <th className="py-1 pr-2">{t("col_offers_count")}</th>
                      <th className="py-1 pr-2">{t("col_total_cost")}</th>
                      <th className="py-1 pr-2">{t("col_total_revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.channels_usage).map(([id, vals]) => (
                      <tr key={id} className="border-t border-border">
                        <td className="py-1 pr-2">{channelLabelById(id)}</td>
                        <td className="py-1 pr-2">{vals[0].toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}</td>
                        <td className="py-1 pr-2">{Math.round(vals[1]).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽</td>
                        <td className="py-1 pr-2">{Math.round(vals[2]).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Products distribution */}
              <div className="overflow-x-auto">
                <div className="font-medium mb-2">{t("product_distribution")}</div>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2">{t("col_product")}</th>
                      <th className="py-1 pr-2">{t("col_offers_count")}</th>
                      <th className="py-1 pr-2">{t("col_avg_affinity_revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.products_distribution).map(([id, vals]) => (
                      <tr key={id} className="border-t border-border">
                        <td className="py-1 pr-2">{productLabelById(id)}</td>
                        <td className="py-1 pr-2">{vals[0].toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}</td>
                        <td className="py-1 pr-2">{Math.round(vals[1]).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
