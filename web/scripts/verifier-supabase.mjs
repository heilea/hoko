/**
 * Vérifie que le projet Supabase est joignable et que le schéma est en place.
 *
 * Lancer depuis le dossier web : npm run supabase:verifier
 * (lit NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local)
 *
 * Le script se connecte comme un visiteur non connecté. Il contrôle aussi que ce visiteur
 * ne voit aucune donnée privée.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !cle) {
  console.error("Variables manquantes : remplissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans web/.env.local.");
  process.exit(1);
}

const supabase = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });

/** Tables lisibles par le public, et tables qui doivent rester vides pour un visiteur. */
const PUBLIQUES = ["categories", "shops", "listings", "photos", "ad_slots"];
const PRIVEES = ["profiles", "shop_private", "boosts", "contact_reveals", "customer_accounts_b2b", "purchase_orders"];

let echecs = 0;
const ok = (message) => console.log(`  ok      ${message}`);
const echec = (message) => {
  echecs += 1;
  console.log(`  ÉCHEC   ${message}`);
};

async function compter(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) return { erreur: error.message || error.code || "erreur inconnue" };
  return { lignes: count ?? 0 };
}

console.log(`Projet : ${new URL(url).host}`);

for (const table of PUBLIQUES) {
  const resultat = await compter(table);
  if ("erreur" in resultat) echec(`${table} : ${resultat.erreur}`);
  else ok(`${table} : lisible, ${resultat.lignes} ligne(s) visible(s)`);
}

for (const table of PRIVEES) {
  const resultat = await compter(table);
  if ("erreur" in resultat) echec(`${table} : ${resultat.erreur}`);
  else if (resultat.lignes > 0) echec(`${table} : ${resultat.lignes} ligne(s) visible(s) par un visiteur, alors que la table est privée`);
  else ok(`${table} : présente, rien de visible pour un visiteur`);
}

const { data: categories, error: erreurCategories } = await supabase.from("categories").select("slug").order("ordre");
if (erreurCategories) echec(`catégories : ${erreurCategories.message}`);
else if (categories.length === 0) echec("catégories : la table est vide, le schéma n'a pas été exécuté en entier");
else ok(`catégories : ${categories.map((c) => c.slug).join(", ")}`);

// Un visiteur ne doit pas pouvoir écrire
const { error: erreurEcriture } = await supabase.from("categories").insert({ slug: "test-visiteur", nom: "Test", icone: "test" });
if (erreurEcriture) ok("écriture refusée à un visiteur");
else {
  echec("un visiteur a pu créer une catégorie : les règles d'accès ne sont pas en place");
  await supabase.from("categories").delete().eq("slug", "test-visiteur");
}

console.log(echecs === 0 ? "\nSupabase est branché et le schéma est en place." : `\n${echecs} point(s) à corriger.`);
process.exit(echecs === 0 ? 0 : 1);
