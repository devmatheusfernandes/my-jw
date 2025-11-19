"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { useParams } from "next/navigation"
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

  if (loading) return <div className="p-4">Carregando...</div>
  if (!user || !congregacaoId) return <div className="p-4">Você precisa estar em uma congregação</div>
  if (!isAdmin) return <div className="p-4">Apenas administradores podem acessar</div>

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Editar território</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grupo">Grupo</Label>
          <Input id="grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="geo">GeoJSON</Label>
          <textarea id="geo" className="min-h-24 rounded-md border px-2 py-2" value={geoJson} onChange={(e) => setGeoJson(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="image">Imagem (até 3MB)</Label>
          <input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={handleSave} disabled={saving || !cidade || !grupo || !codigo}>Salvar</Button>
        </div>
      </div>
    </div>
  )
}