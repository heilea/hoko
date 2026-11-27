-- Hoko : limites d'essais sur la connexion, l'inscription et le mot de passe oublié
-- (SPEC.md, section 4 octies).
--
-- Connexion : 10 essais ratés en 15 minutes par e-mail, 50 par adresse IP.
-- Inscription et mot de passe oublié : 3 demandes par heure par e-mail, 20 par adresse IP.
--
-- Le serveur envoie seulement des empreintes (HMAC) de l'e-mail et de l'adresse IP, jamais les
-- valeurs en clair. Les essais sont effacés au bout d'une heure. Seul le serveur du site
-- (clé secrète, rôle service_role) appelle ces fonctions.

create table public.essais (
  id bigint generated always as identity primary key,
  genre text not null check (genre in ('connexion', 'inscription', 'mot_de_passe')),
  cle text not null check (length(cle) between 16 and 64),
  adresse text not null check (length(adresse) between 16 and 64),
  created_at timestamptz not null default now()
);
create index essais_cle_idx on public.essais (genre, cle, created_at);
create index essais_adresse_idx on public.essais (genre, adresse, created_at);
create index essais_date_idx on public.essais (created_at);

-- Ni le public ni les comptes ne lisent ou n'écrivent cette table : seules les fonctions ci-dessous.
alter table public.essais enable row level security;
create policy "essais : fermé à tous" on public.essais
  for all to anon, authenticated using (false) with check (false);

-- Renvoie 'ok', ou 'limite' si l'e-mail ou l'adresse a atteint sa limite.
-- noter = true : l'essai est compté (inscription, mot de passe oublié, connexion ratée).
-- noter = false : simple contrôle avant de tenter la connexion.
create function public.controler_essai(genre_essai text, cle_essai text, adresse_essai text, noter boolean)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  fenetre interval;
  max_cle integer;
  max_adresse integer;
begin
  case genre_essai
    when 'connexion' then fenetre := interval '15 minutes'; max_cle := 10; max_adresse := 50;
    when 'inscription' then fenetre := interval '1 hour'; max_cle := 3; max_adresse := 20;
    when 'mot_de_passe' then fenetre := interval '1 hour'; max_cle := 3; max_adresse := 20;
    else raise exception 'genre inconnu' using errcode = '22023', hint = 'genre';
  end case;
  if cle_essai is null or adresse_essai is null then
    raise exception 'empreinte manquante' using errcode = '22023';
  end if;

  delete from public.essais where created_at < now() - interval '1 hour';

  if (select count(*) from public.essais e
       where e.genre = genre_essai and e.cle = cle_essai and e.created_at > now() - fenetre) >= max_cle
     or (select count(*) from public.essais e
       where e.genre = genre_essai and e.adresse = adresse_essai and e.created_at > now() - fenetre) >= max_adresse then
    return 'limite';
  end if;

  if noter then
    insert into public.essais (genre, cle, adresse) values (genre_essai, cle_essai, adresse_essai);
  end if;
  return 'ok';
end;
$$;
revoke execute on function public.controler_essai(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.controler_essai(text, text, text, boolean) to service_role;

-- Connexion réussie : les essais ratés de cet e-mail sont oubliés.
create function public.oublier_essais(genre_essai text, cle_essai text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.essais where genre = genre_essai and cle = cle_essai;
$$;
revoke execute on function public.oublier_essais(text, text) from public, anon, authenticated;
grant execute on function public.oublier_essais(text, text) to service_role;
