-- Hoko : espaces pub en V1 (SPEC.md, section 3 ter).
--
-- Exclusif seulement : un annonceur à la fois par emplacement (accueil, ou en-tête d'une
-- catégorie). L'administrateur crée la pub « en attente de paiement », puis l'active à
-- réception des fonds : 30 jours à partir de l'activation. Une pub dont la fin est passée
-- disparaît d'elle-même du site (pas de tâche planifiée).

-- ───────────────── Table ─────────────────
-- Anciennes règles d'accès retirées d'abord : elles dépendent des colonnes de date.
drop policy "publicité : lecture des espaces actifs" on public.ad_slots;
drop policy "publicité : gestion par l'administrateur" on public.ad_slots;
-- Les dates ne sont connues qu'à l'activation, à la minute près (comme le boost).
alter table public.ad_slots alter column debut drop not null, alter column fin drop not null;
alter table public.ad_slots
  alter column debut type timestamptz using debut::timestamptz,
  alter column fin type timestamptz using fin::timestamptz;
alter table public.ad_slots
  add column montant_xpf integer not null default 0 check (montant_xpf >= 0),
  add column created_at timestamptz not null default now(),
  add constraint ad_slots_actif_date check (statut <> 'actif' or (debut is not null and fin is not null)),
  add constraint ad_slots_exclusif check (mode = 'exclusif'),
  add constraint ad_slots_annonceur check (length(trim(annonceur)) between 2 and 80),
  add constraint ad_slots_lien check (lien is null or (lien ~ '^https://[^[:space:]]+$' and length(lien) <= 500)),
  add constraint ad_slots_visuel check (visuel is null or visuel ~ '^pubs/[0-9a-f-]{36}\.jpg$');
create index ad_slots_en_place_idx on public.ad_slots (emplacement, category_id, fin) where statut = 'actif';

-- Le public ne voit que les pubs en place ; l'administrateur voit tout. Les écritures passent
-- seulement par les fonctions ci-dessous (plus d'écriture directe dans la table).
create policy "publicité : lecture des pubs en place" on public.ad_slots
  for select to anon, authenticated
  using ((statut = 'actif' and fin > now()) or private.is_admin());
revoke insert, update, delete on public.ad_slots from anon, authenticated;

-- ───────────────── Tarifs ─────────────────
-- Modifiables depuis le tableau de bord, jamais depuis le site. Recopiés sur chaque commande.
create table public.pub_tarifs (
  emplacement text primary key check (emplacement in ('accueil', 'categorie')),
  prix_xpf integer not null check (prix_xpf > 0),
  modifie_le timestamptz not null default now()
);
alter table public.pub_tarifs enable row level security;
create policy "tarifs pub : lecture publique" on public.pub_tarifs for select to anon, authenticated using (true);
insert into public.pub_tarifs (emplacement, prix_xpf) values ('accueil', 100000), ('categorie', 45000);

-- ───────────────── Créer une pub (administrateur) ─────────────────
create function public.creer_pub(emplacement text, categorie text, annonceur text, lien text, visuel text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  cat smallint;
  prix integer;
  nouvelle bigint;
begin
  if not private.is_admin() then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;
  if creer_pub.emplacement = 'categorie' then
    select c.id into cat from public.categories c where c.slug = creer_pub.categorie;
    if cat is null then
      raise exception 'catégorie inconnue' using errcode = '22023', hint = 'categorie';
    end if;
  elsif creer_pub.emplacement <> 'accueil' then
    raise exception 'emplacement inconnu' using errcode = '22023', hint = 'emplacement';
  end if;
  select t.prix_xpf into prix from public.pub_tarifs t where t.emplacement = creer_pub.emplacement;
  insert into public.ad_slots (emplacement, category_id, mode, annonceur, visuel, lien, montant_xpf)
    values (creer_pub.emplacement, cat, 'exclusif', trim(creer_pub.annonceur), creer_pub.visuel, creer_pub.lien, prix)
    returning id into nouvelle;
  return nouvelle;
end;
$$;

-- ───────────────── Décider (administrateur) ─────────────────
-- activer : paiement reçu, 30 jours à partir de maintenant, si l'emplacement est libre.
-- annuler : commande non payée abandonnée ; renvoie le visuel, que le serveur efface.
-- retirer : pub en place arrêtée avant la fin (litige, contenu refusé).
create function public.decider_pub(pub_id bigint, geste text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  p public.ad_slots;
  occupee timestamptz;
begin
  if not private.is_admin() then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;
  select * into p from public.ad_slots a where a.id = pub_id for update;
  if not found then
    raise exception 'pub introuvable' using errcode = 'P0002';
  end if;

  if geste = 'activer' then
    if p.statut <> 'en_attente_paiement' then
      raise exception 'pub déjà traitée' using errcode = '22023', hint = 'deja';
    end if;
    -- Une seule pub en place par emplacement, même si deux activations arrivent ensemble
    perform pg_advisory_xact_lock(hashtext('pub'), coalesce(p.category_id, 0));
    select max(a.fin) into occupee from public.ad_slots a
     where a.statut = 'actif' and a.fin > now()
       and a.emplacement = p.emplacement and a.category_id is not distinct from p.category_id;
    if occupee is not null then
      raise exception 'emplacement occupé jusqu''au %', occupee using errcode = '22023', hint = 'occupe';
    end if;
    update public.ad_slots set statut = 'actif', debut = now(), fin = now() + interval '30 days' where id = p.id;
    return null;
  elsif geste = 'annuler' then
    if p.statut <> 'en_attente_paiement' then
      raise exception 'pub déjà traitée' using errcode = '22023', hint = 'deja';
    end if;
    update public.ad_slots set statut = 'annule' where id = p.id;
    return p.visuel;
  elsif geste = 'retirer' then
    if p.statut <> 'actif' or p.fin <= now() then
      raise exception 'pub pas en place' using errcode = '22023', hint = 'deja';
    end if;
    update public.ad_slots set statut = 'termine', fin = now() where id = p.id;
    return null;
  end if;
  raise exception 'geste inconnu' using errcode = '22023';
end;
$$;

revoke execute on function public.creer_pub(text, text, text, text, text) from public, anon;
revoke execute on function public.decider_pub(bigint, text) from public, anon;
grant execute on function public.creer_pub(text, text, text, text, text) to authenticated;
grant execute on function public.decider_pub(bigint, text) to authenticated;
