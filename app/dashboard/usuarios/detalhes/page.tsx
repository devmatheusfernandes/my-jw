"use client"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { getUserDoc, getCongregationDoc, getRegisterDoc, updateRegister, type RegisterDoc, type UserDoc } from "@/lib/firebase"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { User, Calendar, Award, Users, Shield, Star, CheckCircle2, XCircle, UserCircle, Edit2, Check, X, Plus, Trash2 } from "lucide-react"

function UsuarioDetalhesPageContent() {
  const params = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [congregacaoId, setCongregacaoId] = React.useState<string | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [targetUser, setTargetUser] = React.useState<UserDoc | null>(null)
  const [targetRegister, setTargetRegister] = React.useState<({ id: string } & RegisterDoc) | null>(null)
  const [editingField, setEditingField] = React.useState<string | null>(null)
  const [editValues, setEditValues] = React.useState<any>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const uid = user?.uid
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setCongregacaoId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        setIsAdmin(!!c?.admins?.includes(uid))

        const qUid = params.get("uid")
        const qReg = params.get("regId")
        if (qUid) {
          const tu = await getUserDoc(qUid)
          setTargetUser(tu)
          const regId = qReg || tu?.registerId || undefined
          if (regId) {
            const tr = await getRegisterDoc(u.congregacaoId, regId)
            setTargetRegister(tr)
          }
        } else if (qReg) {
          const tr = await getRegisterDoc(u.congregacaoId, qReg)
          setTargetRegister(tr)
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user, params])

  const designationLabels: Record<string, string> = {
    leitura_biblia: "Leitura da Bíblia",
    iniciando_conversas: "Iniciando conversas",
    cultivando_interesse: "Cultivando interesse",
    fazendo_discipulos: "Fazendo discípulos",
    explicando_crencas_demonstracao: "Explicando suas crenças (demonstração)",
    audio_video: "Áudio e vídeo",
    volante: "Volante",
    palco: "Palco",
    explicando_crencas_discurso: "Explicando suas crenças (discurso)",
    discurso: "Discurso",
    indicador: "Indicador",
    discurso_tesouros: "Tesouros da Palavra de Deus",
    joias_espirituais: "Joias espirituais",
    leitor_do_estudo: "Leitor do estudo",
    estudo_biblico_congregacao: "Estudo bíblico de congregação",
    nossa_vida_crista: "Nossa vida cristã",
    presidente_meio_semana: "Presidente reunião meio de semana",
    presidente_fim_semana: "Presidente reunião fim de semana",
    leitor_sentinela: "Leitor da Sentinela",
    dirigente_sentinela: "Dirigente da Sentinela",
  }

  const responsibilityLabels: Record<string, string> = {
    coordenador: "Coordenador",
    secretario: "Secretário",
    superintendente_servico: "Superintendente de serviço",
    superintendente_audio_video: "Superintendente de áudio e vídeo",
    superintendente_vida_ministerio: "Superintendente reunião Vida e Ministério",
    superintendente_discursos_publicos: "Superintendente de discursos públicos",
    servo_contas: "Servo de contas",
    servo_publicacoes: "Servo de publicações",
    servo_carrinho: "Servo do carrinho",
    servo_territorio: "Servo de território",
    servo_limpeza: "Servo de limpeza",
    servo_quadro_anuncios: "Servo de quadro de anúncios",
    servo_audio_video: "Servo de áudio e vídeo",
    servo_discursos: "Servo de discursos",
  }

  const formatDesignation = (k: string) => designationLabels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const formatResponsibility = (k: string) => responsibilityLabels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const handleStartEdit = (field: string) => {
    if (!targetRegister) return
    setEditingField(field)
    
    switch (field) {
      case 'nomeCompleto':
        setEditValues({ nomeCompleto: targetRegister.nomeCompleto || '' })
        break
      case 'sexo':
        setEditValues({ sexo: targetRegister.sexo || '' })
        break
      case 'status':
        setEditValues({ status: targetRegister.status || '' })
        break
      case 'nascimento':
        setEditValues({ nascimento: targetRegister.nascimento || '' })
        break
      case 'batismo':
        setEditValues({ batismo: targetRegister.batismo || '' })
        break
      case 'privilegioServico':
        setEditValues({ privilegioServico: targetRegister.privilegioServico || '' })
        break
      case 'pioneiro':
        setEditValues({
          pioneiroAuxiliar: !!targetRegister.outrosPrivilegios?.pioneiroAuxiliar,
          pioneiroRegular: !!targetRegister.outrosPrivilegios?.pioneiroRegular
        })
        break
      case 'designacoes':
        setEditValues({ designacoes: targetRegister.designacoesAprovadas || [] })
        break
      case 'responsabilidades':
        setEditValues({ responsabilidades: targetRegister.responsabilidades || [] })
        break
    }
  }

  const handleSaveField = async (field: string) => {
    if (!congregacaoId || !targetRegister?.id) return
    
    try {
      setSaving(true)
      let updateData: any = {}
      
      switch (field) {
        case 'nomeCompleto':
          updateData = { nomeCompleto: editValues.nomeCompleto }
          break
        case 'sexo':
          updateData = { sexo: editValues.sexo || undefined }
          break
        case 'status':
          updateData = { status: editValues.status || undefined }
          break
        case 'nascimento':
          updateData = { nascimento: editValues.nascimento || undefined }
          break
        case 'batismo':
          updateData = { batismo: editValues.batismo || undefined }
          break
        case 'privilegioServico':
          updateData = { privilegioServico: editValues.privilegioServico || null }
          break
        case 'pioneiro':
          updateData = {
            outrosPrivilegios: {
              pioneiroAuxiliar: editValues.pioneiroAuxiliar,
              pioneiroRegular: editValues.pioneiroRegular
            }
          }
          break
        case 'designacoes':
          updateData = { designacoesAprovadas: editValues.designacoes }
          break
        case 'responsabilidades':
          updateData = { responsabilidades: editValues.responsabilidades }
          break
      }
      
      await updateRegister(congregacaoId, targetRegister.id, updateData)
      const refreshed = await getRegisterDoc(congregacaoId, targetRegister.id)
      setTargetRegister(refreshed)
      setEditingField(null)
      setEditValues({})
      toast.success("Atualizado com sucesso")
    } catch (e) {
      toast.error("Falha ao atualizar")
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValues({})
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
          <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
        </motion.div>
      </div>
    )
  }

  if (!user || !congregacaoId) {
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

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 max-w-md"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">Apenas administradores podem acessar os detalhes dos usuários.</p>
        </motion.div>
      </div>
    )
  }

  const nomeBase = targetRegister?.nomeCompleto || targetUser?.nome || "Detalhes"

  const EditableInfoCard = ({ icon: Icon, label, value, field, type = 'text', options }: {
    icon: any
    label: string
    value: string | undefined
    field: string
    type?: 'text' | 'date' | 'select'
    options?: { value: string; label: string }[]
  }) => {
    const isEditing = editingField === field
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
      >
        <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
          {isEditing ? (
            <div className="space-y-2">
              {type === 'select' ? (
                <Select value={editValues[field] || ''} onValueChange={(v) => setEditValues({ ...editValues, [field]: v })}>
                  <SelectTrigger size="sm" className="w-full h-8">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={type}
                  value={editValues[field] || ''}
                  onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                  className="h-8 text-sm"
                />
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="default" onClick={() => handleSaveField(field)} disabled={saving} className="h-7 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={saving} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium truncate flex-1">{(type === 'select' ? (options?.find(o => o.value === value)?.label || value) : value) || "—"}</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStartEdit(field)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const StatusBadge = ({ active, label }: { active: boolean; label: string }) => (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
    }`}>
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </div>
  )

  const EditableListSection = ({ icon: Icon, title, items, field, allOptions }: {
    icon: any
    title: string
    items: string[]
    field: string
    allOptions: { key: string; label: string; show: boolean }[]
  }) => {
    const isEditing = editingField === field
    const currentItems = isEditing ? editValues[field] || [] : items || []
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Icon className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => handleStartEdit(field)} className="gap-2">
              <Edit2 className="h-3 w-3" />
              Editar
            </Button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-card p-4 space-y-2 max-h-96 overflow-y-auto">
              {allOptions.filter(d => d.show).map((opt) => (
                <div key={opt.key} className="flex items-center justify-between py-1">
                  <Label className="text-sm">{opt.label}</Label>
                  <Switch
                    checked={currentItems.includes(opt.key)}
                    onCheckedChange={(checked) => {
                      const newItems = checked
                        ? [...currentItems, opt.key]
                        : currentItems.filter((i: string) => i !== opt.key)
                      setEditValues({ ...editValues, [field]: newItems })
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSaveField(field)} disabled={saving} className="gap-2">
                <Check className="h-4 w-4" />
                Salvar alterações
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : currentItems.length > 0 ? (
          <div className="grid gap-2">
            {currentItems.map((item: string, idx: number) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-sm">{field === 'designacoes' ? formatDesignation(item) : formatResponsibility(item)}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic p-3 rounded-md bg-muted/30 border">
            Nenhum item registrado
          </div>
        )}
      </motion.div>
    )
  }

  const availableDesignations = [
    { key: 'leitura_biblia', label: designationLabels['leitura_biblia'], show: targetRegister?.sexo === 'homem' },
    { key: 'iniciando_conversas', label: designationLabels['iniciando_conversas'], show: true },
    { key: 'cultivando_interesse', label: designationLabels['cultivando_interesse'], show: true },
    { key: 'fazendo_discipulos', label: designationLabels['fazendo_discipulos'], show: true },
    { key: 'explicando_crencas_demonstracao', label: designationLabels['explicando_crencas_demonstracao'], show: true },
    { key: 'audio_video', label: designationLabels['audio_video'], show: targetRegister?.sexo === 'homem' },
    { key: 'volante', label: designationLabels['volante'], show: targetRegister?.sexo === 'homem' },
    { key: 'palco', label: designationLabels['palco'], show: targetRegister?.sexo === 'homem' },
    { key: 'explicando_crencas_discurso', label: designationLabels['explicando_crencas_discurso'], show: targetRegister?.sexo === 'homem' && targetRegister?.status === 'publicador_batizado' },
    { key: 'discurso', label: designationLabels['discurso'], show: targetRegister?.sexo === 'homem' && targetRegister?.status === 'publicador_batizado' },
    { key: 'indicador', label: designationLabels['indicador'], show: targetRegister?.sexo === 'homem' },
    { key: 'discurso_tesouros', label: designationLabels['discurso_tesouros'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'joias_espirituais', label: designationLabels['joias_espirituais'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'leitor_do_estudo', label: designationLabels['leitor_do_estudo'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'estudo_biblico_congregacao', label: designationLabels['estudo_biblico_congregacao'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'nossa_vida_crista', label: designationLabels['nossa_vida_crista'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'presidente_meio_semana', label: designationLabels['presidente_meio_semana'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'presidente_fim_semana', label: designationLabels['presidente_fim_semana'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'leitor_sentinela', label: designationLabels['leitor_sentinela'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'dirigente_sentinela', label: designationLabels['dirigente_sentinela'], show: targetRegister?.privilegioServico === 'anciao' },
  ]

  const availableResponsibilities = [
    { key: 'coordenador', label: responsibilityLabels['coordenador'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'secretario', label: responsibilityLabels['secretario'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'superintendente_servico', label: responsibilityLabels['superintendente_servico'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'superintendente_audio_video', label: responsibilityLabels['superintendente_audio_video'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'superintendente_vida_ministerio', label: responsibilityLabels['superintendente_vida_ministerio'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'superintendente_discursos_publicos', label: responsibilityLabels['superintendente_discursos_publicos'], show: targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_contas', label: responsibilityLabels['servo_contas'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_publicacoes', label: responsibilityLabels['servo_publicacoes'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_carrinho', label: responsibilityLabels['servo_carrinho'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_territorio', label: responsibilityLabels['servo_territorio'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_limpeza', label: responsibilityLabels['servo_limpeza'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_quadro_anuncios', label: responsibilityLabels['servo_quadro_anuncios'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_audio_video', label: responsibilityLabels['servo_audio_video'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
    { key: 'servo_discursos', label: responsibilityLabels['servo_discursos'], show: targetRegister?.privilegioServico === 'servo_ministerial' || targetRegister?.privilegioServico === 'anciao' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{nomeBase}</h1>
              <p className="text-sm text-muted-foreground">Detalhes do publicador</p>
            </div>
          </div>
          <Separator />
        </motion.div>

        {targetRegister ? (
          <div className="space-y-6">
            {/* Informações Pessoais */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informações Pessoais
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <EditableInfoCard
                  icon={User}
                  label="Nome Completo"
                  value={targetRegister.nomeCompleto}
                  field="nomeCompleto"
                />
                <EditableInfoCard
                  icon={User}
                  label="Sexo"
                  value={targetRegister.sexo}
                  field="sexo"
                  type="select"
                  options={[
                    { value: 'homem', label: 'Homem' },
                    { value: 'mulher', label: 'Mulher' }
                  ]}
                />
                <EditableInfoCard
                  icon={Shield}
                  label="Status"
                  value={targetRegister.status}
                  field="status"
                  type="select"
                  options={[
                    { value: 'publicador_nao_batizado', label: 'Publicador não batizado' },
                    { value: 'publicador_batizado', label: 'Publicador Batizado' }
                  ]}
                />
              </div>
            </motion.div>

            {/* Datas Importantes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Datas Importantes
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <EditableInfoCard
                  icon={Calendar}
                  label="Data de Nascimento"
                  value={targetRegister.nascimento}
                  field="nascimento"
                  type="date"
                />
                <EditableInfoCard
                  icon={Calendar}
                  label="Data de Batismo"
                  value={targetRegister.batismo}
                  field="batismo"
                  type="date"
                />
              </div>
            </motion.div>

            {/* Privilégios */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Privilégios
              </h3>
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <EditableInfoCard
                  icon={Award}
                  label="Privilégio de Serviço"
                  value={targetRegister.privilegioServico ?? undefined}
                  field="privilegioServico"
                  type="select"
                  options={[
                    { value: 'servo_ministerial', label: 'Servo ministerial' },
                    { value: 'anciao', label: 'Ancião' }
                  ]}
                />
                
                {editingField === 'pioneiro' ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Serviço de Pioneiro</div>
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Label>Pioneiro Auxiliar</Label>
                        <Switch
                          checked={editValues.pioneiroAuxiliar}
                          onCheckedChange={(checked) => setEditValues({ ...editValues, pioneiroAuxiliar: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Pioneiro Regular</Label>
                        <Switch
                          checked={editValues.pioneiroRegular}
                          onCheckedChange={(checked) => setEditValues({ ...editValues, pioneiroRegular: checked })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleSaveField('pioneiro')} disabled={saving} size="sm" className="gap-2">
                        <Check className="h-4 w-4" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={saving} size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Serviço de Pioneiro</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEdit('pioneiro')}
                        className="gap-2"
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        active={!!targetRegister.outrosPrivilegios?.pioneiroAuxiliar}
                        label="Pioneiro Auxiliar"
                      />
                      <StatusBadge
                        active={!!targetRegister.outrosPrivilegios?.pioneiroRegular}
                        label="Pioneiro Regular"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Designações */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <EditableListSection
                icon={Star}
                title="Designações Aprovadas"
                items={targetRegister.designacoesAprovadas || []}
                field="designacoes"
                allOptions={availableDesignations}
              />
            </motion.div>

            {/* Responsabilidades */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <EditableListSection
                icon={Shield}
                title="Responsabilidades"
                items={targetRegister.responsabilidades || []}
                field="responsabilidades"
                allOptions={availableResponsibilities}
              />
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border bg-muted/30 p-8 text-center"
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Registro não encontrado</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function UsuarioDetalhesPage() {
  return (
    <React.Suspense fallback={<div className="p-4">Carregando...</div>}>
      <UsuarioDetalhesPageContent />
    </React.Suspense>
  )
}