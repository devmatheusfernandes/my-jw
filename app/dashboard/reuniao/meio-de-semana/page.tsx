'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MidweekIncomingType, MidweekAssignmentsDisplay, WeekType } from './MidweekSimple'
import { mapMidweekToDesignations } from '@/types/midweek-meeting'
import { useAuth } from '@/components/providers/auth-provider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronDown, ChevronsUpDown, CalendarDays, Users, Settings, Save, Download, Music, Book, Award, Clock, UserCircle, AlertCircle, Edit3, Check, X } from 'lucide-react'
import { getUserDoc, listRegisters, upsertMidweekScheduleMonth, getMidweekScheduleMonth, getMidweekAssignmentsMonth, updateMidweekAssignmentsMonth, updateMidweekAssignmentsWeek } from '@/lib/firebase'
import { toast } from 'sonner'
import { designationLabels } from '@/types/register-labels'

type RegisterOpt = { id: string; nomeCompleto: string }

const removeDiacritics = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')

const normalizeAyfKey = (type?: string, title?: string, content?: string): keyof typeof designationLabels | undefined => {
  if (!type) return undefined
  const t = removeDiacritics(type.toLowerCase())
  const ttl = removeDiacritics((title || '').toLowerCase())
  const cnt = removeDiacritics((content || '').toLowerCase())

  if (t.includes('iniciando')) return 'iniciando_conversas'
  if (t.includes('cultivando')) return 'cultivando_interesse'
  if (t.includes('fazendo')) return 'fazendo_discipulos'
  if (t.includes('explicando')) {
    if (ttl.includes('discurso')) return 'explicando_crencas_discurso'
    if (cnt.includes('demonstr') || ttl.includes('demonstr')) return 'explicando_crencas_demonstracao'
    return 'explicando_crencas_demonstracao'
  }
  return undefined
}

const mapMidweek = (item: any): MidweekIncomingType => ({
  week_date: item.mwb_week_date || item.week_date,
  mwb_week_date: item.mwb_week_date,
  mwb_week_date_locale: item.mwb_week_date_locale,
  mwb_weekly_bible_reading: item.mwb_weekly_bible_reading,
  mwb_song_first: item.mwb_song_first,
  mwb_tgw_talk_title: item.mwb_tgw_talk_title,
  mwb_tgw_gems_title: item.mwb_tgw_gems_title,
  mwb_tgw_bread: item.mwb_tgw_bread,
  mwb_tgw_bread_title: item.mwb_tgw_bread_title,
  mwb_ayf_count: item.mwb_ayf_count,
  mwb_ayf_part1_type: item.mwb_ayf_part1_type,
  mwb_ayf_part1_time: item.mwb_ayf_part1_time,
  mwb_ayf_part1_title: item.mwb_ayf_part1_title,
  mwb_ayf_part1: item.mwb_ayf_part1,
  mwb_ayf_part2_type: item.mwb_ayf_part2_type,
  mwb_ayf_part2_time: item.mwb_ayf_part2_time,
  mwb_ayf_part2_title: item.mwb_ayf_part2_title,
  mwb_ayf_part2: item.mwb_ayf_part2,
  mwb_ayf_part3_type: item.mwb_ayf_part3_type,
  mwb_ayf_part3_time: item.mwb_ayf_part3_time,
  mwb_ayf_part3_title: item.mwb_ayf_part3_title,
  mwb_ayf_part3: item.mwb_ayf_part3,
  mwb_ayf_part4_type: item.mwb_ayf_part4_type,
  mwb_ayf_part4_time: item.mwb_ayf_part4_time,
  mwb_ayf_part4_title: item.mwb_ayf_part4_title,
  mwb_ayf_part4: item.mwb_ayf_part4,
  mwb_song_middle: item.mwb_song_middle,
  mwb_lc_count: item.mwb_lc_count,
  mwb_lc_part1_time: item.mwb_lc_part1_time,
  mwb_lc_part1_title: item.mwb_lc_part1_title,
  mwb_lc_part1_content: item.mwb_lc_part1_content,
  mwb_lc_part2_time: item.mwb_lc_part2_time,
  mwb_lc_part2_title: item.mwb_lc_part2_title,
  mwb_lc_part2_content: item.mwb_lc_part2_content,
  mwb_lc_cbs: item.mwb_lc_cbs,
  mwb_lc_cbs_title: item.mwb_lc_cbs_title,
  mwb_song_conclude: item.mwb_song_conclude,
})

