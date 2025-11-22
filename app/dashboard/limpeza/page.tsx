"use client"
import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import { WashingMachine, CalendarDays, ChevronsUpDown, WashingMachineIcon } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { getUserDoc, getCongregationDoc, listFamilies, getMidweekAssignmentsMonth, getWeekendAssignmentsMonth, updateCleaningAssignmentsWeek, getCleaningAssignmentsMonth } from "@/lib/firebase"

type FamilyOpt = { id: string; nome?: string }
type MidAssign = Record<string, { week_type?: 'normal' | 'visita_superintendente' | 'congresso' | 'assembleia' | 'celebracao' | 'sem_reuniao' }>
type WkAssign = Record<string, any>
type CleanWeek = { midweek_families?: string[]; weekend_families?: string[]; observacoes?: string }

function useLimpeza() {
  const { user } = useAuth()
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth()+1).padStart(2, "0"); return `${y}-${m}`
  })
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [meioDia, setMeioDia] = React.useState<string>("quarta")
  const [fimDia, setFimDia] = React.useState<string>("domingo")
  const [families, setFamilies] = React.useState<FamilyOpt[]>([])
  const [midAssign, setMidAssign] = React.useState<MidAssign>({})
  const [wkAssign, setWkAssign] = React.useState<WkAssign>({})
  const [cleanWeeks, setCleanWeeks] = React.useState<Record<string, CleanWeek>>({})
  const [loading, setLoading] = React.useState<boolean>(true)
  const saveTimers = React.useRef<Map<string, any>>(new Map())

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const uid = user?.uid; if (!uid) return
        const u = await getUserDoc(uid); if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        if (c?.meioSemanaDia) setMeioDia(c.meioSemanaDia)
        if (c?.fimSemanaDia) setFimDia(c.fimSemanaDia)
        const fams = await listFamilies(u.congregacaoId)
        setFamilies(fams.map(f => ({ id: f.id, nome: f.nome || "" })))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  React.useEffect(() => {
    const run = async () => {
      try {
        if (!congregacaoId) return
        const mid = await getMidweekAssignmentsMonth(congregacaoId, monthId)
        const wk = await getWeekendAssignmentsMonth(congregacaoId, monthId)
        const cl = await getCleaningAssignmentsMonth(congregacaoId, monthId)
        const normMid: MidAssign = {}
        if (mid?.weeks) Object.entries(mid.weeks as any).forEach(([k,v])=>{ normMid[k.replace(/-/g,'/')] = v as any })
        const normWk: WkAssign = {}
        if (wk?.weeks) Object.entries(wk.weeks as any).forEach(([k,v])=>{ normWk[k.replace(/-/g,'/')] = v as any })
        const normCl: Record<string, CleanWeek> = {}
        if (cl?.weeks) Object.entries(cl.weeks as any).forEach(([k,v])=>{ normCl[k.replace(/-/g,'/')] = v as any })
        setMidAssign(normMid); setWkAssign(normWk); setCleanWeeks(normCl)
      } catch (e: any) {
        const msg = (e && (e.message || e.toString())) || 'Falha ao carregar designações'
        toast.error(msg)
        setMidAssign({}); setWkAssign({}); setCleanWeeks({})
      }
    }
    run()
  }, [congregacaoId, monthId])

  const scheduleSave = React.useCallback(async (wd: string, data: CleanWeek) => {
    try {
      const t = saveTimers.current.get(wd); if (t) { clearTimeout(t); saveTimers.current.delete(wd) }
      const h = setTimeout(async () => {
        try {
          if (congregacaoId) {
            await updateCleaningAssignmentsWeek(congregacaoId, monthId, wd, data)
            const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, d)
            const when = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
            toast.success(`Limpeza salva — ${when}`)
          }
        } catch (e: any) { toast.error((e && (e.message||e.toString())) || 'Falha ao salvar') }
      }, 600)
      saveTimers.current.set(wd, h)
    } catch {}
  }, [congregacaoId, monthId])

  const updateClean = React.useCallback((wd: string, kind: 'mid'|'wk', familiesIds: string[]) => {
    setCleanWeeks(curr => {
      const prev = curr[wd] || {}
      const next: CleanWeek = { ...prev, [kind === 'mid' ? 'midweek_families' : 'weekend_families']: familiesIds }
      const all = { ...curr, [wd]: next }
      scheduleSave(wd, next)
      return all
    })
  }, [scheduleSave])

  return { monthId, setMonthId, meioDia, fimDia, families, midAssign, wkAssign, cleanWeeks, updateClean, loading }
}

