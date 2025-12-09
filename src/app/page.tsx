"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <h1 className="text-3xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Personalized Offers</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-accent" />оптимизация маркетинговых контактов</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>max SMS</Label>
                <Input className="h-9" placeholder="5000" defaultValue={5000} />
              </div>
              <div className="space-y-1.5">
                <Label>SMS cost</Label>
                <Input className="h-9" placeholder="0.7" defaultValue={0.7} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>max Emails</Label>
                <Input className="h-9" placeholder="750000" defaultValue={750000} />
              </div>
              <div className="space-y-1.5">
                <Label>Email cost</Label>
                <Input className="h-9" placeholder="0.004" defaultValue={0.004} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>max Calls</Label>
                <Input className="h-9" placeholder="2000" defaultValue={2000} />
              </div>
              <div className="space-y-1.5">
                <Label>Calls cost</Label>
                <Input className="h-9" placeholder="2.9" defaultValue={2.9} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LTV</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Mortgage ₽</Label>
                <Input placeholder="30000" defaultValue={30000} />
              </div>
              <div className="space-y-1.5">
                <Label>Pension ₽</Label>
                <Input placeholder="24000" defaultValue={24000} />
              </div>
              <div className="space-y-1.5">
                <Label>Savings ₽</Label>
                <Input placeholder="3500" defaultValue={3500} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <div className="mt-1 h-1 w-10 rounded-full bg-accent" />
          </CardHeader>
          <CardContent className="space-y-3 py-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Budget</Label>
                <Input placeholder="100000" defaultValue={100000} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="random" />
                <Label htmlFor="random">Random mailing</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Which model?</Label>
                <Tabs defaultValue="model2" className="mt-2">
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
              <Button className="w-full h-9">Get Results</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            -
          </p>
        </CardContent>
      </Card>
    </div>
  )
}