"use client";

import { useSyncExternalStore } from "react";
import { CHAMP_DEBUT, CHAMP_PIEGE } from "@/lib/essais";

/** Heure de la première lecture dans le navigateur, c'est-à-dire de l'ouverture de la page. */
let ouverture: string | null = null;
const lireOuverture = () => (ouverture ??= String(Date.now()));
const rienAEcouter = () => () => {};

/**
 * Piège à robots invisible (SPEC.md, section 4 octies), à placer dans un formulaire :
 * - un champ « site web » hors de l'écran, sauté au clavier et ignoré des lecteurs d'écran :
 *   seuls les robots le remplissent ;
 * - l'heure d'ouverture de la page, posée une fois la page prête dans le navigateur (vide dans
 *   le HTML du serveur) : le serveur refuse un envoi trop rapide ou sans cette heure.
 */
export function PiegeRobots() {
  const debut = useSyncExternalStore(rienAEcouter, lireOuverture, () => "");

  return (
    <div className="piege" aria-hidden="true">
      <label htmlFor={CHAMP_PIEGE}>Site web (laisser vide)</label>
      <input id={CHAMP_PIEGE} name={CHAMP_PIEGE} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      <input type="hidden" name={CHAMP_DEBUT} value={debut} />
    </div>
  );
}
