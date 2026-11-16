-- Hoko : corrections signalées par les alertes de sécurité et de performance de Supabase.

-- Les fonctions du schéma `public` sont appelables par l'API (/rest/v1/rpc/...).
--
-- 1. Les deux fonctions de déclencheur n'ont pas à l'être : un déclencheur s'exécute sans
--    vérifier ce droit, on peut donc le retirer à tout le monde.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.verifier_limite_annonces() from public, anon, authenticated;

-- 2. is_admin() sert dans les règles d'accès : visiteurs et comptes connectés doivent pouvoir
--    l'exécuter. On la déplace dans un schéma `private`, que l'API n'expose pas. Les règles
--    d'accès la retrouvent quand même : elles pointent vers la fonction, pas vers son nom.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Index sur les clés étrangères qui n'en avaient pas
create index if not exists boosts_listing_idx on public.boosts (listing_id);
create index if not exists purchase_orders_shop_idx on public.purchase_orders (shop_id);
create index if not exists shops_category_idx on public.shops (category_id);
create index if not exists ad_slots_category_idx on public.ad_slots (category_id);
