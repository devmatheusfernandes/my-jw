'use client'
import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { FieldDescription } from "@/components/ui/field"
import { UserAuthForm } from "@/components/auth/use-auth-form"
import { ModeToggle } from "@/components/theme/mode-toggle"

export default function AuthenticationPage() {
  return (
    <>
      <div className="relative flex items-center justify-center h-screen md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="absolute top-4 right-4 md:top-8 md:right-8">
          <ModeToggle />
        </div>
        <div className="text-primary relative hidden h-full flex-col p-10 lg:flex dark:border-r">
          <div className="bg-primary/5 absolute inset-0" />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-20 flex items-center text-lg font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Meu JW
          </motion.div>
        </div>
        <div className="flex items-center justify-center h-full lg:p-8 p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex w-full max-w-sm flex-col justify-center gap-6"
          >
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Crie uma conta
              </h1>
              <p className="text-muted-foreground text-sm">
                Ou faça o login com sua conta Google
              </p>
            </div>
            <UserAuthForm />
            <FieldDescription className="px-6 text-center">
              Por continuar, você concorda com nossos{" "}
              <Link href="/terms">Termos de Serviço</Link> e{" "}
              <Link href="/privacy">Política de Privacidade</Link>.
            </FieldDescription>
          </motion.div>
        </div>
      </div>
    </>
  )
}