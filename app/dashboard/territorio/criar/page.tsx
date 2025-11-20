"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { Spinner } from "@/components/ui/spinner"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Building2, Layers, Hash, Image as ImageIcon, Save, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import {
  getUserDoc,
  getCongregationDoc,
  createTerritory,
  uploadTerritoryImage,
  listTerritories,
} from "@/lib/firebase"

export default function CriarTerritorioPage() {
  const { user } = useAuth()
  const router = useRouter()
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
  
  const [cities, setCities] = React.useState<string[]>([])
  const [groups, setGroups] = React.useState<string[]>([])
  const [openCity, setOpenCity] = React.useState(false)
  const [openGroup, setOpenGroup] = React.useState(false)
  const [cityQuery, setCityQuery] = React.useState("")
  const [groupQuery, setGroupQuery] = React.useState("")

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
      try {
        setLoading(true)
        const uid = user?.uid
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        setIsAdmin(!!c?.admins?.includes(uid))
        const ts = await listTerritories(u.congregacaoId)
        const cs = Array.from(new Set(ts.map(t => t.cidade).filter(Boolean))) as string[]
        const gs = Array.from(new Set(ts.map(t => t.grupo).filter(Boolean))) as string[]
        setCities(cs)
        setGroups(gs)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  React.useEffect(() => {
    const init = async () => {
      if (!mapRef.current) return
      await loadLeaflet()
      const L = (window as any).L
      const m = L.map(mapRef.current)
      m.setView([0, 0], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(m)
      setTimeout(() => { try { m.invalidateSize() } catch {} }, 0)
      const drawnItems = new L.FeatureGroup()
      drawnRef.current = drawnItems
      m.addLayer(drawnItems)
      const drawControl = new L.Control.Draw({ draw: { marker: false, circle: false, circlemarker: false }, edit: { featureGroup: drawnItems } })
      m.addControl(drawControl)
      m.on(L.Draw.Event.CREATED, function (e: any) {
        drawnItems.clearLayers()
        drawnItems.addLayer(e.layer)
        const gj = drawnItems.toGeoJSON()
        setGeoJson(JSON.stringify(gj))
      })
      m.on(L.Draw.Event.EDITED, function () { const gj = drawnItems.toGeoJSON(); setGeoJson(JSON.stringify(gj)) })
      m.on(L.Draw.Event.DELETED, function () { const gj = drawnItems.toGeoJSON(); setGeoJson(JSON.stringify(gj)) })
      return () => { try { m.remove() } catch {} }
    }
    init()
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

  const handleCreate = async () => {
    if (!congregacaoId) return
    try {
      setSaving(true)
      const { id } = await createTerritory(congregacaoId, {
        cidade,
        grupo,
        codigo,
        geoJson: geoJson || undefined,
      })
      if (imageFile) {
        if (imageFile.size > 3 * 1024 * 1024) {
          toast.error("Imagem acima de 3MB")
        } else {
          await uploadTerritoryImage(congregacaoId, id, imageFile)
        }
      }
      toast.success("Território criado")
      router.push(`/dashboard/territorio/ver/${id}`)
    } catch (e) {
      toast.error("Falha ao criar território")
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
        <h2 className="text-xl font-semibold">Criar território</h2>
      </div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cidade"><Building2 className="h-4 w-4" /> Cidade</Label>
          <Popover open={openCity} onOpenChange={setOpenCity}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openCity} className="w-full justify-between">
                {cidade ? cidade : "Selecione ou pesquise"}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput value={cityQuery} onValueChange={setCityQuery} placeholder="Pesquisar cidade..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                  <CommandGroup>
                    {cityQuery ? (
                      <CommandItem value={cityQuery} onSelect={(val) => { setCidade(val); setOpenCity(false); setCityQuery("") }}>
                        Usar: {cityQuery}
                        <Check className={cn("ml-auto", cidade === cityQuery ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ) : null}
                    {cities.map((c) => (
                      <CommandItem
                        key={c}
                        value={c}
                        onSelect={(val) => { setCidade(val); setOpenCity(false) }}
                      >
                        {c}
                        <Check className={cn("ml-auto", cidade === c ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="grupo"><Layers className="h-4 w-4" /> Grupo</Label>
          <Popover open={openGroup} onOpenChange={setOpenGroup}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openGroup} className="w-full justify-between">
                {grupo ? grupo : "Selecione ou pesquise"}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput value={groupQuery} onValueChange={setGroupQuery} placeholder="Pesquisar grupo..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                  <CommandGroup>
                    {groupQuery ? (
                      <CommandItem value={groupQuery} onSelect={(val) => { setGrupo(val); setOpenGroup(false); setGroupQuery("") }}>
                        Usar: {groupQuery}
                        <Check className={cn("ml-auto", grupo === groupQuery ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ) : null}
                    {groups.map((g) => (
                      <CommandItem
                        key={g}
                        value={g}
                        onSelect={(val) => { setGrupo(val); setOpenGroup(false) }}
                      >
                        {g}
                        <Check className={cn("ml-auto", grupo === g ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
          <Button onClick={handleCreate} disabled={saving || !cidade || !grupo || !codigo}><Save className="mr-2 h-4 w-4" /> Criar</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}