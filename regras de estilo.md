# Regras de estilo das páginas do dashboard

- Início do arquivo: usar `"use client"` na primeira linha quando a página for client-side.
- Imports: ordenar por grupos (React, animações, UI, ícones, providers, libs/serviços) e manter todos os imports no topo do arquivo.
- Layout base: envolver o conteúdo em `div` com `min-h-screen bg-background` e um container central `max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8`.
- Cabeçalho: usar `motion.div` com entrada suave (`opacity/y`) e título em `h1` (`text-2xl sm:text-3xl font-bold tracking-tight`) acompanhado de ícone relevante (lucide) em `h-7 w-7 text-primary`.
- Separação: usar `Separator` entre blocos principais de conteúdo.
- Cards/Blocos: preferir `rounded-lg border bg-card overflow-hidden` e, para conteúdo interno, `p-4` e estados vazios com `bg-muted/30`.
- Animações: utilizar `framer-motion` (`motion`, `AnimatePresence`) para listas e blocos com `initial/animate/exit` sutis; aplicar `transition` com pequenos `delay`s.
- Estados de carregamento: centralizar com `min-h-screen` e usar spinner com borda (`border-2 border-primary border-t-transparent rounded-full animate-spin`) e texto em `text-muted-foreground` dentro de `motion.div`.
- Estados de autorização/condição: exibir mensagens dedicadas quando `!user`, `!congregacaoId` ou sem permissão, com ícones lucide, título `text-xl font-semibold` e descrição `text-sm text-muted-foreground`.
- Componentes UI: usar os componentes do kit (`Button`, `Input`, `Label`, `Switch`, `Separator`, `Drawer`, `Popover`, `Command` etc.). Para `select`, aplicar classes `h-9 w-full rounded-md border bg-background px-3 text-sm`.
- Botões: usar espaçamento `gap-2` em botões com ícones; `variant` apropriado (`default`, `outline`, `ghost`) e `size` (`sm`, `icon`) conforme contexto.
- Listas: quando interativas, usar `AnimatePresence` e `motion.div` por item com `initial={{ opacity: 0, y: 10 }}` e `transition` incremental.
- Feedback: usar `toast` (`sonner`) para sucesso/erro nas ações assíncronas.
- Hooks e estado: `useAuth` para obter `user`; efeitos assíncronos com `try/finally` controlando `loading`; `useCallback` e `useMemo` quando necessário.
- Classes utilitárias: preferir `space-y-*`, `flex/gap`, `grid gap-*` e `text-muted-foreground`; usar `bg-muted/30` para destaques suaves.
- Nomenclatura: manter nomes claros de variáveis/estados e funções, evitando abreviações obscuras; manter consistência com os docs Firebase e contexto do app.