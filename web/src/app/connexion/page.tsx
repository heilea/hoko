import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Connexion" };

export default function Page() {
  return <ComingSoon titre="Connexion" texte="L'inscription et la connexion ne sont pas encore ouvertes." />;
}
