"use client"
import * as React from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { toast } from "sonner"
import { listTerritories, getUserDoc, closeTerritoryRecordForUser, deleteOpenTerritoryRecordForUser, type TerritoryDoc } from "@/lib/firebase"

export default function Page() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [territories, setTerritories] = React.useState<({ id: string } & TerritoryDoc)[]>([])
  const [openReturn, setOpenReturn] = React.useState(false)
  const [activeTerritoryId, setActiveTerritoryId] = React.useState<string | null>(null)
  const [finishDate, setFinishDate] = React.useState<Date | undefined>(undefined)
  const [observacoes, setObservacoes] = React.useState("")
  const uid = user?.uid
  const [userRegisterId, setUserRegisterId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        setUserRegisterId(u.registerId || null)
        const ts = await listTerritories(u.congregacaoId)
        setTerritories(ts)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [uid])

  const myOpenAssignments = React.useMemo(() => {
    if (!uid) return [] as ({ id: string } & TerritoryDoc)[]
    return territories.filter((t) => (t.registros || []).some((r) => (userRegisterId ? r.assignedRegisterIds?.includes(userRegisterId) : false) && !r.finishedAt))
  }, [territories, userRegisterId])

  const openRecordByTerritoryId = React.useMemo(() => {
    const m: Record<string, { startedAt: string }> = {}
    territories.forEach((t) => {
      const r = (t.registros || []).find((r) => r.assignedRegisterIds?.includes(userRegisterId || "") && !r.finishedAt)
      if (r) m[t.id] = { startedAt: r.startedAt }
    })
    return m
  }, [territories, userRegisterId])

  const handleOpenDevolver = (territoryId: string) => {
    setActiveTerritoryId(territoryId)
    setFinishDate(undefined)
    setObservacoes("")
    setOpenReturn(true)
  }

  const handleConfirmDevolver = async () => {
    if (!userRegisterId || !congregacaoId || !activeTerritoryId) return
    const d = finishDate
    if (!d) {
      toast.error("Selecione a data de devolução")
      return
    }
    const started = openRecordByTerritoryId[activeTerritoryId]?.startedAt
    if (started) {
      const sDate = new Date(started)
      if (d < new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate())) {
        toast.error("A data deve ser igual ou após o início")
        return
      }
    }
    const iso = d.toISOString().slice(0, 10)
    try {
      await closeTerritoryRecordForUser(congregacaoId, activeTerritoryId, userRegisterId, iso, observacoes.trim() || undefined)
      toast.success("Território devolvido")
      const ts = await listTerritories(congregacaoId)
      setTerritories(ts)
      setOpenReturn(false)
    } catch (e) {
      toast.error("Falha ao devolver território")
    }
  }

  const handleNaoTrabalhado = async () => {
    if (!userRegisterId || !congregacaoId || !activeTerritoryId) return
    try {
      await deleteOpenTerritoryRecordForUser(congregacaoId, activeTerritoryId, userRegisterId)
      toast.success("Registro removido")
      const ts = await listTerritories(congregacaoId)
      setTerritories(ts)
      setOpenReturn(false)
    } catch (e) {
      toast.error("Falha ao remover registro")
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Meus territórios</h3>
        {loading ? (
          <div className="text-sm">Carregando...</div>
        ) : myOpenAssignments.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum território designado</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myOpenAssignments.map((t) => (
              <div key={t.id} className="rounded-md border p-3 space-y-3">
                <div className="text-sm font-medium">{t.codigo} — {t.cidade}</div>
                <div>
                  <Button onClick={() => handleOpenDevolver(t.id)}>Devolver</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={openReturn} onOpenChange={setOpenReturn}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Devolver território</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 flex flex-row">
            <div className="space-y-2 md:col-span-2">
              <Label>Data de devolução</Label>
              <Calendar
                mode="single"
                selected={finishDate}
                onSelect={(d) => setFinishDate(d || undefined)}
                fromDate={activeTerritoryId ? new Date(openRecordByTerritoryId[activeTerritoryId]?.startedAt || new Date()) : undefined}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações (opcional)</Label>
              <textarea className="min-h-24 rounded-md border px-2 py-2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-2">
              <Button onClick={handleConfirmDevolver} disabled={!finishDate}>Confirmar devolução</Button>
              <Button variant="outline" onClick={handleNaoTrabalhado}>Não trabalhado</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
