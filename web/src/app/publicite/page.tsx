import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Réserver l'espace publicitaire" };

export default function Page() {
  return <ComingSoon titre="Réserver l'espace publicitaire" texte="La réservation en ligne n'est pas encore ouverte. L'espace de la page d'accueil est vendu au mois, payé d'avance." />;
}
