"use client"

import * as React from "react"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/providers/auth-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { MoreHorizontal, Trash, Eye, Pencil, PlusCircle, MapPinned, Search, Users, ChevronsUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import {
  getUserDoc,
  getCongregationDoc,
  listTerritories,
  addTerritoryRecord,
  deleteTerritory,
  listRegisters,
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
  const [leaders, setLeaders] = React.useState<{ id: string; nomeCompleto: string }[]>([])
  const [territories, setTerritories] = React.useState<({ id: string } & TerritoryDoc)[]>([])

  

  const [openAddRecordFor, setOpenAddRecordFor] = React.useState<string | null>(null)
  const [startedAt, setStartedAt] = React.useState("")
  const [finishedAt, setFinishedAt] = React.useState("")
  const [selectedLeaderId, setSelectedLeaderId] = React.useState<string>("")
  const leaderById = React.useMemo(() => new Map(leaders.map((l) => [l.id, l.nomeCompleto])), [leaders])
  const [openLeaderCombo, setOpenLeaderCombo] = React.useState(false)
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
        const regs = await listRegisters(u.congregacaoId)
        setLeaders(regs.filter((r) => (r.designacoesAprovadas || []).includes("dirigir_reuniao_de_campo")).map((r) => ({ id: r.id, nomeCompleto: r.nomeCompleto })))
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

  

  const handleAddRecord = async () => {
    if (!congregacaoId || !openAddRecordFor) return
    try {
      setSavingRecord(true)
      const rec: TerritoryRecord = {
        startedAt,
        finishedAt: finishedAt || undefined,
        assignedRegisterIds: selectedLeaderId ? [selectedLeaderId] : [],
      }
      await addTerritoryRecord(congregacaoId, openAddRecordFor, rec)
      setOpenAddRecordFor(null)
      setStartedAt("")
      setFinishedAt("")
      setSelectedLeaderId("")
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando territórios...</p>
        </motion.div>
      </div>
    )
  }
  if (!user || !congregacaoId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3 max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Congregação necessária</h2>
          <p className="text-sm text-muted-foreground">Você precisa estar vinculado a uma congregação para acessar esta página.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <MapPinned className="h-7 w-7 text-primary" />
                Territórios
              </h1>
              <p className="text-sm text-muted-foreground">Gerencie e visualize os territórios da congregação</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código, cidade ou grupo" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
              </div>
              {isAdmin && (
                <Button onClick={() => router.push('/dashboard/territorio/criar')} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Criar território
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <Separator />

      {grouped.length === 0 ? (
        <div className="text-center py-12 rounded-lg border bg-muted/30">
          <p className="text-sm text-muted-foreground">Nenhum território</p>
        </div>
      ) : (
        grouped.map(({ grp, items }) => (
          <motion.div key={grp} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
            <h2 className="text-lg font-semibold">Grupo: {grp}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => router.push(`/dashboard/territorio/ver/${t.id}`)}
                  className="group cursor-pointer overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  {t.imageUrl ? (
                    <div className="relative aspect-square w-full">
                      <Image src={t.imageUrl} alt={t.codigo} className="absolute inset-0 h-full w-full object-cover" width={500} height={500}/>
                      <div className="absolute inset-0 bg-black/50 transition-colors group-hover:bg-black/60" />
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-muted" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">{t.codigo} - {t.cidade}</div>
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
                              <DropdownMenuItem className="text-emerald-500 hover:text-white hover:bg-emerald-500/40 focus:bg-emerald-500/15 transition-all duration-100 ease-in-out" onClick={(e) => { e.stopPropagation(); setOpenAddRecordFor(t.id) }}>
                                <PlusCircle className="mr-2 h-4 w-4 text-emerald-500" /> Designar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive hover:text-white hover:bg-destructive/40 focus:bg-destructive/15 transition-all duration-100 ease-in-out" onClick={(e) => { e.stopPropagation(); setDeleteFor(t.id) }}>
                                <Trash className="mr-2 h-4 w-4 text-destructive" /> Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <div className="hidden mt-2 text-xs text-muted-foreground">Registros: {t.registros?.length || 0}</div>
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
              <Label>Dirigente designado</Label>
              <Popover open={openLeaderCombo} onOpenChange={setOpenLeaderCombo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openLeaderCombo} className="w-full justify-between">
                    <span className="truncate">{selectedLeaderId ? (leaderById.get(selectedLeaderId) || "Selecionar dirigente...") : "Selecionar dirigente..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar dirigente" />
                    <CommandList>
                      <CommandEmpty>Nenhum dirigente</CommandEmpty>
                      <CommandGroup>
                        {leaders.map((l) => (
                          <CommandItem key={l.id} value={l.nomeCompleto} onSelect={() => { setSelectedLeaderId(l.id); setOpenLeaderCombo(false) }}>
                            {l.nomeCompleto}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleAddRecord} disabled={savingRecord || !startedAt || !selectedLeaderId}>Adicionar</Button>
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
    </div></div>
  )
}