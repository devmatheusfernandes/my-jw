"use client"

import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/providers/auth-provider"
import Link from "next/link"
import {
  getUserDoc,
  getCongregationDoc,
  listUsersByCongregation,
  listPendingUsersByCongregation,
  listRegisters,
  createRegister,
  attachUserToRegister,
  rejectUserAccess,
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
  const [sexo, setSexo] = React.useState<'homem' | 'mulher' | ''>('')
  const [statusPub, setStatusPub] = React.useState<'publicador_nao_batizado' | 'publicador_batizado' | ''>('')
  const [privilegioServico, setPrivilegioServico] = React.useState<'servo_ministerial' | 'anciao' | ''>('')
  const [pioneiroAuxiliar, setPioneiroAuxiliar] = React.useState(false)
  const [pioneiroRegular, setPioneiroRegular] = React.useState(false)
  const [designacoes, setDesignacoes] = React.useState<string[]>([])
  const [responsabilidades, setResponsabilidades] = React.useState<string[]>([])

  const [openAccept, setOpenAccept] = React.useState(false)
  const [acceptTargetUid, setAcceptTargetUid] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"associate" | "create">("associate")
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<string>("")
  const [creatingDuringAccept, setCreatingDuringAccept] = React.useState(false)
  const [createNomeCompleto, setCreateNomeCompleto] = React.useState("")
  const [createNascimento, setCreateNascimento] = React.useState("")
  const [createBatismo, setCreateBatismo] = React.useState("")


  const autoBaseDesignacoes = React.useCallback((sx: 'homem' | 'mulher' | '', st: 'publicador_nao_batizado' | 'publicador_batizado' | '', ps: 'servo_ministerial' | 'anciao' | '') => {
    const set = new Set<string>()
    if (st === 'publicador_nao_batizado' || st === 'publicador_batizado') {
      set.add('iniciando_conversas')
      set.add('cultivando_interesse')
      set.add('fazendo_discipulos')
      set.add('explicando_crencas_demonstracao')
      if (sx === 'homem') set.add('leitura_biblia')
    }
    if (st === 'publicador_batizado' && sx === 'homem') {
      set.add('explicando_crencas_discurso')
      set.add('discurso')
    }
    if (ps === 'servo_ministerial') {
      set.add('discurso_tesouros')
      set.add('joias_espirituais')
      set.add('leitor_do_estudo')
    }
    return Array.from(set)
  }, [])

  React.useEffect(() => {
    setDesignacoes(autoBaseDesignacoes(sexo, statusPub, privilegioServico))
  }, [sexo, statusPub, privilegioServico, autoBaseDesignacoes])

  const isBatizadoHaMaisDeUmAno = React.useMemo(() => {
    if (!batismo) return false
    const b = new Date(batismo)
    const now = new Date()
    const diff = now.getTime() - b.getTime()
    return diff >= 365 * 24 * 60 * 60 * 1000
  }, [batismo])


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
        sexo: sexo || undefined,
        status: statusPub || undefined,
        privilegioServico: privilegioServico || null,
        outrosPrivilegios: { pioneiroAuxiliar, pioneiroRegular },
        designacoesAprovadas: designacoes,
        responsabilidades,
      })
      setOpenCreateRegister(false)
      setNomeCompleto("")
      setNascimento("")
      setBatismo("")
      setSexo('')
      setStatusPub('')
      setPrivilegioServico('')
      setPioneiroAuxiliar(false)
      setPioneiroRegular(false)
      setDesignacoes([])
      setResponsabilidades([])
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
            <div className="grid gap-4 p-4 md:grid-cols-2 overflow-y-auto">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nomeCompleto">Nome completo</Label>
                  <Input id="nomeCompleto" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <select id="sexo" className="h-9 rounded-md border px-2" value={sexo} onChange={(e) => setSexo(e.target.value as any)}>
                    <option value="">Selecione</option>
                    <option value="homem">Homem</option>
                    <option value="mulher">Mulher</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" className="h-9 rounded-md border px-2" value={statusPub} onChange={(e) => setStatusPub(e.target.value as any)}>
                    <option value="">Selecione</option>
                    <option value="publicador_nao_batizado">Publicador não batizado</option>
                    <option value="publicador_batizado">Publicador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nascimento">Nascimento</Label>
                  <Input id="nascimento" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batismo">Batismo</Label>
                  <Input id="batismo" type="date" value={batismo} onChange={(e) => setBatismo(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="privilegio">Privilégio de serviço</Label>
                  <select id="privilegio" className="h-9 rounded-md border px-2" value={privilegioServico} onChange={(e) => setPrivilegioServico(e.target.value as any)} disabled={sexo !== 'homem'}>
                    <option value="">Nenhum</option>
                    <option value="servo_ministerial">Servo ministerial</option>
                    <option value="anciao">Ancião</option>
                  </select>
                </div>
                <div className="md:col-span-2 border rounded-lg p-3 space-y-3">
                  <div className="text-sm font-medium">Outros privilégios</div>
                  <div className="flex items-center justify-between">
                    <Label>Pioneiro auxiliar</Label>
                    <Switch checked={pioneiroAuxiliar} onCheckedChange={setPioneiroAuxiliar} disabled={statusPub !== 'publicador_batizado'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Pioneiro regular</Label>
                    <Switch checked={pioneiroRegular} onCheckedChange={setPioneiroRegular} disabled={statusPub !== 'publicador_batizado' || !isBatizadoHaMaisDeUmAno} />
                  </div>
                </div>
                <div className="md:col-span-2 border rounded-lg p-3 space-y-3">
                  <div className="text-sm font-medium">Designações aprovadas</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      { key: 'leitura_biblia', label: 'Leitura da Bíblia', show: sexo === 'homem' },
                      { key: 'iniciando_conversas', label: 'Iniciando conversas', show: true },
                      { key: 'cultivando_interesse', label: 'Cultivando interesse', show: true },
                      { key: 'fazendo_discipulos', label: 'Fazendo discípulos', show: true },
                      { key: 'explicando_crencas_demonstracao', label: 'Explicando suas crenças (demonstração)', show: true },
                      { key: 'audio_video', label: 'Áudio e vídeo', show: sexo === 'homem' },
                      { key: 'volante', label: 'Volante', show: sexo === 'homem' },
                      { key: 'palco', label: 'Palco', show: sexo === 'homem' },
                      { key: 'explicando_crencas_discurso', label: 'Explicando suas crenças (discurso)', show: sexo === 'homem' && statusPub === 'publicador_batizado' },
                      { key: 'discurso', label: 'Discurso', show: sexo === 'homem' && statusPub === 'publicador_batizado' },
                      { key: 'indicador', label: 'Indicador', show: sexo === 'homem' },
                      { key: 'discurso_tesouros', label: 'Tesouros da Palavra de Deus', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'joias_espirituais', label: 'Joias espirituais', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'leitor_do_estudo', label: 'Leitor do estudo', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'estudo_biblico_congregacao', label: 'Estudo bíblico de congregação', show: true },
                      { key: 'nossa_vida_crista', label: 'Nossa vida cristã', show: true },
                      { key: 'presidente_meio_semana', label: 'Presidente reunião meio de semana', show: true },
                      { key: 'presidente_fim_semana', label: 'Presidente reunião fim de semana', show: true },
                      { key: 'leitor_sentinela', label: 'Leitor da Sentinela', show: true },
                      { key: 'dirigente_sentinela', label: 'Dirigente da Sentinela', show: true },
                    ].filter(d => d.show).map((d) => (
                      <div key={d.key} className="flex items-center justify-between">
                        <Label>{d.label}</Label>
                        <Switch checked={designacoes.includes(d.key)} onCheckedChange={(v) => {
                          setDesignacoes((curr) => {
                            const s = new Set(curr)
                            if (v) s.add(d.key)
                            else s.delete(d.key)
                            return Array.from(s)
                          })
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 border rounded-lg p-3 space-y-3">
                  <div className="text-sm font-medium">Responsabilidades</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      { key: 'coordenador', label: 'Coordenador', show: privilegioServico === 'anciao' },
                      { key: 'secretario', label: 'Secretário', show: privilegioServico === 'anciao' },
                      { key: 'superintendente_servico', label: 'Superintendente de serviço', show: privilegioServico === 'anciao' },
                      { key: 'superintendente_audio_video', label: 'Superintendente de áudio e vídeo', show: privilegioServico === 'anciao' },
                      { key: 'superintendente_vida_ministerio', label: 'Superintendente reunião Vida e Ministério', show: privilegioServico === 'anciao' },
                      { key: 'superintendente_discursos_publicos', label: 'Superintendente de discursos públicos', show: privilegioServico === 'anciao' },
                      { key: 'servo_contas', label: 'Servo de contas', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_publicacoes', label: 'Servo de publicações', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_carrinho', label: 'Servo do carrinho', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_territorio', label: 'Servo de território', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_limpeza', label: 'Servo de limpeza', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_quadro_anuncios', label: 'Servo de quadro de anúncios', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_audio_video', label: 'Servo de áudio e vídeo', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                      { key: 'servo_discursos', label: 'Servo de discursos', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                    ].filter(d => d.show).map((d) => (
                      <div key={d.key} className="flex items-center justify-between">
                        <Label>{d.label}</Label>
                        <Switch checked={responsabilidades.includes(d.key)} onCheckedChange={(v) => {
                          setResponsabilidades((curr) => {
                            const s = new Set(curr)
                            if (v) s.add(d.key)
                            else s.delete(d.key)
                            return Array.from(s)
                          })
                        }} />
                      </div>
                    ))}
                  </div>
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
                  <Link href={`/dashboard/usuarios/detalhes?uid=${m.uid}${m.registerId ? `&regId=${m.registerId}` : ''}`} className="text-sm hover:underline">
                    {m.nome}
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">{m.registerName ? `Registro: ${m.registerName}` : "Sem registro"}</div>
                    {m.registerId ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUnlink(m.uid)}>Desvincular</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={`reg:${m.id}`} className="flex items-center justify-between rounded-md border p-3">
                  <Link href={`/dashboard/usuarios/detalhes?regId=${m.id}`} className="text-sm hover:underline">
                    {m.nomeCompleto}
                  </Link>
                  <div className="text-xs text-muted-foreground">Registro sem conta</div>
                </div>
              )
            ))}
          </div>
        )}
      </div>


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