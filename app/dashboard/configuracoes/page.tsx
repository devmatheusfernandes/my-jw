"use client"
import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/theme/mode-toggle"
import { toast } from "sonner"

export default function ConfiguracoesPage() {
  const [emailNotif, setEmailNotif] = React.useState(false)
  const [appNotif, setAppNotif] = React.useState(true)
  const [compactMode, setCompactMode] = React.useState(false)
  const [advancedMode, setAdvancedMode] = React.useState(false)

  React.useEffect(() => {
    const e = localStorage.getItem("settings.email_notif")
    const a = localStorage.getItem("settings.app_notif")
    const c = localStorage.getItem("settings.compact_mode")
    const adv = localStorage.getItem("settings.advanced_mode")
    if (e !== null) setEmailNotif(e === "true")
    if (a !== null) setAppNotif(a === "true")
    if (c !== null) setCompactMode(c === "true")
    if (adv !== null) setAdvancedMode(adv === "true")
  }, [])

  function salvar() {
    localStorage.setItem("settings.email_notif", String(emailNotif))
    localStorage.setItem("settings.app_notif", String(appNotif))
    localStorage.setItem("settings.compact_mode", String(compactMode))
    localStorage.setItem("settings.advanced_mode", String(advancedMode))
    toast.success("Configurações salvas")
  }

  function restaurar() {
    setEmailNotif(false)
    setAppNotif(true)
    setCompactMode(false)
    setAdvancedMode(false)
    toast.info("Configurações restauradas")
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Configurações</h2>
      <p className="text-muted-foreground">Ajuste preferências da aplicação.</p>
      <Separator className="my-4" />

      <Tabs defaultValue="aparencia">
        <TabsList>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="aparencia" className="mt-4">
          <div className="border rounded-lg p-4 grid gap-4">
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label>Tema</Label>
                <span className="text-muted-foreground text-sm">Claro, escuro ou automático.</span>
              </div>
              <ModeToggle />
            </div>
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label>Modo compacto</Label>
                <span className="text-muted-foreground text-sm">Reduz espaçamento em listas e formulários.</span>
              </div>
              <Switch checked={compactMode} onCheckedChange={setCompactMode} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-4">
          <div className="border rounded-lg p-4 grid gap-4">
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label>Notificações por e-mail</Label>
                <span className="text-muted-foreground text-sm">Avisos de tarefas e mudanças importantes.</span>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label>Notificações no app</Label>
                <span className="text-muted-foreground text-sm">Alertas dentro da aplicação.</span>
              </div>
              <Switch checked={appNotif} onCheckedChange={setAppNotif} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-4">
          <div className="border rounded-lg p-4 grid gap-4">
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label>Opções avançadas</Label>
                <span className="text-muted-foreground text-sm">Mostra configurações adicionais quando disponíveis.</span>
              </div>
              <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 mt-6">
        <Button onClick={salvar}>Salvar alterações</Button>
        <Button variant="outline" onClick={restaurar}>Restaurar padrões</Button>
      </div>
    </div>
  )
}