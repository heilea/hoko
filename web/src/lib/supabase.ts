/**
 * Accès à Supabase (base de données, puis authentification et photos).
 *
 * Deux variables d'environnement, à mettre dans `web/.env.local` en local et chez l'hébergeur
 * en production (modèle : `web/.env.example`) :
 * - NEXT_PUBLIC_SUPABASE_URL : adresse du projet ;
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : clé publique. Elle ne donne que ce que les règles
 *   d'accès (RLS) autorisent à un visiteur, elle peut donc figurer dans le navigateur.
 *
 * La clé secrète (« secret » ou « service_role ») contourne toutes les règles : elle ne doit
 * jamais porter le préfixe NEXT_PUBLIC_ ni être commitée.
 *
 * Tant que les variables manquent, le site continue de tourner sur les données d'exemple.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clePublique = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function supabaseConfigure(): boolean {
  return Boolean(url && clePublique);
}

let client: SupabaseClient | null = null;

/**
 * Client de lecture publique : il voit ce qu'un visiteur non connecté a le droit de voir.
 * Renvoie null si Supabase n'est pas configuré.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !clePublique) return null;
  // Aucune session n'est gardée : ce client ne représente jamais un annonceur connecté
  client ??= createClient(url, clePublique, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
