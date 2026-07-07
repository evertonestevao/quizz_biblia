# 📖 Verbum Quiz

Jogo de quiz bíblico em Next.js: o sistema mostra um versículo e você precisa descobrir a **referência correta** (Livro capítulo:versículo). Jogue sozinho ou crie uma sala online e dispute com amigos em tempo real via **Supabase Realtime**.

---

## ✨ Recursos

- **Modo Solo** — perguntas infinitas, funciona **sem Supabase** (100% local).
- **Modo entre Amigos** — salas com código curto (ex.: `ABC123`), lobby em tempo real, timer sincronizado pelo relógio do servidor e pontuação por ordem de resposta (1º correto = 10 pts, 2º = 9 ... mínimo 1 pt).
- Pontuação e validação de tempo calculadas **no servidor** (funções SQL/RPC no Supabase) — o frontend nunca é a fonte da verdade.
- Reconexão simples: `playerId` e `roomCode` ficam no `localStorage`, então atualizar a página mantém você na sala.
- Visual escuro com glassmorphism, detalhes dourados e layout mobile-first.

## 🧰 Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · componentes estilo shadcn/ui · Supabase JS + Realtime · Deploy na Vercel.

---

## 🚀 Como rodar na sua máquina

Pré-requisito: **Node.js 18.17+** (recomendado Node 20). Verifique com `node -v`.

```bash
# 1. Entre na pasta do projeto
cd verbum-quiz

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de ambiente
cp .env.example .env.local

# 4. Rode em modo desenvolvimento
npm run dev
```

Abra **http://localhost:3000**. O **Modo Solo já funciona** nesse ponto, sem nenhuma configuração extra.

## 🔑 Configurando o Supabase (para o modo entre amigos)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No painel do projeto, abra **SQL Editor** → **New query**.
3. Copie **todo** o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**. Isso cria as tabelas, índices, políticas RLS, funções (`start_game`, `next_question`, `submit_answer`, `get_server_time`) e habilita o Realtime nas tabelas.
4. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **Publishable key** (em projetos antigos, a chave `anon public`)
5. Preencha o `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-aqui
```

6. Reinicie o `npm run dev`. Pronto: crie uma sala em **Jogar com Amigos** e teste abrindo o link em duas abas/celulares.

## 📕 Bíblia completa (acf.json)

O projeto já vem com um `src/data/acf.json` **de exemplo** (alguns livros e versículos conhecidos) só para o jogo funcionar imediatamente.

Para a experiência completa, substitua pelo arquivo da Bíblia inteira **no mesmo formato**:

```json
[
  {
    "abbrev": "gn",
    "name": "Gênesis",
    "chapters": [
      ["No princípio criou Deus os céus e a terra.", "..."]
    ]
  }
]
```

Basta trocar o arquivo em `src/data/acf.json` mantendo o campo `name` com o nome do livro em português (ele é usado nas alternativas). Repositórios open source como `thiagobodruk/biblia` no GitHub usam exatamente esse formato — verifique a licença da tradução escolhida antes de publicar.

## ☁️ Publicando na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Clique em **Deploy**. A Vercel detecta o Next.js automaticamente.

## 🎮 Como funciona

### Modo Solo (`/solo`)
1. Digite seu nome e comece.
2. Cada pergunta mostra um versículo e 4 referências; só uma está certa.
3. Acertou: **+10 pontos**. Errou: 0. Sem limite de perguntas.
4. A tela mostra pontuação, perguntas respondidas, acertos e taxa de acerto, com botões de próxima pergunta, reiniciar e voltar.

### Modo entre Amigos (`/amigos`)
1. **Criar sala**: informe seu nome, tempo por pergunta (10–60s) e quantidade de perguntas (5–30). Um código curto é gerado (ex.: `ABC123`).
2. **Convidar**: compartilhe o código ou o botão *Copiar link* no lobby.
3. **Lobby**: todos veem a lista de jogadores em tempo real. Só o anfitrião vê o botão **Iniciar partida**.
4. **Partida**: a mesma pergunta aparece para todos. O timer usa `started_at` (horário do banco) + duração, sincronizado com `get_server_time()` — então vale igual para todos, independente do relógio do celular.
5. **Pontuação**: registrada pela função SQL `submit_answer`, que valida tempo e duplicidade e pontua pela **ordem real de chegada** no banco: 1º correto = 10, 2º = 9 ... mínimo 1. Errado ou sem resposta = 0.
6. **Avanço**: a sala avança sozinha ao fim do tempo (ou quando todos respondem); o anfitrião também pode avançar manualmente.
7. **Resultado**: pódio destacando o top 3 (1º com destaque maior), tabela completa com pontos e acertos, e botões *Jogar novamente* / *Voltar ao início*.

## 🗂️ Estrutura

```
src/
  app/                # rotas (App Router)
  components/
    layout/           # header, hero, cards de modo
    game/             # pergunta, alternativas, timer, placar
    room/             # lobby, lista de jogadores, pódio, tabela
    ui/               # botões, inputs, selects (estilo shadcn)
  data/acf.json       # base bíblica (substituível)
  lib/                # bible, game, scoring, room, supabase, storage, utils
  types/              # tipos TypeScript
supabase/schema.sql   # banco completo: tabelas, RLS, funções, realtime
```

## 🧭 Próximos passos recomendados

1. Substituir o `acf.json` de exemplo pela Bíblia completa.
2. Adicionar autenticação (Supabase Auth) e apertar as políticas RLS — hoje elas são públicas de propósito, e a `correct_reference` fica legível no banco (um jogador técnico conseguiria "colar"). Com login, mova as alternativas para uma view sem a resposta.
3. Botão "Jogar novamente" reaproveitando a mesma sala (resetar placares e gerar novas perguntas).
4. Níveis de dificuldade (alternativas do mesmo livro/capítulo ficam bem mais difíceis).
5. Modo campeonato entre grupos/igrejas com várias rodadas.
6. Sons e vibração no timer, e PWA para instalar no celular.

---

Feito com Next.js + Supabase. *“Examinais as Escrituras...”* (João 5:39)
