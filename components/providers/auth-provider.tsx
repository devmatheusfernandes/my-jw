"use client"

import * as React from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"

type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u?.uid) {
        document.cookie = `auth_uid=${u.uid}; path=/; max-age=${60 * 60 * 24 * 7}`
      } else {
        document.cookie = `auth_uid=; Max-Age=0; path=/`
      }
    })
    return () => unsub()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}