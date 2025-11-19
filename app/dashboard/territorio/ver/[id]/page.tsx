"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"
import { Switch } from "@/components/ui/switch"
import { useParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { motion } from "framer-motion"
import { Hash, Building2, Layers, MapIcon, Image as ImageIcon, Maximize2, Minimize2, Link as LinkIcon, Share2, LocateFixed } from "lucide-react"
import {
  getUserDoc,
  getCongregationDoc,
  getTerritoryDoc,
  setTerritoryShareOpen,
  type TerritoryDoc,
} from "@/lib/firebase"
import Image from "next/image"

export default function VerTerritorioPage() {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [selected, setSelected] = React.useState<({ id: string } & TerritoryDoc) | null>(null)
  const [shareUrl, setShareUrl] = React.useState<string>("")
  const [fullImage, setFullImage] = React.useState(false)
  const [satellite, setSatellite] = React.useState(false)
  const mapRef = React.useRef<HTMLDivElement | null>(null)
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
      if (!selected?.geoJson || !mapRef.current) return
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
        const gj = JSON.parse(selected.geoJson)
        const layer = L.geoJSON(gj).addTo(m)
        if (layer.getBounds && layer.getBounds().isValid()) m.fitBounds(layer.getBounds())
      } catch {}
      return () => { m.remove(); mapInstRef.current = null }
    }
    run()
  }, [selected?.geoJson, loadLeaflet, satellite])

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

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const uid = user?.uid
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        setIsAdmin(!!c?.admins?.includes(uid))
        const t = await getTerritoryDoc(u.congregacaoId, params.id)
        if (t) setSelected(t)
        if (t) {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          setShareUrl(t.sharedOpen && origin ? `${origin}/shared/territorio/${u.congregacaoId}/${params.id}` : '')
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user, params.id])

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
  if (!user || !congregacaoId) return <div className="p-4">Você precisa estar em uma congregação</div>

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ver território</h2>
      </div>

      {selected ? (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3 flex items-center gap-2 text-sm"><Hash className="h-4 w-4" /><span className="font-medium">Código:</span> {selected.codigo}</div>
            <div className="rounded-md border p-3 flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /><span className="font-medium">Cidade:</span> {selected.cidade}</div>
            <div className="rounded-md border p-3 flex items-center gap-2 text-sm"><Layers className="h-4 w-4" /><span className="font-medium">Grupo:</span> {selected.grupo}</div>
          </motion.div>

          {selected.imageUrl ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-medium"><ImageIcon className="h-4 w-4" /> Imagem</div>
                <Button variant="outline" size="sm" onClick={() => setFullImage((v) => !v)}>
                  {fullImage ? (<><Minimize2 className="mr-2 h-4 w-4" /> Sair da tela cheia</>) : (<><Maximize2 className="mr-2 h-4 w-4" /> Tela cheia</>)}
                </Button>
              </div>
              {fullImage ? (
                <div className="fixed inset-0 z-[9999] bg-black/80" onClick={() => setFullImage(false)}>
                  <div className="absolute top-4 right-4">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFullImage(false) }}>
                      <Minimize2 className="mr-2 h-4 w-4" /> Sair da tela cheia
                    </Button>
                  </div>
                  <div className="flex h-full w-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                    <Image src={selected.imageUrl} alt={selected.codigo} className="max-h-[90vh] max-w-[90vw] object-contain" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Image src={selected.imageUrl} alt={selected.codigo} className="h-48 w-full object-cover md:h-64" />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
              )}
            </motion.div>
          ) : null}

          {selected.geoJson ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-medium"><MapIcon className="h-4 w-4" /> Mapa</div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSatellite((v) => !v)}>
                    {satellite ? 'Mapa padrão' : 'Satélite'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLocate}>
                    <LocateFixed className="mr-2 h-4 w-4" /> Minha localização
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <div ref={mapRef} className="h-72 w-full rounded-md border" />
              </div>
            </motion.div>
          ) : null}

          {isAdmin && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <h3 className="text-lg font-medium">Registros</h3>
                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                  <Share2 className="h-4 w-4" />
                  <span>Compartilhar aberto:</span>
                  <Switch
                    checked={!!selected?.sharedOpen}
                    onCheckedChange={async (v) => {
                      if (!congregacaoId || !selected) return
                      await setTerritoryShareOpen(congregacaoId, selected.id, v)
                      const origin = typeof window !== 'undefined' ? window.location.origin : ''
                      setShareUrl(v && origin ? `${origin}/shared/territorio/${congregacaoId}/${selected.id}` : '')
                      setSelected({ ...selected, sharedOpen: v })
                    }}
                  />
                  {shareUrl ? (
                    <div className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> <span className="break-all">{shareUrl}</span></div>
                  ) : null}
                </div>
              </div>
              {selected.registros && selected.registros.length > 0 ? (
                <div className="grid gap-2">
                  {selected.registros.map((r, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border p-3 text-sm">
                      <div>Início: {r.startedAt}</div>
                      <div>Fim: {r.finishedAt || "—"}</div>
                      <div>Designados: {r.assignedRegisterIds.join(", ")}</div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem registros</p>
              )}
            </motion.div>
          )}
        </div>
      ) : null}
    </motion.div>
  )
}