export default function MidweekPage() {
  const { user } = useAuth()
  const [weeks, setWeeks] = React.useState<MidweekIncomingType[]>([])
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  })
  const [selectedWeekDate, setSelectedWeekDate] = React.useState<string>('')
  const [registers, setRegisters] = React.useState<RegisterOpt[]>([])
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const regById = React.useMemo(() => new Map(registers.map(r => [r.id, r.nomeCompleto])), [registers])
  const [assignByWeek, setAssignByWeek] = React.useState<Record<string, MidweekAssignmentsDisplay>>({})
  const assignByWeekRef = React.useRef(assignByWeek)
  React.useEffect(() => { assignByWeekRef.current = assignByWeek }, [assignByWeek])
  const saveTimersRef = React.useRef<Map<string, any>>(new Map())
  const [editingWeek, setEditingWeek] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [importOpen, setImportOpen] = React.useState(false)
  const [importStart, setImportStart] = React.useState<string>('')
  const [importEnd, setImportEnd] = React.useState<string>('')
  const [importLoading, setImportLoading] = React.useState(false)
  const [importLang, setImportLang] = React.useState<'P' | 'E' | 'T'>('T')

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const doc = await getMidweekScheduleMonth(monthId)
        if (doc?.weeks && Array.isArray(doc.weeks) && doc.weeks.length > 0) {
          setWeeks(doc.weeks as MidweekIncomingType[])
          return
        }
        const resp = await fetch('/midweek_pt.json')
        const list = await resp.json()
        setWeeks(list as MidweekIncomingType[])
      } catch {
        try {
          const resp = await fetch('/midweek_pt.json')
          const list = await resp.json()
          setWeeks(list as MidweekIncomingType[])
        } catch {
          toast.error('Falha ao carregar programação')
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [monthId])

  React.useEffect(() => {
    const run = async () => {
      const uid = user?.uid
      if (!uid) return
      const u = await getUserDoc(uid)
      if (!u?.congregacaoId) return
      setCongregacaoId(u.congregacaoId)
      const regs = await listRegisters(u.congregacaoId)
      setRegisters(regs.map(r => ({ id: r.id, nomeCompleto: r.nomeCompleto })))
    }
    run()
  }, [user])

  const monthWeeks = React.useMemo(() => {
    const [y, m] = monthId.split('-').map(x => parseInt(x, 10))
    return weeks.filter(w => {
      const [wy, wm] = w.week_date.split('/').map(x => parseInt(x, 10))
      return wy === y && wm === m
    })
  }, [weeks, monthId])

  React.useEffect(() => {
    if (monthWeeks.length === 0) return
    const now = new Date()
    const match = monthWeeks.find(w => {
      const [y, m, d] = w.week_date.split('/').map(x => parseInt(x, 10))
      const wd = new Date(y, m - 1, d)
      const diff = now.getTime() - wd.getTime()
      return diff >= 0 && diff < 7 * 86400000
    })
    setSelectedWeekDate(match ? match.week_date : monthWeeks[0].week_date)
  }, [monthWeeks])

  const assignKey = React.useMemo(() => `midweek_assign_${monthId}`, [monthId])
  
  React.useEffect(() => {
    const run = async () => {
      try {
        if (!congregacaoId) {
          const raw = localStorage.getItem(assignKey)
          if (raw) setAssignByWeek(JSON.parse(raw))
          else setAssignByWeek({})
          return
        }
        const doc = await getMidweekAssignmentsMonth(congregacaoId, monthId)
        if (doc?.weeks) {
          const fromDb = doc.weeks as Record<string, MidweekAssignmentsDisplay>
          const normalized: Record<string, MidweekAssignmentsDisplay> = {}
          Object.entries(fromDb).forEach(([k, v]) => { normalized[k.replace(/-/g, '/')] = v })
          setAssignByWeek(normalized)
          return
        }
        const raw = localStorage.getItem(assignKey)
        if (raw) setAssignByWeek(JSON.parse(raw))
        else setAssignByWeek({})
      } catch {
        const raw = localStorage.getItem(assignKey)
        if (raw) setAssignByWeek(JSON.parse(raw))
        else setAssignByWeek({})
      }
    }
    run()
  }, [assignKey, congregacaoId, monthId])

  const persistAssign = React.useCallback(async () => {
    try {
      localStorage.setItem(assignKey, JSON.stringify(assignByWeek))
      if (!congregacaoId) throw new Error('Sem congregação')
      await updateMidweekAssignmentsMonth(congregacaoId, monthId, assignByWeek)
      toast.success('Designações salvas')
    } catch (e: any) {
      const msg = (e && (e.message || e.toString())) || 'Falha ao salvar designações'
      toast.error(msg)
    }
  }, [assignKey, assignByWeek, congregacaoId, monthId])

  const persistWeek = React.useCallback(async (weekDate: string) => {
    try {
      localStorage.setItem(assignKey, JSON.stringify(assignByWeekRef.current))
      if (!congregacaoId) return
      const data = assignByWeekRef.current[weekDate] || {}
      await updateMidweekAssignmentsWeek(congregacaoId, monthId, weekDate, data)
      toast.success('Semana salva', { duration: 1200 })
    } catch (e: any) {
      const msg = (e && (e.message || e.toString())) || 'Falha ao salvar semana'
      toast.error(msg)
    }
  }, [assignKey, congregacaoId, monthId])

  const scheduleSaveWeek = React.useCallback(async (weekDate: string, data: MidweekAssignmentsDisplay) => {
    try {
      const t = saveTimersRef.current.get(weekDate)
      if (t) { clearTimeout(t); saveTimersRef.current.delete(weekDate) }
      const handle = setTimeout(async () => {
        try {
          localStorage.setItem(assignKey, JSON.stringify(assignByWeekRef.current))
          if (congregacaoId) {
            await updateMidweekAssignmentsWeek(congregacaoId, monthId, weekDate, data)
            toast.success('Semana salva', { duration: 1200 })
          }
        } catch (e: any) {
          const msg = (e && (e.message || e.toString())) || 'Falha ao salvar semana'
          toast.error(msg)
        }
      }, 800)
      saveTimersRef.current.set(weekDate, handle)
    } catch {}
  }, [assignKey, congregacaoId, monthId])

  const updateAssign = React.useCallback((weekDate: string, field: keyof MidweekAssignmentsDisplay, value: string | undefined) => {
    setAssignByWeek(curr => {
      const nextWeek = { ...(curr[weekDate] || {}), [field]: value }
      const next = { ...curr, [weekDate]: nextWeek }
      assignByWeekRef.current = next
      scheduleSaveWeek(weekDate, nextWeek)
      return next
    })
  }, [scheduleSaveWeek])

  const monthsBetween = React.useCallback((start: string, end: string) => {
    if (!start || !end) return 0
    const [sy, sm] = start.split('-').map(x => parseInt(x,10))
    const [ey, em] = end.split('-').map(x => parseInt(x,10))
    return (ey - sy) * 12 + (em - sm) + 1
  }, [])

  const handleImport = React.useCallback(async () => {
    if (!importStart || !importEnd) return
    if (monthsBetween(importStart, importEnd) < 2) return
    setImportLoading(true)
    try {
      const resp = await fetch(`https://source-materials.organized-app.com/api/${importLang}`)
      const raw = await resp.json()
      let arr: MidweekIncomingType[] = (Array.isArray(raw) ? raw : [])
        .filter((x: any) => x && typeof x === 'object' && 'mwb_week_date_locale' in x)
        .map(mapMidweek)

      const startStr = `${importStart.replace('-', '/')}/01`
      const endStr = `${importEnd.replace('-', '/')}/31`
      arr = arr.filter(w => typeof w.week_date === 'string' && w.week_date >= startStr && w.week_date <= endStr)

      const byMonth = new Map<string, MidweekIncomingType[]>()
      arr.forEach(w => {
        const [y, m] = w.week_date.split('/').map(x => parseInt(x,10))
        const mid = `${y}-${String(m).padStart(2,'0')}`
        const list = byMonth.get(mid) || []
        list.push(w)
        byMonth.set(mid, list)
      })

      for (const [mid, list] of byMonth) {
        await upsertMidweekScheduleMonth(mid, list, `https://source-materials.organized-app.com/api/${importLang}`)
      }

      const visible = byMonth.get(monthId)
      if (visible && visible.length > 0) {
        const merged = new Map<string, MidweekIncomingType>()
        weeks.forEach(w => merged.set(w.week_date, w))
        visible.forEach(w => merged.set(w.week_date, w))
        setWeeks(Array.from(merged.values()))
      }
      toast.success('Programação importada e salva')
    } catch (e: any) {
      console.error(e)
      const msg = (e && (e.message || e.toString())) || 'Falha ao importar programação'
      toast.error(msg)
    } finally {
      setImportLoading(false)
      setImportOpen(false)
    }
  }, [importStart, importEnd, importLang, monthId, weeks, monthsBetween])

  function RegisterCombo({ value, onChange, placeholder = "Selecionar..." }: { value?: string; onChange: (id: string) => void; placeholder?: string }) {
    const [open, setOpen] = React.useState(false)
    const label = value ? (regById.get(value) || placeholder) : placeholder
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" role="combobox" aria-expanded={open} className="justify-between w-full h-auto min-h-[32px] px-2 py-1 text-sm font-normal hover:bg-muted/50">
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
                {registers.map(r => (
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

  const TYPES: { key: WeekType; label: string }[] = [
    { key: 'normal', label: 'Semana normal' },
    { key: 'visita_superintendente', label: 'Visita do superintendente' },
    { key: 'congresso', label: 'Congresso regional' },
    { key: 'assembleia', label: 'Assembleia' },
    { key: 'celebracao', label: 'Celebração' },
    { key: 'sem_reuniao', label: 'Não haverá reunião' },
  ]

  const AssignmentLine = ({ label, value, icon: Icon }: { label: string; value?: string; icon?: any }) => (
    <div className="flex items-center gap-2 py-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
      <span className="text-xs text-muted-foreground min-w-[100px]">{label}:</span>
      <span className="text-sm font-medium flex-1">{value || '—'}</span>
    </div>
  )

  const EditableLine = ({ label, weekDate, field, icon: Icon }: { label: string; weekDate: string; field: keyof MidweekAssignmentsDisplay; icon?: any }) => {
    const a = assignByWeek[weekDate] || {}
    const value = a[field]
    
    return (
      <div className="flex items-center gap-2 py-1 hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        <span className="text-xs text-muted-foreground min-w-[100px] flex-shrink-0">{label}:</span>
        <div className="flex-1 min-w-0">
          <RegisterCombo
            value={typeof value === 'string' ? value : undefined}
            onChange={(id) => updateAssign(weekDate, field, id)}
            placeholder="Designar..."
          />
        </div>
      </div>
    )
  }

  const WeekCard: React.FC<{ w: MidweekIncomingType }> = ({ w }) => {
    const a = assignByWeek[w.week_date] || {}
    const isEditing = editingWeek === w.week_date
    const parts = mapMidweekToDesignations(w).parts
    const isDiscurso = (idx: number) => {
      const p = parts.filter(p => p.key !== 'discurso_tesouros' && p.key !== 'joias_espirituais' && p.key !== 'leitura_biblia' && p.key !== 'nossa_vida_crista' && p.key !== 'estudo_biblico_congregacao')[idx]
      if (!p) return false
      return p.key === 'explicando_crencas_discurso' || p.key === 'discurso'
    }
    const noMeeting = a.week_type === 'sem_reuniao' || a.week_type === 'congresso' || a.week_type === 'assembleia' || a.week_type === 'celebracao'

    return (
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-3 sm:px-4 py-3 border-b bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{w.mwb_week_date_locale}</span>
            </div>
            <Button
              variant={isEditing ? "default" : "ghost"}
              size="sm"
              onClick={() => { if (isEditing) persistWeek(w.week_date); setEditingWeek(isEditing ? null : w.week_date) }}
              className="gap-1.5 h-8 px-2 text-xs"
            >
              {isEditing ? (
                <><Check className="h-3 w-3" /> Salvar</>
              ) : (
                <><Edit3 className="h-3 w-3" /> Editar</>
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {w.mwb_weekly_bible_reading}
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground flex-shrink-0">Tipo:</Label>
            <select
              className="h-7 flex-1 rounded-md border bg-background px-2 text-xs"
              value={a.week_type || 'normal'}
              onChange={e => updateAssign(w.week_date, 'week_type', e.target.value)}
            >
              {TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-4">
          {noMeeting ? (
            <div className="rounded-md border-2 border-dashed bg-muted/30 p-6 sm:p-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Não haverá reunião de meio de semana</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Abertura */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />
                  Abertura
                </div>
                <div className="rounded-md bg-muted/30 p-3 space-y-1">
                  <div className="text-xs text-muted-foreground mb-2">Cântico {w.mwb_song_first}</div>
                  {isEditing ? (
                    <>
                      <EditableLine label="Presidente" weekDate={w.week_date} field="presidente" icon={UserCircle} />
                      <EditableLine label="Oração inicial" weekDate={w.week_date} field="oracao_inicial" icon={Users} />
                    </>
                  ) : (
                    <>
                      <AssignmentLine label="Presidente" value={a.presidente ? regById.get(a.presidente) : undefined} icon={UserCircle} />
                      <AssignmentLine label="Oração inicial" value={a.oracao_inicial ? regById.get(a.oracao_inicial) : undefined} icon={Users} />
                    </>
                  )}
                </div>
              </div>

              {/* Tesouros da Palavra de Deus */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Book className="h-3.5 w-3.5" />
                  Tesouros da Palavra de Deus
                </div>
                <div className="rounded-md bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xs font-medium">{w.mwb_tgw_talk_title}</div>
                      <div className="text-xs">{w.mwb_tgw_gems_title}</div>
                      <div className="text-xs">{w.mwb_tgw_bread_title} — {w.mwb_tgw_bread}</div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-1 min-w-0">
                      {isEditing ? (
                        <>
                          <EditableLine label="Orador" weekDate={w.week_date} field="tgw_discurso_orador" icon={UserCircle} />
                          <EditableLine label="Dirigente" weekDate={w.week_date} field="tgw_joias_dirigente" icon={UserCircle} />
                          <EditableLine label="Leitor" weekDate={w.week_date} field="leitura" icon={Book} />
                        </>
                      ) : (
                        <>
                          <AssignmentLine label="Orador" value={a.tgw_discurso_orador ? regById.get(a.tgw_discurso_orador) : undefined} icon={UserCircle} />
                          <AssignmentLine label="Dirigente" value={a.tgw_joias_dirigente ? regById.get(a.tgw_joias_dirigente) : undefined} icon={UserCircle} />
                          <AssignmentLine label="Leitor" value={a.leitura ? regById.get(a.leitura) : undefined} icon={Book} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Faça seu melhor no ministério */}
              {w.mwb_ayf_count > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" />
                    Faça seu melhor no ministério
                  </div>
                  <div className="rounded-md bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 space-y-3">
                    {w.mwb_ayf_count >= 1 && w.mwb_ayf_part1_title && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium">
                          {designationLabels[normalizeAyfKey(w.mwb_ayf_part1_type, w.mwb_ayf_part1_title, w.mwb_ayf_part1) || 'iniciando_conversas']}
                        </div>
                        <div className="text-xs text-muted-foreground">{w.mwb_ayf_part1_title} ({w.mwb_ayf_part1_time} min) — {w.mwb_ayf_part1}</div>
                        {isEditing ? (
                          <>
                            <EditableLine label="Estudante" weekDate={w.week_date} field="ayf_part1_estudante" icon={UserCircle} />
                            {!isDiscurso(0) && <EditableLine label="Ajudante" weekDate={w.week_date} field="ayf_part1_ajudante" icon={Users} />}
                          </>
                        ) : (
                          <>
                            <AssignmentLine label="Estudante" value={a.ayf_part1_estudante ? regById.get(a.ayf_part1_estudante) : undefined} icon={UserCircle} />
                            {!isDiscurso(0) && <AssignmentLine label="Ajudante" value={a.ayf_part1_ajudante ? regById.get(a.ayf_part1_ajudante) : undefined} icon={Users} />}
                          </>
                        )}
                      </div>
                    )}
                    
                    {w.mwb_ayf_count >= 2 && w.mwb_ayf_part2_title && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs font-medium">
                          {designationLabels[normalizeAyfKey(w.mwb_ayf_part2_type, w.mwb_ayf_part2_title, w.mwb_ayf_part2) || 'iniciando_conversas']}
                        </div>
                        <div className="text-xs text-muted-foreground">{w.mwb_ayf_part2_title} ({w.mwb_ayf_part2_time} min) — {w.mwb_ayf_part2}</div>
                        {isEditing ? (
                          <>
                            <EditableLine label="Estudante" weekDate={w.week_date} field="ayf_part2_estudante" icon={UserCircle} />
                            {!isDiscurso(1) && <EditableLine label="Ajudante" weekDate={w.week_date} field="ayf_part2_ajudante" icon={Users} />}
                          </>
                        ) : (
                          <>
                            <AssignmentLine label="Estudante" value={a.ayf_part2_estudante ? regById.get(a.ayf_part2_estudante) : undefined} icon={UserCircle} />
                            {!isDiscurso(1) && <AssignmentLine label="Ajudante" value={a.ayf_part2_ajudante ? regById.get(a.ayf_part2_ajudante) : undefined} icon={Users} />}
                          </>
                        )}
                      </div>
                    )}
                    
                    {w.mwb_ayf_count >= 3 && w.mwb_ayf_part3_title && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs font-medium">
                          {designationLabels[normalizeAyfKey(w.mwb_ayf_part3_type, w.mwb_ayf_part3_title, w.mwb_ayf_part3) || 'cultivando_interesse']}
                        </div>
                        <div className="text-xs text-muted-foreground">{w.mwb_ayf_part3_title} ({w.mwb_ayf_part3_time} min) — {w.mwb_ayf_part3}</div>
                        {isEditing ? (
                          <>
                            <EditableLine label="Estudante" weekDate={w.week_date} field="ayf_part3_estudante" icon={UserCircle} />
                            {!isDiscurso(2) && <EditableLine label="Ajudante" weekDate={w.week_date} field="ayf_part3_ajudante" icon={Users} />}
                          </>
                        ) : (
                          <>
                            <AssignmentLine label="Estudante" value={a.ayf_part3_estudante ? regById.get(a.ayf_part3_estudante) : undefined} icon={UserCircle} />
                            {!isDiscurso(2) && <AssignmentLine label="Ajudante" value={a.ayf_part3_ajudante ? regById.get(a.ayf_part3_ajudante) : undefined} icon={Users} />}
                          </>
                        )}
                      </div>
                    )}
                    
                    {w.mwb_ayf_count >= 4 && w.mwb_ayf_part4_title && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs font-medium">
                          {designationLabels[normalizeAyfKey(w.mwb_ayf_part4_type, w.mwb_ayf_part4_title, w.mwb_ayf_part4) || 'cultivando_interesse']}
                        </div>
                        <div className="text-xs text-muted-foreground">{w.mwb_ayf_part4_title} ({w.mwb_ayf_part4_time} min) — {w.mwb_ayf_part4}</div>
                        {isEditing ? (
                          <>
                            <EditableLine label="Estudante" weekDate={w.week_date} field="ayf_part4_estudante" icon={UserCircle} />
                            {!isDiscurso(3) && <EditableLine label="Ajudante" weekDate={w.week_date} field="ayf_part4_ajudante" icon={Users} />}
                          </>
                        ) : (
                          <>
                            <AssignmentLine label="Estudante" value={a.ayf_part4_estudante ? regById.get(a.ayf_part4_estudante) : undefined} icon={UserCircle} />
                            {!isDiscurso(3) && <AssignmentLine label="Ajudante" value={a.ayf_part4_ajudante ? regById.get(a.ayf_part4_ajudante) : undefined} icon={Users} />}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Intervalo */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Intervalo
                </div>
                <div className="rounded-md bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Cântico {w.mwb_song_middle}</div>
                </div>
              </div>

              {/* Nossa vida cristã */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Nossa vida cristã
                </div>
                <div className="rounded-md bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 space-y-3">
                  {w.mwb_lc_part1_title && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium">{w.mwb_lc_part1_title}</div>
                      <div className="text-xs text-muted-foreground">{w.mwb_lc_part1_content} ({w.mwb_lc_part1_time} min)</div>
                      {isEditing ? (
                        <EditableLine label="Apresentador" weekDate={w.week_date} field="lc_part1_apresentador" icon={UserCircle} />
                      ) : (
                        <AssignmentLine label="Apresentador" value={a.lc_part1_apresentador ? regById.get(a.lc_part1_apresentador) : undefined} icon={UserCircle} />
                      )}
                    </div>
                  )}
                  
                  {w.mwb_lc_count > 1 && w.mwb_lc_part2_title && (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="text-xs font-medium">{w.mwb_lc_part2_title}</div>
                      <div className="text-xs text-muted-foreground">{w.mwb_lc_part2_content} ({w.mwb_lc_part2_time} min)</div>
                      {isEditing ? (
                        <EditableLine label="Apresentador" weekDate={w.week_date} field="lc_part2_apresentador" icon={UserCircle} />
                      ) : (
                        <AssignmentLine label="Apresentador" value={a.lc_part2_apresentador ? regById.get(a.lc_part2_apresentador) : undefined} icon={UserCircle} />
                      )}
                    </div>
                  )}
                  
                  {a.week_type === 'visita_superintendente' && (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="text-xs font-medium">Discurso do superintendente</div>
                      {isEditing ? (
                        <EditableLine label="Orador" weekDate={w.week_date} field="lc_superintendente_orador" icon={UserCircle} />
                      ) : (
                        <AssignmentLine label="Orador" value={a.lc_superintendente_orador ? regById.get(a.lc_superintendente_orador) : undefined} icon={UserCircle} />
                      )}
                    </div>
                  )}
                  
                  {w.mwb_lc_cbs_title && a.week_type !== 'visita_superintendente' && (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-xs font-medium">Estudo bíblico de congregação</div>
                          <div className="text-xs text-muted-foreground">{w.mwb_lc_cbs_title} — {w.mwb_lc_cbs}</div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 min-w-0">
                          {isEditing ? (
                            <>
                              <EditableLine label="Dirigente do estudo" weekDate={w.week_date} field="lc_cbs_dirigente" icon={UserCircle} />
                              <EditableLine label="Leitor do livro" weekDate={w.week_date} field="lc_cbs_leitor" icon={Book} />
                            </>
                          ) : (
                            <>
                              <AssignmentLine label="Dirigente do estudo" value={a.lc_cbs_dirigente ? regById.get(a.lc_cbs_dirigente) : undefined} icon={UserCircle} />
                              <AssignmentLine label="Leitor do livro" value={a.lc_cbs_leitor ? regById.get(a.lc_cbs_leitor) : undefined} icon={Book} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Encerramento */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" />
                  Encerramento
                </div>
                <div className="rounded-md bg-muted/30 p-3 space-y-1">
                  <div className="text-xs text-muted-foreground mb-2">Cântico {w.mwb_song_conclude}</div>
                  {isEditing ? (
                    <EditableLine label="Oração final" weekDate={w.week_date} field="oracao_final" icon={Users} />
                  ) : (
                    <AssignmentLine label="Oração final" value={a.oracao_final ? regById.get(a.oracao_final) : undefined} icon={Users} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const weeklyWeeks = monthWeeks
  const selectedWeek = weeklyWeeks.find(w => w.week_date === selectedWeekDate) || null

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                Reunião do Meio de Semana
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Programação e designações da vida e ministério cristão</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  value={monthId}
                  onChange={e => setMonthId(e.target.value)}
                  className="h-9 w-36 text-sm"
                />
              </div>
              <Popover open={importOpen} onOpenChange={setImportOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Importar do JW.org</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] space-y-3" align="end">
                  <div className="space-y-2">
                    <Label className="text-xs">Início</Label>
                    <Input type="month" value={importStart} onChange={e => setImportStart(e.target.value)} className="h-8 w-full text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Fim</Label>
                    <Input type="month" value={importEnd} onChange={e => setImportEnd(e.target.value)} className="h-8 w-full text-xs" />
                  </div>
                  <Button size="sm" onClick={handleImport} className="gap-2 w-full" disabled={importLoading || !importStart || !importEnd || monthsBetween(importStart, importEnd) < 2}>
                    {importLoading ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Download className="h-4 w-4" />}
                    Importar e salvar
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="semanal" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="semanal" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Semanal</span>
            </TabsTrigger>
            <TabsTrigger value="mensal" className="gap-2">
              <Users className="h-4 w-4" />
              <span>Mensal</span>
            </TabsTrigger>
          </TabsList>

          {/* Semanal View - Default and better for mobile */}
          <TabsContent value="semanal" className="space-y-4">
            {monthWeeks.length === 0 ? (
              <div className="text-center py-12 rounded-lg border bg-muted/30">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma semana disponível para este mês</p>
              </div>
            ) : (
              <>
                {/* Week Selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {weeklyWeeks.map((w) => (
                    <Button
                      key={w.week_date}
                      variant={selectedWeekDate === w.week_date ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedWeekDate(w.week_date)}
                      className="whitespace-nowrap flex-shrink-0"
                    >
                      {w.mwb_week_date_locale.split(' ')[0]}
                    </Button>
                  ))}
                </div>

                {/* Selected Week Card */}
                <AnimatePresence mode="wait">
                  {selectedWeek && (
                    <motion.div
                      key={selectedWeek.week_date}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <WeekCard w={selectedWeek} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </TabsContent>

          {/* Mensal View */}
          <TabsContent value="mensal" className="space-y-4">
            {monthWeeks.length === 0 ? (
              <div className="text-center py-12 rounded-lg border bg-muted/30">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma semana disponível para este mês</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                <AnimatePresence>
                  {monthWeeks.map((w, idx) => (
                    <motion.div
                      key={w.week_date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <WeekCard w={w} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}