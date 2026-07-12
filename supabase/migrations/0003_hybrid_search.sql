-- Hybrid retrieval: pgvector cosine + Postgres FTS, fused with Reciprocal Rank
-- Fusion. Runs as invoker, so RLS scopes results to visible books.

create or replace function public.hybrid_search(
  query_text text,
  query_embedding extensions.halfvec(1024),
  scope_book_ids uuid[] default null,
  match_count int default 20,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 50
)
returns setof public.chunks
language sql
stable
set search_path = public, extensions
as $$
  with full_text as (
    select id,
           row_number() over (
             order by ts_rank_cd(tsv, websearch_to_tsquery('english', query_text)) desc
           ) as rank_ix
    from public.chunks
    where tsv @@ websearch_to_tsquery('english', query_text)
      and (scope_book_ids is null or book_id = any (scope_book_ids))
    limit greatest(match_count, 20) * 2
  ),
  semantic as (
    select id,
           row_number() over (order by embedding <=> query_embedding) as rank_ix
    from public.chunks
    where embedding is not null
      and (scope_book_ids is null or book_id = any (scope_book_ids))
    limit greatest(match_count, 20) * 2
  )
  select c.*
  from full_text
  full outer join semantic on full_text.id = semantic.id
  join public.chunks c on c.id = coalesce(full_text.id, semantic.id)
  order by
    coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight
    + coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight
    desc
  limit match_count;
$$;
