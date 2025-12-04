"use client"

import * as React from "react"
import { Home, User, Users, Settings, Calendar, BaggageClaim } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/components/providers/auth-provider"
import { getUserDoc, getRegisterDoc, getCongregationDoc } from "@/lib/firebase"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const [hasCongregation, setHasCongregation] = React.useState(false)
  const [canSeePeople, setCanSeePeople] = React.useState(false)
  const [canSeeTerritory, setCanSeeTerritory] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)
  React.useEffect(() => {
    const run = async () => {
      const uid = user?.uid
      if (!uid) { setHasCongregation(false); setIsAdmin(false); return }
      const u = await getUserDoc(uid)
      setHasCongregation(!!u?.congregacaoId)
      try {
        let resolvedAdmin = false
        if (u?.congregacaoId) {
          const cong = await getCongregationDoc(u.congregacaoId)
          const admins = cong?.admins || []
          resolvedAdmin = Array.isArray(admins) && admins.includes(uid)
          setIsAdmin(!!resolvedAdmin)
        } else {
          setIsAdmin(false)
        }
        
        if (resolvedAdmin) {
          setCanSeePeople(true)
          setCanSeeTerritory(true)
          return
        }
      } catch { setIsAdmin(false) }
      try {
        if (u?.congregacaoId && u.registerId) {
          const reg = await getRegisterDoc(u.congregacaoId, u.registerId)
          const responsabilidades = reg?.responsabilidades || []
          const priv = reg?.privilegioServico || null
          const peopleAllowed = responsabilidades.includes('coordenador') || priv === 'servo_ministerial'
          const territoryAllowed = priv === 'anciao' || responsabilidades.includes('servo_carrinho') || responsabilidades.includes('servo_territorio') || responsabilidades.includes('secretario') || responsabilidades.includes('superintendente_servico')
          setCanSeePeople(peopleAllowed)
          setCanSeeTerritory(territoryAllowed)
        } else {
          setCanSeePeople(false)
          setCanSeeTerritory(false)
        }
      } catch {
        setCanSeePeople(false)
        setCanSeeTerritory(false)
      }
    }
    run()
  }, [user?.uid])

  const navMain = React.useMemo(() => {
    const base = [
      { title: "Início", url: "/dashboard", icon: Home, isActive: true },
      { title: "Meu Perfil", url: "/dashboard/meu-perfil", icon: User },
    ]
    const congregacaoCollapsed = { title: "Congregação", url: "/dashboard/congregacao", icon: Users, items: [
      { title: "Congregação", url: "/dashboard/congregacao" },
    ] }
    const congregacaoFullItems: any[] = [
      { title: "Congregação", url: "/dashboard/congregacao" },
      { title: "Limpeza", url: "/dashboard/limpeza" },
    ]
    if (canSeePeople) {
      congregacaoFullItems.unshift({ title: "Pessoas", url: "/dashboard/usuarios" })
    }
    const congregacaoFull = { title: "Congregação", url: "/dashboard/congregacao", icon: Users, items: congregacaoFullItems }
    const settings = { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings }
    if (!hasCongregation) {
      return [...base, congregacaoCollapsed, settings]
    }
    const meetings = { title: "Reuniões", url: "/dashboard/reuniao/meio-de-semana", icon: Calendar, items: [
      { title: "Fim de semana", url: "/dashboard/reuniao/fim-de-semana" },
      { title: "Meio de semana", url: "/dashboard/reuniao/meio-de-semana" },
      { title: "Mecânicas", url: "/dashboard/reuniao/mecanicas" },
    ] }
    const pregacaoItems: any[] = [
      { title: "Campo", url: "/dashboard/pregacao" },
      { title: "Carrinhos", url: "/dashboard/pregacao/carrinhos" },
    ]
    if (canSeeTerritory) {
      pregacaoItems.push({ title: "Territorio", url: "/dashboard/territorio" })
    }
    const pregacao = { title: "Pregação", url: "/dashboard/pregacao", icon: BaggageClaim, items: pregacaoItems }
    return [...base, congregacaoFull, meetings, pregacao, settings]
  }, [hasCongregation, canSeePeople, canSeeTerritory])
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader />

      <SidebarContent>
        <NavMain items={navMain as any} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
