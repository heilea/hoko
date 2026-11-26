-- Hoko : signaler une annonce (SPEC.md, section 4 septies).
--
-- Un visiteur, sans compte, signale une annonce en ligne avec un motif. Seul le serveur du site
-- enregistre un signalement (clé secrète) : il envoie des empreintes du visiteur et de l'adresse
-- IP (HMAC), jamais l'adresse en clair. L'annonce reste en ligne jusqu'à la décision de
-- l'administrateur : retirer l'annonce, ou classer sans suite.

create table public.signalements (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings (id) on delete cascade,
  motif text not null check (motif in ('arnaque', 'interdit', 'doublon', 'categorie', 'autre')),
  details text check (details is null or char_length(details) between 1 and 500),
  visiteur text not null check (length(visiteur) between 16 and 64),
  adresse text not null check (length(adresse) between 16 and 64),
  statut text not null default 'ouvert' check (statut in ('ouvert', 'retenu', 'classe')),
  created_at timestamptz not null default now(),
  traite_le timestamptz,
  traite_par uuid references auth.users (id) on delete set null,
  -- Un visiteur signale une même annonce une seule fois
  unique (listing_id, visiteur)
);
create index signalements_ouverts_idx on public.signalements (listing_id) where statut = 'ouvert';
create index signalements_visiteur_idx on public.signalements (visiteur, created_at);
create index signalements_adresse_idx on public.signalements (adresse, created_at);
create index signalements_traite_par_idx on public.signalements (traite_par);

-- Seul l'administrateur lit les signalements. Personne n'écrit directement : fonctions ci-dessous.
alter table public.signalements enable row level security;
create policy "signalements : lecture par l'administrateur" on public.signalements
  for select to authenticated using (private.is_admin());
revoke insert, update, delete on public.signalements from anon, authenticated;

-- ───────────────── Signaler (serveur du site seulement) ─────────────────
-- Refus signalés par hint : 'introuvable' (annonce pas en ligne), 'deja' (déjà signalée par ce
-- visiteur), 'limite' (5 par heure et par visiteur, 50 par adresse), 'motif', 'details'.
create function public.signaler_annonce(annonce_id bigint, motif text, details text, visiteur text, adresse text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  texte text := nullif(trim(coalesce(details, '')), '');
begin
  if visiteur is null or adresse is null then
    raise exception 'visiteur inconnu' using errcode = '22023';
  end if;
  if motif is null or motif not in ('arnaque', 'interdit', 'doublon', 'categorie', 'autre') then
    raise exception 'motif inconnu' using errcode = '22023', hint = 'motif';
  end if;
  if char_length(coalesce(texte, '')) > 500 or (motif = 'autre' and char_length(coalesce(texte, '')) < 10) then
    raise exception 'précision invalide' using errcode = '22023', hint = 'details';
  end if;

  -- Même règle que « Voir le numéro » : annonce en ligne, et vitrine en ligne pour une annonce pro
  if not exists (
    select 1 from public.listings l
      left join public.shops s on s.id = l.shop_id
     where l.id = annonce_id
       and l.statut = 'active'
       and (l.expire_le is null or l.expire_le > now())
       and (l.shop_id is null or (s.statut = 'actif' and s.verifie))
  ) then
    raise exception 'annonce introuvable' using errcode = 'P0002', hint = 'introuvable';
  end if;

  if exists (select 1 from public.signalements g
              where g.listing_id = annonce_id and g.visiteur = signaler_annonce.visiteur) then
    raise exception 'déjà signalée' using errcode = '23505', hint = 'deja';
  end if;

  if (select count(*) from public.signalements g
       where g.visiteur = signaler_annonce.visiteur and g.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.signalements g
       where g.adresse = signaler_annonce.adresse and g.created_at > now() - interval '1 hour') >= 50 then
    raise exception 'trop de signalements' using errcode = 'P0001', hint = 'limite';
  end if;

  insert into public.signalements (listing_id, motif, details, visiteur, adresse)
    values (annonce_id, motif, texte, signaler_annonce.visiteur, signaler_annonce.adresse)
    on conflict on constraint signalements_listing_id_visiteur_key do nothing;
  if not found then
    raise exception 'déjà signalée' using errcode = '23505', hint = 'deja';
  end if;
end;
$$;
revoke execute on function public.signaler_annonce(bigint, text, text, text, text) from public, anon, authenticated;
grant execute on function public.signaler_annonce(bigint, text, text, text, text) to service_role;

-- ───────────────── Traiter (administrateur) ─────────────────
-- retirer : l'annonce passe « refusée » avec un motif lu par l'annonceur ; signalements retenus.
-- classer : l'annonce reste en ligne ; signalements classés sans suite.
create function public.traiter_signalements(annonce_id bigint, geste text, motif text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  motif_net text := nullif(trim(coalesce(motif, '')), '');
begin
  if not private.is_admin() then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;
  if not exists (select 1 from public.signalements g where g.listing_id = annonce_id and g.statut = 'ouvert') then
    raise exception 'aucun signalement ouvert' using errcode = 'P0002', hint = 'deja';
  end if;

  if geste = 'retirer' then
    if motif_net is null or char_length(motif_net) < 5 or char_length(motif_net) > 500 then
      raise exception 'motif de 5 à 500 caractères' using errcode = '22023', hint = 'motif';
    end if;
    update public.listings
       set statut = 'refusee', motif_refus = motif_net, modere_par = (select auth.uid()), modere_le = now()
     where id = annonce_id and statut = 'active';
    if not found then
      raise exception 'annonce plus en ligne' using errcode = '22023', hint = 'plus_en_ligne';
    end if;
  elsif geste <> 'classer' then
    raise exception 'geste inconnu' using errcode = '22023';
  end if;

  update public.signalements
     set statut = case when geste = 'retirer' then 'retenu' else 'classe' end,
         traite_le = now(),
         traite_par = (select auth.uid())
   where listing_id = annonce_id and statut = 'ouvert';
end;
$$;
revoke execute on function public.traiter_signalements(bigint, text, text) from public, anon;
grant execute on function public.traiter_signalements(bigint, text, text) to authenticated;
