"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/components/providers/auth-provider"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { MapIcon, Image as ImageIcon, Maximize2, Minimize2, LocateFixed, MapPinned, Building2, Calendar as CalendarIcon, FileText, CheckCircle2, XCircle } from "lucide-react"
import {
  getTerritoryDoc,
  closeTerritoryRecordForUser,
  deleteOpenTerritoryRecordForUser,
  getUserDoc,
} from "@/lib/firebase"
import Image from "next/image"

export default function SharedTerritoryPage() {
  const { user } = useAuth()
  const params = useParams<{ congregacaoId: string; territoryId: string }>()
  const [loading, setLoading] = React.useState(true)
  const [territory, setTerritory] = React.useState<any>(null)
  const [finishDate, setFinishDate] = React.useState<Date | undefined>(undefined)
  const [observacoes, setObservacoes] = React.useState("")
  const [fullImage, setFullImage] = React.useState(false)
  const [satellite, setSatellite] = React.useState(false)
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const [userRegisterId, setUserRegisterId] = React.useState<string | null>(null)
  const mapInstRef = React.useRef<any>(null)
  const locationRef = React.useRef<any>(null)

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
      mapInstRef.current = m
      m.setView([0, 0], 2)
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' })
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri' })
      ;(satellite ? sat : osm).addTo(m)
      setTimeout(() => {
        try { m.invalidateSize() } catch {}
      }, 0)
      const loc = new L.FeatureGroup()
      locationRef.current = loc
      m.addLayer(loc)
      try {
        const gj = JSON.parse(territory.geoJson)
        const layer = L.geoJSON(gj).addTo(m)
        if (layer.getBounds && layer.getBounds().isValid()) m.fitBounds(layer.getBounds())
      } catch {}
      return () => { m.remove(); mapInstRef.current = null }
    }
    run()
  }, [territory?.geoJson, loadLeaflet, satellite])

  const handleLocate = React.useCallback(() => {
    const L = (window as any).L
    const m = mapInstRef.current
    if (!L || !m || !navigator.geolocation) return
    const locGroup = locationRef.current
    try { locGroup?.clearLayers() } catch {}
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const acc = pos.coords.accuracy || 0
      const g = locGroup || new L.FeatureGroup()
      if (!locGroup) { locationRef.current = g; m.addLayer(g) }
      L.marker([lat, lng]).addTo(g)
      if (acc > 0) L.circle([lat, lng], { radius: acc }).addTo(g)
      try { m.setView([lat, lng], 16) } catch {}
    })
  }, [])

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-3"
        >
          <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando território...</p>
        </motion.div>
      </div>
    )
  }

  if (!territory) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 max-w-md"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <MapPinned className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Território não disponível</h2>
          <p className="text-sm text-muted-foreground">Este território não está disponível para visualização no momento.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPinned className="h-4 w-4" />
            <span>Território Compartilhado</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Território {territory.codigo}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">{territory.cidade}</span>
          </div>
        </motion.div>

        {/* Image Section */}
        {territory.imageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border bg-card overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2 font-medium">
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">Imagem do Território</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullImage((v) => !v)}
                className="gap-2"
              >
                {fullImage ? (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Expandir</span>
                  </>
                )}
              </Button>
            </div>
            {fullImage ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
                onClick={() => setFullImage(false)}
              >
                <div className="absolute top-4 right-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFullImage(false)
                    }}
                    className="gap-2 bg-background/80 backdrop-blur-sm"
                  >
                    <Minimize2 className="h-4 w-4" />
                    Fechar
                  </Button>
                </div>
                <div
                  className="flex h-full w-full items-center justify-center p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.img
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={territory.imageUrl}
                    alt={territory.codigo}
                    className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                  />
                </div>
              </motion.div>
            ) : (
              <div className="relative group cursor-pointer" onClick={() => setFullImage(true)}>
                <Image
                  src={territory.imageUrl}
                  alt={territory.codigo}
                  className="h-56 sm:h-72 md:h-80 w-full object-cover"
                  width={500} height={500}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Clique para expandir</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Map Section */}
        {territory.geoJson && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border bg-card overflow-hidden shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2 font-medium">
                <MapIcon className="h-4 w-4" />
                <span className="text-sm">Localização</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSatellite((v) => !v)}
                  className="text-xs sm:text-sm"
                >
                  {satellite ? 'Mapa' : 'Satélite'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLocate}
                  className="gap-2 text-xs sm:text-sm"
                >
                  <LocateFixed className="h-4 w-4" />
                  <span className="hidden sm:inline">Localizar-me</span>
                </Button>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              <div ref={mapRef} className="h-64 sm:h-80 md:h-96 w-full rounded-lg border" />
            </div>
          </motion.div>
        )}

        {/* Return Section */}
        {openRecord ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg border bg-card p-4 sm:p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2 font-semibold text-lg">
              <CalendarIcon className="h-5 w-5" />
              <span>Devolver Território</span>
            </div>

            <div className="space-y-4 flex flex-col sm:flex-row w-full gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Data de devolução *
                </Label>
                <div className="flex justify-center sm:justify-start">
                  <Calendar
                    mode="single"
                    selected={finishDate}
                    onSelect={(d) => setFinishDate(d || undefined)}
                    hidden={startedAtDate ? { before: startedAtDate } : undefined}
                    className="rounded-md border"
                  />
                </div>
              </div>

              <div className="space-y-3 w-full">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observações (opcional)
                </Label>
                <textarea
                  className="w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre o trabalho realizado..."
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleConfirmDevolver}
                disabled={!finishDate}
                className="sm:flex-1 gap-2"
                size="lg"
              >
                <CheckCircle2 className="h-4 w-4" />
                Devolver Território
              </Button>
              <Button
                variant="outline"
                onClick={handleNaoTrabalhado}
                className="gap-2"
                size="lg"
              >
                <XCircle className="h-4 w-4" />
                Não Trabalhado
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg border bg-muted/30 p-6 text-center"
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sem registro aberto para este território</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}