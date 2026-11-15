import Link from "next/link";
import { categories } from "@/lib/data";
import { Icon } from "./Icon";

/** Tuiles des catégories. `active` met en évidence la catégorie de la page en cours. */
export function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="cats" aria-label="Catégories">
      {categories.map((c) => (
        <Link
          key={c.slug}
          className="cat"
          href={`/categories/${c.slug}`}
          aria-current={c.slug === active ? "page" : undefined}
        >
          <Icon name={c.icone} />
          {c.nom}
        </Link>
      ))}
    </nav>
  );
}
