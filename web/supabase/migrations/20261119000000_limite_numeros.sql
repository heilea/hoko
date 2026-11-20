-- Hoko : limite de « Voir le numéro » contre l'aspiration des numéros (SPEC.md, section 4, point 7).
--
-- 20 numéros par heure et par visiteur (cookie signé par le serveur), 300 par heure et par
-- adresse IP. Le serveur envoie seulement des empreintes (HMAC) du visiteur et de l'adresse,
-- jamais l'adresse en clair. Les demandes sont effacées au bout d'une heure.
--
-- Les fonctions ne sont plus ouvertes à la clé publique : seul le serveur du site (clé secrète,
-- rôle service_role) peut demander un numéro, donc personne ne contourne la limite.

create table public.numero_demandes (
  id bigint generated always as identity primary key,
  visiteur text not null check (length(visiteur) between 16 and 64),
  adresse text not null check (length(adresse) between 16 and 64),
  created_at timestamptz not null default now()
);
create index numero_demandes_visiteur_idx on public.numero_demandes (visiteur, created_at);
create index numero_demandes_adresse_idx on public.numero_demandes (adresse, created_at);
create index numero_demandes_date_idx on public.numero_demandes (created_at);

-- Ni le public ni les comptes ne lisent ou n'écrivent cette table : seules les fonctions ci-dessous.
alter table public.numero_demandes enable row level security;
create policy "demandes de numéro : fermé à tous" on public.numero_demandes
  for all to anon, authenticated using (false) with check (false);

-- Compte la demande, ou refuse au-delà de la limite (hint = 'limite').
-- Toute demande compte, même pour une annonce introuvable : on ne peut pas sonder les numéros d'annonce.
create function private.compter_demande_numero(visiteur text, adresse text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if visiteur is null or adresse is null then
    raise exception 'visiteur inconnu' using errcode = '22023';
  end if;
  delete from public.numero_demandes where created_at < now() - interval '1 hour';
  if (select count(*) from public.numero_demandes d
       where d.visiteur = compter_demande_numero.visiteur) >= 20
     or (select count(*) from public.numero_demandes d
       where d.adresse = compter_demande_numero.adresse) >= 300 then
    raise exception 'trop de numéros demandés' using errcode = 'P0001', hint = 'limite';
  end if;
  insert into public.numero_demandes (visiteur, adresse)
    values (compter_demande_numero.visiteur, compter_demande_numero.adresse);
end;
$$;
revoke execute on function private.compter_demande_numero(text, text) from public, anon, authenticated;

drop function public.voir_numero_annonce(bigint);
drop function public.voir_numero_vitrine(text);

create function public.voir_numero_annonce(annonce_id bigint, visiteur text, adresse text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  numero text;
begin
  perform private.compter_demande_numero(visiteur, adresse);
  select coalesce(sp.telephone, p.telephone) into numero
    from public.listings l
    join public.profiles p on p.id = l.user_id
    left join public.shops s on s.id = l.shop_id
    left join public.shop_private sp on sp.shop_id = l.shop_id
   where l.id = annonce_id
     and l.statut = 'active'
     and (l.expire_le is null or l.expire_le > now())
     -- Une annonce pro ne donne son numéro que si sa vitrine est en ligne
     and (l.shop_id is null or (s.statut = 'actif' and s.verifie));
  if numero is null then
    return null;
  end if;
  insert into public.contact_reveals (listing_id) values (annonce_id);
  return numero;
end;
$$;

create function public.voir_numero_vitrine(vitrine_slug text, visiteur text, adresse text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  boutique uuid;
  numero text;
begin
  perform private.compter_demande_numero(visiteur, adresse);
  select s.id, sp.telephone into boutique, numero
    from public.shops s
    join public.shop_private sp on sp.shop_id = s.id
   where s.slug = vitrine_slug
     and s.statut = 'actif'
     and s.verifie;
  if numero is null then
    return null;
  end if;
  insert into public.contact_reveals (shop_id) values (boutique);
  return numero;
end;
$$;

revoke execute on function public.voir_numero_annonce(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.voir_numero_vitrine(text, text, text) from public, anon, authenticated;
grant execute on function public.voir_numero_annonce(bigint, text, text) to service_role;
grant execute on function public.voir_numero_vitrine(text, text, text) to service_role;
