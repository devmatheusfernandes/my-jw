"use client"
import * as React from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { motion } from "framer-motion"
import { Building2, User, Mail, IdCard, AlertCircle } from "lucide-react"
import { getUserDoc, getCongregationDoc, db, type UserDoc } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export default function MeuPerfilPage() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [userDoc, setUserDoc] = React.useState<UserDoc | null>(null)
  const [congregacaoNome, setCongregacaoNome] = React.useState<string>("")
  const [registerNome, setRegisterNome] = React.useState<string>("")

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        const uid = user?.uid
        if (!uid) return
        const ud = await getUserDoc(uid)
        setUserDoc(ud)
        if (ud?.congregacaoId) {
          const c = await getCongregationDoc(ud.congregacaoId)
          setCongregacaoNome(c?.nome || "")
        }
        if (ud?.registerCongregationId && ud?.registerId) {
          try {
            const ref = doc(db, 'congregations', ud.registerCongregationId, 'register', ud.registerId)
            const snap = await getDoc(ref)
            if (snap.exists()) {
              const data = snap.data() as { nomeCompleto?: string }
              setRegisterNome(data?.nomeCompleto || ud.registerId)
            }
          } catch {}
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user?.uid])

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Faça login para ver seu perfil.</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Meu Perfil</h2>
      </div>

      {loading ? (
        <div className="min-h-32 flex items-center justify-center"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL || ""} alt={user.displayName || "Usuário"} />
              <AvatarFallback>{(user.displayName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /> <span className="font-medium">Nome:</span> {user.displayName || "—"}</div>
              <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4" /> <span className="font-medium">Email:</span> <span className="break-all">{user.email || "—"}</span></div>
            </div>
          </motion.div>

          {!userDoc?.registerId && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Sem registro associado</div>
                  <div className="text-xs text-muted-foreground">Você não está vinculado a nenhum registro da congregação. Peça a um administrador para associar seu usuário a um registro.</div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card p-4 grid gap-2">
            <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /> <span className="font-medium">Congregação:</span> {congregacaoNome || "—"}</div>
            <div className="flex items-center gap-2 text-sm"><IdCard className="h-4 w-4" /> <span className="font-medium">Registro:</span> {userDoc?.registerId ? (<span>{userDoc.registerId}{registerNome ? ` — ${registerNome}` : ''}</span>) : '—'}</div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
