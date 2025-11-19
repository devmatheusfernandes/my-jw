"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"
import { signInWithGoogle } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function UserAuthForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const router = useRouter()

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={async () => {
          try {
            setIsLoading(true)
            const user = await signInWithGoogle()
            document.cookie = `auth_uid=${user.uid}; path=/; max-age=${60 * 60 * 24 * 7}`
            toast.success("Logado com sucesso")
            router.push("/dashboard")
          } catch (e) {
            toast.error("Falha ao fazer login com Google")
          } finally {
            setIsLoading(false)
          }
        }}
      >
        {isLoading ? (
          <Spinner />
        ) : (
          <Image src="/icons/google.svg" alt="Google" width={16} height={16} className="mr-2 h-4 w-4" />
        )}{" "}
        Google
      </Button>
    </div>
  )
}