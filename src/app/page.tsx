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
import { Trash2 } from "lucide-react"
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
  const [channels, setChannels] = useState<ChannelRow[]>([
    { id: crypto.randomUUID(), type: undefined, max: 0, cost: 0 },
    { id: crypto.randomUUID(), type: undefined, max: 0, cost: 0 },
    { id: crypto.randomUUID(), type: undefined, max: 0, cost: 0 },
  ])

  const [products, setProducts] = useState<ProductRow[]>([
    { id: crypto.randomUUID(), product_id: undefined, ltv: 0 },
    { id: crypto.randomUUID(), product_id: undefined, ltv: 0 },
    { id: crypto.randomUUID(), product_id: undefined, ltv: 0 },
  ])

  const [budget, setBudget] = useState<number>(100000)
  const [model, setModel] = useState<"model1" | "model2">("model1")
  const [results, setResults] = useState<OptimizeResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const usedChannelTypes = useMemo(
    () => new Set(channels.map((c) => c.type).filter(Boolean) as ChannelType[]),
    [channels]
  )
  const availableChannelOptions = (current?: ChannelType) =>
    CHANNEL_OPTIONS.filter((o) => o === current || !usedChannelTypes.has(o))

  const usedProductTypes = useMemo(
    () => new Set(products.map((p) => p.product_id).filter(Boolean) as string[]),
    [products]
  )
  const availableProductOptions = (current?: string) =>
    PRODUCT_OPTIONS.filter((o) => o.id === current || !usedProductTypes.has(o.id))

  const updateChannel = (id: string, patch: Partial<ChannelRow>) =>
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const removeChannel = (id: string) =>
    setChannels((prev) => prev.filter((c) => c.id !== id))
  const addChannel = () =>
    setChannels((prev) => [...prev, { id: crypto.randomUUID(), type: undefined, max: 0, cost: 0 }])

  const updateProduct = (id: string, patch: Partial<ProductRow>) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id))
  const addProduct = () =>
    setProducts((prev) => [...prev, { id: crypto.randomUUID(), product_id: undefined, ltv: 0 }])

  const onGetResults = () => {
    setLoading(true)
    const start = Date.now()
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
        .map(c => [channelCode(c.type), [c.max ?? 0, c.cost ?? 0] as [number, number]])
        .filter(([k]) => !!k)
    ) as Record<string, [number, number]>
    const productsMap = Object.fromEntries(
      products
        .map(p => [p.product_id, p.ltv ?? 0])
        .filter(([k]) => !!k)
    ) as Record<string, number>
    const payloadV2 = {
      budget,
      model: model === "model1" ? "catboost" : "lightgbm",
      channels: channelsMap,
      products: productsMap,
    }
    fetch("/api/optimize?delay=500000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadV2),
    })
      .then((r) => r.json())
      .then((data) => setResults(data))
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
            <div className="hidden sm:grid grid-cols-12 gap-6 text-xs text-muted-foreground font-medium px-0">
              <div className="sm:col-span-6">{t("channel")}</div>
              <div className="sm:col-span-3">{t("amount")}</div>
              <div className="sm:col-span-2">{t("cost")}</div>
              <div className="sm:col-span-1" />
            </div>

            {channels.map((row) => (
              <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-6">
                  <Select
                    value={row.type}
                    onValueChange={(v: ChannelType) => updateChannel(row.id, { type: v })}
                  >
                    <SelectTrigger className="h-9 w-full min-w-[176px]" aria-label="Channel">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannelOptions(row.type).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Input
                    className="h-9 w-full min-w-[100px]"
                    type="number"
                    min={0}
                    value={row.max ?? ""}
                    onChange={(e) => updateChannel(row.id, { max: Number(e.target.value) })}
                    placeholder="0"
                    aria-label="amount"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    className="h-9 w-full min-w-[82px]"
                    type="number"
                    min={0}
                    step="0.001"
                    value={row.cost ?? ""}
                    onChange={(e) => updateChannel(row.id, { cost: Number(e.target.value) })}
                    placeholder="0"
                    aria-label="cost"
                  />
                </div>
                <div className="sm:col-span-1 flex items-center justify-center pl-1.5">
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
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProductOptions(row.product_id).map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
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
                    value={row.ltv ?? ""}
                    onChange={(e) => updateProduct(row.id, { ltv: Number(e.target.value) })}
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
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("which_model")}</Label>
                <Tabs
                  value={model}
                  onValueChange={(v) => setModel(v as "model1" | "model2")}
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
                  </TabsList>
                </Tabs>
              </div>
              <Button className="w-full h-9" onClick={onGetResults} disabled={loading}>
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
                        <td className="py-1 pr-2">{id}</td>
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
                        <td className="py-1 pr-2">{id}</td>
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
