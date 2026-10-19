-- Contador sequencial de pedidos da Pizzaria D'Casa
-- Execute uma única vez no Supabase: SQL Editor > New query > Run.

create table if not exists public.contador_pedidos (
  id boolean primary key default true check (id = true),
  proximo_numero bigint not null default 1 check (proximo_numero >= 1)
);

insert into public.contador_pedidos (id, proximo_numero)
values (true, 1)
on conflict (id) do nothing;

alter table public.contador_pedidos enable row level security;
revoke all on public.contador_pedidos from anon, authenticated;

create or replace function public.registrar_pedido_numerado(p_id bigint, p_dados jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero bigint;
  v_dados jsonb;
begin
  if p_id is null or p_id <= 0 or p_dados is null then
    raise exception 'Dados do pedido inválidos';
  end if;

  -- O bloqueio da linha torna a atribuição sequencial mesmo com pedidos simultâneos.
  select proximo_numero into v_numero
  from public.contador_pedidos
  where id = true
  for update;

  if v_numero is null then
    raise exception 'Contador de pedidos não foi inicializado';
  end if;

  update public.contador_pedidos
  set proximo_numero = v_numero + 1
  where id = true;

  v_dados := jsonb_set(p_dados, '{numeroPedido}', to_jsonb(v_numero), true);

  insert into public.pedidos (id, dados, status, criado_em)
  values (
    p_id,
    v_dados,
    coalesce(v_dados->>'status', 'Recebido'),
    coalesce(nullif(v_dados->>'dataHora', '')::timestamptz, now())
  );

  return v_numero;
end;
$$;

create or replace function public.resetar_contador_pedidos()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só uma sessão autenticada do painel administrativo pode resetar a contagem.
  if auth.uid() is null then
    raise exception 'Apenas o administrador autenticado pode resetar a contagem';
  end if;

  update public.contador_pedidos
  set proximo_numero = 1
  where id = true;

  if not found then
    insert into public.contador_pedidos (id, proximo_numero) values (true, 1);
  end if;
end;
$$;

grant execute on function public.registrar_pedido_numerado(bigint, jsonb) to anon, authenticated;
grant execute on function public.resetar_contador_pedidos() to authenticated;
