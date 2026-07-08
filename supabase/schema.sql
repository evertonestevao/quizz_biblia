-- =====================================================================
-- Cristão Quiz - Schema Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_player_id uuid,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  question_count integer not null default 10,
  question_duration integer not null default 20,
  current_question_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  total_score integer not null default 0,
  correct_answers integer not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists public.room_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_index integer not null,
  verse_text text not null,
  correct_reference text not null,
  options jsonb not null,
  started_at timestamptz,
  duration_seconds integer not null default 20,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_at timestamptz not null default now(),
  unique (room_id, question_index)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_id uuid not null references public.room_questions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  selected_reference text not null,
  is_correct boolean not null default false,
  score_awarded integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (question_id, player_id)
);

-- Localização aproximada (geo-IP) de onde cada jogador entrou numa sala.
create table if not exists public.player_locations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  city text,
  state text,
  country text,
  created_at timestamptz default now()
);

-- Cache de coordenadas por cidade (geocodificado uma vez via Nominatim/OSM).
create table if not exists public.city_coordinates (
  id uuid primary key default gen_random_uuid(),
  city text,
  state text,
  country text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  unique (city, state, country)
);

-- ---------------------------------------------------------------------
-- Migrations (seguras para bancos já criados na v1)
-- ---------------------------------------------------------------------

alter table public.rooms
  add column if not exists bible_version text not null default 'acf';

alter table public.room_questions
  add column if not exists ends_at timestamptz;

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------

create index if not exists idx_rooms_code on public.rooms (code);
create index if not exists idx_players_room on public.players (room_id);
create index if not exists idx_questions_room on public.room_questions (room_id, question_index);
create index if not exists idx_answers_question on public.answers (question_id, answered_at);
create index if not exists idx_answers_room on public.answers (room_id);
create index if not exists idx_player_locations_room on public.player_locations (room_id);

-- ---------------------------------------------------------------------
-- RLS (políticas públicas simples enquanto não há login)
-- Quando adicionar autenticação, basta trocar estas políticas.
-- ---------------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.room_questions enable row level security;
alter table public.answers enable row level security;

drop policy if exists "public read rooms" on public.rooms;
drop policy if exists "public write rooms" on public.rooms;
drop policy if exists "public update rooms" on public.rooms;
create policy "public read rooms" on public.rooms for select using (true);
create policy "public write rooms" on public.rooms for insert with check (true);
create policy "public update rooms" on public.rooms for update using (true);

drop policy if exists "public read players" on public.players;
drop policy if exists "public write players" on public.players;
drop policy if exists "public update players" on public.players;
create policy "public read players" on public.players for select using (true);
create policy "public write players" on public.players for insert with check (true);
create policy "public update players" on public.players for update using (true);

drop policy if exists "public read questions" on public.room_questions;
drop policy if exists "public write questions" on public.room_questions;
drop policy if exists "public update questions" on public.room_questions;
create policy "public read questions" on public.room_questions for select using (true);
create policy "public write questions" on public.room_questions for insert with check (true);
create policy "public update questions" on public.room_questions for update using (true);

drop policy if exists "public read answers" on public.answers;
drop policy if exists "public write answers" on public.answers;
create policy "public read answers" on public.answers for select using (true);
create policy "public write answers" on public.answers for insert with check (true);

alter table public.player_locations enable row level security;
drop policy if exists "public read player_locations" on public.player_locations;
drop policy if exists "public write player_locations" on public.player_locations;
create policy "public read player_locations" on public.player_locations for select using (true);
create policy "public write player_locations" on public.player_locations for insert with check (true);

alter table public.city_coordinates enable row level security;
drop policy if exists "public read city_coordinates" on public.city_coordinates;
drop policy if exists "public write city_coordinates" on public.city_coordinates;
drop policy if exists "public update city_coordinates" on public.city_coordinates;
create policy "public read city_coordinates" on public.city_coordinates for select using (true);
create policy "public write city_coordinates" on public.city_coordinates for insert with check (true);
create policy "public update city_coordinates" on public.city_coordinates for update using (true);

