"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/components/providers/auth-provider"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { MapIcon, Image as ImageIcon, Maximize2, Minimize2, LocateFixed, MapPinned, Building2, Calendar as CalendarIcon, FileText, CheckCircle2, XCircle, HelpCircle, Settings, Layers, Navigation } from "lucide-react"
import {
  getTerritoryDoc,
  closeTerritoryRecordForUser,
  deleteOpenTerritoryRecordForUser,
  getUserDoc,
} from "@/lib/firebase"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"

export default function SharedTerritoryPage() {
  const { user } = useAuth()
  const params = useParams<{ congregacaoId: string; territoryId: string }>()
  const [loading, setLoading] = React.useState(true)
  const [territory, setTerritory] = React.useState<any>(null)
  const [finishDate, setFinishDate] = React.useState<Date | undefined>(undefined)
  const [observacoes, setObservacoes] = React.useState("")
  const [fullImage, setFullImage] = React.useState(false)
  const [satellite, setSatellite] = React.useState(false)
  const [destLatLng, setDestLatLng] = React.useState<{ lat: number; lng: number } | null>(null)
  
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const [userRegisterId, setUserRegisterId] = React.useState<string | null>(null)
  
  // Refs para controle da instância do Leaflet
  const mapInstRef = React.useRef<any>(null)
  const locationRef = React.useRef<any>(null)
  const baseLayerRef = React.useRef<any>(null)
  const osmLayerRef = React.useRef<any>(null)
  const satLayerRef = React.useRef<any>(null)
  
  const { setTheme } = useTheme()
  const [prefs, setPrefs] = React.useState<{ accent: string; mode: "light" | "dark" | "system"; showImage: boolean; showMap: boolean; order: "image-first" | "map-first" }>({ accent: "", mode: "system", showImage: true, showMap: true, order: "image-first" })

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

  // Lógica de Inicialização do Mapa Corrigida
  React.useEffect(() => {
    const initMap = async () => {
      if (!territory?.geoJson || !mapRef.current) return
      
      await loadLeaflet()
      const L = (window as any).L
      if (!L) return

      // Se já existe mapa, destrói antes de criar um novo (evita bug de re-render)
      if (mapInstRef.current) {
        mapInstRef.current.remove()
        mapInstRef.current = null
      }

      const m = L.map(mapRef.current, {
        zoomControl: false // Movemos ou removemos controles padrão para limpar a UI mobile
      })
      
      mapInstRef.current = m
      m.setView([0, 0], 2)
      L.control.zoom({ position: 'bottomright' }).addTo(m)

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri' })
      
      osmLayerRef.current = osm
      satLayerRef.current = sat
      const base = satellite ? sat : osm
      base.addTo(m)
      baseLayerRef.current = base
      
      setTimeout(() => { try { m.invalidateSize() } catch {} }, 200)
      
      const loc = new L.FeatureGroup()
      locationRef.current = loc
      m.addLayer(loc)
      
      try {
        const gj = JSON.parse(territory.geoJson)
        const layer = L.geoJSON(gj, {
            style: { color: "#3b82f6", weight: 3, opacity: 0.8, fillOpacity: 0.1 }
        }).addTo(m)
        
        if (layer.getBounds && layer.getBounds().isValid()) {
          const b = layer.getBounds()
          m.fitBounds(b, { padding: [20, 20] })
          const c = b.getCenter()
          setDestLatLng({ lat: c.lat, lng: c.lng })
        }
      } catch {}
    }

    initMap()

    // Cleanup function
    return () => {
      if (mapInstRef.current) {
        mapInstRef.current.remove()
        mapInstRef.current = null
      }
    }
  }, [territory?.geoJson, loadLeaflet]) // Removido 'satellite' das dependências para evitar reload total

  // Efeito apenas para trocar camada (Satélite/Mapa) sem recriar o mapa
  React.useEffect(() => {
    const m = mapInstRef.current
    const next = satellite ? satLayerRef.current : osmLayerRef.current
    const curr = baseLayerRef.current
    
    if (!m || !next) return
    try { 
        if (curr) m.removeLayer(curr)
        next.addTo(m)
        baseLayerRef.current = next 
    } catch {}
  }, [satellite])

  const handleDirections = React.useCallback(() => {
    const d = destLatLng
    if (!d) return
    const isApple = typeof navigator !== 'undefined' && /iP(hone|od|ad)|Mac/i.test(navigator.userAgent)
    const url = isApple
      ? `https://maps.apple.com/?daddr=${d.lat},${d.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`
    try { window.open(url, '_blank') } catch {}
  }, [destLatLng])

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("territory_shared_prefs")
      if (raw) {
        const p = JSON.parse(raw)
        setPrefs({ accent: p.accent || "", mode: p.mode || "system", showImage: p.showImage ?? true, showMap: p.showMap ?? true, order: p.order || "image-first" })
      } else {
        const accent = localStorage.getItem("accent_theme") || ""
        const mode = (localStorage.getItem("theme") as any) || "system"
        setPrefs((curr) => ({ ...curr, accent, mode }))
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    try { localStorage.setItem("accent_theme", prefs.accent || ""); window.dispatchEvent(new Event("accent-theme-change")) } catch {}
  }, [prefs.accent])

  React.useEffect(() => {
    try { setTheme(prefs.mode); localStorage.setItem("theme", prefs.mode) } catch {}
  }, [prefs.mode, setTheme])

  React.useEffect(() => {
    try { localStorage.setItem("territory_shared_prefs", JSON.stringify(prefs)) } catch {}
  }, [prefs])

  const handleLocate = React.useCallback(() => {
    const L = (window as any).L
    const m = mapInstRef.current
    if (!L || !m || !navigator.geolocation) return
    const locGroup = locationRef.current
    try { locGroup?.clearLayers() } catch {}
    
    toast.info("Buscando localização...")
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const acc = pos.coords.accuracy || 0
      const g = locGroup || new L.FeatureGroup()
      if (!locGroup) { locationRef.current = g; m.addLayer(g) }
      
      // Ícone personalizado para melhor visibilidade
      const icon = L.divIcon({
        className: "bg-blue-600 border-2 border-white rounded-full shadow-lg",
        iconSize: [12, 12]
      })

      L.marker([lat, lng], { icon }).addTo(g)
      if (acc > 0) L.circle([lat, lng], { radius: acc }).addTo(g)
      try { m.setView([lat, lng], 18) } catch {}
    }, (err) => {
        toast.error("Erro ao obter localização. Verifique as permissões.")
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
    <div className="min-h-screen bg-background pb-10">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPinned className="h-4 w-4" />
              <span>Território Compartilhado</span>
            </div>
            
            <div className="flex gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                        <HelpCircle className="h-5 w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Ajuda</DialogTitle>
                        <DialogDescription>Dicas rápidas.</DialogDescription>
                        </DialogHeader>
                        <div className="text-sm space-y-2">
                        <div>• Use o botão de camadas no mapa para ver satélite.</div>
                        <div>• "Rotas" abre o GPS do seu celular.</div>
                        <div>• Preencha a data abaixo para devolver.</div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Preferências</DialogTitle>
                        <DialogDescription>Ajuste a visualização.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Tema</Label>
                                <Select value={prefs.mode} onValueChange={(v)=>setPrefs((p)=>({ ...p, mode: v as any }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">Claro</SelectItem>
                                        <SelectItem value="dark">Escuro</SelectItem>
                                        <SelectItem value="system">Sistema</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>Mostrar Imagem</Label>
                                <Switch checked={prefs.showImage} onCheckedChange={(v)=>setPrefs((p)=>({ ...p, showImage: !!v }))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>Mostrar Mapa</Label>
                                <Switch checked={prefs.showMap} onCheckedChange={(v)=>setPrefs((p)=>({ ...p, showMap: !!v }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ordem de exibição</Label>
                                <Select value={prefs.order} onValueChange={(v)=>setPrefs((p)=>({ ...p, order: v as any }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="image-first">Imagem primeiro</SelectItem>
                                    <SelectItem value="map-first">Mapa primeiro</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Território {territory.codigo}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">{territory.cidade}</span>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Content */}
        <div className="space-y-6">
            {prefs.order === 'image-first' ? (
            <>
                {prefs.showImage && territory.imageUrl && <ImageComponent territory={territory} fullImage={fullImage} setFullImage={setFullImage} />}
                {prefs.showMap && territory.geoJson && <MapComponent 
                    mapRef={mapRef} 
                    satellite={satellite} 
                    setSatellite={setSatellite} 
                    handleDirections={handleDirections} 
                    handleLocate={handleLocate}
                    destLatLng={destLatLng}
                />}
            </>
            ) : (
            <>
                {prefs.showMap && territory.geoJson && <MapComponent 
                    mapRef={mapRef} 
                    satellite={satellite} 
                    setSatellite={setSatellite} 
                    handleDirections={handleDirections} 
                    handleLocate={handleLocate}
                    destLatLng={destLatLng}
                />}
                {prefs.showImage && territory.imageUrl && <ImageComponent territory={territory} fullImage={fullImage} setFullImage={setFullImage} />}
            </>
            )}
        </div>

        {/* Return Section */}
        {openRecord ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg border bg-card p-4 sm:p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2 font-semibold text-lg border-b pb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Concluir Designação</span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Data de devolução *
                </Label>
                <div className="flex justify-center md:justify-start">
                  <Calendar
                    mode="single"
                    selected={finishDate}
                    onSelect={(d) => setFinishDate(d || undefined)}
                    hidden={startedAtDate ? { before: startedAtDate } : undefined}
                    className="rounded-md border bg-background"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observações
                </Label>
                <textarea
                  className="w-full min-h-[150px] md:min-h-[280px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Casa nova na esquina, morador pediu para não voltar..."
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
                className="gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
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
            className="rounded-lg border border-dashed bg-muted/30 p-8 text-center"
          >
            <p className="text-sm text-muted-foreground">Você não tem registro aberto para este território no momento.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Sub-components para limpar o render principal
function ImageComponent({ territory, fullImage, setFullImage }: any) {
    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border bg-card overflow-hidden shadow-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 font-medium">
            <ImageIcon className="h-4 w-4" />
            <span className="text-sm">Imagem</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFullImage((v: boolean) => !v)}>
            {fullImage ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
        
        {fullImage ? (
          <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFullImage(false)}>
            <div className="absolute top-4 right-4">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFullImage(false) }}>
                <Minimize2 className="h-4 w-4 mr-2" /> Fechar
              </Button>
            </div>
            <img src={territory.imageUrl} alt={territory.codigo} className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" onClick={(e)=>e.stopPropagation()} />
          </div>
        ) : (
          <div className="relative group cursor-pointer bg-muted/10" onClick={() => setFullImage(true)}>
            <Image
              src={territory.imageUrl}
              alt={territory.codigo}
              className="h-56 sm:h-72 md:h-80 w-full object-contain"
              width={800} height={600}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <span className="bg-background/80 backdrop-blur text-xs px-2 py-1 rounded shadow">Clique para expandir</span>
            </div>
          </div>
        )}
      </motion.div>
    )
}

function MapComponent({ mapRef, satellite, setSatellite, handleDirections, handleLocate, destLatLng }: any) {
    return (
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border bg-card overflow-hidden shadow-sm flex flex-col"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 font-medium">
            <MapIcon className="h-4 w-4" />
            <span className="text-sm">Localização</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline" size="sm"
              onClick={() => setSatellite(!satellite)}
              className="h-8 text-xs gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              {satellite ? 'Mapa' : 'Satélite'}
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={handleDirections}
              disabled={!destLatLng}
              className="h-8 text-xs gap-1.5"
            >
              <Navigation className="h-3.5 w-3.5" />
              Rotas
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={handleLocate}
              className="h-8 text-xs gap-1.5"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Eu
            </Button>
          </div>
        </div>
        {/* Z-INDEX FIX:
            relative isolate z-0 -> Cria um contexto de empilhamento novo e baixo.
            Isso garante que Dialogs (z-50) e Selects (z-50+) fiquem sempre acima do mapa.
        */}
        <div className="p-0 relative isolate z-0 h-80 sm:h-96 w-full bg-muted/10">
           <div ref={mapRef} className="h-full w-full outline-none" style={{ zIndex: 0 }} />
        </div>
      </motion.div>
    )
}
