import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Créer un compte" };

export default function Page() {
  return (
    <ComingSoon
      titre="Créer un compte"
      texte="L'inscription n'est pas encore ouverte. Elle sera gratuite pour les particuliers ; les professionnels pourront ouvrir une vitrine."
    />
  );
}
