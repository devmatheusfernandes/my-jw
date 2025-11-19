"use client"

import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/providers/auth-provider"
import {
  getUserDoc,
  getCongregationDoc,
  listUsersByCongregation,
  listPendingUsersByCongregation,
  listRegisters,
  createRegister,
  attachUserToRegister,
  rejectUserAccess,
  updateRegister,
  unlinkUserFromCongregation,
  type RegisterDoc,
} from "@/lib/firebase"

export default function UsuariosPage() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [users, setUsers] = React.useState<{ uid: string; nome: string; registerId?: string | null }[]>([])
  const [pending, setPending] = React.useState<{ uid: string; nome: string }[]>([])
  const [registers, setRegisters] = React.useState<({ id: string } & RegisterDoc)[]>([])

  const [openCreateRegister, setOpenCreateRegister] = React.useState(false)
  const [nomeCompleto, setNomeCompleto] = React.useState("")
  const [nascimento, setNascimento] = React.useState("")
  const [batismo, setBatismo] = React.useState("")
  const [creatingRegister, setCreatingRegister] = React.useState(false)

  const [openAccept, setOpenAccept] = React.useState(false)
  const [acceptTargetUid, setAcceptTargetUid] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"associate" | "create">("associate")
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<string>("")
  const [creatingDuringAccept, setCreatingDuringAccept] = React.useState(false)
  const [createNomeCompleto, setCreateNomeCompleto] = React.useState("")
  const [createNascimento, setCreateNascimento] = React.useState("")
  const [createBatismo, setCreateBatismo] = React.useState("")

  const [openEditRegister, setOpenEditRegister] = React.useState(false)
  const [editRegId, setEditRegId] = React.useState<string>("")
  const [editNomeCompleto, setEditNomeCompleto] = React.useState("")
  const [editNascimento, setEditNascimento] = React.useState("")
  const [editBatismo, setEditBatismo] = React.useState("")
  const [savingEdit, setSavingEdit] = React.useState(false)

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
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  const refreshData = React.useCallback(async (cid: string) => {
    const [us, pend, regs] = await Promise.all([
      listUsersByCongregation(cid),
      listPendingUsersByCongregation(cid),
      listRegisters(cid),
    ])
    setUsers(us.map((x) => ({ uid: x.uid, nome: x.nome, registerId: x.registerId ?? null })))
    setPending(pend.map((x) => ({ uid: x.uid, nome: x.nome })))
    setRegisters(regs)
  }, [])

  React.useEffect(() => {
    if (congregacaoId && isAdmin) {
      refreshData(congregacaoId)
    }
  }, [congregacaoId, isAdmin, refreshData])

  const members = React.useMemo(() => {
    const byId = new Map(registers.map((r) => [r.id, r]))
    const used = new Set<string>()
    const userItems = users.map((u) => {
      const reg = u.registerId ? byId.get(u.registerId) : undefined
      if (reg?.id) used.add(reg.id)
      return { type: "user" as const, uid: u.uid, nome: u.nome, registerId: u.registerId || null, registerName: reg?.nomeCompleto || null }
    })
    const registerItems = registers
      .filter((r) => !used.has(r.id))
      .map((r) => ({ type: "register" as const, id: r.id, nomeCompleto: r.nomeCompleto }))
    return [...userItems, ...registerItems]
  }, [users, registers])

  const handleOpenAccept = async (uid: string, nome: string) => {
    setAcceptTargetUid(uid)
    setCreateNomeCompleto(nome || "")
    setOpenAccept(true)
    setMode("associate")
    setSelectedRegisterId(registers[0]?.id || "")
  }

  const handleReject = async (uid: string) => {
    try {
      await rejectUserAccess(uid)
      if (congregacaoId) await refreshData(congregacaoId)
      toast.success("Pedido rejeitado")
    } catch (e) {
      toast.error("Falha ao rejeitar")
    }
  }

  const handleConfirmAccept = async () => {
    if (!acceptTargetUid || !congregacaoId) return
    try {
      if (mode === "associate") {
        if (!selectedRegisterId) {
          toast.error("Selecione um registro")
          return
        }
        await attachUserToRegister(acceptTargetUid, congregacaoId, selectedRegisterId)
      } else {
        setCreatingDuringAccept(true)
        const { id } = await createRegister(congregacaoId, {
          nomeCompleto: createNomeCompleto,
          nascimento: createNascimento || undefined,
          batismo: createBatismo || undefined,
        })
        await attachUserToRegister(acceptTargetUid, congregacaoId, id)
      }
      setOpenAccept(false)
      setAcceptTargetUid(null)
      setCreatingDuringAccept(false)
      await refreshData(congregacaoId)
      toast.success("Acesso aceito")
    } catch (e) {
      setCreatingDuringAccept(false)
      toast.error("Falha ao aceitar")
    }
  }

  const handleCreateRegister = async () => {
    if (!congregacaoId) return
    try {
      setCreatingRegister(true)
      const { id } = await createRegister(congregacaoId, {
        nomeCompleto,
        nascimento: nascimento || undefined,
        batismo: batismo || undefined,
      })
      setOpenCreateRegister(false)
      setNomeCompleto("")
      setNascimento("")
      setBatismo("")
      await refreshData(congregacaoId)
      toast.success(`Registro criado: ${id}`)
    } catch (e) {
      toast.error("Falha ao criar registro")
    } finally {
      setCreatingRegister(false)
    }
  }

  const handleUnlink = async (uid: string) => {
    if (!congregacaoId) return
    try {
      await unlinkUserFromCongregation(uid)
      await refreshData(congregacaoId)
      toast.success("Desvinculado e removido da congregação")
    } catch (e) {
      toast.error("Falha ao desvincular")
    }
  }

  const handleOpenEditRegister = (registerId: string) => {
    const reg = registers.find((r) => r.id === registerId)
    if (!reg) return
    setEditRegId(registerId)
    setEditNomeCompleto(reg.nomeCompleto)
    setEditNascimento((reg.nascimento as string) || "")
    setEditBatismo((reg.batismo as string) || "")
    setOpenEditRegister(true)
  }

  const handleSaveEditRegister = async () => {
    if (!congregacaoId || !editRegId) return
    try {
      setSavingEdit(true)
      await updateRegister(congregacaoId, editRegId, {
        nomeCompleto: editNomeCompleto,
        nascimento: editNascimento || undefined,
        batismo: editBatismo || undefined,
      })
      setOpenEditRegister(false)
      await refreshData(congregacaoId)
      toast.success("Registro atualizado")
    } catch (e) {
      toast.error("Falha ao atualizar registro")
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) return <div className="p-4">Carregando...</div>
  if (!user || !congregacaoId) return <div className="p-4">Você precisa estar em uma congregação</div>
  if (!isAdmin) return <div className="p-4">Apenas administradores podem acessar</div>

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Usuários</h2>
        <Drawer open={openCreateRegister} onOpenChange={setOpenCreateRegister}>
          <DrawerTrigger asChild>
            <Button>Criar registro</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Criar registro</DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nomeCompleto">Nome completo</Label>
                <Input id="nomeCompleto" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nascimento">Nascimento</Label>
                <Input id="nascimento" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batismo">Batismo</Label>
                <Input id="batismo" type="date" value={batismo} onChange={(e) => setBatismo(e.target.value)} />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleCreateRegister} disabled={creatingRegister || !nomeCompleto}>Criar</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Pedidos pendentes</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido</p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.uid} className="flex items-center justify-between rounded-md border p-3">
                <div className="text-sm">{p.nome}</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReject(p.uid)}>Rejeitar</Button>
                  <Button onClick={() => handleOpenAccept(p.uid, p.nome)}>Aceitar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Membros</h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              m.type === "user" ? (
                <div key={`user:${m.uid}`} className="flex items-center justify-between rounded-md border p-3">
                  <div className="text-sm">{m.nome}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">{m.registerName ? `Registro: ${m.registerName}` : "Sem registro"}</div>
                    {m.registerId ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUnlink(m.uid)}>Desvincular</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEditRegister(m.registerId as string)}>Editar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={`reg:${m.id}`} className="flex items-center justify-between rounded-md border p-3">
                  <div className="text-sm">{m.nomeCompleto}</div>
                  <div className="text-xs text-muted-foreground">Registro sem conta</div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <Drawer open={openEditRegister} onOpenChange={setOpenEditRegister}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar registro</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="er-nome">Nome completo</Label>
              <Input id="er-nome" value={editNomeCompleto} onChange={(e) => setEditNomeCompleto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="er-nasc">Nascimento</Label>
              <Input id="er-nasc" type="date" value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="er-bat">Batismo</Label>
              <Input id="er-bat" type="date" value={editBatismo} onChange={(e) => setEditBatismo(e.target.value)} />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleSaveEditRegister} disabled={savingEdit || !editNomeCompleto}>Salvar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={openAccept} onOpenChange={setOpenAccept}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Concluir aceitação</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 p-4">
            <div className="flex gap-2">
              <Button variant={mode === "associate" ? "default" : "outline"} onClick={() => setMode("associate")}>Associar a um registro</Button>
              <Button variant={mode === "create" ? "default" : "outline"} onClick={() => setMode("create")}>Criar registro com base em usuário</Button>
            </div>
            {mode === "associate" ? (
              <div className="space-y-2">
                <Label htmlFor="registro">Registro</Label>
                <select id="registro" className="h-9 rounded-md border px-2" value={selectedRegisterId} onChange={(e) => setSelectedRegisterId(e.target.value)}>
                  <option value="">Selecione</option>
                  {registers.map((r) => (
                    <option key={r.id} value={r.id}>{r.nomeCompleto}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="crNomeCompleto">Nome completo</Label>
                  <Input id="crNomeCompleto" value={createNomeCompleto} onChange={(e) => setCreateNomeCompleto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crNascimento">Nascimento</Label>
                  <Input id="crNascimento" type="date" value={createNascimento} onChange={(e) => setCreateNascimento(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crBatismo">Batismo</Label>
                  <Input id="crBatismo" type="date" value={createBatismo} onChange={(e) => setCreateBatismo(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button onClick={handleConfirmAccept} disabled={creatingDuringAccept || (mode === "associate" && !selectedRegisterId) || (mode === "create" && !createNomeCompleto)}>Confirmar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}