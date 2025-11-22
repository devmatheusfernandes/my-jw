"use client"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/components/providers/auth-provider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { MapPin, Home, CalendarDays, Clock, Users, MapPinned, Package, Info, CheckCircle2, XCircle, Wrench } from "lucide-react"
import { listTerritories, getUserDoc, closeTerritoryRecordForUser, deleteOpenTerritoryRecordForUser, getPregacaoFixed, getPregacaoMonth, getMidweekAssignmentsMonth, getWeekendAssignmentsMonth, type TerritoryDoc, type PregacaoFixedDoc, type PregacaoMonthDoc, type PregacaoEntry } from "@/lib/firebase"
import talks from "@/locales/pt-br/weekend-meeting/public-talks/public_talks.json"
import songs from "@/locales/pt-br/songs.json"
import { designationLabels } from "@/types/register-labels"

export default function Page() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [territories, setTerritories] = React.useState<({ id: string } & TerritoryDoc)[]>([])
  const [openReturn, setOpenReturn] = React.useState(false)
  const [activeTerritoryId, setActiveTerritoryId] = React.useState<string | null>(null)
  const [finishDate, setFinishDate] = React.useState<Date | undefined>(undefined)
  const [observacoes, setObservacoes] = React.useState("")
  const uid = user?.uid
  const [userRegisterId, setUserRegisterId] = React.useState<string | null>(null)
  const [fixedPregacao, setFixedPregacao] = React.useState<PregacaoFixedDoc | null>(null)
  const [monthId, setMonthId] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [monthlyPregacao, setMonthlyPregacao] = React.useState<PregacaoMonthDoc | null>(null)
  const [midweekAssignments, setMidweekAssignments] = React.useState<Record<string, any>>({})
  const [selectedMidweekDate, setSelectedMidweekDate] = React.useState<string>("")
  const [midweekView, setMidweekView] = React.useState<"semanal" | "mensal">("semanal")
  const [weekendAssignments, setWeekendAssignments] = React.useState<Record<string, any>>({})

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        setUserRegisterId(u.registerId || null)
        const ts = await listTerritories(u.congregacaoId)
        setTerritories(ts)
        const fp = await getPregacaoFixed(u.congregacaoId)
        setFixedPregacao(fp)
        const mp = await getPregacaoMonth(u.congregacaoId, monthId)
        setMonthlyPregacao(mp)
        const am = await getMidweekAssignmentsMonth(u.congregacaoId, monthId)
        if (am?.weeks) {
          const m: Record<string, any> = {}
          Object.entries(am.weeks).forEach(([k, v]) => { m[k.replace(/-/g, "/")] = v })
          setMidweekAssignments(m)
        } else {
          setMidweekAssignments({})
        }
        try {
          const wam = await getWeekendAssignmentsMonth(u.congregacaoId, monthId)
          if (wam?.weeks) {
            const wmap: Record<string, any> = {}
            Object.entries(wam.weeks).forEach(([k, v]) => { wmap[k.replace(/-/g, "/")] = v })
            setWeekendAssignments(wmap)
          } else {
            setWeekendAssignments({})
          }
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [uid, monthId])

  React.useEffect(() => {
    const loadMonthly = async () => {
      if (!congregacaoId) return
      const mp = await getPregacaoMonth(congregacaoId, monthId)
      setMonthlyPregacao(mp)
    }
    loadMonthly()
  }, [congregacaoId, monthId])

  const myMidweekWeeks = React.useMemo(() => {
    if (!userRegisterId) return [] as { weekDate: string; roles: string[] }[]
    const keys = [
      "presidente","oracao_inicial","oracao_final","leitura",
      "tgw_discurso_orador","tgw_joias_dirigente",
      "ayf_part1_estudante","ayf_part1_ajudante",
      "ayf_part2_estudante","ayf_part2_ajudante",
      "ayf_part3_estudante","ayf_part3_ajudante",
      "ayf_part4_estudante","ayf_part4_ajudante",
      "lc_part1_apresentador","lc_part2_apresentador",
      "lc_cbs_dirigente","lc_cbs_leitor",
      "lc_superintendente_orador",
    ]
    const labelMap: Record<string, string> = {
      presidente: "Presidente",
      oracao_inicial: "Oração inicial",
      oracao_final: "Oração final",
      leitura: "Leitor",
      tgw_discurso_orador: "Orador (Tesouros)",
      tgw_joias_dirigente: "Dirigente (Joias)",
      ayf_part1_estudante: "AYF Parte 1 — Estudante",
      ayf_part1_ajudante: "AYF Parte 1 — Ajudante",
      ayf_part2_estudante: "AYF Parte 2 — Estudante",
      ayf_part2_ajudante: "AYF Parte 2 — Ajudante",
      ayf_part3_estudante: "AYF Parte 3 — Estudante",
      ayf_part3_ajudante: "AYF Parte 3 — Ajudante",
      ayf_part4_estudante: "AYF Parte 4 — Estudante",
      ayf_part4_ajudante: "AYF Parte 4 — Ajudante",
      lc_part1_apresentador: "Nossa vida cristã — Parte 1",
      lc_part2_apresentador: "Nossa vida cristã — Parte 2",
      lc_cbs_dirigente: "Estudo bíblico — Dirigente",
      lc_cbs_leitor: "Estudo bíblico — Leitor",
      lc_superintendente_orador: "Orador (Superintendente)",
    }
    const parse = (wd: string) => {
      const [y,m,d] = wd.split("/").map(x=>parseInt(x,10)); return new Date(y, m-1, d).getTime()
    }
    const out: { weekDate: string; roles: string[] }[] = []
    Object.entries(midweekAssignments).forEach(([wd, a]) => {
      const roles = keys.filter(k => a && a[k] && a[k] === userRegisterId).map(k => labelMap[k])
      if (roles.length > 0) out.push({ weekDate: wd, roles })
    })
    return out.sort((a,b)=>parse(a.weekDate)-parse(b.weekDate))
  }, [midweekAssignments, userRegisterId])

  const myWeekendWeeks = React.useMemo(() => {
    if (!userRegisterId) return [] as { weekDate: string; roles: string[]; details?: { tema?: string; cantico?: string } }[]
    const parse = (wd: string) => { const [y,m,d] = wd.split("/").map(x=>parseInt(x,10)); return new Date(y, m-1, d).getTime() }
    const out: { weekDate: string; roles: string[]; details?: { tema?: string; cantico?: string } }[] = []
    Object.entries(weekendAssignments).forEach(([wd, a]: [string, any]) => {
      const roles: string[] = []
      if (a?.presidente_fim_semana && a.presidente_fim_semana === userRegisterId) roles.push("Presidente fim de semana")
      if (a?.dirigente_sentinela && a.dirigente_sentinela === userRegisterId) roles.push("Dirigente da Sentinela")
      if (a?.leitor_sentinela && a.leitor_sentinela === userRegisterId) roles.push("Leitor da Sentinela")
      if (a?.orador_register_id && a.orador_register_id === userRegisterId) {
        const tema = a.discurso_publico_tema ? String((talks as any)[a.discurso_publico_tema] || "") : undefined
        const cantico = a.discurso_publico_cantico ? String((songs as any)[a.discurso_publico_cantico] || "") : undefined
        roles.push("Orador do discurso público")
        out.push({ weekDate: wd, roles, details: { tema, cantico } })
        return
      }
      if (a?.hospitalidade_register_id && a.hospitalidade_register_id === userRegisterId) roles.push("Hospitalidade ao orador")
      if (roles.length > 0) out.push({ weekDate: wd, roles })
    })
    return out.sort((a,b)=>parse(a.weekDate)-parse(b.weekDate))
  }, [weekendAssignments, userRegisterId])

  const myMechanicalMidweek = React.useMemo(() => {
    if (!userRegisterId) return [] as { weekDate: string; roles: string[] }[]
    const parse = (wd: string) => { const [y,m,d] = wd.split("/").map(x=>parseInt(x,10)); return new Date(y, m-1, d).getTime() }
    const keys = ["audio_video","volante","palco","indicador_porta","indicador_palco"]
    const labels: Record<string, string> = {
      audio_video: designationLabels.audio_video,
      volante: designationLabels.volante,
      palco: designationLabels.palco,
      indicador_porta: designationLabels.indicador_porta,
      indicador_palco: designationLabels.indicador_palco,
    }
    const out: { weekDate: string; roles: string[] }[] = []
    Object.entries(midweekAssignments).forEach(([wd, a]) => {
      const roles = keys.filter(k => a && a[k] && a[k] === userRegisterId).map(k => labels[k])
      if (roles.length > 0) out.push({ weekDate: wd, roles })
    })
    return out.sort((a,b)=>parse(a.weekDate)-parse(b.weekDate))
  }, [midweekAssignments, userRegisterId])

  const myMechanicalWeekend = React.useMemo(() => {
    if (!userRegisterId) return [] as { weekDate: string; roles: string[] }[]
    const parse = (wd: string) => { const [y,m,d] = wd.split("/").map(x=>parseInt(x,10)); return new Date(y, m-1, d).getTime() }
    const keys = ["audio_video","volante","palco","indicador_porta","indicador_palco"]
    const labels: Record<string, string> = {
      audio_video: designationLabels.audio_video,
      volante: designationLabels.volante,
      palco: designationLabels.palco,
      indicador_porta: designationLabels.indicador_porta,
      indicador_palco: designationLabels.indicador_palco,
    }
    const out: { weekDate: string; roles: string[] }[] = []
    Object.entries(weekendAssignments).forEach(([wd, a]) => {
      const roles = keys.filter(k => a && a[k] && a[k] === userRegisterId).map(k => labels[k])
      if (roles.length > 0) out.push({ weekDate: wd, roles })
    })
    return out.sort((a,b)=>parse(a.weekDate)-parse(b.weekDate))
  }, [weekendAssignments, userRegisterId])

  React.useEffect(() => {
    if (myMidweekWeeks.length === 0) { setSelectedMidweekDate(""); return }
    const now = new Date()
    const match = myMidweekWeeks.find(w => {
      const [y,m,d] = w.weekDate.split("/").map(x=>parseInt(x,10))
      const wd = new Date(y, m-1, d)
      const diff = now.getTime() - wd.getTime()
      return diff >= 0 && diff < 7 * 86400000
    })
    setSelectedMidweekDate(match ? match.weekDate : myMidweekWeeks[0].weekDate)
  }, [myMidweekWeeks])

  const myOpenAssignments = React.useMemo(() => {
    if (!uid) return [] as ({ id: string } & TerritoryDoc)[]
    return territories.filter((t) => (t.registros || []).some((r) => (userRegisterId ? r.assignedRegisterIds?.includes(userRegisterId) : false) && !r.finishedAt))
  }, [territories, userRegisterId])

  const openRecordByTerritoryId = React.useMemo(() => {
    const m: Record<string, { startedAt: string }> = {}
    territories.forEach((t) => {
      const r = (t.registros || []).find((r) => r.assignedRegisterIds?.includes(userRegisterId || "") && !r.finishedAt)
      if (r) m[t.id] = { startedAt: r.startedAt }
    })
    return m
  }, [territories, userRegisterId])

  const handleOpenDevolver = (territoryId: string) => {
    setActiveTerritoryId(territoryId)
    setFinishDate(undefined)
    setObservacoes("")
    setOpenReturn(true)
  }

  const handleConfirmDevolver = async () => {
    if (!userRegisterId || !congregacaoId || !activeTerritoryId) return
    const d = finishDate
    if (!d) {
      toast.error("Selecione a data de devolução")
      return
    }
    const started = openRecordByTerritoryId[activeTerritoryId]?.startedAt
    if (started) {
      const sDate = new Date(started)
      if (d < new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate())) {
        toast.error("A data deve ser igual ou após o início")
        return
      }
    }
    const iso = d.toISOString().slice(0, 10)
    try {
      await closeTerritoryRecordForUser(congregacaoId, activeTerritoryId, userRegisterId, iso, observacoes.trim() || undefined)
      toast.success("Território devolvido")
      const ts = await listTerritories(congregacaoId)
      setTerritories(ts)
      setOpenReturn(false)
    } catch (e) {
      toast.error("Falha ao devolver território")
    }
  }

  const handleNaoTrabalhado = async () => {
    if (!userRegisterId || !congregacaoId || !activeTerritoryId) return
    try {
      await deleteOpenTerritoryRecordForUser(congregacaoId, activeTerritoryId, userRegisterId)
      toast.success("Registro removido")
      const ts = await listTerritories(congregacaoId)
      setTerritories(ts)
      setOpenReturn(false)
    } catch (e) {
      toast.error("Falha ao remover registro")
    }
  }

  const DAYS: { key: string; label: string; shortLabel: string }[] = [
    { key: "segunda", label: "Segunda-feira", shortLabel: "Seg" },
    { key: "terça", label: "Terça-feira", shortLabel: "Ter" },
    { key: "quarta", label: "Quarta-feira", shortLabel: "Qua" },
    { key: "quinta", label: "Quinta-feira", shortLabel: "Qui" },
    { key: "sexta", label: "Sexta-feira", shortLabel: "Sex" },
    { key: "sábado", label: "Sábado", shortLabel: "Sáb" },
    { key: "domingo", label: "Domingo", shortLabel: "Dom" },
  ]

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

  const myFixedLeadership = React.useMemo(() => {
    if (!userRegisterId || !fixedPregacao) return [] as { dayLabel: string; slot: PregacaoEntry }[]
    const out: { dayLabel: string; slot: PregacaoEntry }[] = []
    DAYS.forEach((d) => {
      const arr = fixedPregacao.porDia?.[d.key] || []
      arr.forEach((slot) => {
        if (slot.dirigenteRegisterId && slot.dirigenteRegisterId === userRegisterId) {
          out.push({ dayLabel: d.label, slot })
        }
      })
    })
    return out
  }, [fixedPregacao, userRegisterId])

  const myMonthlyLeadership = React.useMemo(() => {
    if (!userRegisterId || !monthlyPregacao) return [] as { dayLabel: string; date: Date; slot: PregacaoEntry }[]
    const out: { dayLabel: string; date: Date; slot: PregacaoEntry }[] = []
    DAYS.forEach((d) => {
      const entries = monthlyPregacao.porDiaSemanas?.[d.key] || []
      const dates = weekDatesForMonth(monthId, d.key)
      entries.forEach((slot, idx) => {
        if (slot.dirigenteRegisterId && slot.dirigenteRegisterId === userRegisterId && dates[idx]) {
          out.push({ dayLabel: d.label, date: dates[idx], slot })
        }
      })
    })
    return out
  }, [monthlyPregacao, userRegisterId, monthId, weekDatesForMonth])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-3"
        >
          <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Home className="h-7 w-7 text-primary" />
            Página Inicial
          </h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas atividades e designações</p>
        </motion.div>

        <Separator />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Minhas Designações — Mecânicas</h2>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="mechMonthId" className="text-xs whitespace-nowrap">Mês:</Label>
              <Input id="mechMonthId" type="month" value={monthId} onChange={(e)=>setMonthId(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Meio de Semana</div>
              {myMechanicalMidweek.length === 0 ? (
                <div className="text-xs text-muted-foreground rounded-lg border bg-muted/30 p-3">Nenhuma mecânica neste mês</div>
              ) : (
                <div className="space-y-2">
                  {myMechanicalMidweek.map((w, idx) => (
                    <motion.div key={`mm-${w.weekDate}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="rounded-md bg-muted/50 p-3 space-y-1.5">
                      <div className="font-medium text-sm">Semana {w.weekDate.replace(/\//g, '-')}</div>
                      <ul className="text-sm space-y-1">
                        {w.roles.map((r,i)=> (<li key={i} className="flex items-center gap-2">• <span>{r}</span></li>))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Fim de Semana</div>
              {myMechanicalWeekend.length === 0 ? (
                <div className="text-xs text-muted-foreground rounded-lg border bg-muted/30 p-3">Nenhuma mecânica neste mês</div>
              ) : (
                <div className="space-y-2">
                  {myMechanicalWeekend.map((w, idx) => (
                    <motion.div key={`mw-${w.weekDate}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="rounded-md bg-muted/50 p-3 space-y-1.5">
                      <div className="font-medium text-sm">Semana {w.weekDate.replace(/\//g, '-')}</div>
                      <ul className="text-sm space-y-1">
                        {w.roles.map((r,i)=> (<li key={i} className="flex items-center gap-2">• <span>{r}</span></li>))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Territories Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Meus Territórios</h2>
            {myOpenAssignments.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {myOpenAssignments.length}
              </span>
            )}
          </div>

          {myOpenAssignments.length === 0 ? (
            <div className="text-center py-12 rounded-lg border bg-muted/30">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Você não possui territórios designados no momento</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {myOpenAssignments.map((t, idx) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg">{t.codigo}</div>
                          <div className="text-sm text-muted-foreground">{t.cidade}</div>
                        </div>
                      </div>

                      {openRecordByTerritoryId[t.id] && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                          Iniciado em: {new Date(openRecordByTerritoryId[t.id].startedAt).toLocaleDateString('pt-BR')}
                        </div>
                      )}

                      <Button
                        onClick={() => handleOpenDevolver(t.id)}
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Devolver Território
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        <Separator />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Minhas Designações — Fim de Semana</h2>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="weekendMonthId" className="text-xs whitespace-nowrap">Mês:</Label>
              <Input id="weekendMonthId" type="month" value={monthId} onChange={(e)=>setMonthId(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
          </div>

          {myWeekendWeeks.length === 0 ? (
            <div className="text-center py-12 rounded-lg border bg-muted/30">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma designação neste mês</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myWeekendWeeks.map((w, idx) => (
                <motion.div
                  key={`wk-${w.weekDate}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-md bg-muted/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">Semana {w.weekDate.replace(/\//g, '-')}</div>
                      {w.details?.tema && (
                        <div className="text-xs text-muted-foreground">Tema: {w.details.tema}</div>
                      )}
                      {w.details?.cantico && (
                        <div className="text-xs text-muted-foreground">Cântico: {w.details.cantico}</div>
                      )}
                    </div>
                  </div>
                  <ul className="text-sm space-y-1">
                    {w.roles.map((r,i)=> (<li key={i} className="flex items-center gap-2">• <span>{r}</span></li>))}
                  </ul>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <Separator />

        {/* Leadership Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Minhas Designações como Dirigente</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Fixed Leadership */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <div className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Programação Fixa
                </div>
              </div>
              <div className="p-4">
                {myFixedLeadership.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma designação fixa
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myFixedLeadership.map((it, idx) => (
                      <motion.div
                        key={`fx-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-md bg-muted/50 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{it.dayLabel}</span>
                          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                            {it.slot.hora}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{it.slot.local}</span>
                        </div>
                        {it.slot.observacoes && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>{it.slot.observacoes}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Leadership */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Programação Mensal
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="monthId" className="text-xs whitespace-nowrap">Mês:</Label>
                  <Input
                    id="monthId"
                    type="month"
                    value={monthId}
                    onChange={(e) => setMonthId(e.target.value)}
                    className="h-8 w-36 text-xs"
                  />
                </div>
              </div>
              <div className="p-4">
                {myMonthlyLeadership.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma designação neste mês
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myMonthlyLeadership.sort((a, b) => a.date.getTime() - b.date.getTime()).map((it, idx) => (
                      <motion.div
                        key={`mn-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-md bg-muted/50 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-medium text-sm">{it.dayLabel}</div>
                            <div className="text-xs text-muted-foreground">
                              {it.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                            {it.slot.hora}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{it.slot.local}</span>
                        </div>
                        {it.slot.observacoes && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>{it.slot.observacoes}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <Separator />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Minhas Designações — Meio de Semana</h2>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="midweekMonthId" className="text-xs whitespace-nowrap">Mês:</Label>
              <Input id="midweekMonthId" type="month" value={monthId} onChange={(e)=>setMonthId(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant={midweekView==='semanal'?'default':'outline'} onClick={()=>setMidweekView('semanal')}>Semanal</Button>
            <Button size="sm" variant={midweekView==='mensal'?'default':'outline'} onClick={()=>setMidweekView('mensal')}>Mensal</Button>
          </div>

          {midweekView === 'semanal' ? (
            <div className="space-y-4">
              {myMidweekWeeks.length === 0 ? (
                <div className="text-center py-12 rounded-lg border bg-muted/30">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhuma designação neste mês</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {myMidweekWeeks.map((w) => (
                      <Button
                        key={w.weekDate}
                        variant={selectedMidweekDate === w.weekDate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMidweekDate(w.weekDate)}
                        className="whitespace-nowrap flex-shrink-0"
                      >
                        {(() => { const [y,m,d] = w.weekDate.split('/'); return `${d}/${m}` })()}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    {myMidweekWeeks.filter(w=>w.weekDate===selectedMidweekDate).map((w)=> (
                      <div key={w.weekDate} className="space-y-2">
                        <div className="text-sm font-semibold">{selectedMidweekDate.replace(/\//g, '-')}</div>
                        <ul className="text-sm space-y-1">
                          {w.roles.map((r,i)=> (<li key={i} className="flex items-center gap-2">• <span>{r}</span></li>))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {myMidweekWeeks.length === 0 ? (
                <div className="text-center py-12 rounded-lg border bg-muted/30">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhuma designação neste mês</p>
                </div>
              ) : (
                myMidweekWeeks.map((w, idx) => (
                  <motion.div
                    key={w.weekDate}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-md bg-muted/50 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">Semana {w.weekDate.replace(/\//g, '-')}</div>
                      </div>
                    </div>
                    <ul className="text-sm space-y-1">
                      {w.roles.map((r,i)=> (<li key={i} className="flex items-center gap-2">• <span>{r}</span></li>))}
                    </ul>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Return Territory Drawer */}
      <Drawer open={openReturn} onOpenChange={setOpenReturn}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Devolver Território</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Data de devolução *</Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={finishDate}
                  onSelect={(d) => setFinishDate(d || undefined)}
                  fromDate={activeTerritoryId ? new Date(openRecordByTerritoryId[activeTerritoryId]?.startedAt || new Date()) : undefined}
                  className="rounded-md border"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Observações (opcional)</Label>
              <textarea
                className="w-full min-h-[280px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre o trabalho realizado..."
              />
            </div>
          </div>
          <DrawerFooter>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleConfirmDevolver} disabled={!finishDate} className="flex-1 gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Devolução
              </Button>
              <Button variant="outline" onClick={handleNaoTrabalhado} className="flex-1 gap-2">
                <XCircle className="h-4 w-4" />
                Não Trabalhado
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}