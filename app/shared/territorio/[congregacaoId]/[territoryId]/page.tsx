"use client"

import * as React from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import {
  getTerritoryDoc,
  closeTerritoryRecordForUser,
  deleteOpenTerritoryRecordForUser,
} from "@/lib/firebase"

export default function SharedTerritoryPage() {
  const { user } = useAuth()
  const params = useParams<{ congregacaoId: string; territoryId: string }>()
  const [loading, setLoading] = React.useState(true)
  const [territory, setTerritory] = React.useState<any>(null)
  const [finishDate, setFinishDate] = React.useState<Date | undefined>(undefined)
  const [observacoes, setObservacoes] = React.useState("")

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const t = await getTerritoryDoc(params.congregacaoId, params.territoryId)
        if (!t || !t.sharedOpen) {
          setTerritory(null)
        } else {
          setTerritory(t)
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [params.congregacaoId, params.territoryId])

  const openRecord = React.useMemo(() => {
    if (!territory) return null
    return (territory.registros || []).find((r: any) => !r.finishedAt)
  }, [territory])

  const startedAtDate = React.useMemo(() => {
    if (!openRecord?.startedAt) return undefined
    return new Date(openRecord.startedAt)
  }, [openRecord])

  const handleConfirmDevolver = async () => {
    if (!user || !territory) {
      toast.error("Faça login para devolver")
      return
    }
    if (!finishDate) {
      toast.error("Selecione a data de devolução")
      return
    }
    if (startedAtDate && finishDate < new Date(startedAtDate.getFullYear(), startedAtDate.getMonth(), startedAtDate.getDate())) {
      toast.error("A data deve ser igual ou após o início")
      return
    }
    const iso = finishDate.toISOString().slice(0, 10)
    try {
      await closeTerritoryRecordForUser(params.congregacaoId, params.territoryId, user.uid, iso, observacoes.trim() || undefined)
      toast.success("Território devolvido")
      const t = await getTerritoryDoc(params.congregacaoId, params.territoryId)
      setTerritory(t)
    } catch (e) {
      toast.error("Falha ao devolver território")
    }
  }

  const handleNaoTrabalhado = async () => {
    if (!user || !territory) {
      toast.error("Faça login para remover registro")
      return
    }
    try {
      await deleteOpenTerritoryRecordForUser(params.congregacaoId, params.territoryId, user.uid)
      toast.success("Registro removido")
      const t = await getTerritoryDoc(params.congregacaoId, params.territoryId)
      setTerritory(t)
    } catch (e) {
      toast.error("Falha ao remover registro")
    }
  }

  if (loading) return <div className="p-4">Carregando...</div>
  if (!territory) return <div className="p-4">Território não disponível</div>

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Território compartilhado</h2>
      <div className="text-sm">Código: {territory.codigo} — Cidade: {territory.cidade}</div>
      {territory.geoJson ? (
        <div className="text-xs text-muted-foreground break-words">GeoJSON: {territory.geoJson}</div>
      ) : null}
      {territory.imageUrl ? (
        <img src={territory.imageUrl} alt={territory.codigo} className="mt-2 h-40 w-full object-cover rounded" />
      ) : null}

      {openRecord ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Data de devolução</Label>
            <Calendar mode="single" selected={finishDate} onSelect={(d) => setFinishDate(d || undefined)} fromDate={startedAtDate} />
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <textarea className="min-h-24 rounded-md border px-2 py-2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleConfirmDevolver} disabled={!finishDate}>Devolver</Button>
            <Button variant="outline" onClick={handleNaoTrabalhado}>Não trabalhado</Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Sem registro aberto</div>
      )}
    </div>
  )
}