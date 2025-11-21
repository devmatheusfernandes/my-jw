'use client'
import React from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { MidweekIncomingType, MidweekAssignmentsDisplay, WeekType } from './MidweekSimple'
import { designationLabels } from '@/types/register-labels'
import { getUserDoc, listRegisters, upsertMidweekScheduleMonth, getMidweekScheduleMonth, getMidweekAssignmentsMonth, updateMidweekAssignmentsMonth, updateMidweekAssignmentsWeek } from '@/lib/firebase'

export type RegisterOpt = { id: string; nomeCompleto: string }

export const WEEK_TYPES: { key: WeekType; label: string }[] = [
  { key: 'normal', label: 'Semana normal' },
  { key: 'visita_superintendente', label: 'Visita do superintendente' },
  { key: 'congresso', label: 'Congresso regional' },
  { key: 'assembleia', label: 'Assembleia' },
  { key: 'celebracao', label: 'Celebração' },
  { key: 'sem_reuniao', label: 'Não haverá reunião' },
]

export const removeDiacritics = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')

export const normalizeAyfKey = (
  type?: string,
  title?: string,
  content?: string
): keyof typeof designationLabels | undefined => {
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

export const mapMidweek = (item: any): MidweekIncomingType => ({
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

export const monthsBetween = (start: string, end: string) => {
  if (!start || !end) return 0
  const [sy, sm] = start.split('-').map(x => parseInt(x, 10))
  const [ey, em] = end.split('-').map(x => parseInt(x, 10))
  return (ey - sy) * 12 + (em - sm) + 1
}

export function useMidweekMeeting() {
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
  const [importLoading, setImportLoading] = React.useState(false)

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const doc = await getMidweekScheduleMonth(monthId)
        if (doc?.weeks && Array.isArray(doc.weeks) && doc.weeks.length > 0) {
          setWeeks(doc.weeks as MidweekIncomingType[])
        } else {
          setWeeks([])
        }
      } catch {
        setWeeks([])
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

  const prevWeekDate = React.useCallback((weekDate: string) => {
    try {
      const [y, m, d] = weekDate.split('/').map(x => parseInt(x, 10))
      const dt = new Date(y, m - 1, d)
      dt.setDate(dt.getDate() - 7)
      const py = dt.getFullYear()
      const pm = String(dt.getMonth() + 1).padStart(2, '0')
      const pd = String(dt.getDate()).padStart(2, '0')
      return `${py}/${pm}/${pd}`
    } catch {
      return ''
    }
  }, [])

  const collectWeekIds = React.useCallback((weekDate: string) => {
    const a = assignByWeekRef.current[weekDate] || {}
    const out: string[] = []
    Object.entries(a).forEach(([k, v]) => {
      if (k === 'week_type') return
      if (typeof v === 'string' && v) out.push(v)
    })
    return out
  }, [])

  const computeWeekWarnings = React.useCallback((weekDate: string) => {
    const msgs: string[] = []
    const ids = collectWeekIds(weekDate)
    const counts = new Map<string, number>()
    ids.forEach(id => counts.set(id, (counts.get(id) || 0) + 1))
    Array.from(counts.entries()).forEach(([id, c]) => {
      if (c > 1) {
        const nome = regById.get(id) || 'Registro'
        msgs.push(`${nome} com múltiplas designações nesta semana`)
      }
    })
    const prev = prevWeekDate(weekDate)
    if (prev) {
      const prevIds = collectWeekIds(prev)
      const seen = new Set(prevIds)
      ids.forEach(id => {
        if (seen.has(id)) {
          const nome = regById.get(id) || 'Registro'
          msgs.push(`${nome} designada em semanas consecutivas`)
        }
      })
    }
    const a = assignByWeekRef.current[weekDate] || {}
    const pairs: string[] = []
    const addPair = (e?: string, h?: string) => { if (e && h) pairs.push(`${e}|${h}`) }
    addPair(a.ayf_part1_estudante, a.ayf_part1_ajudante)
    addPair(a.ayf_part2_estudante, a.ayf_part2_ajudante)
    addPair(a.ayf_part3_estudante, a.ayf_part3_ajudante)
    addPair(a.ayf_part4_estudante, a.ayf_part4_ajudante)
    const pc = new Map<string, number>()
    pairs.forEach(p => pc.set(p, (pc.get(p) || 0) + 1))
    Array.from(pc.entries()).forEach(([p, c]) => {
      if (c > 1) {
        const [e, h] = p.split('|')
        const ne = regById.get(e) || 'Estudante'
        const nh = regById.get(h) || 'Ajudante'
        msgs.push(`Dupla repetida no Ministério: ${ne} e ${nh} (mesma semana)`)
      }
    })
    if (prev) {
      const ap = assignByWeekRef.current[prev] || {}
      const prevPairs: string[] = []
      const addPrev = (e?: string, h?: string) => { if (e && h) prevPairs.push(`${e}|${h}`) }
      addPrev(ap.ayf_part1_estudante, ap.ayf_part1_ajudante)
      addPrev(ap.ayf_part2_estudante, ap.ayf_part2_ajudante)
      addPrev(ap.ayf_part3_estudante, ap.ayf_part3_ajudante)
      addPrev(ap.ayf_part4_estudante, ap.ayf_part4_ajudante)
      const setPrevPairs = new Set(prevPairs)
      pairs.forEach(p => {
        if (setPrevPairs.has(p)) {
          const [e, h] = p.split('|')
          const ne = regById.get(e) || 'Estudante'
          const nh = regById.get(h) || 'Ajudante'
          msgs.push(`Dupla repetida com a semana anterior: ${ne} e ${nh}`)
        }
      })
    }
    return msgs
  }, [collectWeekIds, prevWeekDate, regById])

  const showWeekWarnings = React.useCallback((weekDate: string) => {
    const msgs = computeWeekWarnings(weekDate)
    msgs.forEach(m => {
      try { (toast as any).warning ? (toast as any).warning(m) : toast.message(m) } catch { toast.message(m) }
    })
  }, [computeWeekWarnings])

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
      try { showWeekWarnings(weekDate) } catch {}
      return next
    })
  }, [scheduleSaveWeek, showWeekWarnings])

  const handleImport = React.useCallback(async (importLang: 'P' | 'E' | 'T', importStart: string, importEnd: string) => {
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
        const [y, m] = w.week_date.split('/').map(x => parseInt(x, 10))
        const mid = `${y}-${String(m).padStart(2, '0')}`
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
      const msg = (e && (e.message || e.toString())) || 'Falha ao importar programação'
      toast.error(msg)
    } finally {
      setImportLoading(false)
    }
  }, [monthId, weeks])

  return {
    weeks,
    setWeeks,
    monthId,
    setMonthId,
    selectedWeekDate,
    setSelectedWeekDate,
    registers,
    regById,
    congregacaoId,
    assignByWeek,
    updateAssign,
    persistWeek,
    editingWeek,
    setEditingWeek,
    loading,
    handleImport,
    importLoading,
    monthWeeks,
    persistAssign,
    prevWeekDate,
    collectWeekIds,
  }
}