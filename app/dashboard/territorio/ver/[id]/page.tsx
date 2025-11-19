"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"
import { Switch } from "@/components/ui/switch"
import { useParams } from "next/navigation"
import {
  getUserDoc,
  getCongregationDoc,
  getTerritoryDoc,
  setTerritoryShareOpen,
  type TerritoryDoc,
} from "@/lib/firebase"

export default function VerTerritorioPage() {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [selected, setSelected] = React.useState<({ id: string } & TerritoryDoc) | null>(null)
  const [shareUrl, setShareUrl] = React.useState<string>("")
  const [fullMap, setFullMap] = React.useState(false)
  const mapRef = React.useRef<HTMLDivElement | null>(null)

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
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(m)
      try {
        const gj = JSON.parse(selected.geoJson)
        const layer = L.geoJSON(gj).addTo(m)
        if (layer.getBounds && layer.getBounds().isValid()) m.fitBounds(layer.getBounds())
      } catch {}
      return () => { m.remove() }
    }
    run()
  }, [selected?.geoJson, fullMap, loadLeaflet])

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

  if (loading) return <div className="p-4">Carregando...</div>
  if (!user || !congregacaoId) return <div className="p-4">Você precisa estar em uma congregação</div>

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Ver território</h2>

      {selected ? (
        <div className="space-y-3">
          <div className="text-sm"><span className="font-medium">Código:</span> {selected.codigo}</div>
          <div className="text-sm"><span className="font-medium">Cidade:</span> {selected.cidade}</div>
          <div className="text-sm"><span className="font-medium">Grupo:</span> {selected.grupo}</div>
          {selected.geoJson ? (
            <div className="space-y-2">
              <div className={fullMap ? "fixed inset-0 z-50 bg-background p-4" : ""}>
                <div ref={mapRef} className={fullMap ? "h-[80vh] w-full rounded-md border" : "h-72 w-full rounded-md border"} />
                <div className="mt-2">
                  <Button variant="outline" onClick={() => setFullMap((v) => !v)}>{fullMap ? "Sair da tela cheia" : "Tela cheia"}</Button>
                </div>
              </div>
            </div>
          ) : null}
          {selected.imageUrl ? (
            <img src={selected.imageUrl} alt={selected.codigo} className="mt-2 h-40 w-full object-cover rounded" />
          ) : null}

          {isAdmin && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Registros</h3>
              {selected.registros && selected.registros.length > 0 ? (
                <div className="grid gap-2">
                  {selected.registros.map((r, idx) => (
                    <div key={idx} className="rounded-md border p-3 text-sm">
                      <div>Início: {r.startedAt}</div>
                      <div>Fim: {r.finishedAt || "—"}</div>
                      <div>Designados: {r.assignedRegisterIds.join(", ")}</div>
                      {isAdmin && !r.finishedAt ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs">Compartilhar</span>
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
                            <span className="text-xs">{shareUrl}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem registros</p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}