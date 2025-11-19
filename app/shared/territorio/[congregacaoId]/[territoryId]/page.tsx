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
  getUserDoc,
} from "@/lib/firebase"

export default function SharedTerritoryPage() {
  const { user } = useAuth()
  const params = useParams<{ congregacaoId: string; territoryId: string }>()
  const [loading, setLoading] = React.useState(true)
  const [territory, setTerritory] = React.useState<any>(null)
  const [finishDate, setFinishDate] = React.useState<Date | undefined>(undefined)
  const [observacoes, setObservacoes] = React.useState("")
  const [fullMap, setFullMap] = React.useState(false)
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const [userRegisterId, setUserRegisterId] = React.useState<string | null>(null)

  const loadLeaflet = React.useCallback(async () => {
    if (typeof window === 'undefined') return
    const w = window as any
    if (w.L) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    await new Promise<void>((resolve) => {
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => resolve()
      document.body.appendChild(s)
    })
  }, [])

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
        if (user?.uid) {
          const u = await getUserDoc(user.uid)
          setUserRegisterId(u?.registerId || null)
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [params.congregacaoId, params.territoryId, user?.uid])

  const openRecord = React.useMemo(() => {
    if (!territory) return null
    return (territory.registros || []).find((r: any) => !r.finishedAt)
  }, [territory])

  const startedAtDate = React.useMemo(() => {
    if (!openRecord?.startedAt) return undefined
    return new Date(openRecord.startedAt)
  }, [openRecord])

  React.useEffect(() => {
    const run = async () => {
      if (!territory?.geoJson || !mapRef.current) return
      await loadLeaflet()
      const L = (window as any).L
      const m = L.map(mapRef.current)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(m)
      try {
        const gj = JSON.parse(territory.geoJson)
        const layer = L.geoJSON(gj).addTo(m)
        if (layer.getBounds && layer.getBounds().isValid()) m.fitBounds(layer.getBounds())
      } catch {}
      return () => { m.remove() }
    }
    run()
  }, [territory?.geoJson, fullMap, loadLeaflet])

  const handleConfirmDevolver = async () => {
    if (!user || !territory || !userRegisterId) {
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
      await closeTerritoryRecordForUser(params.congregacaoId, params.territoryId, userRegisterId, iso, observacoes.trim() || undefined)
      toast.success("Território devolvido")
      const t = await getTerritoryDoc(params.congregacaoId, params.territoryId)
      setTerritory(t)
    } catch (e) {
      toast.error("Falha ao devolver território")
    }
  }

  const handleNaoTrabalhado = async () => {
    if (!user || !territory || !userRegisterId) {
      toast.error("Faça login para remover registro")
      return
    }
    try {
      await deleteOpenTerritoryRecordForUser(params.congregacaoId, params.territoryId, userRegisterId)
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
        <div className="space-y-2">
          <div className={fullMap ? "fixed inset-0 z-50 bg-background p-4" : ""}>
            <div ref={mapRef} className={fullMap ? "h-[80vh] w-full rounded-md border" : "h-72 w-full rounded-md border"} />
            <div className="mt-2">
              <Button variant="outline" onClick={() => setFullMap((v) => !v)}>{fullMap ? "Sair da tela cheia" : "Tela cheia"}</Button>
            </div>
          </div>
        </div>
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