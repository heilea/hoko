/**
 * Une photo montrée en entier dans un cadre de taille fixe, sans être rognée : une photo prise
 * en hauteur ou en largeur garde ses proportions. Les bords vides sont remplis par la même
 * photo, floutée. Le cadre prend la taille de son conteneur (`.cadre-photo` dans globals.css).
 *
 * Les deux images ont la même adresse : le navigateur ne la télécharge qu'une fois.
 */
export function PhotoCadree({ src, alt, paresseuse = true }: { src: string; alt: string; paresseuse?: boolean }) {
  const chargement = paresseuse ? "lazy" : "eager";
  return (
    <span className="cadre-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- image déjà réduite par le serveur */}
      <img className="cadre-fond" src={src} alt="" aria-hidden="true" loading={chargement} decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element -- image déjà réduite par le serveur */}
      <img className="cadre-image" src={src} alt={alt} loading={chargement} decoding="async" />
    </span>
  );
}
