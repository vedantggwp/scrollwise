-- RLS: seed rows (owner_id null) are world-readable; user rows are owner-only.
-- Ingestion/generation jobs write via the service role, which bypasses RLS.

alter table public.books enable row level security;
alter table public.chunks enable row level security;
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.answer_citations enable row level security;
alter table public.saves enable row level security;

-- books
create policy "read seed or own books" on public.books
  for select to anon, authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "insert own books" on public.books
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "update own books" on public.books
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "delete own books" on public.books
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- chunks follow their book's visibility; clients never write chunks
create policy "read chunks of visible books" on public.chunks
  for select to anon, authenticated
  using (exists (
    select 1 from public.books b
    where b.id = book_id
      and (b.owner_id is null or b.owner_id = (select auth.uid()))
  ));

-- profiles: own row only
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "insert own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- questions: seed or own; writes are service-role only
create policy "read seed or own questions" on public.questions
  for select to anon, authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

-- answers/citations follow their question's visibility
create policy "read answers of visible questions" on public.answers
  for select to anon, authenticated
  using (exists (
    select 1 from public.questions q
    where q.id = question_id
      and (q.owner_id is null or q.owner_id = (select auth.uid()))
  ));
create policy "read citations of visible answers" on public.answer_citations
  for select to anon, authenticated
  using (exists (
    select 1 from public.answers a
    join public.questions q on q.id = a.question_id
    where a.id = answer_id
      and (q.owner_id is null or q.owner_id = (select auth.uid()))
  ));

-- saves: own rows only
create policy "read own saves" on public.saves
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own saves" on public.saves
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own saves" on public.saves
  for delete to authenticated using (user_id = (select auth.uid()));
