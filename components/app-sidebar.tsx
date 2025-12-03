"use client"

import * as React from "react"
import { Home, User, Users, Settings, Map, Calendar, WashingMachine, BaggageClaim } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/components/providers/auth-provider"
import { getUserDoc } from "@/lib/firebase"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const [hasCongregation, setHasCongregation] = React.useState(false)
  React.useEffect(() => {
    const run = async () => {
      const uid = user?.uid
      if (!uid) { setHasCongregation(false); return }
      const u = await getUserDoc(uid)
      setHasCongregation(!!u?.congregacaoId)
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
    const congregacaoFull = { title: "Congregação", url: "/dashboard/congregacao", icon: Users, items: [
      { title: "Pessoas", url: "/dashboard/usuarios" },
      { title: "Congregação", url: "/dashboard/congregacao" },
      { title: "Limpeza", url: "/dashboard/limpeza" },
    ] }
    const settings = { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings }
    if (!hasCongregation) {
      return [...base, congregacaoCollapsed, settings]
    }
    const meetings = { title: "Reuniões", url: "/dashboard/reuniao/meio-de-semana", icon: Calendar, items: [
      { title: "Fim de semana", url: "/dashboard/reuniao/fim-de-semana" },
      { title: "Meio de semana", url: "/dashboard/reuniao/meio-de-semana" },
      { title: "Mecânicas", url: "/dashboard/reuniao/mecanicas" },
    ] }
    const pregacao = { title: "Pregação", url: "/dashboard/pregacao", icon: BaggageClaim, items: [
      { title: "Campo", url: "/dashboard/pregacao" },
      { title: "Carrinhos", url: "/dashboard/pregacao/carrinhos" },
      { title: "Territorio", url: "/dashboard/territorio" },
    ] }
    return [...base, congregacaoFull, meetings, pregacao, settings]
  }, [hasCongregation])
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
