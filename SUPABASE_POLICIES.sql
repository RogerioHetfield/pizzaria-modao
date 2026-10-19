-- Pizzaria D’Casa: políticas finais para site_data e pedidos
-- UID do administrador: 60f1b879-94ff-4248-8293-673fae7a93c5

ALTER TABLE public.site_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica do cardapio" ON public.site_data;
DROP POLICY IF EXISTS "Admin pode inserir dados" ON public.site_data;
DROP POLICY IF EXISTS "Admin pode atualizar dados" ON public.site_data;
DROP POLICY IF EXISTS "Admin pode excluir dados" ON public.site_data;
DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admin pode consultar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admin pode atualizar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Administradores autenticados podem ler pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Administradores podem atualizar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir dados" ON public.site_data;
DROP POLICY IF EXISTS "Usuarios autenticados podem atualizar dados" ON public.site_data;
DROP POLICY IF EXISTS "Usuarios autenticados podem excluir dados" ON public.site_data;

-- Público só lê dados necessários ao cardápio.
CREATE POLICY "Leitura publica do cardapio" ON public.site_data
FOR SELECT TO anon, authenticated
USING (id IN ('produtos','config','categorias','cupons'));

-- A conta administrativa pode ler todas as chaves (inclusive clientes e funcionários).
CREATE POLICY "Admin pode ler todos os dados" ON public.site_data
FOR SELECT TO authenticated
USING (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid);

CREATE POLICY "Admin pode inserir dados" ON public.site_data
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid);
CREATE POLICY "Admin pode atualizar dados" ON public.site_data
FOR UPDATE TO authenticated
USING (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid)
WITH CHECK (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid);
CREATE POLICY "Admin pode excluir dados" ON public.site_data
FOR DELETE TO authenticated
USING (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid);

-- Cliente pode inserir pedido sem login; não pode consultar nem alterar pedidos.
CREATE POLICY "Clientes podem criar pedidos" ON public.pedidos
FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin pode consultar pedidos" ON public.pedidos
FOR SELECT TO authenticated
USING (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid);
CREATE POLICY "Admin pode atualizar pedidos" ON public.pedidos
FOR UPDATE TO authenticated
USING (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid)
WITH CHECK (auth.uid() = '60f1b879-94ff-4248-8293-673fae7a93c5'::uuid);
