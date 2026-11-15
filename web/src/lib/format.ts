/** Prix en XPF : espace insécable comme séparateur de milliers, sans centimes. */
export function prixXpf(montant: number): string {
  const entier = String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${entier} XPF`;
}

/** Minuscules sans accents, pour comparer une recherche à un texte. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Initiales d'un nom, pour un logo de remplacement. */
export function sigle(nom: string): string {
  return nom
    .split(" ")
    .filter((mot) => mot.length > 2)
    .slice(0, 2)
    .map((mot) => mot[0])
    .join("")
    .toUpperCase();
}
