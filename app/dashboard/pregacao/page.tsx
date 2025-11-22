"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ChevronsUpDown, Calendar, MapPin, Clock, Plus, Trash2, Users, Save, Eye, Edit3, Info, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import {
  getUserDoc,
  getCongregationDoc,
  getRegisterDoc,
  getPregacaoFixed,
  updatePregacaoFixed,
  getPregacaoMonth,
  updatePregacaoMonth,
  type PregacaoFixedDoc,
  type PregacaoMonthDoc,
  type PregacaoEntry,
} from "@/lib/firebase"
import { listRegisters } from "@/lib/firebase"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const DAYS: { key: string; label: string; shortLabel: string }[] = [
  { key: "segunda", label: "Segunda-feira", shortLabel: "Seg" },
  { key: "terça", label: "Terça-feira", shortLabel: "Ter" },
  { key: "quarta", label: "Quarta-feira", shortLabel: "Qua" },
  { key: "quinta", label: "Quinta-feira", shortLabel: "Qui" },
  { key: "sexta", label: "Sexta-feira", shortLabel: "Sex" },
  { key: "sábado", label: "Sábado", shortLabel: "Sáb" },
  { key: "domingo", label: "Domingo", shortLabel: "Dom" },
]

function emptyByDay(): Record<string, PregacaoEntry[]> {
  const o: Record<string, PregacaoEntry[]> = {}
  DAYS.forEach((d) => (o[d.key] = []))
  return o
}

