"use client"
import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { createCongregation, requestCongregationAccess, searchCongregations, getUserDoc, getCongregationDoc, updateCongregation, getRegisterDoc, type CongregationWithId } from "@/lib/firebase"
import { motion } from "framer-motion"
import Image from "next/image"
import { Building, MapPin, Map, Hash, CalendarClock, Calendar, ChevronsUpDown, Check } from "lucide-react"
import ImageHeader from "@/public/images/congregation/header.jpg"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

export default function CongregacaoPage() {
  const { user } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [nome, setNome] = React.useState("")
  const [cidade, setCidade] = React.useState("")
  const [estado, setEstado] = React.useState("")
  const [meioSemanaDia, setMeioSemanaDia] = React.useState("quarta")
  const [meioSemanaHora, setMeioSemanaHora] = React.useState("19:30")
  const [fimSemanaDia, setFimSemanaDia] = React.useState("domingo")
  const [fimSemanaHora, setFimSemanaHora] = React.useState("09:00")

  const [identifier, setIdentifier] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<CongregationWithId[]>([])
  const [loadingCreate, setLoadingCreate] = React.useState(false)
  const [loadingAccess, setLoadingAccess] = React.useState(false)

  const [myCongregationId, setMyCongregationId] = React.useState<string | null>(null)
  const [myCongregation, setMyCongregation] = React.useState<CongregationWithId | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [isElder, setIsElder] = React.useState(false)
  const [loadingMyCongregation, setLoadingMyCongregation] = React.useState(true)
  const [requestStatus, setRequestStatus] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [editNome, setEditNome] = React.useState("")
  const [editCidade, setEditCidade] = React.useState("")
  const [editEstado, setEditEstado] = React.useState("")
  const [editMeioSemanaDia, setEditMeioSemanaDia] = React.useState("quarta")
  const [editMeioSemanaHora, setEditMeioSemanaHora] = React.useState("19:30")
  const [editFimSemanaDia, setEditFimSemanaDia] = React.useState("domingo")
  const [editFimSemanaHora, setEditFimSemanaHora] = React.useState("09:00")
  const [locais, setLocais] = React.useState<string[]>([])
  const [novoLocal, setNovoLocal] = React.useState("")

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoadingMyCongregation(true)
        const uid = user?.uid
        if (!uid) return
        const u = await getUserDoc(uid)
        if (!u?.congregacaoId) return
        setRequestStatus(u.requestCongregationStatus as string)
        setMyCongregationId(u.congregacaoId)
        const c = await getCongregationDoc(u.congregacaoId)
        if (c) {
          setMyCongregation(c)
          setIsAdmin(!!c.admins?.includes(uid))
          if (u.registerCongregationId && u.registerId && u.registerCongregationId === u.congregacaoId) {
            const reg = await getRegisterDoc(u.registerCongregationId, u.registerId)
            setIsElder(reg?.privilegioServico === 'anciao')
          }
          setEditNome(c.nome)
          setEditCidade(c.cidade)
          setEditEstado(c.estado)
          setEditMeioSemanaDia(c.meioSemanaDia)
          setEditMeioSemanaHora(c.meioSemanaHora)
          setEditFimSemanaDia(c.fimSemanaDia)
          setEditFimSemanaHora(c.fimSemanaHora)
          setLocais(c.locaisPregacaoAprovados || [])
        }
      } finally {
        setLoadingMyCongregation(false)
      }
    }
    run()
  }, [user])

  const handleCreate = async () => {
    try {
      setLoadingCreate(true)
      const uid = user?.uid
      if (!uid) {
        toast.error("Você precisa estar logado")
        return
      }
      const { id } = await createCongregation({
        nome,
        cidade,
        estado,
        meioSemanaDia,
        meioSemanaHora,
        fimSemanaDia,
        fimSemanaHora,
      }, uid)
      toast.success(`Congregação criada: ${nome} (ID: ${id})`)
      setOpen(false)
      setNome("")
      setCidade("")
      setEstado("")
    } catch (e) {
      toast.error("Falha ao criar congregação")
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleAccessRequest = async () => {
    try {
      setLoadingAccess(true)
      const uid = user?.uid
      if (!uid) {
        toast.error("Você precisa estar logado")
        return
      }
      await requestCongregationAccess(uid, identifier)
      toast.success("Pedido de acesso enviado e está pendente")
    } catch (e) {
      toast.error("Congregação não encontrada ou erro ao pedir acesso")
    } finally {
      setLoadingAccess(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!myCongregationId) return
    try {
      setSaving(true)
      await updateCongregation(myCongregationId, {
        nome: editNome,
        cidade: editCidade,
        estado: editEstado,
        meioSemanaDia: editMeioSemanaDia,
        meioSemanaHora: editMeioSemanaHora,
        fimSemanaDia: editFimSemanaDia,
        fimSemanaHora: editFimSemanaHora,
        locaisPregacaoAprovados: locais,
      })
      const c = await getCongregationDoc(myCongregationId)
      setMyCongregation(c)
      setEditing(false)
      toast.success("Dados atualizados")
    } catch (e) {
      toast.error("Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const [comboOpen, setComboOpen] = React.useState(false)
  const [comboLabel, setComboLabel] = React.useState("")
  const handleSearch = React.useCallback(async (q: string) => {
    if (!q || q.trim().length === 0) {
      setSearchResults([])
      return
    }
    const res = await searchCongregations(q.trim())
    setSearchResults(res)
  }, [])

  if (loadingMyCongregation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando congregação...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-primary" />
            Congregação
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie dados da congregação e pedidos de acesso</p>
        </motion.div>

        <Separator />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card overflow-hidden">
          <div className="relative h-72 w-full">
            <Image src={ImageHeader} alt="Congregação" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Informações da congregação</div>
              {(isAdmin || isElder) && myCongregation && requestStatus === 'accepted' && (
                editing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSaveEdit} disabled={saving}>Salvar</Button>
                  </div>
                ) : (
                  <Button onClick={() => setEditing(true)}>Editar</Button>
                )
              )}
            </div>

            {requestStatus === 'pending' ? (
              <div className="text-sm text-muted-foreground">Aguardando administrador aprovar pedido</div>
            ) : requestStatus === 'accepted' && myCongregation ? (
              editing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="e-nome">Nome</Label>
                    <Input id="e-nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-cidade">Cidade</Label>
                    <Input id="e-cidade" value={editCidade} onChange={(e) => setEditCidade(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-estado">Estado</Label>
                    <Input id="e-estado" value={editEstado} onChange={(e) => setEditEstado(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-meio-dia">Dia (meio de semana)</Label>
                    <select id="e-meio-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editMeioSemanaDia} onChange={(e) => setEditMeioSemanaDia(e.target.value)}>
                      <option value="segunda">segunda</option>
                      <option value="terça">terça</option>
                      <option value="quarta">quarta</option>
                      <option value="quinta">quinta</option>
                      <option value="sexta">sexta</option>
                      <option value="sábado">sábado</option>
                      <option value="domingo">domingo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-meio-hora">Hora (meio de semana)</Label>
                    <Input id="e-meio-hora" type="time" value={editMeioSemanaHora} onChange={(e) => setEditMeioSemanaHora(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-fim-dia">Dia (fim de semana)</Label>
                    <select id="e-fim-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editFimSemanaDia} onChange={(e) => setEditFimSemanaDia(e.target.value)}>
                      <option value="sábado">sábado</option>
                      <option value="domingo">domingo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-fim-hora">Hora (fim de semana)</Label>
                    <Input id="e-fim-hora" type="time" value={editFimSemanaHora} onChange={(e) => setEditFimSemanaHora(e.target.value)} />
                  </div>
                  <div className="md:col-span-2 space-y-2 border rounded-lg p-3 bg-muted/30">
                    <div className="text-sm font-medium">Locais aprovados para saída de campo</div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="novo-local">Novo local</Label>
                        <Input id="novo-local" value={novoLocal} onChange={(e) => setNovoLocal(e.target.value)} />
                      </div>
                      <Button onClick={() => {
                        const v = novoLocal.trim()
                        if (!v) return
                        setLocais((curr) => Array.from(new Set([...curr, v])))
                        setNovoLocal("")
                      }}>Adicionar</Button>
                    </div>
                    {locais.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum local</p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {locais.map((l) => (
                          <div key={l} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <span>{l}</span>
                            <Button variant="outline" size="sm" onClick={() => setLocais((curr) => curr.filter((x) => x !== l))}>Remover</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 text-sm"><Building className="h-4 w-4" /><span className="font-medium">Nome:</span> {myCongregation.nome}</div>
                  <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /><span className="font-medium">Cidade:</span> {myCongregation.cidade}</div>
                  <div className="flex items-center gap-2 text-sm"><Map className="h-4 w-4" /><span className="font-medium">Estado:</span> {myCongregation.estado}</div>
                  <div className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4" /><span className="font-medium">Código de acesso:</span> {myCongregation.accessCode}</div>
                  <div className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4" /><span className="font-medium">Meio da semana:</span> {myCongregation.meioSemanaDia} às {myCongregation.meioSemanaHora}</div>
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /><span className="font-medium">Fim de semana:</span> {myCongregation.fimSemanaDia} às {myCongregation.fimSemanaHora}</div>
                  <div className="text-sm">
                    <span className="font-medium">Locais aprovados:</span> {(myCongregation.locaisPregacaoAprovados || []).join(', ') || 'Nenhum'}
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Sem congregação vinculada</div>
            )}
          </div>
        </motion.div>

        {requestStatus !== 'accepted' && requestStatus !== 'pending' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Criar congregação</h3>
                <Drawer open={open} onOpenChange={setOpen}>
                  <DrawerTrigger asChild>
                    <Button className="gap-2">Abrir</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Criar congregação</DrawerTitle>
                    </DrawerHeader>
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meio-dia">Dia (meio de semana)</Label>
                        <select id="meio-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={meioSemanaDia} onChange={(e) => setMeioSemanaDia(e.target.value)}>
                          <option value="segunda">segunda</option>
                          <option value="terça">terça</option>
                          <option value="quarta">quarta</option>
                          <option value="quinta">quinta</option>
                          <option value="sexta">sexta</option>
                          <option value="sábado">sábado</option>
                          <option value="domingo">domingo</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meio-hora">Horário (meio de semana)</Label>
                        <Input id="meio-hora" type="time" value={meioSemanaHora} onChange={(e) => setMeioSemanaHora(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fim-dia">Dia (fim de semana)</Label>
                        <select id="fim-dia" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={fimSemanaDia} onChange={(e) => setFimSemanaDia(e.target.value)}>
                          <option value="sábado">sábado</option>
                          <option value="domingo">domingo</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fim-hora">Horário (fim de semana)</Label>
                        <Input id="fim-hora" type="time" value={fimSemanaHora} onChange={(e) => setFimSemanaHora(e.target.value)} />
                      </div>
                    </div>
                    <DrawerFooter>
                      <div className="flex gap-2">
                        <Button onClick={handleCreate} disabled={loadingCreate || !nome || !cidade || !estado}>Salvar</Button>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
              <p className="text-xs text-muted-foreground">Crie uma nova congregação e entre como administrador.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-4 space-y-4">
              <h3 className="text-sm font-medium">Pedir acesso</h3>
              <div className="flex items-end gap-2">
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboOpen} className="w-[280px] justify-between">
                      {comboLabel || "Selecionar congregação..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <Command onValueChange={(v) => handleSearch(v)}>
                      <CommandInput placeholder="Buscar por ID, código, nome ou cidade" />
                      <CommandList>
                        <CommandEmpty>Nenhuma congregação encontrada.</CommandEmpty>
                        <CommandGroup>
                          {searchResults.map((r) => (
                            <CommandItem
                              key={r.id}
                              value={`${r.id} ${r.accessCode || ''} ${r.nome} ${r.cidade}`}
                              onSelect={() => {
                                setIdentifier(r.id)
                                setComboLabel(`${r.nome} — ${r.cidade}`)
                                setComboOpen(false)
                              }}
                            >
                              <Check className={comboLabel && identifier === r.id ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                              <span>{r.nome}</span>
                              <span className="ml-auto text-muted-foreground">{r.cidade}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button onClick={handleAccessRequest} disabled={loadingAccess || !identifier}>Pedir acesso</Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  )
}