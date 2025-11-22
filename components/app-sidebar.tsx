"use client"

import * as React from "react"
import { Home, User, Users, Settings, Map, Calendar } from "lucide-react"

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

const data = {
  navMain: [
    { title: "Início", url: "/dashboard", icon: Home, isActive: true },
    { title: "Meu Perfil", url: "/dashboard/meu-perfil", icon: User },
    { title: "Congregação", url: "/dashboard/congregacao", icon: Users },
    { title: "Território", url: "/dashboard/territorio", icon: Map },
    { title: "Pregação", url: "/dashboard/pregacao", icon: Calendar },
    { title: "Reuniões", url: "/dashboard/reuniao/meio-de-semana", icon: Calendar, items: [
      { title: "Fim de semana", url: "/dashboard/reuniao/fim-de-semana" },
      { title: "Meio de semana", url: "/dashboard/reuniao/meio-de-semana" },
    ] },
    { title: "Pessoas", url: "/dashboard/usuarios", icon: Users },
    { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader />

      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
