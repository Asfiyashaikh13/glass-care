-- Glass Care single-client document storage. Run once in Supabase SQL Editor.
-- Access is restricted to authenticated users, with every row owned by its creator.
create table if not exists public.glass_care_documents (
  id text not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('Estimate', 'Bill', 'Invoice')),
  document_number text not null,
  source_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  unique (owner_id, document_number)
);

create index if not exists glass_care_documents_owner_created_idx
  on public.glass_care_documents (owner_id, created_at desc);

alter table public.glass_care_documents enable row level security;
revoke all on table public.glass_care_documents from anon, authenticated;
grant select, insert, update, delete on table public.glass_care_documents to authenticated;

create policy "Users read their Glass Care documents"
  on public.glass_care_documents for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Users create their Glass Care documents"
  on public.glass_care_documents for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Users update their Glass Care documents"
  on public.glass_care_documents for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Users delete their Glass Care documents"
  on public.glass_care_documents for delete to authenticated
  using ((select auth.uid()) = owner_id);

create table if not exists public.glass_care_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.glass_care_settings enable row level security;
revoke all on table public.glass_care_settings from anon, authenticated;
grant select, insert, update on table public.glass_care_settings to authenticated;

create policy "Users read their Glass Care settings"
  on public.glass_care_settings for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Users create their Glass Care settings"
  on public.glass_care_settings for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Users update their Glass Care settings"
  on public.glass_care_settings for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create table if not exists public.glass_care_counters (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  counter_type text not null check (counter_type in ('Estimate', 'Bill', 'Invoice', 'Calculation')),
  last_value bigint not null default 0 check (last_value >= 0),
  primary key (owner_id, counter_type)
);

alter table public.glass_care_counters enable row level security;
revoke all on table public.glass_care_counters from anon, authenticated;
grant select, insert, update on table public.glass_care_counters to authenticated;
create policy "Users read their Glass Care counters"
  on public.glass_care_counters for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Users create their Glass Care counters"
  on public.glass_care_counters for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Users increment their Glass Care counters"
  on public.glass_care_counters for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.next_glass_care_number(p_type text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_value bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_type not in ('Estimate', 'Bill', 'Invoice', 'Calculation') then
    raise exception 'Unsupported document type';
  end if;

  insert into public.glass_care_counters (owner_id, counter_type, last_value)
  values (
    auth.uid(),
    p_type,
    1 + coalesce((
      select max(
        case
          when p_type = 'Calculation' then substring(d.payload ->> 'calculationNumber' from '[0-9]+$')::bigint
          else substring(d.document_number from '[0-9]+$')::bigint
        end
      )
      from public.glass_care_documents as d
      where d.owner_id = auth.uid()
        and case
          when p_type = 'Calculation' then d.payload ->> 'calculationNumber' ~ '^GCE-Calculation-[0-9]+$'
          else d.document_type = p_type and d.document_number ~ ('^GCE-' || p_type || '-[0-9]+$')
        end
    ), 0)
  )
  on conflict (owner_id, counter_type)
  do update set last_value = public.glass_care_counters.last_value + 1
  returning last_value into next_value;

  return 'GCE-' || p_type || '-' || lpad(next_value::text, 3, '0');
end;
$$;
revoke all on function public.next_glass_care_number(text) from public, anon;
grant execute on function public.next_glass_care_number(text) to authenticated;
