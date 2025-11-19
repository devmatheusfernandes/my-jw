"use client"

import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/components/providers/auth-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash, Eye, Pencil, PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import {
  getUserDoc,
  getCongregationDoc,
  listUsersByCongregation,
  listTerritories,
  createTerritory,
  uploadTerritoryImage,
  addTerritoryRecord,
  deleteTerritory,
  type TerritoryDoc,
  type TerritoryRecord,
} from "@/lib/firebase"
import Image from "next/image"

export default function TerritorioPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [eligibleRegisters, setEligibleRegisters] = React.useState<{ registerId: string; nome: string }[]>([])
  const [territories, setTerritories] = React.useState<({ id: string } & TerritoryDoc)[]>([])

  const [openCreate, setOpenCreate] = React.useState(false)
  const [cidade, setCidade] = React.useState("")
  const [grupo, setGrupo] = React.useState("")
  const [codigo, setCodigo] = React.useState("")
  const [geoJson, setGeoJson] = React.useState("")
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [creating, setCreating] = React.useState(false)

  const [openAddRecordFor, setOpenAddRecordFor] = React.useState<string | null>(null)
  const [startedAt, setStartedAt] = React.useState("")
  const [finishedAt, setFinishedAt] = React.useState("")
  const [assigned, setAssigned] = React.useState<string[]>([])
  const [savingRecord, setSavingRecord] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [deleteFor, setDeleteFor] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

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
        const members = await listUsersByCongregation(u.congregacaoId)
        setEligibleRegisters(members.filter((m) => !!m.registerId).map((m) => ({ registerId: m.registerId as string, nome: m.nome })))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  const refreshTerritories = React.useCallback(async (cid: string) => {
    const ts = await listTerritories(cid)
    setTerritories(ts)
  }, [])

  React.useEffect(() => {
    if (congregacaoId) {
      refreshTerritories(congregacaoId)
    }
  }, [congregacaoId, refreshTerritories])

  const handleCreateTerritory = async () => {
    if (!congregacaoId) return
    try {
      setCreating(true)
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
      setOpenCreate(false)
      setCidade("")
      setGrupo("")
      setCodigo("")
      setGeoJson("")
      setImageFile(null)
      await refreshTerritories(congregacaoId)
      toast.success("Território criado")
    } catch (e) {
      toast.error("Falha ao criar território")
    } finally {
      setCreating(false)
    }
  }

  const handleAddRecord = async () => {
    if (!congregacaoId || !openAddRecordFor) return
    try {
      setSavingRecord(true)
      const rec: TerritoryRecord = {
        startedAt,
        finishedAt: finishedAt || undefined,
        assignedRegisterIds: assigned,
      }
      await addTerritoryRecord(congregacaoId, openAddRecordFor, rec)
      setOpenAddRecordFor(null)
      setStartedAt("")
      setFinishedAt("")
      setAssigned([])
      await refreshTerritories(congregacaoId)
      toast.success("Registro adicionado")
    } catch (e) {
      toast.error("Falha ao adicionar registro")
    } finally {
      setSavingRecord(false)
    }
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, ({ id: string } & TerritoryDoc)[]>()
    const q = search.trim().toLowerCase()
    const base = q
      ? territories.filter((t) => [t.codigo, t.cidade, t.grupo].some((v) => (v || "").toLowerCase().includes(q)))
      : territories
    base.forEach((t) => {
      const g = t.grupo || "Sem grupo"
      const arr = map.get(g) || []
      arr.push(t)
      map.set(g, arr)
    })
    return Array.from(map.entries()).map(([grp, items]) => ({ grp, items }))
  }, [territories, search])

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
  if (!user || !congregacaoId) return <div className="p-4">Você precisa estar em uma congregação</div>

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Territórios</h2>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar por código, cidade ou grupo" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        {isAdmin && (
          <Drawer open={openCreate} onOpenChange={setOpenCreate}>
            <DrawerTrigger asChild>
              <Button>Criar território</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Criar território</DrawerTitle>
              </DrawerHeader>
              <div className="grid gap-4 p-4 md:grid-cols-2">
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
              </div>
              <DrawerFooter>
                <Button onClick={handleCreateTerritory} disabled={creating || !cidade || !grupo || !codigo}>Criar</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum território</p>
      ) : (
        grouped.map(({ grp, items }) => (
          <motion.div key={grp} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-2">
            <h3 className="text-lg font-medium">Grupo: {grp}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => router.push(`/dashboard/territorio/ver/${t.id}`)}
                  className="group cursor-pointer overflow-hidden rounded-md border hover:shadow-sm transition"
                >
                  {t.imageUrl ? (
                    <div className="relative aspect-square w-full">
                      <Image src={t.imageUrl} alt={t.codigo} className="absolute inset-0 h-full w-full object-cover" width={500} height={500}/>
                      <div className="absolute inset-0 bg-black/50 transition-colors group-hover:bg-black/60" />
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-muted" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{t.codigo} — {t.cidade}</div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/territorio/ver/${t.id}`) }}>
                                <Eye className="mr-2 h-4 w-4" /> Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/territorio/editar/${t.id}`) }}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setOpenAddRecordFor(t.id) }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Designar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive hover:text-white hover:bg-destructive/40 focus:bg-destructive/15 transition-all duration-100 ease-in-out" onClick={(e) => { e.stopPropagation(); setDeleteFor(t.id) }}>
                                <Trash className="mr-2 h-4 w-4" /> Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Registros: {t.registros?.length || 0}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))
      )}

      <Drawer open={!!openAddRecordFor} onOpenChange={(v) => setOpenAddRecordFor(v ? openAddRecordFor : null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Novo registro de território</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Início</Label>
              <Input id="start" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fim (opcional)</Label>
              <Input id="end" type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Designados</Label>
              <select multiple className="h-24 rounded-md border px-2" value={assigned} onChange={(e) => setAssigned(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                {eligibleRegisters.map((r) => (
                  <option key={r.registerId} value={r.registerId}>{r.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleAddRecord} disabled={savingRecord || !startedAt || assigned.length === 0}>Adicionar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Dialog open={!!deleteFor} onOpenChange={(v) => setDeleteFor(v ? deleteFor : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar deleção</DialogTitle>
            <DialogDescription>Esta ação remove o território e sua imagem.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFor(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (!congregacaoId || !deleteFor) return
              try {
                setDeleting(true)
                await deleteTerritory(congregacaoId, deleteFor)
                setDeleteFor(null)
                await refreshTerritories(congregacaoId)
                toast.success("Território deletado")
              } catch (e) {
                toast.error("Falha ao deletar território")
              } finally {
                setDeleting(false)
              }
            }}>Deletar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}