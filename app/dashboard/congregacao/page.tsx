"use client"
import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { createCongregation, requestCongregationAccess, searchCongregations, getUserDoc, getCongregationDoc, updateCongregation, getRegisterDoc, listRegisters, listCongregationEvents, createCongregationEvent, deleteCongregationEvent, type CongregationWithId, type CongregationEventDoc } from "@/lib/firebase"
import { motion } from "framer-motion"
import Image from "next/image"
import { Building, MapPin, Map, Hash, CalendarClock, Calendar, ChevronsUpDown, Check } from "lucide-react"
import ImageHeader from "@/public/images/congregation/header.jpg"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CongregacaoPage() {
  const { user } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [nome, setNome] = React.useState("")
  const [cidade, setCidade] = React.useState("")
  const [estado, setEstado] = React.useState("")
  const [meioSemanaDia, setMeioSemanaDia] = React.useState("quarta")
  const [meioSemanaHora, setMeioSemanaHora] = React.useState("19:30")
  const [fimSemanaDia, setFimSemanaDia] = React.useState("domingo")
  const [fimSemanaHora, setFimSemanaHora] = React.useState("09:00")

  const [identifier, setIdentifier] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<CongregationWithId[]>([])
  const [loadingCreate, setLoadingCreate] = React.useState(false)
  const [loadingAccess, setLoadingAccess] = React.useState(false)

  const [myCongregationId, setMyCongregationId] = React.useState<string | null>(null)
  const [myCongregation, setMyCongregation] = React.useState<CongregationWithId | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [isElder, setIsElder] = React.useState(false)
  const [myRegister, setMyRegister] = React.useState<({ id: string } & any) | null>(null)
  const [loadingMyCongregation, setLoadingMyCongregation] = React.useState(true)
  const [requestStatus, setRequestStatus] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [editNome, setEditNome] = React.useState("")
  const [editCidade, setEditCidade] = React.useState("")
  const [editEstado, setEditEstado] = React.useState("")
  const [editMeioSemanaDia, setEditMeioSemanaDia] = React.useState("quarta")
  const [editMeioSemanaHora, setEditMeioSemanaHora] = React.useState("19:30")
  const [editFimSemanaDia, setEditFimSemanaDia] = React.useState("domingo")
  const [editFimSemanaHora, setEditFimSemanaHora] = React.useState("09:00")
  const [locais, setLocais] = React.useState<string[]>([])
  const [novoLocal, setNovoLocal] = React.useState("")
  const [locaisCarrinho, setLocaisCarrinho] = React.useState<string[]>([])
  const [novoLocalCarrinho, setNovoLocalCarrinho] = React.useState("")
  const [assignmentsSharedOpen, setAssignmentsSharedOpen] = React.useState<boolean>(false)
  const [publicViewId, setPublicViewId] = React.useState<string>("")
  const [shareUrl, setShareUrl] = React.useState<string>("")

  const [events, setEvents] = React.useState<({ id: string } & CongregationEventDoc)[]>([])
  const [loadingEvents, setLoadingEvents] = React.useState(false)
  const [registers, setRegisters] = React.useState<({ id: string; nomeCompleto: string })[]>([])
  const [openAddEvent, setOpenAddEvent] = React.useState(false)
  const [evtTitulo, setEvtTitulo] = React.useState("")
  const [evtStart, setEvtStart] = React.useState("")
  const [evtDuracao, setEvtDuracao] = React.useState<'um_dia' | 'tres_dias' | 'semana_terca_a_domingo' | 'personalizada'>('um_dia')
  const [evtEnd, setEvtEnd] = React.useState("")
  const [evtAudienceType, setEvtAudienceType] = React.useState<'todos' | 'pioneiros_regulares' | 'privilegio' | 'responsabilidade' | 'designacao' | 'registros'>('todos')
  const [evtAudienceValue, setEvtAudienceValue] = React.useState<string>("")
  const [evtAudienceRegisters, setEvtAudienceRegisters] = React.useState<string[]>([])
  const [evtObs, setEvtObs] = React.useState("")

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoadingMyCongregation(true)
        const uid = user?.uid
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setRequestStatus(u.requestCongregationStatus as string)
        setMyCongregationId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        if (c) {
          setMyCongregation(c)
          setIsAdmin(!!c.admins?.includes(uid))
          if (u.registerCongregationId && u.registerId && u.registerCongregationId === u.congregacaoId) {
            const reg = await getRegisterDoc(u.registerCongregationId, u.registerId)
            setIsElder(reg?.privilegioServico === 'anciao')
            setMyRegister(reg)
          }
          setEditNome(c.nome)
          setEditCidade(c.cidade)
          setEditEstado(c.estado)
          setEditMeioSemanaDia(c.meioSemanaDia)
          setEditMeioSemanaHora(c.meioSemanaHora)
          setEditFimSemanaDia(c.fimSemanaDia)
          setEditFimSemanaHora(c.fimSemanaHora)
          setLocais(c.locaisPregacaoAprovados || [])
          setLocaisCarrinho(c.locaisCarrinhoAprovados || [])
          setAssignmentsSharedOpen(!!(c as any).assignmentsSharedOpen)
          setPublicViewId((c as any).publicViewId || "")
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          setShareUrl(origin && (c as any).publicViewId ? `${origin}/shared/congregacao/${c.id}/${(c as any).publicViewId}` : "")
        }
      } finally {
        setLoadingMyCongregation(false)
      }
    }
    run()
  }, [user])

  React.useEffect(() => {
    const run = async () => {
      try {
        if (!myCongregationId) return
        setLoadingEvents(true)
        const [evs, regs] = await Promise.all([
          listCongregationEvents(myCongregationId),
          listRegisters(myCongregationId)
        ])
        setEvents(evs)
        setRegisters(regs.map(r => ({ id: r.id, nomeCompleto: r.nomeCompleto })))
      } finally {
        setLoadingEvents(false)
      }
    }
    run()
  }, [myCongregationId])

  const prefillQuick = React.useCallback((titulo: string, dur: 'um_dia' | 'tres_dias' | 'semana_terca_a_domingo') => {
    setEvtTitulo(titulo)
    setEvtDuracao(dur)
    setOpenAddEvent(true)
  }, [])

  const computeEndDate = React.useCallback((start: string, dur: 'um_dia' | 'tres_dias' | 'semana_terca_a_domingo' | 'personalizada', endIn?: string) => {
    if (!start) return ''
    if (dur === 'personalizada') return endIn || start
    const d = new Date(start)
    if (Number.isNaN(d.getTime())) return start
    if (dur === 'um_dia') return start
    if (dur === 'tres_dias') {
      const e = new Date(d)
      e.setDate(e.getDate() + 2)
      return e.toISOString().slice(0,10)
    }
    const day = d.getDay()
    const diffToSunday = (7 - day) % 7
    const e = new Date(d)
    e.setDate(e.getDate() + diffToSunday)
    return e.toISOString().slice(0,10)
  }, [])

  React.useEffect(() => {
    setEvtEnd(computeEndDate(evtStart, evtDuracao, evtEnd))
  }, [evtStart, evtDuracao])

  const audienceLabel = React.useCallback((a: CongregationEventDoc['audience']) => {
    if (a.type === 'todos') return 'Todos'
    if (a.type === 'pioneiros_regulares') return 'Pioneiros regulares'
    if (a.type === 'privilegio') return `Privilégio: ${a.value}`
    if (a.type === 'responsabilidade') return `Responsabilidade: ${a.value}`
    if (a.type === 'designacao') return `Designação: ${a.value}`
    if (a.type === 'registros') return 'Registros específicos'
    return 'Audiência'
  }, [])

  const eventVisibleFor = React.useCallback((e: CongregationEventDoc, r: any | null) => {
    if (e.audience.type === 'todos') return true
    if (!r) return false
    if (e.audience.type === 'pioneiros_regulares') return !!r.outrosPrivilegios?.pioneiroRegular
    if (e.audience.type === 'privilegio') return (r.privilegioServico || null) === e.audience.value
    if (e.audience.type === 'responsabilidade') return (r.responsabilidades || []).includes(String(e.audience.value))
    if (e.audience.type === 'designacao') return (r.designacoesAprovadas || []).includes(String(e.audience.value))
    if (e.audience.type === 'registros') return Array.isArray(e.audience.value) && (e.audience.value as string[]).includes(r.id)
    return true
  }, [])

  const handleAddEvent = React.useCallback(async () => {
    if (!myCongregationId) return
    const endDate = computeEndDate(evtStart, evtDuracao, evtEnd)
    const audience: CongregationEventDoc['audience'] = evtAudienceType === 'registros'
      ? { type: 'registros', value: evtAudienceRegisters }
      : { type: evtAudienceType, value: evtAudienceValue || undefined }
    const payload: CongregationEventDoc = {
      titulo: evtTitulo.trim(),
      startDate: evtStart,
      endDate,
      allDay: true,
      audience,
      observacoes: evtObs || undefined,
      createdBy: user?.uid || undefined,
    }
    try {
      if (!payload.titulo || !payload.startDate) { toast.error('Preencha título e data'); return }
      await createCongregationEvent(myCongregationId, payload)
      const evs = await listCongregationEvents(myCongregationId)
      setEvents(evs)
      setOpenAddEvent(false)
      setEvtTitulo(''); setEvtStart(''); setEvtDuracao('um_dia'); setEvtEnd(''); setEvtAudienceType('todos'); setEvtAudienceValue(''); setEvtAudienceRegisters([]); setEvtObs('')
      toast.success('Evento criado')
    } catch {
      toast.error('Falha ao criar evento')
    }
  }, [myCongregationId, evtTitulo, evtStart, evtDuracao, evtEnd, evtAudienceType, evtAudienceValue, evtAudienceRegisters, evtObs, computeEndDate, user?.uid])

  const handleDeleteEvent = React.useCallback(async (id: string) => {
    if (!myCongregationId) return
    try {
      await deleteCongregationEvent(myCongregationId, id)
      const evs = await listCongregationEvents(myCongregationId)
      setEvents(evs)
      toast.success('Evento removido')
    } catch {
      toast.error('Falha ao remover')
    }
  }, [myCongregationId])

  const handleCreate = async () => {
    try {
      setLoadingCreate(true)
      const uid = user?.uid
      if (!uid) {
        toast.error("Você precisa estar logado")
        return
      }
      const { id } = await createCongregation({
        nome,
        cidade,
        estado,
        meioSemanaDia,
        meioSemanaHora,
        fimSemanaDia,
        fimSemanaHora,
      }, uid)
      toast.success(`Congregação criada: ${nome} (ID: ${id})`)
      toast.info("Recarregue a página!")
      setOpen(false)
      setNome("")
      setCidade("")
      setEstado("")
    } catch (e) {
      toast.error("Falha ao criar congregação")
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleAccessRequest = async () => {
    try {
      setLoadingAccess(true)
      const uid = user?.uid
      if (!uid) {
        toast.error("Você precisa estar logado")
        return
      }
      await requestCongregationAccess(uid, identifier)
      toast.success("Pedido de acesso enviado e está pendente")
    } catch (e) {
      toast.error("Congregação não encontrada ou erro ao pedir acesso")
    } finally {
      setLoadingAccess(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!myCongregationId) return
    try {
      setSaving(true)
      await updateCongregation(myCongregationId, {
        nome: editNome,
        cidade: editCidade,
        estado: editEstado,
        meioSemanaDia: editMeioSemanaDia,
        meioSemanaHora: editMeioSemanaHora,
        fimSemanaDia: editFimSemanaDia,
        fimSemanaHora: editFimSemanaHora,
        locaisPregacaoAprovados: locais,
        locaisCarrinhoAprovados: locaisCarrinho,
      })
      const c = await getCongregationDoc(myCongregationId)
      setMyCongregation(c)
      setEditing(false)
      toast.success("Dados atualizados")
    } catch (e) {
      toast.error("Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const [comboOpen, setComboOpen] = React.useState(false)
  const [comboLabel, setComboLabel] = React.useState("")
  const [comboQuery, setComboQuery] = React.useState("")
  const handleSearch = React.useCallback(async (q: string) => {
    if (!q || q.trim().length === 0) {
      setSearchResults([])
      return
    }
    const res = await searchCongregations(q.trim())
    setSearchResults(res)
  }, [])

  if (loadingMyCongregation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando congregação...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-primary" />
            Congregação
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie dados da congregação e pedidos de acesso</p>
        </motion.div>

        <Separator />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
          <div className="relative h-72 w-full">
            <Image src={ImageHeader} alt="Congregação" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Informações da congregação</div>
              {(isAdmin || isElder) && myCongregation && requestStatus === 'accepted' && (
                editing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSaveEdit} disabled={saving}>Salvar</Button>
                  </div>
                ) : (
                  <Button onClick={() => setEditing(true)}>Editar</Button>
                )
              )}
            </div>

            {requestStatus === 'accepted' && myCongregation &&
              ((myCongregation.locaisPregacaoAprovados || []).length === 0 && (myCongregation.locaisCarrinhoAprovados || []).length === 0) && (
              <Alert variant="destructive">
                <AlertTitle>Ação necessária</AlertTitle>
                <AlertDescription>
                  Nenhum local aprovado para saída de campo ou carrinhos. Crie locais nas informações da congregação para liberar a programação.
                </AlertDescription>
              </Alert>
            )}

            {requestStatus === 'pending' ? (
              <div className="text-sm text-muted-foreground">Aguardando administrador aprovar pedido</div>
            ) : requestStatus === 'accepted' && myCongregation ? (
              editing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="e-nome">Nome</Label>
                    <Input id="e-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-cidade">Cidade</Label>
                    <Input id="e-cidade" value={editCidade} onChange={(e) => setEditCidade(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-estado">Estado</Label>
                    <Input id="e-estado" value={editEstado} onChange={(e) => setEditEstado(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-meio-dia">Dia (meio de semana)</Label>
                    <select id="e-meio-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editMeioSemanaDia} onChange={(e) => setEditMeioSemanaDia(e.target.value)}>
                      <option value="segunda">segunda</option>
                      <option value="terça">terça</option>
                      <option value="quarta">quarta</option>
                      <option value="quinta">quinta</option>
                      <option value="sexta">sexta</option>
                      <option value="sábado">sábado</option>
                      <option value="domingo">domingo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-meio-hora">Hora (meio de semana)</Label>
                    <Input id="e-meio-hora" type="time" value={editMeioSemanaHora} onChange={(e) => setEditMeioSemanaHora(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-fim-dia">Dia (fim de semana)</Label>
                    <select id="e-fim-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editFimSemanaDia} onChange={(e) => setEditFimSemanaDia(e.target.value)}>
                      <option value="sábado">sábado</option>
                      <option value="domingo">domingo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-fim-hora">Hora (fim de semana)</Label>
                    <Input id="e-fim-hora" type="time" value={editFimSemanaHora} onChange={(e) => setEditFimSemanaHora(e.target.value)} />
                  </div>
                <div className="md:col-span-2 space-y-2 border rounded-lg p-3 bg-muted/30">
                    <div className="text-sm font-medium">Locais aprovados para saída de campo</div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="novo-local">Novo local</Label>
                        <Input id="novo-local" value={novoLocal} onChange={(e) => setNovoLocal(e.target.value)} />
                      </div>
                      <Button onClick={() => {
                        const v = novoLocal.trim()
                        if (!v) return
                        setLocais((curr) => Array.from(new Set([...curr, v])))
                        setNovoLocal("")
                      }}>Adicionar</Button>
                    </div>
                    {locais.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum local</p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {locais.map((l) => (
                          <div key={l} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <span>{l}</span>
                            <Button variant="outline" size="sm" onClick={() => setLocais((curr) => curr.filter((x) => x !== l))}>Remover</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2 border rounded-lg p-3 bg-muted/30">
                    <div className="text-sm font-medium">Locais aprovados para carrinhos</div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="novo-local-carrinho">Novo local</Label>
                        <Input id="novo-local-carrinho" value={novoLocalCarrinho} onChange={(e) => setNovoLocalCarrinho(e.target.value)} />
                      </div>
                      <Button onClick={() => {
                        const v = novoLocalCarrinho.trim()
                        if (!v) return
                        setLocaisCarrinho((curr) => Array.from(new Set([...curr, v])))
                        setNovoLocalCarrinho("")
                      }}>Adicionar</Button>
                    </div>
                    {locaisCarrinho.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum local</p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {locaisCarrinho.map((l) => (
                          <div key={l} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <span>{l}</span>
                            <Button variant="outline" size="sm" onClick={() => setLocaisCarrinho((curr) => curr.filter((x) => x !== l))}>Remover</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm"><Building className="h-4 w-4" /><span className="font-medium">Nome:</span> {myCongregation.nome}</div>
                  <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /><span className="font-medium">Cidade:</span> {myCongregation.cidade}</div>
                  <div className="flex items-center gap-2 text-sm"><Map className="h-4 w-4" /><span className="font-medium">Estado:</span> {myCongregation.estado}</div>
                  <div className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4" /><span className="font-medium">Código de acesso:</span> {myCongregation.accessCode}</div>
                  <div className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4" /><span className="font-medium">Meio da semana:</span> {myCongregation.meioSemanaDia} às {myCongregation.meioSemanaHora}</div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /><span className="font-medium">Fim de semana:</span> {myCongregation.fimSemanaDia} às {myCongregation.fimSemanaHora}</div>
                  <div className="text-sm">
                    <span className="font-medium">Locais de campo aprovados:</span> {(myCongregation.locaisPregacaoAprovados || []).join(', ') || 'Nenhum'}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Locais de carrinhos aprovados:</span> {(myCongregation.locaisCarrinhoAprovados || []).join(', ') || 'Nenhum'}
                  </div>
                  {(isAdmin || isElder) ? (
                    <div className="mt-2 grid gap-2 rounded-md border p-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Página pública de programação</div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Ativar</Label>
                          <Button variant={assignmentsSharedOpen ? undefined : "outline"} className="h-8 px-3 text-xs" onClick={async ()=>{
                            if (!myCongregationId) return
                            const nextOpen = !assignmentsSharedOpen
                            let nextViewId = publicViewId
                            if (nextOpen && (!nextViewId || nextViewId.length < 6)) {
                              nextViewId = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b=>b.toString(16).padStart(2,'0')).join('')
                            }
                            await updateCongregation(myCongregationId, { assignmentsSharedOpen: nextOpen, publicViewId: nextViewId })
                            const c = await getCongregationDoc(myCongregationId)
                            setMyCongregation(c)
                            setAssignmentsSharedOpen(!!(c as any)?.assignmentsSharedOpen)
                            setPublicViewId((c as any)?.publicViewId || "")
                            const origin = typeof window !== 'undefined' ? window.location.origin : ''
                            setShareUrl(nextOpen && origin ? `${origin}/shared/congregacao/${myCongregationId}/${nextViewId}` : "")
                          }}>{assignmentsSharedOpen ? "Desativar" : "Ativar"}</Button>
                        </div>
                      </div>
                      {shareUrl ? (
                        <div className="grid gap-2 md:grid-cols-[1fr_160px] items-center">
                          <div className="flex items-center gap-1 text-xs break-all"><span className="font-medium">Link:</span> {shareUrl}</div>
                          <img alt="QR Code" className="h-40 w-40 rounded-md border" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`} />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Desativado. Ative para gerar link público.</div>
                      )}
                      {assignmentsSharedOpen ? (
                        <div>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={async ()=>{
                            if (!myCongregationId) return
                            const id = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b=>b.toString(16).padStart(2,'0')).join('')
                            await updateCongregation(myCongregationId, { publicViewId: id })
                            setPublicViewId(id)
                            const origin = typeof window !== 'undefined' ? window.location.origin : ''
                            setShareUrl(origin ? `${origin}/shared/congregacao/${myCongregationId}/${id}` : "")
                            toast.success("Novo link público gerado")
                          }}>Regenerar link</Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Sem congregação vinculada</div>
            )}
          </div>
        </motion.div>

        {requestStatus === 'accepted' && myCongregation ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Eventos</div>
              {isElder && (
                <Drawer open={openAddEvent} onOpenChange={setOpenAddEvent}>
                  <DrawerTrigger asChild>
                    <Button className="gap-2">Adicionar</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Novo evento</DrawerTitle>
                    </DrawerHeader>
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <div className="md:col-span-2 grid gap-2">
                        <div className="text-sm font-medium">Sugestões rápidas</div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Assembleia de circuito (representante de Betel)', 'um_dia')}>Assembleia (Betel)</Button>
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Assembleia de circuito (superintendente)', 'um_dia')}>Assembleia (SC)</Button>
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Congresso regional', 'tres_dias')}>Congresso regional</Button>
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Visita do superintendente de circuito', 'semana_terca_a_domingo')}>Visita do SC</Button>
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Celebração da morte de Cristo', 'um_dia')}>Celebração</Button>
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Reunião anual com os pioneiros', 'um_dia')}>Pioneiros — Reunião</Button>
                          <Button variant="outline" size="sm" onClick={()=>prefillQuick('Pioneiros regulares com os anciãos', 'um_dia')}>Pioneiros — Anciãos</Button>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Título</Label>
                        <Input value={evtTitulo} onChange={(e)=>setEvtTitulo(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Início</Label>
                        <Input type="date" value={evtStart} onChange={(e)=>setEvtStart(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Duração</Label>
                        <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={evtDuracao} onChange={(e)=>setEvtDuracao(e.target.value as any)}>
                          <option value="um_dia">Um dia</option>
                          <option value="tres_dias">Três dias</option>
                          <option value="semana_terca_a_domingo">Semana (terça a domingo)</option>
                          <option value="personalizada">Personalizada</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Término</Label>
                        <Input type="date" value={evtEnd} onChange={(e)=>setEvtEnd(e.target.value)} disabled={evtDuracao!=='personalizada'} />
                      </div>
                      <div className="space-y-2">
                        <Label>Audicência</Label>
                        <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={evtAudienceType} onChange={(e)=>{ setEvtAudienceType(e.target.value as any); setEvtAudienceValue(''); setEvtAudienceRegisters([]) }}>
                          <option value="todos">Todos</option>
                          <option value="pioneiros_regulares">Pioneiros regulares</option>
                          <option value="privilegio">Privilégio de serviço</option>
                          <option value="responsabilidade">Responsabilidade</option>
                          <option value="designacao">Designação aprovada</option>
                          <option value="registros">Registros específicos</option>
                        </select>
                      </div>
                      {evtAudienceType === 'privilegio' && (
                        <div className="space-y-2">
                          <Label>Privilégio</Label>
                          <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={evtAudienceValue} onChange={(e)=>setEvtAudienceValue(e.target.value)}>
                            <option value="">Selecione</option>
                            <option value="servo_ministerial">Servo ministerial</option>
                            <option value="anciao">Ancião</option>
                          </select>
                        </div>
                      )}
                      {evtAudienceType === 'responsabilidade' && (
                        <div className="space-y-2">
                          <Label>Responsabilidade</Label>
                          <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={evtAudienceValue} onChange={(e)=>setEvtAudienceValue(e.target.value)}>
                            <option value="">Selecione</option>
                            <option value="coordenador">Coordenador</option>
                            <option value="secretario">Secretário</option>
                            <option value="superintendente_servico">Superintendente de serviço</option>
                            <option value="superintendente_audio_video">Superintendente de áudio e vídeo</option>
                            <option value="superintendente_vida_ministerio">Superintendente Vida e Ministério</option>
                            <option value="superintendente_discursos_publicos">Superintendente de discursos públicos</option>
                            <option value="servo_contas">Servo de contas</option>
                            <option value="servo_publicacoes">Servo de publicações</option>
                            <option value="servo_carrinho">Servo do carrinho</option>
                            <option value="servo_territorio">Servo de território</option>
                            <option value="servo_limpeza">Servo de limpeza</option>
                            <option value="servo_quadro_anuncios">Servo de quadro de anúncios</option>
                            <option value="servo_audio_video">Servo de áudio e vídeo</option>
                            <option value="servo_discursos">Servo de discursos</option>
                          </select>
                        </div>
                      )}
                      {evtAudienceType === 'designacao' && (
                        <div className="space-y-2">
                          <Label>Designação</Label>
                          <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={evtAudienceValue} onChange={(e)=>setEvtAudienceValue(e.target.value)}>
                            <option value="">Selecione</option>
                            <option value="dirigir_reuniao_de_campo">Dirigente de Campo</option>
                            <option value="leitura_biblia">Leitura da Bíblia</option>
                            <option value="iniciando_conversas">Iniciando conversas</option>
                            <option value="cultivando_interesse">Cultivando interesse</option>
                            <option value="fazendo_discipulos">Fazendo discípulos</option>
                            <option value="explicando_crencas_demonstracao">Explicando suas crenças (demonstração)</option>
                            <option value="explicando_crencas_discurso">Explicando suas crenças (discurso)</option>
                            <option value="discurso">Discurso</option>
                            <option value="audio_video">Áudio e vídeo</option>
                            <option value="volante">Volante</option>
                            <option value="palco">Palco</option>
                            <option value="indicador_porta">Indicador (porta)</option>
                            <option value="indicador_palco">Indicador (palco)</option>
                            <option value="discurso_tesouros">Tesouros</option>
                            <option value="joias_espirituais">Joias espirituais</option>
                            <option value="leitor_do_estudo">Leitor do estudo</option>
                            <option value="estudo_biblico_congregacao">Estudo bíblico</option>
                            <option value="nossa_vida_crista">Nossa vida cristã</option>
                            <option value="presidente_meio_semana">Presidente meio de semana</option>
                            <option value="presidente_fim_semana">Presidente fim de semana</option>
                            <option value="leitor_sentinela">Leitor da Sentinela</option>
                            <option value="dirigente_sentinela">Dirigente da Sentinela</option>
                            <option value="discurso_publico">Discurso público</option>
                          </select>
                        </div>
                      )}
                      {evtAudienceType === 'registros' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>Registros</Label>
                          <select multiple className="h-24 w-full rounded-md border bg-background px-3 text-sm" value={evtAudienceRegisters} onChange={(e)=>{ const opts = Array.from(e.target.selectedOptions).map(o=>o.value); setEvtAudienceRegisters(opts) }}>
                            {registers.map(r => (<option key={r.id} value={r.id}>{r.nomeCompleto}</option>))}
                          </select>
                        </div>
                      )}
                      <div className="md:col-span-2 space-y-2">
                        <Label>Observações</Label>
                        <Input value={evtObs} onChange={(e)=>setEvtObs(e.target.value)} />
                      </div>
                    </div>
                    <DrawerFooter>
                      <div className="flex gap-2">
                        <Button onClick={handleAddEvent}>Salvar</Button>
                        <Button variant="outline" onClick={()=>setOpenAddEvent(false)}>Cancelar</Button>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              )}
            </div>
            <div className="p-3 sm:p-4">
              {loadingEvents ? (
                <div className="text-sm text-muted-foreground">Carregando eventos...</div>
              ) : (
                <div className="grid gap-2">
                  {events.filter(e => eventVisibleFor(e, myRegister)).length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum evento</div>
                  ) : (
                    events.filter(e => eventVisibleFor(e, myRegister)).map((e) => (
                      <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{e.titulo}</div>
                          {isElder ? (<Button variant="outline" size="sm" className="h-8" onClick={()=>handleDeleteEvent(e.id)}>Remover</Button>) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{e.startDate}{e.endDate && e.endDate !== e.startDate ? ` — ${e.endDate}` : ''}</div>
                        <div className="text-xs">Audiência: {audienceLabel(e.audience)}</div>
                        {e.observacoes ? (<div className="text-xs text-muted-foreground">Obs.: {e.observacoes}</div>) : null}
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}

        {requestStatus !== 'accepted' && requestStatus !== 'pending' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Criar congregação</h3>
                <Drawer open={open} onOpenChange={setOpen}>
                  <DrawerTrigger asChild>
                    <Button className="gap-2">Abrir</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Criar congregação</DrawerTitle>
                    </DrawerHeader>
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meio-dia">Dia (meio de semana)</Label>
                        <select id="meio-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={meioSemanaDia} onChange={(e) => setMeioSemanaDia(e.target.value)}>
                          <option value="segunda">segunda</option>
                          <option value="terça">terça</option>
                          <option value="quarta">quarta</option>
                          <option value="quinta">quinta</option>
                          <option value="sexta">sexta</option>
                          <option value="sábado">sábado</option>
                          <option value="domingo">domingo</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meio-hora">Horário (meio de semana)</Label>
                        <Input id="meio-hora" type="time" value={meioSemanaHora} onChange={(e) => setMeioSemanaHora(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fim-dia">Dia (fim de semana)</Label>
                        <select id="fim-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={fimSemanaDia} onChange={(e) => setFimSemanaDia(e.target.value)}>
                          <option value="sábado">sábado</option>
                          <option value="domingo">domingo</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fim-hora">Horário (fim de semana)</Label>
                        <Input id="fim-hora" type="time" value={fimSemanaHora} onChange={(e) => setFimSemanaHora(e.target.value)} />
                      </div>
                    </div>
                    <DrawerFooter>
                      <div className="flex gap-2">
                        <Button onClick={handleCreate} disabled={loadingCreate || !nome || !cidade || !estado}>Salvar</Button>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
              <p className="text-xs text-muted-foreground">Crie uma nova congregação e entre como administrador.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-4 space-y-4">
              <h3 className="text-sm font-medium">Pedir acesso</h3>
              <div className="flex items-end gap-2">
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboOpen} className="w-[280px] justify-between">
                      {comboLabel || "Selecionar congregação..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar por ID, código, nome ou cidade"
                        value={comboQuery}
                        onValueChange={(v)=>{ setComboQuery(v); handleSearch(v) }}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhuma congregação encontrada.</CommandEmpty>
                        <CommandGroup>
                          {searchResults.map((r) => (
                            <CommandItem
                              key={r.id}
                              value={`${r.id} ${r.accessCode || ''} ${r.nome} ${r.cidade}`}
                              onSelect={() => {
                                setIdentifier(r.id)
                                setComboLabel(`${r.nome} — ${r.cidade}`)
                                setComboOpen(false)
                              }}
                            >
                              <Check className={comboLabel && identifier === r.id ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                              <span>{r.nome}</span>
                              <span className="ml-auto text-muted-foreground">{r.cidade}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button onClick={handleAccessRequest} disabled={loadingAccess || !identifier}>Pedir acesso</Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