export default function PregacaoPage() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isElder, setIsElder] = React.useState(false)

  const [fixed, setFixed] = React.useState<PregacaoFixedDoc>({ porDia: emptyByDay(), diasAtivos: [] })
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [monthly, setMonthly] = React.useState<PregacaoMonthDoc>({ porDiaSemanas: {}, diasAtivos: [] })
  const [savingFixed, setSavingFixed] = React.useState(false)
  const [savingMonthly, setSavingMonthly] = React.useState(false)
  const [approvedLocais, setApprovedLocais] = React.useState<string[]>([])
  const [leaders, setLeaders] = React.useState<{ id: string; nomeCompleto: string }[]>([])
  const leaderById = React.useMemo(() => new Map(leaders.map((l) => [l.id, l.nomeCompleto])), [leaders])

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

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const uid = user?.uid
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        if (u.registerCongregationId && u.registerId && u.registerCongregationId === u.congregacaoId) {
          const reg = await getRegisterDoc(u.registerCongregationId, u.registerId)
          setIsElder(reg?.privilegioServico === "anciao")
        }
        const fixedData = await getPregacaoFixed(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        setApprovedLocais(c?.locaisPregacaoAprovados || [])
        const regs = await listRegisters(u.congregacaoId)
        setLeaders(regs.filter((r) => (r.designacoesAprovadas || []).includes("dirigir_reuniao_de_campo")).map((r) => ({ id: r.id, nomeCompleto: r.nomeCompleto })))
        setFixed(fixedData ?? { porDia: emptyByDay(), diasAtivos: [] })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  const refreshMonth = React.useCallback(async (cid: string, mid: string) => {
    const data = await getPregacaoMonth(cid, mid)
    if (!data) {
      setMonthly({ porDiaSemanas: {}, diasAtivos: [] })
    } else {
      setMonthly({ porDiaSemanas: data.porDiaSemanas || {}, diasAtivos: data.diasAtivos || [] })
    }
  }, [])

  React.useEffect(() => {
    if (congregacaoId) {
      refreshMonth(congregacaoId, monthId)
    }
  }, [congregacaoId, monthId, refreshMonth])

  const dayIndex = (key: string) => ({ domingo: 0, segunda: 1, terça: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6 } as Record<string, number>)[key]

  const weekDatesForMonth = React.useCallback((mid: string, key: string) => {
    const [y, m] = mid.split('-').map((x) => parseInt(x, 10))
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const idx = dayIndex(key)
    const dates: Date[] = []
    for (let d = new Date(first); d <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      if (d.getDay() === idx) dates.push(new Date(d))
    }
    return dates
  }, [])

  const monthlyArr = (day: string) => {
    const curr = monthly.porDiaSemanas?.[day] || []
    const dates = weekDatesForMonth(monthId, day)
    const out = [...curr]
    while (out.length < dates.length) out.push({ hora: "", local: "", observacoes: "" })
    if (out.length > dates.length) out.splice(dates.length)
    return { arr: out, dates }
  }

  const setMonthlyForDay = (day: string, arr: PregacaoEntry[]) => {
    setMonthly((curr) => ({ ...curr, porDiaSemanas: { ...(curr.porDiaSemanas || {}), [day]: arr } }))
  }

  const toggleFixedDay = (day: string, value: boolean) => {
    setFixed((curr) => {
      const dias = new Set(curr.diasAtivos || [])
      if (value) dias.add(day)
      else dias.delete(day)
      if (!value) {
        return { porDia: { ...curr.porDia, [day]: [] }, diasAtivos: Array.from(dias) }
      }
      return { ...curr, diasAtivos: Array.from(dias) }
    })
  }

  const toggleMonthlyDay = (day: string, value: boolean) => {
    setMonthly((curr) => {
      const dias = new Set(curr.diasAtivos || [])
      if (value) dias.add(day)
      else dias.delete(day)
      if (!value) {
        const cp = { ...(curr.porDiaSemanas || {}) }
        delete cp[day]
        return { porDiaSemanas: cp, diasAtivos: Array.from(dias) }
      }
      return { ...curr, diasAtivos: Array.from(dias) }
    })
  }

  const addFixedSlot = (day: string) => {
    setFixed((curr) => ({ ...curr, porDia: { ...curr.porDia, [day]: [...(curr.porDia[day] || []), { hora: "", local: "", observacoes: "" }] } }))
  }
  const updateFixedSlot = (day: string, idx: number, field: keyof PregacaoEntry, value: string) => {
    setFixed((curr) => {
      const arr = [...(curr.porDia[day] || [])]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...curr, porDia: { ...curr.porDia, [day]: arr } }
    })
  }
  const removeFixedSlot = (day: string, idx: number) => {
    setFixed((curr) => {
      const arr = [...(curr.porDia[day] || [])]
      arr.splice(idx, 1)
      return { ...curr, porDia: { ...curr.porDia, [day]: arr } }
    })
  }

  const updateMonthlySlot = (day: string, idx: number, field: keyof PregacaoEntry, value: string) => {
    const { arr } = monthlyArr(day)
    arr[idx] = { ...arr[idx], [field]: value }
    setMonthlyForDay(day, arr)
  }

  function LeaderCombo({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
    const [open, setOpen] = React.useState(false)
    const label = value ? (leaderById.get(value) || "Selecionar dirigente...") : "Selecionar dirigente..."
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="justify-between w-full">
            <span className="truncate">{label}</span>
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
                  <CommandItem key={l.id} value={l.nomeCompleto} onSelect={() => { onChange(l.id); setOpen(false) }}>
                    {l.nomeCompleto}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  const handleSaveFixed = async () => {
    if (!congregacaoId) return
    try {
      setSavingFixed(true)
      await updatePregacaoFixed(congregacaoId, fixed)
      toast.success("Programação fixa salva")
    } catch (e) {
      toast.error("Falha ao salvar programação fixa")
    } finally {
      setSavingFixed(false)
    }
  }

  const handleSaveMonthly = async () => {
    if (!congregacaoId) return
    try {
      setSavingMonthly(true)
      await updatePregacaoMonth(congregacaoId, monthId, monthly)
      toast.success("Programação mensal salva")
    } catch (e) {
      toast.error("Falha ao salvar programação mensal")
    } finally {
      setSavingMonthly(false)
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
          <p className="text-sm text-muted-foreground">Carregando programação...</p>
        </motion.div>
      </div>
    )
  }

  if (!user) {
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
          <h2 className="text-xl font-semibold">Autenticação necessária</h2>
          <p className="text-sm text-muted-foreground">Você precisa estar autenticado para acessar esta página.</p>
        </motion.div>
      </div>
    )
  }

  if (!congregacaoId) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Programação de Pregação</h1>
              <p className="text-sm text-muted-foreground">Gerencie os horários e locais das reuniões de campo</p>
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* Programação Fixa */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Programação Fixa
              </h2>
              <p className="text-sm text-muted-foreground">Horários que se repetem todas as semanas</p>
            </div>
            {isElder && (
              <Button onClick={handleSaveFixed} disabled={savingFixed} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            )}
          </div>

          {isElder ? (
            <div className="space-y-4">
              {/* Day Selector */}
              <div className="rounded-lg border bg-card p-4">
                <Label className="text-sm font-medium mb-3 block">Dias da semana ativos</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((d) => (
                    <div key={`fx-${d.key}`} className="flex items-center space-x-2">
                      <Switch
                        id={`fixed-day-${d.key}`}
                        checked={(fixed.diasAtivos || []).includes(d.key)}
                        onCheckedChange={(checked) => toggleFixedDay(d.key, checked)}
                      />
                      <Label htmlFor={`fixed-day-${d.key}`} className="text-sm cursor-pointer">
                        {d.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Days Grid */}
              <div className="grid gap-4 lg:grid-cols-2">
                <AnimatePresence>
                  {(fixed.diasAtivos || []).map((dayKey) => {
                    const d = DAYS.find((x) => x.key === dayKey)!
                    return (
                      <motion.div
                        key={d.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-lg border bg-card overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                          <div className="font-semibold flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {d.label}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addFixedSlot(d.key)}
                            className="gap-2"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar
                          </Button>
                        </div>
                        <div className="p-4 space-y-3">
                          {(fixed.porDia[d.key] || []).length === 0 ? (
                            <div className="text-sm text-muted-foreground italic text-center py-8 rounded-lg bg-muted/30 border-2 border-dashed">
                              Nenhum horário programado
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(fixed.porDia[d.key] || []).map((slot, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="rounded-lg border bg-background p-3 space-y-3"
                                >
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label className="text-xs flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        Horário
                                      </Label>
                                      <Input
                                        type="time"
                                        value={slot.hora}
                                        onChange={(e) => updateFixedSlot(d.key, idx, "hora", e.target.value)}
                                        className="h-9"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" />
                                        Local
                                      </Label>
                                      <select
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                        value={slot.local}
                                        onChange={(e) => updateFixedSlot(d.key, idx, "local", e.target.value)}
                                      >
                                        <option value="">Selecione</option>
                                        {approvedLocais.map((l) => (
                                          <option key={l} value={l}>{l}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs flex items-center gap-1.5">
                                      <Users className="h-3 w-3" />
                                      Dirigente
                                    </Label>
                                    <LeaderCombo
                                      value={slot.dirigenteRegisterId}
                                      onChange={(id) => updateFixedSlot(d.key, idx, "dirigenteRegisterId", id)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs flex items-center gap-1.5">
                                      <Info className="h-3 w-3" />
                                      Observações
                                    </Label>
                                    <Input
                                      value={slot.observacoes || ""}
                                      onChange={(e) => updateFixedSlot(d.key, idx, "observacoes", e.target.value)}
                                      placeholder="Informações adicionais..."
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="flex justify-end pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeFixedSlot(d.key, idx)}
                                      className="gap-2 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remover
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {DAYS.filter((d) => (fixed.porDia[d.key] || []).length > 0).map((d) => (
                <motion.div
                  key={d.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <div className="font-semibold flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {d.label}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {(fixed.porDia[d.key] || []).map((slot, idx) => (
                      <div key={idx} className="rounded-md bg-muted/50 p-3 space-y-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{slot.hora || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{slot.local || "—"}</span>
                        </div>
                        {slot.dirigenteRegisterId && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{leaderById.get(slot.dirigenteRegisterId) || ""}</span>
                          </div>
                        )}
                        {slot.observacoes && (
                          <div className="flex items-center gap-2">
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{slot.observacoes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <Separator />

        {/* Programação Mensal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Programação Mensal
              </h2>
              <p className="text-sm text-muted-foreground">Horários específicos para cada semana do mês</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="monthId" className="text-sm whitespace-nowrap">Selecionar mês:</Label>
                <MonthCombo value={monthId} onChange={setMonthId} />
              </div>
              {isElder && (
                <Button onClick={handleSaveMonthly} disabled={savingMonthly} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              )}
            </div>
          </div>

          {isElder ? (
            <div className="space-y-4">
              {/* Day Selector */}
              <div className="rounded-lg border bg-card p-4">
                <Label className="text-sm font-medium mb-3 block">Dias da semana ativos</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((d) => (
                    <div key={`mn-${d.key}`} className="flex items-center space-x-2">
                      <Switch
                        id={`monthly-day-${d.key}`}
                        checked={(monthly.diasAtivos || []).includes(d.key)}
                        onCheckedChange={(checked) => toggleMonthlyDay(d.key, checked)}
                      />
                      <Label htmlFor={`monthly-day-${d.key}`} className="text-sm cursor-pointer">
                        {d.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Days Grid */}
              <div className="grid gap-4 lg:grid-cols-2">
                <AnimatePresence>
                  {(monthly.diasAtivos || []).map((dayKey) => {
                    const d = DAYS.find((x) => x.key === dayKey)!
                    const { arr, dates } = monthlyArr(d.key)
                    return (
                      <motion.div
                        key={d.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-lg border bg-card overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                          <div className="font-semibold flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {d.label}
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            {dates.length} {dates.length === 1 ? 'semana' : 'semanas'}
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {arr.map((slot, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="rounded-lg border bg-background p-3 space-y-3"
                            >
                              <div className="flex items-center justify-between pb-2 border-b">
                                <div className="text-sm font-medium">{dates[idx].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</div>
                                <div className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  Semana {idx + 1}
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-xs flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    Horário
                                  </Label>
                                  <Input
                                    type="time"
                                    value={slot.hora}
                                    onChange={(e) => updateMonthlySlot(d.key, idx, "hora", e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3" />
                                    Local
                                  </Label>
                                  <select
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                    value={slot.local}
                                    onChange={(e) => updateMonthlySlot(d.key, idx, "local", e.target.value)}
                                  >
                                    <option value="">Selecione</option>
                                    {approvedLocais.map((l) => (
                                      <option key={l} value={l}>{l}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1.5">
                                  <Users className="h-3 w-3" />
                                  Dirigente
                                </Label>
                                <LeaderCombo
                                  value={slot.dirigenteRegisterId}
                                  onChange={(id) => updateMonthlySlot(d.key, idx, "dirigenteRegisterId", id)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1.5">
                                  <Info className="h-3 w-3" />
                                  Observações
                                </Label>
                                <Input
                                  value={slot.observacoes || ""}
                                  onChange={(e) => updateMonthlySlot(d.key, idx, "observacoes", e.target.value)}
                                  placeholder="Informações adicionais..."
                                  className="h-9"
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.keys(monthly.porDiaSemanas || {}).map((dayKey) => {
                const d = DAYS.find((x) => x.key === dayKey)!
                const { arr, dates } = monthlyArr(d.key)
                return (
                  <motion.div
                    key={d.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border bg-card overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <div className="font-semibold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {d.label}
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {dates.length} {dates.length === 1 ? 'semana' : 'semanas'}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {arr.map((slot, idx) => (
                        <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                          <div className="text-sm font-medium pb-1.5 border-b">
                            {dates[idx].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{slot.hora || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{slot.local || "—"}</span>
                            </div>
                            {slot.dirigenteRegisterId && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{leaderById.get(slot.dirigenteRegisterId) || ""}</span>
                              </div>
                            )}
                            {slot.observacoes && (
                              <div className="flex items-center gap-2">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{slot.observacoes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}