"use client"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import { CalendarDays, ChevronsUpDown, Wrench, AudioLines, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { designationLabels } from "@/types/register-labels"
import {
  getUserDoc,
  getCongregationDoc,
  listRegisters,
  getMidweekAssignmentsMonth,
  updateMidweekAssignmentsWeek,
  getWeekendAssignmentsMonth,
  updateWeekendAssignmentsWeek,
} from "@/lib/firebase"

type RegisterOpt = { id: string; nomeCompleto: string; designacoesAprovadas?: string[] }
type Mid = Record<string, any>
type Wk = Record<string, any>

function useMecanicas() {
  const { user } = useAuth()
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [fimDia, setFimDia] = React.useState<string>("domingo")
  const [meioDia, setMeioDia] = React.useState<string>("quarta")
  const [registers, setRegisters] = React.useState<RegisterOpt[]>([])
  const [midweeks, setMidweeks] = React.useState<Mid>({})
  const [weekends, setWeekends] = React.useState<Wk>({})
  const [loading, setLoading] = React.useState<boolean>(false)
  const midRef = React.useRef(midweeks)
  const wkRef = React.useRef(weekends)
  React.useEffect(() => { midRef.current = midweeks }, [midweeks])
  React.useEffect(() => { wkRef.current = weekends }, [weekends])
  const midSaveTimers = React.useRef<Map<string, any>>(new Map())
  const wkSaveTimers = React.useRef<Map<string, any>>(new Map())

  React.useEffect(() => {
    const run = async () => {
      const uid = user?.uid
      if (!uid) return
      const u = await getUserDoc(uid)
      if (!u?.congregacaoId) return
      setCongregacaoId(u.congregacaoId)
      const c = await getCongregationDoc(u.congregacaoId)
      if (c?.fimSemanaDia) setFimDia(c.fimSemanaDia)
      if (c?.meioSemanaDia) setMeioDia(c.meioSemanaDia)
      const regs = await listRegisters(u.congregacaoId)
      setRegisters(regs.map(r => ({ id: r.id, nomeCompleto: r.nomeCompleto, designacoesAprovadas: r.designacoesAprovadas || [] })))
    }
    run()
  }, [user])

  React.useEffect(() => {
    const run = async () => {
      if (!congregacaoId) return
      setLoading(true)
      const mid = await getMidweekAssignmentsMonth(congregacaoId, monthId)
      if (mid?.weeks) {
        const m: Mid = {}
        Object.entries(mid.weeks).forEach(([k,v]) => { m[k.replace(/-/g,'/')] = v })
        setMidweeks(m)
      } else setMidweeks({})

      const wk = await getWeekendAssignmentsMonth(congregacaoId, monthId)
      if (wk?.weeks) {
        const w: Wk = {}
        Object.entries(wk.weeks).forEach(([k,v]) => { w[k.replace(/-/g,'/')] = v })
        setWeekends(w)
      } else setWeekends({})
      setLoading(false)
    }
    run()
  }, [congregacaoId, monthId])

  const updateMid = React.useCallback((wd: string, field: string, value?: string) => {
    setMidweeks(curr => {
      const nextWeek = { ...(curr[wd] || {}), [field]: value }
      const next = { ...curr, [wd]: nextWeek }
      midRef.current = next
      try {
        const t = midSaveTimers.current.get(wd); if (t) { clearTimeout(t); midSaveTimers.current.delete(wd) }
        const h = setTimeout(async () => {
          if (!congregacaoId) return
          try {
            await updateMidweekAssignmentsWeek(congregacaoId, monthId, wd, nextWeek)
            const lbl = (designationLabels as any)[field] || field
            const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, d)
            const when = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
            toast.success(`${lbl} salvo — ${when}`)
          } catch (e: any) {
            const msg = (e && (e.message || e.toString())) || 'Falha ao salvar designação'
            toast.error(msg)
          }
        }, 600)
        midSaveTimers.current.set(wd, h)
      } catch {}
      return next
    })
  }, [congregacaoId, monthId])

  const updateWk = React.useCallback((wd: string, field: string, value?: string) => {
    setWeekends(curr => {
      const nextWeek = { ...(curr[wd] || {}), [field]: value }
      const next = { ...curr, [wd]: nextWeek }
      wkRef.current = next
      try {
        const t = wkSaveTimers.current.get(wd); if (t) { clearTimeout(t); wkSaveTimers.current.delete(wd) }
        const h = setTimeout(async () => {
          if (!congregacaoId) return
          try {
            await updateWeekendAssignmentsWeek(congregacaoId, monthId, wd, nextWeek)
            const lbl = (designationLabels as any)[field] || field
            const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, d)
            const when = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
            toast.success(`${lbl} salvo — ${when}`)
          } catch (e: any) {
            const msg = (e && (e.message || e.toString())) || 'Falha ao salvar designação'
            toast.error(msg)
          }
        }, 600)
        wkSaveTimers.current.set(wd, h)
      } catch {}
      return next
    })
  }, [congregacaoId, monthId])

  return { monthId, setMonthId, fimDia, meioDia, registers, midweeks, weekends, updateMid, updateWk, loading }
}

