"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { useParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { motion } from "framer-motion"
import { Building2, Layers, Hash, Image as ImageIcon, Save } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import {
  getUserDoc,
  getCongregationDoc,
  getTerritoryDoc,
  updateTerritory,
  uploadTerritoryImage,
} from "@/lib/firebase"

export default function EditarTerritorioPage() {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [imageFile, setImageFile] = React.useState<File | null>(null)

  const [cidade, setCidade] = React.useState("")
  const [grupo, setGrupo] = React.useState("")
  const [codigo, setCodigo] = React.useState("")
  const [geoJson, setGeoJson] = React.useState("")
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const drawnRef = React.useRef<any>(null)
  const [openGeoDrawer, setOpenGeoDrawer] = React.useState(false)

  const loadLeaflet = React.useCallback(async () => {
    if (typeof window === 'undefined') return
    const w = window as any
    if (!w.L) {
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
    }
    const hasDraw = !!(w.L && (w.L as any).Draw)
    if (!hasDraw) {
      const drawCss = document.createElement('link')
      drawCss.rel = 'stylesheet'
      drawCss.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css'
      document.head.appendChild(drawCss)
      await new Promise<void>((resolve) => {
        const s = document.createElement('script')
        s.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js'
        s.onload = () => resolve()
        document.body.appendChild(s)
      })
    }
  }, [])

  React.useEffect(() => {
    const run = async () => {
      if (!mapRef.current) return
      await loadLeaflet()
      const L = (window as any).L
      const m = L.map(mapRef.current)
      m.setView([0, 0], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(m)
      setTimeout(() => {
        try { m.invalidateSize() } catch {}
      }, 0)
      const drawnItems = new L.FeatureGroup()
      drawnRef.current = drawnItems
      m.addLayer(drawnItems)
      const drawControl = new L.Control.Draw({
        draw: { marker: false, circle: false, circlemarker: false },
        edit: { featureGroup: drawnItems },
      })
      m.addControl(drawControl)
      m.on(L.Draw.Event.CREATED, function (e: any) {
        drawnItems.clearLayers()
        drawnItems.addLayer(e.layer)
        const gj = drawnItems.toGeoJSON()
        setGeoJson(JSON.stringify(gj))
      })
      m.on(L.Draw.Event.EDITED, function () {
        const gj = drawnItems.toGeoJSON()
        setGeoJson(JSON.stringify(gj))
      })
      m.on(L.Draw.Event.DELETED, function () {
        const gj = drawnItems.toGeoJSON()
        setGeoJson(JSON.stringify(gj))
      })
      if (geoJson) {
        try {
          const gj = JSON.parse(geoJson)
          const layer = L.geoJSON(gj).addTo(drawnItems)
          if (layer.getBounds && layer.getBounds().isValid()) m.fitBounds(layer.getBounds())
        } catch {}
      }
      return () => { m.remove() }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLeaflet])

  React.useEffect(() => {
    const L = (window as any).L
    const drawnItems = drawnRef.current
    if (!L || !drawnItems) return
    try {
      drawnItems.clearLayers()
      if (geoJson) {
        const gj = JSON.parse(geoJson)
        L.geoJSON(gj).addTo(drawnItems)
      }
    } catch {}
  }, [geoJson])

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
        if (t) {
          setCidade(t.cidade)
          setGrupo(t.grupo)
          setCodigo(t.codigo)
          setGeoJson(t.geoJson || "")
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user, params.id])

  const handleSave = async () => {
    if (!congregacaoId) return
    try {
      setSaving(true)
      await updateTerritory(congregacaoId, params.id, {
        cidade,
        grupo,
        codigo,
        geoJson: geoJson || undefined,
      })
      if (imageFile) {
        if (imageFile.size > 3 * 1024 * 1024) {
          toast.error("Imagem acima de 3MB")
        } else {
          await uploadTerritoryImage(congregacaoId, params.id, imageFile)
        }
      }
      toast.success("Território atualizado")
    } catch (e) {
      toast.error("Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
  if (!user || !congregacaoId) return <div className="p-4">Você precisa estar em uma congregação</div>
  if (!isAdmin) return <div className="p-4">Apenas administradores podem acessar</div>

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Editar território</h2>
      </div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cidade"><Building2 className="h-4 w-4" /> Cidade</Label>
          <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grupo"><Layers className="h-4 w-4" /> Grupo</Label>
          <Input id="grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigo"><Hash className="h-4 w-4" /> Código</Label>
          <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Mapa e editor</Label>
          <div className="mt-2">
            <div ref={mapRef} className="h-72 w-full rounded-md border" />
            <p className="mt-1 text-xs text-muted-foreground">Desenhe o território no mapa. Polígono, retângulo ou polilinha são suportados.</p>
          </div>
          <div className="flex items-center gap-2">
            <Drawer open={openGeoDrawer} onOpenChange={setOpenGeoDrawer}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm">Ver GeoJSON</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>GeoJSON do território</DrawerTitle>
                </DrawerHeader>
                <div className="p-4">
                  <textarea className="min-h-48 w-full rounded-md border px-2 py-2" value={geoJson} onChange={(e) => setGeoJson(e.target.value)} />
                </div>
              </DrawerContent>
            </Drawer>
            {geoJson ? <Button variant="ghost" size="sm" onClick={() => setGeoJson("")}>Limpar</Button> : null}
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="image"><ImageIcon className="h-4 w-4" /> Imagem (até 3MB)</Label>
          <input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={handleSave} disabled={saving || !cidade || !grupo || !codigo}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}