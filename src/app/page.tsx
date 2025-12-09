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

type ChannelType =
  | "Phone calls"
  | "SMS"
  | "Email"
  | "Push notifications"
  | "Social media"
  | "Website banner"

type ProductType =
  | "Product 1"
  | "Product 2"
  | "Product 3"
  | "Product 4"
  | "Product 5"
  | "Product 6"

type ChannelRow = {
  id: string
  type?: ChannelType
  max?: number
  cost?: number
}

type ProductRow = {
  id: string
  product?: ProductType
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

const PRODUCT_OPTIONS: ProductType[] = [
  "Product 1",
  "Product 2",
  "Product 3",
  "Product 4",
  "Product 5",
  "Product 6",
]

export default function Home() {
  const [channels, setChannels] = useState<ChannelRow[]>([
    { id: crypto.randomUUID(), type: "SMS", max: 5000, cost: 0.7 },
    { id: crypto.randomUUID(), type: "Email", max: 750000, cost: 0.004 },
    { id: crypto.randomUUID(), type: "Phone calls", max: 2000, cost: 2.9 },
  ])

  const [products, setProducts] = useState<ProductRow[]>([
    { id: crypto.randomUUID(), product: "Product 1", ltv: 30000 },
    { id: crypto.randomUUID(), product: "Product 2", ltv: 24000 },
    { id: crypto.randomUUID(), product: "Product 3", ltv: 3500 },
  ])

  const [budget, setBudget] = useState<number>(100000)
  const [model, setModel] = useState<"model1" | "model2">("model1")

  const usedChannelTypes = useMemo(
    () => new Set(channels.map((c) => c.type).filter(Boolean) as ChannelType[]),
    [channels]
  )
  const availableChannelOptions = (current?: ChannelType) =>
    CHANNEL_OPTIONS.filter((o) => o === current || !usedChannelTypes.has(o))

  const usedProductTypes = useMemo(
    () => new Set(products.map((p) => p.product).filter(Boolean) as ProductType[]),
    [products]
  )
  const availableProductOptions = (current?: ProductType) =>
    PRODUCT_OPTIONS.filter((o) => o === current || !usedProductTypes.has(o))

  const updateChannel = (id: string, patch: Partial<ChannelRow>) =>
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const removeChannel = (id: string) =>
    setChannels((prev) => prev.filter((c) => c.id !== id))
  const addChannel = () =>
    setChannels((prev) => [...prev, { id: crypto.randomUUID() }])

  const updateProduct = (id: string, patch: Partial<ProductRow>) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id))
  const addProduct = () =>
    setProducts((prev) => [...prev, { id: crypto.randomUUID() }])

  const onGetResults = () => {
    console.log({
      budget,
      model,
      channels,
      products,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <h1 className="text-3xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Personalized Offers
        </h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          оптимизация маркетинговых контактов
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Contacts */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            {/* header row for columns */}
            <div className="hidden sm:grid grid-cols-12 gap-6 text-xs text-muted-foreground font-medium px-0">
              <div className="sm:col-span-6">Channel</div>
              <div className="sm:col-span-3">amount</div>
              <div className="sm:col-span-2">cost ₽</div>
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
                + Add channel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LTV */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>LTV</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            {/* header row for columns */}
            <div className="hidden sm:grid grid-cols-12 gap-4 text-xs text-muted-foreground font-medium px-0">
              <div className="sm:col-span-7">Product</div>
              <div className="sm:col-span-4">LTV ₽</div>
            </div>

            {products.map((row) => (
              <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <Select
                    value={row.product}
                    onValueChange={(v: ProductType) => updateProduct(row.id, { product: v })}
                  >
                    <SelectTrigger className="h-9 w-full min-w-[200px]" aria-label="Product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProductOptions(row.product).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
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
                + Add product
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Budget</Label>
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
                <Label>Which model?</Label>
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
                      Model 1
                    </TabsTrigger>
                    <TabsTrigger
                      value="model2"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Model 2
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Button className="w-full h-9" onClick={onGetResults}>
                Get Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">-</p>
        </CardContent>
      </Card>
    </div>
  )
}
