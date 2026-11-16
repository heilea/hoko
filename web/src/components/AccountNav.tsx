"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { seDeconnecter } from "@/app/actions";

const liens = [
  { href: "/compte", libelle: "Tableau de bord" },
  { href: "/compte/annonces", libelle: "Mes annonces" },
  { href: "/compte/profil", libelle: "Mon profil" },
];

/** Menu de l'espace annonceur, avec la page en cours mise en évidence. */
export function AccountNav({ admin = false }: { admin?: boolean }) {
  const chemin = usePathname();
  return (
    <nav className="compte-nav" aria-label="Mon compte">
      {liens.map((lien) => (
        <Link key={lien.href} href={lien.href} aria-current={chemin === lien.href ? "page" : undefined}>
          {lien.libelle}
        </Link>
      ))}
      {admin && <Link href="/admin">Administration</Link>}
      <form action={seDeconnecter}>
        <button type="submit">Se déconnecter</button>
      </form>
    </nav>
  );
}
