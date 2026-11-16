-- Hoko : validation des annonces par l'administrateur.
--
-- Aucun compte connecté ne peut changer le statut d'une annonce par une écriture directe
-- (droit retiré dans la première migration). La validation passe par cette fonction, qui
-- vérifie elle-même que la personne est administrateur : la règle vit dans la base, le site
-- n'a pas besoin de la clé secrète de Supabase.

-- Trace de la décision : qui a validé ou refusé, et quand
alter table public.listings
  add column modere_par uuid references public.profiles (id) on delete set null,
  add column modere_le timestamptz;

create index if not exists listings_modere_par_idx on public.listings (modere_par);

-- File d'attente : les plus anciennes d'abord
create index if not exists listings_en_attente_idx on public.listings (created_at) where statut = 'en_attente_validation';

/**
 * Valide (« active ») ou refuse (« refusee ») une annonce en attente.
 * Un refus exige un motif, que l'annonceur lira dans son espace.
 * La limite de 5 annonces actives (20 pour une vitrine) reste vérifiée par le déclencheur.
 */
create function public.moderer_annonce(annonce_id bigint, decision text, motif text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  motif_net text := nullif(trim(coalesce(motif, '')), '');
begin
  if not private.is_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;
  if decision not in ('active', 'refusee') then
    raise exception 'Décision inconnue : %', decision using errcode = '22023';
  end if;
  if decision = 'refusee' and (motif_net is null or char_length(motif_net) < 5) then
    raise exception 'Un refus doit être motivé (5 caractères au moins).' using errcode = '22023';
  end if;
  if char_length(coalesce(motif_net, '')) > 500 then
    raise exception 'Le motif dépasse 500 caractères.' using errcode = '22023';
  end if;

  update public.listings
     set statut = decision,
         motif_refus = case when decision = 'refusee' then motif_net end,
         modere_par = (select auth.uid()),
         modere_le = now()
   where id = annonce_id
     and statut = 'en_attente_validation';

  if not found then
    raise exception 'Annonce introuvable ou déjà traitée.' using errcode = 'P0002';
  end if;
end;
$$;

-- Ni les visiteurs ni le public : seulement les comptes connectés, et la fonction vérifie le rôle
revoke execute on function public.moderer_annonce(bigint, text, text) from public, anon;
grant execute on function public.moderer_annonce(bigint, text, text) to authenticated;
