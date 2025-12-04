"use client"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import { CalendarDays, Users, UserCircle, BookOpen, Music, MessageSquare, Save, ChevronsUpDown, Edit3, Check, X, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { designationLabels } from "@/types/register-labels"
import {
  getUserDoc,
  getCongregationDoc,
  listRegisters,
  getWeekendAssignmentsMonth,
  updateWeekendAssignmentsWeek,
  listExternalSpeakers,
  createExternalSpeaker,
  getRegisterDoc,
  type WeekendAssignWeek,
  type ExternalSpeakerDoc,
} from "@/lib/firebase"
import talks from "@/locales/pt-br/weekend-meeting/public-talks/public_talks.json"
import songs from "@/locales/pt-br/songs.json"

type RegisterOpt = { id: string; nomeCompleto: string; sexo?: "homem" | "mulher"; privilegioServico?: "servo_ministerial" | "anciao" | null; designacoesAprovadas?: string[] }

function useWeekendData() {
  const { user } = useAuth()
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [fimDia, setFimDia] = React.useState<string>("domingo")
  const [fimHora, setFimHora] = React.useState<string>("")
  const [registers, setRegisters] = React.useState<RegisterOpt[]>([])
  const [externalSpeakers, setExternalSpeakers] = React.useState<({ id: string } & ExternalSpeakerDoc)[]>([])
  const regById = React.useMemo(() => new Map(registers.map(r => [r.id, r.nomeCompleto])), [registers])
  const [assignByWeek, setAssignByWeek] = React.useState<Record<string, WeekendAssignWeek>>({})
  const assignByWeekRef = React.useRef(assignByWeek)
  React.useEffect(() => { assignByWeekRef.current = assignByWeek }, [assignByWeek])
  const saveTimersRef = React.useRef<Map<string, any>>(new Map())
  const [canEdit, setCanEdit] = React.useState(false)

  React.useEffect(() => {
    const run = async () => {
      const uid = user?.uid
      if (!uid) return
      const u = await getUserDoc(uid)
      if (!u?.congregacaoId) return
      setCongregacaoId(u.congregacaoId)
      const c = await getCongregationDoc(u.congregacaoId)
      if (c?.fimSemanaDia) setFimDia(c.fimSemanaDia)
      if (c?.fimSemanaHora) setFimHora(c.fimSemanaHora)
      const regs = await listRegisters(u.congregacaoId)
      setRegisters(regs.map(r => ({ id: r.id, nomeCompleto: r.nomeCompleto, sexo: r.sexo, privilegioServico: r.privilegioServico, designacoesAprovadas: r.designacoesAprovadas || [] })))
      try {
        const ext = await listExternalSpeakers(u.congregacaoId)
        setExternalSpeakers(ext)
      } catch {}
      try {
        if (u.registerId) {
          const reg = await getRegisterDoc(u.congregacaoId, u.registerId)
          const responsabilidades = reg?.responsabilidades || []
          const priv = reg?.privilegioServico || null
          const allowed = priv === 'anciao' || responsabilidades.includes('coordenador') || responsabilidades.includes('superintendente_discursos_publicos') || responsabilidades.includes('servo_discursos')
          setCanEdit(allowed)
        } else {
          setCanEdit(false)
        }
      } catch {
        setCanEdit(false)
      }
    }
    run()
  }, [user])

  React.useEffect(() => {
    const run = async () => {
      if (!congregacaoId) return
      const doc = await getWeekendAssignmentsMonth(congregacaoId, monthId)
      if (doc?.weeks) {
        const fromDb = doc.weeks as Record<string, WeekendAssignWeek>
        const normalized: Record<string, WeekendAssignWeek> = {}
        Object.entries(fromDb).forEach(([k, v]) => { normalized[k.replace(/-/g, "/")] = v })
        setAssignByWeek(normalized)
      } else {
        setAssignByWeek({})
      }
    }
    run()
  }, [congregacaoId, monthId])

  const scheduleSaveWeek = React.useCallback(async (weekDate: string, data: WeekendAssignWeek) => {
    try {
      const t = saveTimersRef.current.get(weekDate)
      if (t) { clearTimeout(t); saveTimersRef.current.delete(weekDate) }
      const handle = setTimeout(async () => {
        try {
          if (congregacaoId) {
            await updateWeekendAssignmentsWeek(congregacaoId, monthId, weekDate, data)
            toast.success("Semana salva", { duration: 1200 })
          }
        } catch (e: any) {
          const msg = (e && (e.message || e.toString())) || "Falha ao salvar semana"
          toast.error(msg)
        }
      }, 800)
      saveTimersRef.current.set(weekDate, handle)
    } catch {}
  }, [congregacaoId, monthId])

  const updateAssign = React.useCallback((weekDate: string, field: keyof WeekendAssignWeek, value: string | undefined) => {
    setAssignByWeek(curr => {
      const nextWeek = { ...(curr[weekDate] || {}), [field]: value }
      const next = { ...curr, [weekDate]: nextWeek }
      assignByWeekRef.current = next
      scheduleSaveWeek(weekDate, nextWeek)
      return next
    })
  }, [scheduleSaveWeek])

  const refreshExternalSpeakers = React.useCallback(async () => {
    if (!congregacaoId) return
    try { setExternalSpeakers(await listExternalSpeakers(congregacaoId)) } catch {}
  }, [congregacaoId])

  return {
    monthId, setMonthId,
    fimDia, fimHora,
    registers, externalSpeakers,
    regById,
    assignByWeek, updateAssign,
    congregacaoId,
    refreshExternalSpeakers,
    canEdit,
  }
}

function useWeekendWeeks(monthId: string, fimDia: string) {
  const weeks = React.useMemo(() => {
    const [y, m] = monthId.split('-').map(x => parseInt(x, 10))
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const targetDow = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"].indexOf(fimDia)
    const out: { dateStr: string; label: string }[] = []
    for (let d = new Date(first); d <= last; d = new Date(y, m - 1, d.getDate() + 1)) {
      if (d.getDay() === (targetDow === -1 ? 0 : targetDow)) {
        const ds = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
        const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
        out.push({ dateStr: ds, label })
      }
    }
    return out
  }, [monthId, fimDia])
  return weeks
}

function FilteredRegisterCombo({ value, onChange, registers, filter, placeholder = "Selecionar...", disabled }: { value?: string; onChange: (id: string) => void; registers: RegisterOpt[]; filter?: (r: RegisterOpt) => boolean; placeholder?: string; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const label = React.useMemo(() => {
    const r = registers.find(x => x.id === value)
    return r ? r.nomeCompleto : placeholder
  }, [registers, value, placeholder])
  const list = React.useMemo(() => (filter ? registers.filter(filter) : registers), [registers, filter])
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} className="justify-between w-full h-auto min-h-[32px] px-2 py-1 text-sm font-normal hover:bg-muted/50" disabled={disabled}>
          <span className="truncate text-left flex-1">{label}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome" className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum registro</CommandEmpty>
            <CommandGroup>
              {list.map(r => (
                <CommandItem key={r.id} value={r.nomeCompleto} onSelect={() => { onChange(r.id); setOpen(false) }} className="text-sm">
                  {r.nomeCompleto}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function TalksCombo({ value, onChange, disabled }: { value?: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const items = React.useMemo(() => Object.entries(talks).map(([k, v]) => ({ id: k, title: String(v) })), [])
  const label = value ? (items.find(i => i.id === value)?.title || "Selecionar...") : "Selecionar..."
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} className="justify-between w-full h-auto min-h-[32px] px-2 py-1 text-sm font-normal hover:bg-muted/50" disabled={disabled}>
          <span className="truncate text-left flex-1">{label}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar tema" className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum tema</CommandEmpty>
            <CommandGroup>
              {items.map(i => (
                <CommandItem key={i.id} value={i.title} onSelect={() => { onChange(i.id); setOpen(false) }} className="text-sm">
                  {i.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function SongsCombo({ value, onChange, disabled }: { value?: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const items = React.useMemo(() => Object.entries(songs).map(([k, v]) => ({ id: k, title: String(v) })), [])
  const label = value ? (items.find(i => i.id === value)?.title || "Selecionar...") : "Selecionar..."
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} className="justify-between w-full h-auto min-h-[32px] px-2 py-1 text-sm font-normal hover:bg-muted/50" disabled={disabled}>
          <span className="truncate text-left flex-1">{label}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cântico" className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum cântico</CommandEmpty>
            <CommandGroup>
              {items.map(i => (
                <CommandItem key={i.id} value={i.title} onSelect={() => { onChange(i.id); setOpen(false) }} className="text-sm">
                  {i.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ExternalSpeakerCombo({ value, onChange, externalSpeakers, disabled }: { value?: string; onChange: (id: string) => void; externalSpeakers: ({ id: string } & ExternalSpeakerDoc)[]; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const label = value ? (externalSpeakers.find(e => e.id === value)?.nome || "Selecionar...") : "Selecionar..."
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} className="justify-between w-full h-auto min-h-[32px] px-2 py-1 text-sm font-normal hover:bg-muted/50" disabled={disabled}>
          <span className="truncate text-left flex-1">{label}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar orador" className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum orador</CommandEmpty>
            <CommandGroup>
              {externalSpeakers.map(e => (
                <CommandItem key={e.id} value={e.nome} onSelect={() => { onChange(e.id); setOpen(false) }} className="text-sm">
                  {e.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function WeekendMeeting() {
  const { monthId, setMonthId, fimDia, fimHora, registers, externalSpeakers, regById, assignByWeek, updateAssign, congregacaoId, refreshExternalSpeakers, canEdit } = useWeekendData()
  const weeks = useWeekendWeeks(monthId, fimDia)

  const isEligibleElderOrServant = React.useCallback((r: RegisterOpt) => r.sexo === "homem" && (r.privilegioServico === "anciao" || r.privilegioServico === "servo_ministerial"), [])
  const filterPresidente = React.useCallback((r: RegisterOpt) => isEligibleElderOrServant(r), [isEligibleElderOrServant])
  const filterDirigente = React.useCallback((r: RegisterOpt) => isEligibleElderOrServant(r), [isEligibleElderOrServant])
  const filterLeitor = React.useCallback((r: RegisterOpt) => (r.designacoesAprovadas || []).includes("leitor_sentinela"), [])
  const filterOradorInterno = React.useCallback((r: RegisterOpt) => isEligibleElderOrServant(r), [isEligibleElderOrServant])

  const [newExternal, setNewExternal] = React.useState<{ nome: string; congregacao?: string; contato?: string }>({ nome: "" })
  const [externalDialogOpen, setExternalDialogOpen] = React.useState(false)

  const handleAddExternal = React.useCallback(async () => {
    try {
      if (!newExternal.nome || newExternal.nome.trim().length === 0) return
      if (!congregacaoId) return
      await createExternalSpeaker(congregacaoId, { nome: newExternal.nome.trim(), congregacao: newExternal.congregacao || "", contato: newExternal.contato || "" })
      setNewExternal({ nome: "" })
      await refreshExternalSpeakers()
      toast.success("Orador externo cadastrado")
    } catch (e: any) {
      const msg = (e && (e.message || e.toString())) || "Falha ao cadastrar orador"
      toast.error(msg)
    }
  }, [newExternal, congregacaoId, refreshExternalSpeakers])

  const handleAddExternalAndClose = React.useCallback(async () => {
    await handleAddExternal()
    setExternalDialogOpen(false)
  }, [handleAddExternal])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Fim de Semana
          </h1>
          <p className="text-sm text-muted-foreground">Designações e discurso público</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="monthId" className="text-sm whitespace-nowrap">Selecionar mês:</Label>
            <MonthCombo value={monthId} onChange={setMonthId} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnimatePresence>
          {weeks.map((w, idx) => {
            const a = assignByWeek[w.dateStr] || {}
            return (
              <motion.div key={w.dateStr} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {w.label} {fimHora ? `• ${fimHora}` : ""}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {designationLabels["presidente_fim_semana"]}
                    </Label>
                      <FilteredRegisterCombo registers={registers} value={a.presidente_fim_semana} onChange={(id) => updateAssign(w.dateStr, "presidente_fim_semana", id)} filter={filterPresidente} disabled={!canEdit} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        {designationLabels["dirigente_sentinela"]}
                      </Label>
                      <FilteredRegisterCombo registers={registers} value={a.dirigente_sentinela} onChange={(id) => updateAssign(w.dateStr, "dirigente_sentinela", id)} filter={filterDirigente} disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3" />
                        {designationLabels["leitor_sentinela"]}
                      </Label>
                      <FilteredRegisterCombo registers={registers} value={a.leitor_sentinela} onChange={(id) => updateAssign(w.dateStr, "leitor_sentinela", id)} filter={filterLeitor} disabled={!canEdit} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        {designationLabels["discurso_publico"]}
                      </Label>
                      {canEdit && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <Button variant={a.orador_tipo === "externo" ? "default" : "outline"} size="sm" className="w-full" onClick={() => updateAssign(w.dateStr, "orador_tipo", "externo")}>Externo</Button>
                          </div>
                          <div>
                            <Button variant={a.orador_tipo === "interno" || !a.orador_tipo ? "default" : "outline"} size="sm" className="w-full" onClick={() => updateAssign(w.dateStr, "orador_tipo", "interno")}>Interno</Button>
                          </div>
                        </div>
                      )}
                      {(a.orador_tipo === "externo") ? (
                        <ExternalSpeakerCombo externalSpeakers={externalSpeakers} value={a.orador_externo_id} onChange={(id) => updateAssign(w.dateStr, "orador_externo_id", id)} disabled={!canEdit} />
                      ) : (
                        <FilteredRegisterCombo registers={registers} value={a.orador_register_id} onChange={(id) => updateAssign(w.dateStr, "orador_register_id", id)} filter={filterOradorInterno} disabled={!canEdit} />
                      )}
                      {canEdit && (
                        <div className="flex justify-end">
                          <Dialog open={externalDialogOpen} onOpenChange={setExternalDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="mt-2 gap-2">
                                <Plus className="h-4 w-4" />
                                Adicionar orador externo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Novo orador externo</DialogTitle>
                                <DialogDescription>Cadastre rapidamente para selecionar.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-2">
                                  <Label className="text-xs">Nome</Label>
                                  <Input value={newExternal.nome} onChange={(e) => setNewExternal((curr) => ({ ...curr, nome: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Congregação</Label>
                                  <Input value={newExternal.congregacao || ""} onChange={(e) => setNewExternal((curr) => ({ ...curr, congregacao: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Contato</Label>
                                  <Input value={newExternal.contato || ""} onChange={(e) => setNewExternal((curr) => ({ ...curr, contato: e.target.value }))} />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setExternalDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleAddExternalAndClose} className="gap-2">
                                  <Save className="h-4 w-4" />
                                  Salvar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Music className="h-3 w-3" />
                        Cântico
                      </Label>
                      <SongsCombo value={a.discurso_publico_cantico} onChange={(id) => updateAssign(w.dateStr, "discurso_publico_cantico", id)} disabled={!canEdit} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" />
                      Tema do discurso
                    </Label>
                    <TalksCombo value={a.discurso_publico_tema} onChange={(id) => updateAssign(w.dateStr, "discurso_publico_tema", id)} disabled={!canEdit} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <UserCircle className="h-3 w-3" />
                      Hospitalidade (família)
                    </Label>
                    <FilteredRegisterCombo registers={registers} value={a.hospitalidade_register_id} onChange={(id) => updateAssign(w.dateStr, "hospitalidade_register_id", id)} disabled={!canEdit} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <Separator />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="font-semibold">Oradores externos</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <div className="space-y-2">
            <Label className="text-xs">Nome</Label>
            <Input value={newExternal.nome} onChange={(e) => setNewExternal(curr => ({ ...curr, nome: e.target.value }))} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Congregação</Label>
            <Input value={newExternal.congregacao || ""} onChange={(e) => setNewExternal(curr => ({ ...curr, congregacao: e.target.value }))} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Contato</Label>
            <Input value={newExternal.contato || ""} onChange={(e) => setNewExternal(curr => ({ ...curr, contato: e.target.value }))} disabled={!canEdit} />
          </div>
        </div>
        <div className="flex justify-end pt-3">
          <Button onClick={handleAddExternal} className="gap-2" disabled={!canEdit}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
  function MonthCombo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = React.useState(false)
    const [year, setYear] = React.useState(() => { const [y] = value.split('-').map(x=>parseInt(x,10)); return y || new Date().getFullYear() })
    const label = React.useMemo(() => {
      const [y,m] = value.split('-').map(x=>parseInt(x,10))
      const dt = new Date(y, (m||1)-1, 1)
      return dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }, [value])
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 px-3 text-xs justify-between w-40">
            <span className="truncate">{label}</span>
            <CalendarDays className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-[280px]" align="end">
          <div className="flex items-center justify-between mb-2">
            <Button variant="outline" size="sm" onClick={()=>setYear(year-1)} className="h-7 px-2"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm font-medium">{year}</div>
            <Button variant="outline" size="sm" onClick={()=>setYear(year+1)} className="h-7 px-2"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1
              const dt = new Date(year, i, 1)
              const short = dt.toLocaleDateString('pt-BR', { month: 'short' })
              const mid = `${year}-${String(m).padStart(2,'0')}`
              const selected = value === mid
              return (
                <Button key={i} variant={selected ? 'default' : 'outline'} className="h-8 text-xs" onClick={()=>{ onChange(mid); setOpen(false) }}>{short}</Button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