-- ---------------------------------------------------------------------
-- Funções (fonte da verdade para tempo e pontuação)
-- ---------------------------------------------------------------------

-- Horário do servidor (para sincronizar o timer entre os jogadores)
create or replace function public.get_server_time()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

-- Inicia a partida: marca a sala como "playing" e ativa a pergunta 0
create or replace function public.start_game(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rooms
     set status = 'playing',
         current_question_index = 0
   where id = p_room_id
     and status = 'lobby';

  update room_questions
     set status = 'active',
         started_at = now(),
         ends_at = now() + make_interval(secs => duration_seconds)
   where room_id = p_room_id
     and question_index = 0;
end;
$$;

-- Encerra a pergunta atual e avança para a próxima (ou finaliza a sala)
create or replace function public.next_question(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' then
    return;
  end if;

  update room_questions
     set status = 'finished'
   where room_id = p_room_id
     and question_index = v_room.current_question_index;

  if v_room.current_question_index + 1 >= v_room.question_count then
    update rooms set status = 'finished' where id = p_room_id;
  else
    update rooms
       set current_question_index = v_room.current_question_index + 1
     where id = p_room_id;

    update room_questions
       set status = 'active',
           started_at = now(),
           ends_at = now() + make_interval(secs => duration_seconds)
     where room_id = p_room_id
       and question_index = v_room.current_question_index + 1;
  end if;
end;
$$;

-- Registra a resposta com validação de tempo, duplicidade e pontuação por ordem:
-- 1º correto = 10 pontos, 2º = 9, 3º = 8 ... mínimo 1 ponto. Errado/sem resposta = 0.
create or replace function public.submit_answer(
  p_question_id uuid,
  p_player_id uuid,
  p_selected text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q room_questions%rowtype;
  v_correct boolean;
  v_correct_count integer;
  v_score integer := 0;
  v_answer_count integer;
  v_player_count integer;
begin
  select * into q from room_questions where id = p_question_id for update;
  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'question_not_found');
  end if;

  if q.status <> 'active'
     or q.started_at is null
     or now() > coalesce(q.ends_at, q.started_at + make_interval(secs => q.duration_seconds)) then
    return jsonb_build_object(
      'accepted', false,
      'reason', 'time_over',
      'correct_reference', q.correct_reference
    );
  end if;

  if exists (
    select 1 from answers
     where question_id = p_question_id
       and player_id = p_player_id
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'already_answered');
  end if;

  v_correct := (p_selected = q.correct_reference);

  if v_correct then
    select count(*) into v_correct_count
      from answers
     where question_id = p_question_id
       and is_correct = true;
    v_score := greatest(10 - v_correct_count, 1);
  end if;

  insert into answers (room_id, question_id, player_id, selected_reference, is_correct, score_awarded)
  values (q.room_id, p_question_id, p_player_id, p_selected, v_correct, v_score);

  update players
     set total_score = total_score + v_score,
         correct_answers = correct_answers + (case when v_correct then 1 else 0 end)
   where id = p_player_id;

  -- Avanço rápido: quando o último jogador responde, o prazo cai para 3 segundos.
  -- Feito aqui no servidor (atômico, sem depender do host) — todos os clientes
  -- recalculam o timer a partir do novo ends_at via Realtime.
  select count(*) into v_answer_count from answers where question_id = p_question_id;
  select count(*) into v_player_count from players where room_id = q.room_id;

  if v_answer_count >= v_player_count then
    update room_questions
       set ends_at = least(ends_at, now() + interval '3 seconds')
     where id = p_question_id
       and status = 'active';
  end if;

  return jsonb_build_object(
    'accepted', true,
    'is_correct', v_correct,
    'score', v_score,
    'correct_reference', q.correct_reference
  );
end;
$$;

grant execute on function public.get_server_time() to anon, authenticated;
grant execute on function public.start_game(uuid) to anon, authenticated;
grant execute on function public.next_question(uuid) to anon, authenticated;
grant execute on function public.submit_answer(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime: adiciona as tabelas à publicação padrão do Supabase
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['rooms', 'players', 'room_questions', 'answers'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
