"use client"

import * as React from "react"
import { useAuth } from "@/components/providers/auth-provider"
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
          setShareUrl(origin ? `${origin}/shared/territorio/${u.congregacaoId}/${params.id}` : '')
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
            <div className="text-xs text-muted-foreground break-words"><span className="font-medium">GeoJSON:</span> {selected.geoJson}</div>
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
                      <div>Designados: {r.assignedUserUids.join(", ")}</div>
                      {isAdmin && !r.finishedAt ? (
                        <div className="mt-2">
                          <button
                            className="text-xs underline"
                            onClick={async () => {
                              if (!congregacaoId || !selected) return
                              await setTerritoryShareOpen(congregacaoId, selected.id, true)
                              const origin = typeof window !== 'undefined' ? window.location.origin : ''
                              setShareUrl(origin ? `${origin}/shared/territorio/${congregacaoId}/${selected.id}` : '')
                            }}
                          >Compartilhar</button>
                          {shareUrl ? (
                            <div className="text-xs mt-1">
                              Link: {shareUrl}
                            </div>
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