"use client"

import * as React from "react"
import { Home, User, Users, Settings, Map } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    { title: "Início", url: "/dashboard", icon: Home, isActive: true },
    { title: "Meu Perfil", url: "/dashboard/meu-perfil", icon: User },
    { title: "Congregação", url: "/dashboard/congregacao", icon: Users },
    { title: "Território", url: "/dashboard/territorio", icon: Map },
    { title: "Usuários", url: "/dashboard/usuarios", icon: Users },
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
