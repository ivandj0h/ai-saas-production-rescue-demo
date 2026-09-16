create table if not exists public.workspace_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  primary key (user_id, workspace_id)
);

alter table public.workspace_members enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "users can read own memberships"
on public.workspace_members;

create policy "users can read own memberships"
on public.workspace_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can read tickets in own workspace"
on public.support_tickets;

create policy "users can read tickets in own workspace"
on public.support_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.workspace_id = support_tickets.workspace_id
  )
);

drop policy if exists "users can update tickets in own workspace"
on public.support_tickets;

create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (user_id, route, window_start)
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_route text,
  p_limit integer default 5,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_count integer;
begin
  if v_user_id is null then
    return false;
  end if;

  v_window_start :=
    to_timestamp(
      floor(extract(epoch from now()) / p_window_seconds)
      * p_window_seconds
    );

  insert into public.api_rate_limits (
    user_id,
    route,
    window_start,
    request_count
  )
  values (
    v_user_id,
    p_route,
    v_window_start,
    1
  )
  on conflict (user_id, route, window_start)
  do update
    set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all privileges
on table public.support_tickets
from anon, authenticated;

grant select
on table public.support_tickets
to authenticated;

revoke all
on table public.api_rate_limits
from anon, authenticated;

revoke all
on function public.consume_rate_limit(text, integer, integer)
from public;

grant execute
on function public.consume_rate_limit(text, integer, integer)
to authenticated;
