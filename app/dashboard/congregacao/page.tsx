"use client"
import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { createCongregation, requestCongregationAccess, findCongregationsByName, getUserDoc, getCongregationDoc, updateCongregation, type CongregationWithId } from "@/lib/firebase"

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
  const [searchResults, setSearchResults] = React.useState<{ id: string; nome: string }[]>([])
  const [loadingCreate, setLoadingCreate] = React.useState(false)
  const [loadingAccess, setLoadingAccess] = React.useState(false)

  const [myCongregationId, setMyCongregationId] = React.useState<string | null>(null)
  const [myCongregation, setMyCongregation] = React.useState<CongregationWithId | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
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
          setEditNome(c.nome)
          setEditCidade(c.cidade)
          setEditEstado(c.estado)
          setEditMeioSemanaDia(c.meioSemanaDia)
          setEditMeioSemanaHora(c.meioSemanaHora)
          setEditFimSemanaDia(c.fimSemanaDia)
          setEditFimSemanaHora(c.fimSemanaHora)
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

  const handleSearchByName = async () => {
    try {
      const results = await findCongregationsByName(identifier)
      setSearchResults(results.map((r) => ({ id: r.id, nome: r.nome })))
      if (results.length === 0) {
        toast.info("Nenhuma congregação encontrada com esse nome")
      }
    } catch (err) {
      toast.error("Erro ao buscar congregações")
    }
  }

  if (loadingMyCongregation) {
    return (<div className="p-4 space-y-6"><h2 className="text-xl font-semibold">Congregação</h2><p className="text-sm">Carregando...</p></div>)
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Congregação</h2>
      {requestStatus === 'pending' && (
        <div className="text-sm text-muted-foreground">Pedido de acesso pendente</div>
      )}

      {myCongregation ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">ID: {myCongregation.id}</div>
            {isAdmin && (
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

          {editing ? (
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
                <select id="e-meio-dia" className="h-9 rounded-md border px-2" value={editMeioSemanaDia} onChange={(e) => setEditMeioSemanaDia(e.target.value)}>
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
                <select id="e-fim-dia" className="h-9 rounded-md border px-2" value={editFimSemanaDia} onChange={(e) => setEditFimSemanaDia(e.target.value)}>
                  <option value="sábado">sábado</option>
                  <option value="domingo">domingo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-fim-hora">Hora (fim de semana)</Label>
                <Input id="e-fim-hora" type="time" value={editFimSemanaHora} onChange={(e) => setEditFimSemanaHora(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="text-sm"><span className="font-medium">Nome:</span> {myCongregation.nome}</div>
              <div className="text-sm"><span className="font-medium">Cidade:</span> {myCongregation.cidade}</div>
              <div className="text-sm"><span className="font-medium">Estado:</span> {myCongregation.estado}</div>
              <div className="text-sm"><span className="font-medium">Código de acesso:</span> {myCongregation.accessCode}</div>
              <div className="text-sm"><span className="font-medium">Meio da semana:</span> {myCongregation.meioSemanaDia} às {myCongregation.meioSemanaHora}</div>
              <div className="text-sm"><span className="font-medium">Fim de semana:</span> {myCongregation.fimSemanaDia} às {myCongregation.fimSemanaHora}</div>
            </div>
          )}
        </div>
      ) : (
      <div className="flex flex-wrap gap-3">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="default">Criar congregação</Button>
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
                <select id="meio-dia" className="h-9 rounded-md border px-2" value={meioSemanaDia} onChange={(e) => setMeioSemanaDia(e.target.value)}>
                  {['segunda','terca','quarta','quinta','sexta'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meio-hora">Horário (meio de semana)</Label>
                <Input id="meio-hora" type="time" value={meioSemanaHora} onChange={(e) => setMeioSemanaHora(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fim-dia">Dia (fim de semana)</Label>
                <select id="fim-dia" className="h-9 rounded-md border px-2" value={fimSemanaDia} onChange={(e) => setFimSemanaDia(e.target.value)}>
                  {['sabado','domingo'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fim-hora">Horário (fim de semana)</Label>
                <Input id="fim-hora" type="time" value={fimSemanaHora} onChange={(e) => setFimSemanaHora(e.target.value)} />
              </div>
            </div>
            <DrawerFooter>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={loadingCreate}>Salvar</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="identifier">ID ou Nome da congregação</Label>
              <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            <Button variant="outline" onClick={handleSearchByName}>Buscar</Button>
            <Button onClick={handleAccessRequest} disabled={loadingAccess}>Pedir acesso</Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Resultados:</p>
              <ul className="text-sm">
                {searchResults.map((r) => (
                  <li key={r.id}>{r.nome} — ID: {r.id}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}