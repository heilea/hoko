"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { seDeconnecter } from "@/app/actions";

const liens = [
  { href: "/compte", libelle: "Tableau de bord" },
  { href: "/compte/annonces", libelle: "Mes annonces" },
  { href: "/compte/profil", libelle: "Mon profil" },
];

/** Menu de l'espace annonceur, avec la page en cours mise en évidence. Un pro a en plus « Ma vitrine ». */
export function AccountNav({ admin = false, pro = false }: { admin?: boolean; pro?: boolean }) {
  const chemin = usePathname();
  const tous = pro ? [...liens.slice(0, 2), { href: "/compte/vitrine", libelle: "Ma vitrine" }, ...liens.slice(2)] : liens;
  return (
    <nav className="compte-nav" aria-label="Mon compte">
      {tous.map((lien) => (
        <Link key={lien.href} href={lien.href} aria-current={chemin === lien.href ? "page" : undefined}>
          {lien.libelle}
        </Link>
      ))}
      {admin && <Link href="/admin">Annonces à valider</Link>}
      {admin && <Link href="/admin/vitrines">Vitrines</Link>}
      {admin && <Link href="/admin/boosts">Boosts</Link>}
      {admin && <Link href="/admin/pubs">Espaces pub</Link>}
      <form action={seDeconnecter}>
        <button type="submit">Se déconnecter</button>
      </form>
    </nav>
  );
}
