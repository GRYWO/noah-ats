-- 063: RLS DELETE policy voor kandidaten ontbrak
-- Zonder deze policy blokkeerde Supabase elke delete stilletjes.
-- De server-action gebruikt nu admin-client + inline ownership-check,
-- maar deze policy is een vangnet als iemand via supabase-js client deletet.

create policy "Eigen tenant kandidaten verwijderen"
  on public.kandidaten for delete
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));
