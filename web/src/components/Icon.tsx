import type { ReactNode } from "react";
import type { IconName } from "@/lib/data";

const paths: Record<IconName, ReactNode> = {
  vehicules: (
    <>
      <path d="M3 13l2-5h14l2 5v5H3z" />
      <path d="M3 13h18" />
      <circle cx="7.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </>
  ),
  immobilier: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  emploi: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V4h6v3M3 13h18" />
    </>
  ),
  services: (
    <>
      <path d="M14.5 5.5a4 4 0 0 0 4.9 4.9L9.5 20.3a2.1 2.1 0 0 1-3-3z" />
      <path d="M14.5 5.5l2 2" />
    </>
  ),
  maison: (
    <>
      <path d="M5 11V7h14v4" />
      <rect x="2" y="11" width="20" height="6" rx="2" />
      <path d="M5 17v3M19 17v3" />
    </>
  ),
  multimedia: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  mode: <path d="M8 3l4 3 4-3 5 4-3 4-2-1v11H8V10l-2 1-3-4z" />,
  sports: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3.5 3 3.5 15 0 18M12 3c-3.5 3-3.5 15 0 18" />
    </>
  ),
  nautisme: (
    <>
      <path d="M3 17h18l-3 4H6z" />
      <path d="M12 3v14M12 5l6 9h-6" />
    </>
  ),
  animaux: (
    <>
      <circle cx="6.5" cy="10" r="1.8" />
      <circle cx="10" cy="6" r="1.8" />
      <circle cx="14" cy="6" r="1.8" />
      <circle cx="17.5" cy="10" r="1.8" />
      <path d="M8 17.5c0-3 2-5 4-5s4 2 4 5c0 2-2 2.5-4 2.5s-4-.5-4-2.5z" />
    </>
  ),
  lieu: (
    <>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  loupe: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  gratuit: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  telephone: (
    <path d="M6 3h3l1.500 4.500-2 1.500a12 12 0 0 0 6.500 6.500l1.500-2L21 15v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z" />
  ),
  boost: <path d="M12 20V5M6 11l6-6 6 6" />,
  fleche: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  horloge: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  verifie: (
    <>
      <path d="M12 3l7 3v5c0 4.500-3 8-7 10-4-2-7-5.500-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

/** Icône au trait, décorative : le texte voisin porte le sens. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
