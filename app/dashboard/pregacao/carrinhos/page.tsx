"use client"
import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import { CalendarDays, CalendarClock, Users, MapPin, Repeat, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { getUserDoc, getCongregationDoc, listRegisters, getCarrinhoAssignmentsMonth, updateCarrinhoAssignmentsWeek, getRegisterDoc, type CarrinhoSlot, type CarrinhoAssignWeek } from "@/lib/firebase"

type RegOpt = { id: string; nome: string }

function formatYmdSlash(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}/${m}/${day}`
}

function listSameWeekdayDates(monthId: string, base: Date) {
  const [y, m] = monthId.split("-").map((x)=>parseInt(x,10))
  const start = new Date(y, m-1, 1)
  const end = new Date(y, m, 0)
  const w = base.getDay()
  const out: string[] = []
  let cur = new Date(start)
  while (cur <= end) {
    if (cur.getDay() === w) out.push(formatYmdSlash(cur))
    cur.setDate(cur.getDate()+1)
  }
  return out
}

function useCarrinhos() {
  const { user } = useAuth()
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth()+1).padStart(2, "0"); return `${y}-${m}`
  })
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [locations, setLocations] = React.useState<string[]>([])
  const [registers, setRegisters] = React.useState<RegOpt[]>([])
  const [weeks, setWeeks] = React.useState<Record<string, CarrinhoAssignWeek>>({})
  const [loading, setLoading] = React.useState<boolean>(true)
  const [canEdit, setCanEdit] = React.useState<boolean>(false)

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const uid = user?.uid; if (!uid) return
        const u = await getUserDoc(uid); if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        setLocations(c?.locaisCarrinhoAprovados || [])
        const regs = await listRegisters(u.congregacaoId)
        const opts = regs.filter(r => r.status === 'publicador_batizado').map(r => ({ id: r.id, nome: r.nomeCompleto }))
        setRegisters(opts)
        try {
          if (u.registerId) {
            const reg = await getRegisterDoc(u.congregacaoId, u.registerId)
            const responsabilidades = reg?.responsabilidades || []
            const priv = reg?.privilegioServico || null
            const allowed = priv === 'anciao' || responsabilidades.includes('coordenador') || responsabilidades.includes('servo_limpeza')
            setCanEdit(allowed)
          } else {
            setCanEdit(false)
          }
        } catch {
          setCanEdit(false)
        }
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
        const doc = await getCarrinhoAssignmentsMonth(congregacaoId, monthId)
        const norm: Record<string, CarrinhoAssignWeek> = {}
        if (doc?.weeks) Object.entries(doc.weeks as any).forEach(([k,v])=>{ norm[k.replace(/-/g,'/')] = v as any })
        setWeeks(norm)
      } catch (e: any) {
        toast.error((e && (e.message||e.toString())) || 'Falha ao carregar')
        setWeeks({})
      }
    }
    run()
  }, [congregacaoId, monthId])

  const saveWeek = React.useCallback(async (wd: string, data: CarrinhoAssignWeek) => {
    try {
      if (!congregacaoId) return
      await updateCarrinhoAssignmentsWeek(congregacaoId, monthId, wd, data)
      const [y,m,d] = wd.split('/').map(x=>parseInt(x,10)); const dt = new Date(y, m-1, d)
      const when = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
      toast.success(`Carrinhos salvos — ${when}`)
    } catch (e: any) {
      toast.error((e && (e.message||e.toString())) || 'Falha ao salvar')
    }
  }, [congregacaoId, monthId])

  return { monthId, setMonthId, congregacaoId, locations, registers, weeks, setWeeks, saveWeek, loading, canEdit }
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
        <Button variant="outline" className="h-8 px-3 text-xs justify-between w-36">
          <span className="truncate">{label}</span>
          <CalendarDays className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-[280px]" align="end">
        <div className="flex items-center justify-between mb-2">
          <Button variant="outline" size="sm" onClick={()=>setYear(year-1)} className="h-7 px-2"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-xs font-medium">{year}</div>
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

function SelectLocation({ locations, value, onChange, disabled }: { locations: string[]; value?: string; onChange: (v: string)=>void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const display = value || 'Selecionar local'
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {display}
          <CalendarClock className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar local" />
          <CommandList>
            <CommandEmpty>Nenhum local</CommandEmpty>
            <CommandGroup>
              {locations.map((loc) => (
                <CommandItem key={loc} value={loc} onSelect={(val)=>{ onChange(val); setOpen(false) }}>{loc}</CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function SelectRegisters({ registers, values, onChange, disabled }: { registers: RegOpt[]; values?: string[]; onChange: (vals: string[])=>void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const display = React.useMemo(() => {
    const names = (values || []).map(v => registers.find(r => r.id === v)?.nome || '').filter(Boolean)
    return names.length > 0 ? names.join(', ') : 'Selecionar participantes'
  }, [values, registers])
  const toggle = (id: string) => {
    const set = new Set(values || [])
    if (set.has(id)) set.delete(id); else set.add(id)
    const list = Array.from(set).slice(0, 3)
    onChange(list)
  }
  return (
    <Popover open={open && !disabled} onOpenChange={(o)=>!disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {display}
          <Users className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar participantes" />
          <CommandList>
            <CommandEmpty>Nenhum participante</CommandEmpty>
            <CommandGroup>
              {registers.map((r) => (
                <CommandItem key={r.id} value={r.nome} onSelect={()=>{ toggle(r.id) }}>
                  {r.nome}
                  <span className={"ml-auto text-xs " + ((values||[]).includes(r.id) ? "opacity-100" : "opacity-40")}>máx. 3</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function CarrinhosPage() {
  const { monthId, setMonthId, locations, registers, weeks, setWeeks, saveWeek, loading, canEdit } = useCarrinhos()
  const [editing, setEditing] = React.useState<boolean>(false)
  const [date, setDate] = React.useState<string>("")
  const [start, setStart] = React.useState<string>("09:00")
  const [duration, setDuration] = React.useState<number>(120)
  const [location, setLocation] = React.useState<string>("")
  const [participants, setParticipants] = React.useState<string[]>([])
  const [fixed, setFixed] = React.useState<boolean>(false)
  const [repeatMonthly, setRepeatMonthly] = React.useState<boolean>(false)

  const disabled = loading || !editing || !canEdit

  const handleAdd = React.useCallback(async () => {
    if (!canEdit) { toast.error('Sem permissão para editar'); return }
    if (!date) { toast.error('Selecione uma data'); return }
    if (!location) { toast.error('Selecione o local'); return }
    if ((participants || []).length < 2) { toast.error('Selecione no mínimo dois participantes batizados'); return }
    const d = new Date(date)
    const wd = formatYmdSlash(d)
    const slot: CarrinhoSlot = { start, durationMinutes: duration, location, participants, fixed }
    const applyTo: string[] = repeatMonthly ? listSameWeekdayDates(monthId, d) : [wd]
    const nextWeeks: Record<string, CarrinhoAssignWeek> = { ...weeks }
    applyTo.forEach((key) => {
      const prev = nextWeeks[key] || {}
      const list = Array.isArray(prev.slots) ? prev.slots.slice() : []
      list.push(slot)
      nextWeeks[key] = { ...prev, slots: list }
    })
    setWeeks(nextWeeks)
    await Promise.all(applyTo.map(async (k)=>{ await saveWeek(k, nextWeeks[k]) }))
    setParticipants([])
    toast.success('Slot adicionado')
  }, [canEdit, date, start, duration, location, participants, fixed, repeatMonthly, monthId, weeks, setWeeks, saveWeek])

  const monthSlots = React.useMemo(() => {
    const out: { wd: string; slots: CarrinhoSlot[] }[] = []
    Object.entries(weeks).forEach(([wd, w]) => {
      const [y,m] = wd.split('/'); const mid = `${y}-${m}`
      if (mid === monthId) out.push({ wd, slots: w.slots || [] })
    })
    return out.sort((a,b)=>{
      const pa = a.wd.split('/').map(x=>parseInt(x,10)); const pb = b.wd.split('/').map(x=>parseInt(x,10))
      const ta = new Date(pa[0], pa[1]-1, pa[2]).getTime()
      const tb = new Date(pb[0], pb[1]-1, pb[2]).getTime()
      return ta - tb
    })
  }, [weeks, monthId])

  const updateSlot = React.useCallback((wd: string, idx: number, patch: Partial<CarrinhoSlot>) => {
    if (!canEdit) { toast.error('Sem permissão para editar'); return }
    setWeeks((curr) => {
      const w = curr[wd] || {}
      const list = Array.isArray(w.slots) ? w.slots.slice() : []
      list[idx] = { ...(list[idx] || {}), ...patch }
      const nextWeek: CarrinhoAssignWeek = { ...w, slots: list }
      const next = { ...curr, [wd]: nextWeek }
      saveWeek(wd, nextWeek)
      return next
    })
  }, [setWeeks, saveWeek, canEdit])

  const removeSlot = React.useCallback((wd: string, idx: number) => {
    if (!canEdit) { toast.error('Sem permissão para editar'); return }
    setWeeks((curr) => {
      const w = curr[wd] || {}
      const list = Array.isArray(w.slots) ? w.slots.slice() : []
      list.splice(idx, 1)
      const nextWeek: CarrinhoAssignWeek = { ...w, slots: list }
      const next = { ...curr, [wd]: nextWeek }
      saveWeek(wd, nextWeek)
      return next
    })
    toast.success('Slot removido')
  }, [setWeeks, saveWeek, canEdit])

  return (
    <div className="space-y-6 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Programação — Carrinhos</h2>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="carrMonthId" className="text-xs whitespace-nowrap">Mês:</Label>
            <MonthCombo value={monthId} onChange={setMonthId} />
            {canEdit && (
              <Button onClick={()=>setEditing((e)=>!e)} variant={editing ? "outline" : undefined} className="h-8 px-3 text-xs">
                {editing ? "Cancelar" : "Editar"}
              </Button>
            )}
          </div>
        </div>
        {editing ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Início</Label>
            <Input type="time" value={start} onChange={(e)=>setStart(e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Duração (min)</Label>
            <Input type="number" value={duration} onChange={(e)=>setDuration(parseInt(e.target.value||'120',10))} disabled={disabled} />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-xs">Local</Label>
            <SelectLocation locations={locations} value={location} onChange={setLocation} disabled={disabled} />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-xs">Participantes (2 a 3 batizados)</Label>
            <SelectRegisters registers={registers} values={participants} onChange={setParticipants} disabled={disabled} />
          </div>
          <div className="flex items-center gap-2">
            <input id="fixed" type="checkbox" checked={fixed} onChange={(e)=>setFixed(e.target.checked)} disabled={disabled} />
            <Label htmlFor="fixed" className="text-xs">Fixo</Label>
          </div>
          <div className="flex items-center gap-2">
            <input id="repeat" type="checkbox" checked={repeatMonthly} onChange={(e)=>setRepeatMonthly(e.target.checked)} disabled={disabled || !fixed || !date} />
            <Label htmlFor="repeat" className="text-xs">Repetir nas semanas do mês</Label>
          </div>
          <div className="md:col-span-3">
            <Button onClick={handleAdd} disabled={disabled} className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
          </div>
          {(locations.length === 0 || registers.length === 0) ? (
            <div className="md:col-span-3 text-xs text-muted-foreground">
              Para criar, adicione locais aprovados de carrinhos e tenha pelo menos 2 publicadores batizados.
            </div>
          ) : null}
        </div>
        ) : null}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <h3 className="text-lg font-semibold">Slots criados</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {monthSlots.map(({ wd, slots }) => (
            <div key={wd} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{wd}</div>
                <div className="text-xs text-muted-foreground">{slots.length} slot(s)</div>
              </div>
              <div className="space-y-3">
                {slots.map((s, idx) => (
                  <div key={idx} className="rounded-md border p-3 text-sm space-y-2">
                    {editing ? (
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Início</Label>
                          <Input type="time" value={s.start} onChange={(e)=>updateSlot(wd, idx, { start: e.target.value })} disabled={disabled} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duração (min)</Label>
                          <Input type="number" value={s.durationMinutes || 120} onChange={(e)=>updateSlot(wd, idx, { durationMinutes: parseInt(e.target.value||'120',10) })} disabled={disabled} />
                        </div>
                        <div className="space-y-1 md:col-span-1">
                          <Label className="text-xs">Local</Label>
                          <SelectLocation locations={locations} value={s.location} onChange={(v)=>updateSlot(wd, idx, { location: v })} disabled={disabled} />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-xs">Participantes</Label>
                          <SelectRegisters registers={registers} values={s.participants || []} onChange={(vals)=>updateSlot(wd, idx, { participants: vals })} disabled={disabled} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input id={`fixed-${wd}-${idx}`} type="checkbox" checked={!!s.fixed} onChange={(e)=>updateSlot(wd, idx, { fixed: e.target.checked })} disabled={disabled} />
                          <Label htmlFor={`fixed-${wd}-${idx}`} className="text-xs">Fixo</Label>
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={()=>removeSlot(wd, idx)} disabled={disabled}>Remover</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /><span>{s.start}</span><span>•</span><span>{s.durationMinutes || 120} min</span>{s.fixed ? (<span className="ml-2 inline-flex items-center gap-1 text-xs"><Repeat className="h-3 w-3" />fixo</span>) : null}</div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{s.location || ''}</span></div>
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{(s.participants || []).map(id => registers.find(r => r.id === id)?.nome || id).filter(Boolean).join(', ')}</span></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {monthSlots.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nenhum slot criado neste mês</div>
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
