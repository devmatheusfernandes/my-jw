"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { MoreHorizontal, Users, UserPlus, Search, Filter, UserCheck, UserX, Link as LinkIcon, Unlink, Eye, AlertCircle, CheckCircle2 } from "lucide-react"
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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterType, setFilterType] = React.useState<"all" | "linked" | "unlinked" | "noAccount">("all")

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

  const filteredMembers = React.useMemo(() => {
    let filtered = members

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((m) => {
        if (m.type === "user") {
          return m.nome.toLowerCase().includes(query) || m.registerName?.toLowerCase().includes(query)
        } else {
          return m.nomeCompleto.toLowerCase().includes(query)
        }
      })
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((m) => {
        if (filterType === "linked") return m.type === "user" && m.registerId
        if (filterType === "unlinked") return m.type === "user" && !m.registerId
        if (filterType === "noAccount") return m.type === "register"
        return true
      })
    }

    return filtered
  }, [members, searchQuery, filterType])

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
      toast.success("Registro criado com sucesso")
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-3"
        >
          <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando usuários...</p>
        </motion.div>
      </div>
    )
  }

  if (!user || !congregacaoId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 max-w-md"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Congregação necessária</h2>
          <p className="text-sm text-muted-foreground">Você precisa estar vinculado a uma congregação para acessar esta página.</p>
        </motion.div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 max-w-md"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-7 w-7 text-primary" />
                Gerenciar Usuários
              </h1>
              <p className="text-sm text-muted-foreground">Gerencie membros, registros e permissões da congregação</p>
            </div>
            <Drawer open={openCreateRegister} onOpenChange={setOpenCreateRegister}>
              <DrawerTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar Registro
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader>
                  <DrawerTitle>Criar novo registro</DrawerTitle>
                </DrawerHeader>
                <div className="grid gap-4 p-4 md:grid-cols-2 overflow-y-auto max-h-[calc(90vh-180px)]">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nomeCompleto">Nome completo *</Label>
                    <Input id="nomeCompleto" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} placeholder="Digite o nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo</Label>
                    <select id="sexo" className="h-9 w-full rounded-md border bg-background px-3" value={sexo} onChange={(e) => setSexo(e.target.value as any)}>
                      <option value="">Selecione</option>
                      <option value="homem">Homem</option>
                      <option value="mulher">Mulher</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select id="status" className="h-9 w-full rounded-md border bg-background px-3" value={statusPub} onChange={(e) => setStatusPub(e.target.value as any)}>
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
                    <select id="privilegio" className="h-9 w-full rounded-md border bg-background px-3" value={privilegioServico} onChange={(e) => setPrivilegioServico(e.target.value as any)} disabled={sexo !== 'homem'}>
                      <option value="">Nenhum</option>
                      <option value="servo_ministerial">Servo ministerial</option>
                      <option value="anciao">Ancião</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 border rounded-lg p-3 space-y-3 bg-muted/30">
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
                  <div className="md:col-span-2 border rounded-lg p-3 space-y-3 bg-muted/30">
                    <div className="text-sm font-medium">Designações aprovadas</div>
                    <div className="grid gap-2 md:grid-cols-2 max-h-60 overflow-y-auto">
                      {[
                        { key: 'leitura_biblia', label: 'Leitura da Bíblia', show: sexo === 'homem' },
                        { key: 'iniciando_conversas', label: 'Iniciando conversas', show: true },
                        { key: 'cultivando_interesse', label: 'Cultivando interesse', show: true },
                        { key: 'fazendo_discipulos', label: 'Fazendo discípulos', show: true },
                        { key: 'explicando_crencas_demonstracao', label: 'Explicando suas crenças (demonstração)', show: true },
                        { key: 'dirigir_reuniao_de_campo', label: 'Dirigente de Campo', show: true },
                        { key: 'audio_video', label: 'Áudio e vídeo', show: sexo === 'homem' },
                        { key: 'volante', label: 'Volante', show: sexo === 'homem' },
                        { key: 'palco', label: 'Palco', show: sexo === 'homem' },
                        { key: 'explicando_crencas_discurso', label: 'Explicando suas crenças (discurso)', show: sexo === 'homem' && statusPub === 'publicador_batizado' },
                        { key: 'discurso', label: 'Discurso', show: sexo === 'homem' && statusPub === 'publicador_batizado' },
                        { key: 'indicador', label: 'Indicador', show: sexo === 'homem' },
                        { key: 'discurso_tesouros', label: 'Tesouros da Palavra de Deus', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                        { key: 'joias_espirituais', label: 'Joias espirituais', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                        { key: 'leitor_do_estudo', label: 'Leitor do estudo', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                        { key: 'estudo_biblico_congregacao', label: 'Estudo bíblico de congregação', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                        { key: 'nossa_vida_crista', label: 'Nossa vida cristã', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                        { key: 'presidente_meio_semana', label: 'Presidente reunião meio de semana', show: privilegioServico === 'anciao' },
                        { key: 'presidente_fim_semana', label: 'Presidente reunião fim de semana', show: privilegioServico === 'anciao' },
                        { key: 'leitor_sentinela', label: 'Leitor da Sentinela', show: privilegioServico === 'servo_ministerial' || privilegioServico === 'anciao' },
                        { key: 'dirigente_sentinela', label: 'Dirigente da Sentinela', show: privilegioServico === 'anciao' },
                      ].filter(d => d.show).map((d) => (
                        <div key={d.key} className="flex items-center justify-between text-sm py-1">
                          <Label className="text-xs">{d.label}</Label>
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
                  <div className="md:col-span-2 border rounded-lg p-3 space-y-3 bg-muted/30">
                    <div className="text-sm font-medium">Responsabilidades</div>
                    <div className="grid gap-2 md:grid-cols-2 max-h-60 overflow-y-auto">
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
                        <div key={d.key} className="flex items-center justify-between text-sm py-1">
                          <Label className="text-xs">{d.label}</Label>
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
                  <Button onClick={handleCreateRegister} disabled={creatingRegister || !nomeCompleto} className="w-full">
                    {creatingRegister ? "Criando..." : "Criar Registro"}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </motion.div>

        <Separator />

        {/* Pending Requests */}
        {pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-lg font-semibold">Pedidos Pendentes</h2>
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AnimatePresence>
                {pending.map((p) => (
                  <motion.div
                    key={p.uid}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="font-medium">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">Aguardando aprovação</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleReject(p.uid)} className="gap-2">
                        <UserX className="h-3 w-3" />
                        Rejeitar
                      </Button>
                      <Button size="sm" onClick={() => handleOpenAccept(p.uid, p.nome)} className="gap-2">
                        <CheckCircle2 className="h-3 w-3" />
                        Aceitar
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Membros e Registros
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className="gap-2"
              >
                <Filter className="h-3 w-3" />
                Todos ({members.length})
              </Button>
              <Button
                variant={filterType === "linked" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("linked")}
                className="gap-2"
              >
                <LinkIcon className="h-3 w-3" />
                Vinculados ({users.filter(u => u.registerId).length})
              </Button>
              <Button
                variant={filterType === "unlinked" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("unlinked")}
                className="gap-2"
              >
                <Unlink className="h-3 w-3" />
                Sem Registro ({users.filter(u => !u.registerId).length})
              </Button>
              <Button
                variant={filterType === "noAccount" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("noAccount")}
                className="gap-2"
              >
                <UserX className="h-3 w-3" />
                Sem Conta ({registers.filter(r => !users.find(u => u.registerId === r.id)).length})
              </Button>
            </div>
          </div>

          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 rounded-lg border bg-muted/30">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Nenhum resultado encontrado" : "Nenhum membro encontrado"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredMembers.map((m, idx) => (
                  m.type === "user" ? (
                    <motion.div
                      key={`user:${m.uid}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.03 }}
                      className="rounded-lg border bg-card hover:bg-muted/50 transition-colors overflow-hidden group"
                    >
                      <Link href={`/dashboard/usuarios/detalhes?uid=${m.uid}${m.registerId ? `&regId=${m.registerId}` : ''}`}>
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate group-hover:text-primary transition-colors">{m.nome}</div>
                                <div className="text-xs text-muted-foreground">Conta ativa</div>
                              </div>
                            </div>
                            {m.registerId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleUnlink(m.uid) }} className="text-destructive">
                                    <Unlink className="h-3 w-3 mr-2" />
                                    Desvincular
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          
                          {m.registerName ? (
                            <div className="flex items-center gap-2 text-xs rounded-md bg-muted/50 p-2">
                              <LinkIcon className="h-3 w-3 text-green-600 dark:text-green-400" />
                              <span className="text-muted-foreground truncate">Registro: {m.registerName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs rounded-md bg-amber-100/50 dark:bg-amber-900/20 p-2">
                              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              <span className="text-amber-600 dark:text-amber-400">Sem registro vinculado</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`reg:${m.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.03 }}
                      className="rounded-lg border bg-card hover:bg-muted/50 transition-colors overflow-hidden group"
                    >
                      <Link href={`/dashboard/usuarios/detalhes?regId=${m.id}`}>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <UserX className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate group-hover:text-primary transition-colors">{m.nomeCompleto}</div>
                              <div className="text-xs text-muted-foreground">Apenas registro</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs rounded-md bg-muted/50 p-2">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Sem conta de usuário</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Accept User Drawer */}
      <Drawer open={openAccept} onOpenChange={setOpenAccept}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Aceitar usuário na congregação</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={mode === "associate" ? "default" : "outline"}
                onClick={() => setMode("associate")}
                className="flex-1"
              >
                Associar a registro existente
              </Button>
              <Button
                variant={mode === "create" ? "default" : "outline"}
                onClick={() => setMode("create")}
                className="flex-1"
              >
                Criar novo registro
              </Button>
            </div>
            
            {mode === "associate" ? (
              <div className="space-y-2">
                <Label htmlFor="registro">Selecionar registro</Label>
                <select
                  id="registro"
                  className="h-9 w-full rounded-md border bg-background px-3"
                  value={selectedRegisterId}
                  onChange={(e) => setSelectedRegisterId(e.target.value)}
                >
                  <option value="">Selecione um registro</option>
                  {registers.map((r) => (
                    <option key={r.id} value={r.id}>{r.nomeCompleto}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="crNomeCompleto">Nome completo *</Label>
                  <Input
                    id="crNomeCompleto"
                    value={createNomeCompleto}
                    onChange={(e) => setCreateNomeCompleto(e.target.value)}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crNascimento">Nascimento</Label>
                  <Input
                    id="crNascimento"
                    type="date"
                    value={createNascimento}
                    onChange={(e) => setCreateNascimento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crBatismo">Batismo</Label>
                  <Input
                    id="crBatismo"
                    type="date"
                    value={createBatismo}
                    onChange={(e) => setCreateBatismo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button
              onClick={handleConfirmAccept}
              disabled={creatingDuringAccept || (mode === "associate" && !selectedRegisterId) || (mode === "create" && !createNomeCompleto)}
              className="w-full"
            >
              {creatingDuringAccept ? "Processando..." : "Confirmar e Aceitar"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}