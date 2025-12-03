"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, MapPin, Users, Info, Calendar as CalendarIcon, Wrench, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  getCongregationDoc,
  listRegisters,
  getPregacaoFixed,
  getPregacaoMonth,
  getMidweekAssignmentsMonth,
  getWeekendAssignmentsMonth,
  getCleaningAssignmentsMonth,
  getCarrinhoAssignmentsMonth,
  type PregacaoEntry,
  type PregacaoFixedDoc,
  type MidweekAssignMonthDoc,
  type WeekendAssignMonthDoc,
  type CleaningAssignMonthDoc,
  type CarrinhoAssignMonthDoc,
} from "@/lib/firebase"
import { designationLabels } from "@/types/register-labels"

type RegisterOpt = { id: string; nomeCompleto: string }

export default function PublicCongregacaoPage() {
  const params = useParams<{ congregacaoId: string; viewId: string }>()
  const [loading, setLoading] = React.useState(true)
  const [valid, setValid] = React.useState(false)
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth()+1).padStart(2, "0"); return `${y}-${m}`
  })
  const [meioDia, setMeioDia] = React.useState<string>("quarta")
  const [fimDia, setFimDia] = React.useState<string>("domingo")
  const [registers, setRegisters] = React.useState<RegisterOpt[]>([])
  const regById = React.useMemo(() => new Map(registers.map(r => [r.id, r.nomeCompleto])), [registers])
  const [selectedWeek, setSelectedWeek] = React.useState<string>("")
  const [selectPolicy, setSelectPolicy] = React.useState<'nearest'|'first'|'last'>('nearest')

  const [pregMonth, setPregMonth] = React.useState<{ porDiaSemanas?: Record<string, PregacaoEntry[]>; diasAtivos?: string[] }>({ porDiaSemanas: {}, diasAtivos: [] })
  const [pregFixed, setPregFixed] = React.useState<PregacaoFixedDoc>({ porDia: {}, diasAtivos: [] })
  const [midweeks, setMidweeks] = React.useState<Record<string, Record<string, string | undefined>>>({})
  const [weekends, setWeekends] = React.useState<Record<string, { [k: string]: string | undefined; discurso_publico_tema?: string; discurso_publico_cantico?: string; observacoes?: string }>>({})
  const [cleanWeeks, setCleanWeeks] = React.useState<Record<string, { midweek_families?: string[]; weekend_families?: string[]; observacoes?: string }>>({})
  const [carrinhos, setCarrinhos] = React.useState<Record<string, { slots?: { start: string; location?: string; participants?: string[]; observacoes?: string }[] }>>({})

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
          <Button variant="outline" className="h-8 px-3 text-xs justify-between w-36">
            <span className="truncate">{label}</span>
            <CalendarDays className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-[280px]" align="end">
          <div className="flex items-center justify-between mb-2">
            <Button variant="outline" size="sm" onClick={()=>setYear(year-1)} className="h-7 px-2">‹</Button>
            <div className="text-xs font-medium">{year}</div>
            <Button variant="outline" size="sm" onClick={()=>setYear(year+1)} className="h-7 px-2">›</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1
              const dt = new Date(year, i, 1)
              const short = dt.toLocaleDateString('pt-BR', { month: 'short' })
              const mid = `${year}-${String(m).padStart(2,'0')}`
              const selected = value === mid
              return (
                <Button key={i} variant={selected ? 'default' : 'outline'} className="h-8 text-xs" onClick={()=>{ setSelectPolicy('first'); onChange(mid); setOpen(false) }}>{short}</Button>
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
        const cid = params.congregacaoId
        const vid = params.viewId
        if (!cid || !vid) return
        const c = await getCongregationDoc(cid)
        if (!c || !c.assignmentsSharedOpen || !c.publicViewId || c.publicViewId !== vid) { setValid(false); return }
        setMeioDia(c.meioSemanaDia)
        setFimDia(c.fimSemanaDia)
        setValid(true)
        const regs = await listRegisters(cid)
        setRegisters(regs.map(r => ({ id: r.id, nomeCompleto: r.nomeCompleto })))
        const pf = await getPregacaoFixed(cid)
        setPregFixed(pf ?? { porDia: {}, diasAtivos: [] })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [params])

  React.useEffect(() => {
    const run = async () => {
      const cid = params.congregacaoId
      if (!cid || !valid) return
      const mid: MidweekAssignMonthDoc | null = await getMidweekAssignmentsMonth(cid, monthId)
      const wk: WeekendAssignMonthDoc | null = await getWeekendAssignmentsMonth(cid, monthId)
      const cl: CleaningAssignMonthDoc | null = await getCleaningAssignmentsMonth(cid, monthId)
      const car: CarrinhoAssignMonthDoc | null = await getCarrinhoAssignmentsMonth(cid, monthId)
      const pm = await getPregacaoMonth(cid, monthId)
      const normMid: Record<string, Record<string, string | undefined>> = {}
      if (mid?.weeks) Object.entries(mid.weeks).forEach(([k,v])=>{ normMid[String(k).replace(/-/g,'/')] = v as Record<string, string | undefined> })
      const normWk: Record<string, { [k: string]: string | undefined; discurso_publico_tema?: string; discurso_publico_cantico?: string; observacoes?: string }> = {}
      if (wk?.weeks) Object.entries(wk.weeks).forEach(([k,v])=>{ normWk[String(k).replace(/-/g,'/')] = v as { [k: string]: string | undefined; discurso_publico_tema?: string; discurso_publico_cantico?: string; observacoes?: string } })
      const normCl: Record<string, { midweek_families?: string[]; weekend_families?: string[]; observacoes?: string }> = {}
      if (cl?.weeks) Object.entries(cl.weeks).forEach(([k,v])=>{ normCl[String(k).replace(/-/g,'/')] = v })
      const normCar: Record<string, { slots?: { start: string; location?: string; participants?: string[]; observacoes?: string }[] }> = {}
      if (car?.weeks) Object.entries(car.weeks).forEach(([k,v])=>{ normCar[String(k).replace(/-/g,'/')] = v })
      setMidweeks(normMid); setWeekends(normWk); setCleanWeeks(normCl); setCarrinhos(normCar)
      setPregMonth({ porDiaSemanas: pm?.porDiaSemanas || {}, diasAtivos: pm?.diasAtivos || [] })
      let allWeeks = Array.from(new Set<string>([...Object.keys(normMid), ...Object.keys(normWk), ...Object.keys(normCl), ...Object.keys(normCar)])).sort((a,b)=>a.localeCompare(b))
      if (allWeeks.length === 0) {
        allWeeks = allWeeksForMonth(monthId)
      }
      if (allWeeks.length > 0) {
        if (selectPolicy === 'first') {
          setSelectedWeek(allWeeks[0])
        } else if (selectPolicy === 'last') {
          setSelectedWeek(allWeeks[allWeeks.length-1])
        } else {
          const today = new Date()
          const pick = nearestWeek(allWeeks, today)
          setSelectedWeek(pick || allWeeks[0])
        }
      } else {
        setSelectedWeek("")
      }
      setSelectPolicy('nearest')
    }
    run()
  }, [params, monthId, valid])

  const weekLabel = React.useCallback((wd: string) => {
    try { const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, d); return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) } catch { return wd }
  }, [])

  const toDate = React.useCallback((wd: string) => { try { const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); return new Date(y, m-1, d) } catch { return new Date() } }, [])
  const startOfWeek = React.useCallback((dt: Date) => {
    const day = dt.getDay() === 0 ? 7 : dt.getDay()
    const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - (day-1))
    start.setHours(0,0,0,0)
    return start
  }, [])
  const isSameWeek = React.useCallback((a: Date, b: Date) => startOfWeek(a).getTime() === startOfWeek(b).getTime(), [startOfWeek])
  const nearestWeek = React.useCallback((weeks: string[], today: Date) => {
    const ts = today.getTime()
    const sorted = weeks.slice().map(w=>({ w, t: toDate(w).getTime() })).sort((x,y)=>Math.abs(x.t-ts)-Math.abs(y.t-ts))
    return sorted[0]?.w || weeks[0]
  }, [toDate])

  const weekKeys = React.useMemo(() => Array.from(new Set<string>([...Object.keys(midweeks), ...Object.keys(weekends), ...Object.keys(cleanWeeks), ...Object.keys(carrinhos)])).sort((a,b)=>a.localeCompare(b)), [midweeks, weekends, cleanWeeks, carrinhos])
  const nextMonthId = React.useCallback((mid: string) => { const [y,m] = mid.split('-').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, 1); const nd = new Date(dt.getFullYear(), dt.getMonth()+1, 1); return `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}` }, [])
  const prevMonthId = React.useCallback((mid: string) => { const [y,m] = mid.split('-').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, 1); const pd = new Date(dt.getFullYear(), dt.getMonth()-1, 1); return `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}` }, [])
  const DAYS: { key: string; label: string }[] = [
    { key: "segunda", label: "Segunda-feira" },
    { key: "terça", label: "Terça-feira" },
    { key: "quarta", label: "Quarta-feira" },
    { key: "quinta", label: "Quinta-feira" },
    { key: "sexta", label: "Sexta-feira" },
    { key: "sábado", label: "Sábado" },
    { key: "domingo", label: "Domingo" },
  ]
  const dayIndex = React.useCallback((key: string) => ({ domingo: 0, segunda: 1, terça: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6 } as Record<string, number>)[key], [])
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
  }, [dayIndex])
  const formatYmdSlash = React.useCallback((dt: Date) => {
    const py = dt.getFullYear()
    const pm = String(dt.getMonth() + 1).padStart(2, '0')
    const pd = String(dt.getDate()).padStart(2, '0')
    return `${py}/${pm}/${pd}`
  }, [])
  
    const allWeeksForMonth = React.useCallback((mid: string) => {
    const set = new Set<string>()
    weekDatesForMonth(mid, meioDia).forEach(dt => set.add(formatYmdSlash(dt)))
    weekDatesForMonth(mid, fimDia).forEach(dt => set.add(formatYmdSlash(dt)))
    return Array.from(set).sort((a,b)=>a.localeCompare(b))
  }, [weekDatesForMonth, meioDia, fimDia, formatYmdSlash])
  
  const prevWeek = React.useCallback(() => {
    if (!selectedWeek) return
    const keys = weekKeys.length > 0 ? weekKeys : allWeeksForMonth(monthId)
    const idx = keys.findIndex(w => w === selectedWeek)
    if (idx <= 0) {
      const pm = prevMonthId(monthId)
      setSelectPolicy('last')
      setMonthId(pm)
      return
    }
    const target = keys[idx-1]
    if (!target) return
    setSelectedWeek(target)
  }, [selectedWeek, weekKeys, monthId, allWeeksForMonth, prevMonthId])
  const nextWeek = React.useCallback(() => {
    if (!selectedWeek) return
    const keys = weekKeys.length > 0 ? weekKeys : allWeeksForMonth(monthId)
    const idx = keys.findIndex(w => w === selectedWeek)
    if (idx >= keys.length-1) {
      const nm = nextMonthId(monthId)
      setSelectPolicy('first')
      setMonthId(nm)
      return
    }
    const target = keys[idx+1]
    if (!target) return
    setSelectedWeek(target)
  }, [selectedWeek, weekKeys, monthId, allWeeksForMonth, nextMonthId])


  const weeklyPregacaoSlots = React.useMemo(() => {
    if (!selectedWeek) return [] as { day: string; slots: PregacaoEntry[] }[]
    const refDate = toDate(selectedWeek)
    return DAYS.map(d => {
      const list = pregMonth.porDiaSemanas?.[d.key] || []
      const dates = weekDatesForMonth(monthId, d.key)
      const idx = dates.findIndex(dt => isSameWeek(dt, refDate))
      let slots: PregacaoEntry[] = []
      if (idx >= 0 && list[idx] && (list[idx].hora || list[idx].local || list[idx].dirigenteRegisterId || list[idx].observacoes)) {
        slots = [list[idx]]
      } else if ((pregFixed.diasAtivos || []).includes(d.key)) {
        slots = (pregFixed.porDia && pregFixed.porDia[d.key]) ? pregFixed.porDia[d.key] : []
      }
      return { day: d.label, slots }
    }).filter(x => x.slots.length > 0)
  }, [selectedWeek, pregMonth, pregFixed, monthId, weekDatesForMonth, isSameWeek])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
    )
  }

  if (!valid) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-2xl font-bold">Link inválido ou desativado</h1>
          <p className="text-sm text-muted-foreground">Peça ao responsável pela congregação para gerar um novo link público.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" /> Programações da Congregação</h1>
          <p className="text-sm text-muted-foreground">Visualização pública por mês</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Label htmlFor="monthId" className="text-xs whitespace-nowrap">Mês:</Label>
          <MonthCombo value={monthId} onChange={setMonthId} />
          <div className="ml-2 flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-xs font-medium min-w-[8rem] sm:min-w-[10rem] text-center truncate">{selectedWeek ? weekLabel(selectedWeek) : "Semanas"}</div>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </motion.div>

      <Separator />

      <Tabs defaultValue="campo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campo">Programação de Campo</TabsTrigger>
          <TabsTrigger value="reuniao">Reunião</TabsTrigger>
          <TabsTrigger value="limpeza">Limpeza</TabsTrigger>
        </TabsList>

        <TabsContent value="campo" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Pregação</div>
            </div>
            <div className="p-3 sm:p-4">
              {weeklyPregacaoSlots.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma programação cadastrada para esta semana</div>
              ) : (
                <div className="grid gap-3">
                  {weeklyPregacaoSlots.map(({ day, slots }, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="text-sm font-medium">{day}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {slots.map((slot, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{slot.hora} — {slot.local}</div>
                            </div>
                            <div className="mt-1 space-y-1">
                              {slot.dirigenteRegisterId ? (
                                <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{regById.get(slot.dirigenteRegisterId) || ""}</span></div>
                              ) : null}
                              {slot.observacoes ? (
                                <div className="flex items-center gap-2"><Info className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{slot.observacoes}</span></div>
                              ) : null}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Carrinho</div>
            </div>
            <div className="p-3 sm:p-4">
              {selectedWeek && carrinhos[selectedWeek] ? (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{weekLabel(selectedWeek)}</div>
                  <div className="mt-2 space-y-2">
                    {Array.isArray(carrinhos[selectedWeek].slots) && carrinhos[selectedWeek].slots!.length > 0 ? carrinhos[selectedWeek].slots!.map((s, i: number) => (
                      <div key={i} className="rounded-md border p-2">
                        <div className="flex items-center justify-between"><div>{s.start} — {s.location || ""}</div></div>
                        <div className="text-xs text-muted-foreground">Participantes: {(s.participants||[]).map((id: string) => regById.get(id) || id).join(', ') || '—'}</div>
                        {s.observacoes ? (<div className="text-xs text-muted-foreground">Obs.: {s.observacoes}</div>) : null}
                      </div>
                    )) : (<div className="text-xs text-muted-foreground">Sem slots</div>)}
                  </div>
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma programação de carrinho neste mês</div>
              )}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="reuniao" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Meio de semana — {meioDia}</div>
            </div>
            <div className="p-3 sm:p-4">
              {selectedWeek && midweeks[selectedWeek] ? (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{weekLabel(selectedWeek)}</div>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(midweeks[selectedWeek]).filter(([k]) => k!=="week_type").map(([k, v]) => (
                      <li key={k} className="flex items-center gap-2">• <span>{designationLabels[k] || k}:</span> <span className="text-muted-foreground">{typeof v === 'string' ? (regById.get(v) || v) : ''}</span></li>
                    ))}
                  </ul>
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma designação neste mês</div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Fim de semana — {fimDia}</div>
            </div>
            <div className="p-3 sm:p-4">
              {selectedWeek && weekends[selectedWeek] ? (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{weekLabel(selectedWeek)}</div>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(weekends[selectedWeek]).map(([k, v]) => {
                      if (k === 'discurso_publico_tema' || k === 'discurso_publico_cantico' || k === 'observacoes') {
                        return (<li key={k} className="flex items-center gap-2">• <span>{designationLabels[k] || k}:</span> <span className="text-muted-foreground">{String(v||'')}</span></li>)
                      }
                      const name = typeof v === 'string' ? (regById.get(v) || v) : ''
                      return (<li key={k} className="flex items-center gap-2">• <span>{designationLabels[k] || k}:</span> <span className="text-muted-foreground">{name}</span></li>)
                    })}
                  </ul>
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma designação neste mês</div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Mecânicas</div>
            </div>
            <div className="p-3 sm:p-4">
              {selectedWeek && weekends[selectedWeek] ? (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{weekLabel(selectedWeek)}</div>
                  <ul className="mt-2 space-y-1">
                    {['audio_video','volante','palco','indicador_porta','indicador_palco'].map((k) => (
                      <li key={k} className="flex items-center gap-2">• <span>{designationLabels[k] || k}:</span> <span className="text-muted-foreground">{weekends[selectedWeek] && weekends[selectedWeek]![k] ? (regById.get(weekends[selectedWeek]![k]!) || weekends[selectedWeek]![k]!) : '—'}</span></li>
                    ))}
                  </ul>
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma mecânica cadastrada nesta semana</div>
              )}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="limpeza" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Limpeza — {meioDia} e {fimDia}</div>
            </div>
            <div className="p-4">
              {selectedWeek && cleanWeeks[selectedWeek] ? (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{weekLabel(selectedWeek)}</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium">Meio de semana</div>
                      <div className="text-xs text-muted-foreground">{Array.isArray(cleanWeeks[selectedWeek].midweek_families) && cleanWeeks[selectedWeek].midweek_families!.length > 0 ? cleanWeeks[selectedWeek].midweek_families!.map((id: string) => regById.get(id) || id).join(', ') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium">Fim de semana</div>
                      <div className="text-xs text-muted-foreground">{Array.isArray(cleanWeeks[selectedWeek].weekend_families) && cleanWeeks[selectedWeek].weekend_families!.length > 0 ? cleanWeeks[selectedWeek].weekend_families!.map((id: string) => regById.get(id) || id).join(', ') : '—'}</div>
                    </div>
                  </div>
                  {cleanWeeks[selectedWeek].observacoes ? (<div className="mt-2 text-xs text-muted-foreground">Obs.: {cleanWeeks[selectedWeek].observacoes}</div>) : null}
                </motion.div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma programação de limpeza neste mês</div>
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
