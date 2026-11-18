/**
 * Accès au stockage des photos avec la clé secrète, côté serveur seulement.
 *
 * Un compte ne peut pas déposer de fichier dans le stockage lui-même (règles d'accès de la
 * base) : c'est le serveur qui dépose la photo, une fois vérifiée et traitée par sharp, et qui
 * l'efface. Il le fait toujours après avoir vérifié la session, et la base vérifie de son côté
 * que l'annonce appartient au compte (fonctions `ajouter_photo`, `supprimer_photo`).
 *
 * La clé secrète (SUPABASE_SECRET_KEY) contourne toutes les règles : ce client ne sert qu'au
 * stockage des photos, jamais aux tables, et la clé ne porte jamais le préfixe NEXT_PUBLIC_.
 */
import { createClient } from "@supabase/supabase-js";
import { ESPACE_PHOTOS } from "./photos";

export function stockagePhotos() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SECRET_KEY;
  if (!url || !cle) return null;
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(ESPACE_PHOTOS);
}
