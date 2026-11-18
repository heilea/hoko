-- Hoko : photos des annonces (SPEC.md, sections 4 ter et 4 quinquies).
--
-- Les fichiers vivent dans le stockage Supabase, espace « photos » ; la table `photos` dit à
-- quelle annonce ils appartiennent et dans quel ordre. Le site traite chaque photo avant de
-- l'enregistrer (JPEG vérifié, position GPS retirée, image réduite) : il dépose deux fichiers,
-- `<chemin>` (grande image) et la vignette, même nom terminé par `-v.jpg`.
--
-- Chemin d'un fichier : `<compte>/<annonce>/<nom au hasard>.jpg`. Le nom au hasard rend
-- l'adresse impossible à deviner : l'espace est public en lecture, pour que les images
-- s'affichent et se mettent en cache sans jeton, mais seules les pages qui montrent
-- l'annonce donnent l'adresse.

-- ───────────────── Espace de stockage ─────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 2 * 1024 * 1024, array['image/jpeg']);

-- Un annonceur ne dépose et n'efface que dans son propre dossier (le premier segment du chemin)
create policy "photos stockage : lecture par l'annonceur" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos stockage : dépôt par l'annonceur" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos stockage : suppression par l'annonceur" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos stockage : gestion par l'administrateur" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and private.is_admin())
  with check (bucket_id = 'photos' and private.is_admin());

-- ───────────────── Table photos : seulement par les fonctions ─────────────────
-- Une photo ajoutée renvoie l'annonce à la validation : l'annonceur ne doit pas pouvoir écrire
-- directement dans la table.

drop policy "photos : gestion par l'annonceur" on public.photos;
revoke insert, update, delete on public.photos from authenticated, anon;

/**
 * Enregistre une photo déjà déposée dans le stockage. 6 photos au plus par annonce.
 * Une annonce qui n'était pas en attente repasse en attente de validation : la nouvelle
 * photo doit être vérifiée avant d'être en ligne. Renvoie l'identifiant de la photo.
 */
create function public.ajouter_photo(annonce_id bigint, chemin text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  a public.listings%rowtype;
  nombre integer;
  nouvelle bigint;
begin
  select * into a from public.listings
   where id = annonce_id and user_id = (select auth.uid()) and shop_id is null
   for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  -- Le fichier doit être dans le dossier de cette annonce, au nom attendu
  if chemin !~ ('^' || (select auth.uid())::text || '/' || annonce_id::text || '/[0-9a-f-]{36}\.jpg$') then
    raise exception 'Chemin de photo invalide.' using errcode = '22023';
  end if;

  select count(*) into nombre from public.photos where listing_id = annonce_id;
  if nombre >= 6 then
    raise exception 'Une annonce a 6 photos au plus.' using errcode = 'check_violation';
  end if;

  insert into public.photos (listing_id, chemin, ordre)
  values (annonce_id, chemin, nombre)
  returning id into nouvelle;

  if a.statut <> 'en_attente_validation' then
    update public.listings
       set statut = 'en_attente_validation', motif_refus = null, modere_par = null, modere_le = null,
           expire_le = null, termine_le = null
     where id = annonce_id;
  end if;
  return nouvelle;
end;
$$;

/**
 * Retire une photo de son annonce et renvoie son chemin : le site efface ensuite les fichiers.
 * Retirer une photo ne renvoie pas l'annonce à la validation (rien de nouveau à vérifier).
 */
create function public.supprimer_photo(photo_id bigint)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  ancien text;
  annonce bigint;
begin
  delete from public.photos p
   using public.listings l
   where p.id = photo_id and l.id = p.listing_id and l.user_id = (select auth.uid())
  returning p.chemin, p.listing_id into ancien, annonce;
  if ancien is null then
    raise exception 'Photo introuvable.' using errcode = 'P0002';
  end if;
  -- Les suivantes remontent d'un rang : la première reste la vignette
  update public.photos q
     set ordre = r.rang
    from (select id, (row_number() over (order by ordre, id) - 1)::smallint as rang
            from public.photos where listing_id = annonce) r
   where q.id = r.id;
  return ancien;
end;
$$;

/** Met une photo en premier : elle devient la vignette de l'annonce. */
create function public.photo_en_premier(photo_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  annonce bigint;
begin
  select p.listing_id into annonce
    from public.photos p
    join public.listings l on l.id = p.listing_id
   where p.id = photo_id and l.user_id = (select auth.uid());
  if annonce is null then
    raise exception 'Photo introuvable.' using errcode = 'P0002';
  end if;
  update public.photos q
     set ordre = r.rang
    from (select id, (row_number() over (order by (id <> photo_id), ordre, id) - 1)::smallint as rang
            from public.photos where listing_id = annonce) r
   where q.id = r.id;
end;
$$;

revoke execute on function public.ajouter_photo(bigint, text) from public, anon;
revoke execute on function public.supprimer_photo(bigint) from public, anon;
revoke execute on function public.photo_en_premier(bigint) from public, anon;
grant execute on function public.ajouter_photo(bigint, text) to authenticated;
grant execute on function public.supprimer_photo(bigint) to authenticated;
grant execute on function public.photo_en_premier(bigint) to authenticated;
