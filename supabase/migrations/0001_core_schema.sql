-- Scrollwise v2 core schema: books → chunks (vectors + FTS) → questions → answers.
-- Seed/demo rows have owner_id null; user rows reference auth.users.

create extension if not exists vector with schema extensions;

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  title text not null,
  author text not null default '',
  format text not null check (format in ('epub', 'pdf')),
  source text not null default 'upload' check (source in ('seed', 'upload')),
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  chapter_index int not null,
  chapter_title text not null default '',
  section_path text[] not null default '{}',
  breadcrumb text not null,
  raw_text text not null,
  embeddable_text text not null,
  char_start int not null,
  char_end int not null,
  token_count int not null,
  quote_score real not null default 0,
  embedding extensions.halfvec(1024),
  tsv tsvector generated always as (to_tsvector('english', raw_text)) stored,
  created_at timestamptz not null default now()
);

create index chunks_book_id_idx on public.chunks (book_id);
create index chunks_embedding_idx on public.chunks
  using hnsw (embedding extensions.halfvec_cosine_ops);
create index chunks_tsv_idx on public.chunks using gin (tsv);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  life_context text not null default '',
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  question text not null,
  hook text not null default '',
  chunk_ids uuid[] not null default '{}',
  persona_fingerprint text not null default '',
  created_at timestamptz not null default now()
);

create index questions_owner_idx on public.questions (owner_id);
create index questions_book_idx on public.questions (book_id);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  answer_md text not null,
  model text not null default '',
  created_at timestamptz not null default now(),
  unique (question_id)
);

create table public.answer_citations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers (id) on delete cascade,
  chunk_id uuid not null references public.chunks (id) on delete cascade,
  quote text not null,
  ord int not null default 0
);

create index answer_citations_answer_idx on public.answer_citations (answer_id);

create table public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('question', 'chunk', 'book')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);