function RegistersCombo({ registers, value, onChange, filter, placeholder = "Selecionar...", disabled }: { registers: RegisterOpt[]; value?: string; onChange: (id?: string) => void; filter?: (r: RegisterOpt) => boolean; placeholder?: string; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const label = React.useMemo(() => {
    const r = registers.find(x => x.id === value)
    return r ? r.nomeCompleto : placeholder
  }, [registers, value, placeholder])
  const list = React.useMemo(() => (filter ? registers.filter(filter) : registers), [registers, filter])
  return (
    <Popover open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open && !disabled} className={`justify-between w-full h-9 px-2 text-sm ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
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

function WeekCard({ label, dateStr, registers, data, onChange, editable }: { label: string; dateStr: string; registers: RegisterOpt[]; data?: Record<string, any>; onChange: (field: string, value?: string) => void; editable?: boolean }) {
  const has = (k: string) => (r: RegisterOpt) => (r.designacoesAprovadas || []).includes(k)
  const nameOf = (id?: string) => {
    if (!id) return undefined
    const f = registers.find(r => r.id === id)
    return f?.nomeCompleto
  }
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="font-semibold text-sm">{label}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{designationLabels.audio_video}</Label>
          {editable ? (
            <RegistersCombo registers={registers} value={data?.audio_video} onChange={(id) => onChange('audio_video', id)} filter={has('audio_video')} />
          ) : (
            <div className="h-9 flex items-center px-2 text-sm rounded-md border bg-background">{nameOf(data?.audio_video) || '—'}</div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{designationLabels.volante}</Label>
          {editable ? (
            <RegistersCombo registers={registers} value={data?.volante} onChange={(id) => onChange('volante', id)} filter={has('volante')} />
          ) : (
            <div className="h-9 flex items-center px-2 text-sm rounded-md border bg-background">{nameOf(data?.volante) || '—'}</div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{designationLabels.palco}</Label>
          {editable ? (
            <RegistersCombo registers={registers} value={data?.palco} onChange={(id) => onChange('palco', id)} filter={has('palco')} />
          ) : (
            <div className="h-9 flex items-center px-2 text-sm rounded-md border bg-background">{nameOf(data?.palco) || '—'}</div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{designationLabels.indicador_porta}</Label>
          {editable ? (
            <RegistersCombo registers={registers} value={data?.indicador_porta} onChange={(id) => onChange('indicador_porta', id)} filter={has('indicador_porta')} />
          ) : (
            <div className="h-9 flex items-center px-2 text-sm rounded-md border bg-background">{nameOf(data?.indicador_porta) || '—'}</div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{designationLabels.indicador_palco}</Label>
          {editable ? (
            <RegistersCombo registers={registers} value={data?.indicador_palco} onChange={(id) => onChange('indicador_palco', id)} filter={has('indicador_palco')} />
          ) : (
            <div className="h-9 flex items-center px-2 text-sm rounded-md border bg-background">{nameOf(data?.indicador_palco) || '—'}</div>
          )}
        </div>
      </div>
    </div>
  )
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

export default function MecanicasPage() {
  const { monthId, setMonthId, fimDia, meioDia, registers, midweeks, weekends, updateMid, updateWk, loading } = useMecanicas()
  const weekendWeeks = useWeekendWeeks(monthId, fimDia)
  const [editing, setEditing] = React.useState(false)

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col p-4 sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Mecânicas das Reuniões
          </h1>
          <p className="text-sm text-muted-foreground">Volante, palco, indicadores e áudio/vídeo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="monthId" className="text-sm whitespace-nowrap">Selecionar mês:</Label>
            <MonthCombo value={monthId} onChange={setMonthId} />
          </div>
          <Button onClick={() => { const next = !editing; setEditing(next); toast.message(next ? 'Modo edição ativado' : 'Modo edição desativado') }} variant={editing ? 'default' : 'outline'} className="h-9">
            {editing ? 'Concluir edição' : 'Editar'}
          </Button>
        </div>
      </div>

      <Separator />

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Carregando designações...
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <AudioLines className="h-4 w-4 text-primary" />
            Meio de Semana
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{meioDia}</span>
          </div>
          {Object.keys(midweeks).length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8 rounded-lg bg-muted/30 border-2 border-dashed">
              Sem designações salvas neste mês
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(midweeks).map(([wd, data], idx) => (
                <motion.div key={`mid-${wd}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <WeekCard label={(() => { const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const base = new Date(y, m-1, d); const idxMap: Record<string, number> = { domingo: 0, segunda: 1, terça: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6 }; const target = idxMap[meioDia] ?? base.getDay(); const diff = target - base.getDay(); const meet = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff); return meet.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) })()} dateStr={wd} registers={registers} data={data as any} onChange={(f,v)=>updateMid(wd,f,v)} editable={editing} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Fim de Semana
          </div>
          {weekendWeeks.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8 rounded-lg bg-muted/30 border-2 border-dashed">
              Sem semanas calculadas para este mês
            </div>
          ) : (
            <div className="space-y-3">
              {weekendWeeks.map((w, idx) => (
                <motion.div key={`wk-${w.dateStr}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <WeekCard label={w.label} dateStr={w.dateStr} registers={registers} data={weekends[w.dateStr] as any} onChange={(f,v)=>updateWk(w.dateStr,f,v)} editable={editing} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}