function FamiliesCombo({ families, values, onChange, disabled }: { families: FamilyOpt[]; values?: string[]; onChange: (vals: string[]) => void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const display = React.useMemo(() => {
    const names = (values || []).map(v => families.find(f => f.id === v)?.nome || '').filter(Boolean)
    return names.length > 0 ? names.join(', ') : 'Selecionar família(s)'
  }, [values, families])
  const toggle = (id: string) => {
    const set = new Set(values || [])
    if (set.has(id)) set.delete(id); else set.add(id)
    const list = Array.from(set).slice(0, 2)
    onChange(list)
  }
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between w-full h-9 px-2 text-sm ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
          <span className="truncate text-left flex-1">{display}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar família" className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhuma família</CommandEmpty>
            <CommandGroup>
              {families.map(f => (
                <CommandItem key={f.id} value={f.nome || f.id} onSelect={() => toggle(f.id)} className="text-sm">
                  {f.nome || f.id}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function weekDatesForMonth(monthId: string, dayName: string) {
  const [y, m] = monthId.split('-').map(x => parseInt(x, 10))
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const idx = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"].indexOf(dayName)
  const out: string[] = []
  for (let d = new Date(first); d <= last; d = new Date(y, m - 1, d.getDate() + 1)) {
    if (d.getDay() === (idx === -1 ? 0 : idx)) {
      out.push(`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`)
    }
  }
  return out
}

export default function LimpezaPage() {
  const { monthId, setMonthId, meioDia, fimDia, families, midAssign, wkAssign, cleanWeeks, updateClean, loading } = useLimpeza()
  const [editing, setEditing] = React.useState(false)

  const midDates = React.useMemo(() => weekDatesForMonth(monthId, meioDia), [monthId, meioDia])
  const wkDates = React.useMemo(() => weekDatesForMonth(monthId, fimDia), [monthId, fimDia])

  const skipMid = React.useCallback((wd: string) => {
    const t = midAssign[wd]?.week_type
    return t === 'congresso' || t === 'assembleia' || t === 'sem_reuniao'
  }, [midAssign])

  const skipWk = React.useCallback((wd: string) => {
    const t = (wkAssign[wd] && wkAssign[wd].week_type) as any
    return t === 'congresso' || t === 'assembleia' || t === 'sem_reuniao'
  }, [wkAssign])

  const autoGenerate = React.useCallback(() => {
    if (families.length === 0) { toast.error('Nenhuma família cadastrada'); return }
    const two = families.length >= 2
    const nextIds = families.map(f => f.id)
    let midIdx = 0, wkIdx = 0
    const makePick = (idx: number) => two ? [nextIds[idx % nextIds.length], nextIds[(idx+1) % nextIds.length]] : [nextIds[idx % nextIds.length]]
    const updates: Record<string, CleanWeek> = { ...cleanWeeks }
    midDates.forEach((wd) => {
      if (skipMid(wd)) return
      updates[wd] = { ...(updates[wd] || {}), midweek_families: makePick(midIdx) }
      midIdx += two ? 2 : 1
    })
    wkDates.forEach((wd) => {
      if (skipWk(wd)) return
      updates[wd] = { ...(updates[wd] || {}), weekend_families: makePick(wkIdx) }
      wkIdx += two ? 2 : 1
    })
    Object.entries(updates).forEach(([wd, data]) => { updateClean(wd, 'mid', data.midweek_families || []); updateClean(wd, 'wk', data.weekend_families || []) })
    toast.success('Programação de limpeza gerada')
  }, [families, cleanWeeks, midDates, wkDates, skipMid, skipWk, updateClean])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <WashingMachine className="h-5 w-5 text-primary" />
            Limpeza do Salão
          </h1>
          <p className="text-sm text-muted-foreground">Antes das reuniões de meio e fim de semana</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="monthId" className="text-sm whitespace-nowrap">Selecionar mês:</Label>
            <Input id="monthId" type="month" value={monthId} onChange={(e) => setMonthId(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => { const next = !editing; setEditing(next); toast.message(next ? 'Modo edição ativado' : 'Modo edição desativado') }} variant={editing ? 'default' : 'outline'} className="h-9">
            {editing ? 'Concluir edição' : 'Editar'}
          </Button>
          <Button onClick={autoGenerate} variant="outline" className="h-9">Gerar programação</Button>
        </div>
      </div>

      <Separator />

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Carregando famílias e designações...
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Antes da reunião de meio de semana
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{meioDia}</span>
          </div>
          {midDates.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8 rounded-lg bg-muted/30 border-2 border-dashed">Sem semanas calculadas</div>
          ) : (
            <div className="space-y-3">
              {midDates.map((wd, idx) => {
                const dt = (() => { const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const base = new Date(y, m-1, d); return base.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) })()
                const data = cleanWeeks[wd] || {}
                const fams = data.midweek_families || []
                const disabled = !editing || skipMid(wd)
                return (
                  <motion.div key={`mid-${wd}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="text-sm font-semibold">{dt}</div>
                    {skipMid(wd) && <div className="text-xs text-muted-foreground">Semana especial — sem limpeza</div>}
                    <FamiliesCombo families={families} values={fams} disabled={disabled} onChange={(vals)=>updateClean(wd,'mid',vals)} />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Antes da reunião de fim de semana
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{fimDia}</span>
          </div>
          {wkDates.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8 rounded-lg bg-muted/30 border-2 border-dashed">Sem semanas calculadas</div>
          ) : (
            <div className="space-y-3">
              {wkDates.map((wd, idx) => {
                const dt = (() => { const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const base = new Date(y, m-1, d); return base.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) })()
                const data = cleanWeeks[wd] || {}
                const fams = data.weekend_families || []
                const disabled = !editing || skipWk(wd)
                return (
                  <motion.div key={`wk-${wd}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="text-sm font-semibold">{dt}</div>
                    {skipWk(wd) && <div className="text-xs text-muted-foreground">Semana especial — sem limpeza</div>}
                    <FamiliesCombo families={families} values={fams} disabled={disabled} onChange={(vals)=>updateClean(wd,'wk',vals)} />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}