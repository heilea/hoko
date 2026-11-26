/**
 * Types de la base Supabase, GÉNÉRÉS à partir du projet : ne pas modifier à la main.
 *
 * À régénérer après chaque migration (outil MCP Supabase `generate_typescript_types`, ou
 * `npx supabase gen types typescript --project-id qzfcfskxoauipvitvpog`), puis lancer
 * `npm test` : `tests/schema.test.js` vérifie que chaque table des migrations y figure.
 *
 * Les colonnes à valeurs fixes (statut, rôle…) sont des `text` avec une contrainte dans la
 * base : elles arrivent ici en `string`, et le code les ramène à leurs valeurs connues
 * (voir `accounts.ts`).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ad_slots: {
        Row: {
          annonceur: string
          category_id: number | null
          created_at: string
          debut: string | null
          emplacement: string
          fin: string | null
          id: number
          lien: string | null
          mode: string
          montant_xpf: number
          statut: string
          visuel: string | null
        }
        Insert: {
          annonceur: string
          category_id?: number | null
          created_at?: string
          debut?: string | null
          emplacement: string
          fin?: string | null
          id?: never
          lien?: string | null
          mode?: string
          montant_xpf?: number
          statut?: string
          visuel?: string | null
        }
        Update: {
          annonceur?: string
          category_id?: number | null
          created_at?: string
          debut?: string | null
          emplacement?: string
          fin?: string | null
          id?: never
          lien?: string | null
          mode?: string
          montant_xpf?: number
          statut?: string
          visuel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_slots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_complets: {
        Row: {
          category_id: number
          created_at: string
          id: number
        }
        Insert: {
          category_id: number
          created_at?: string
          id?: never
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "boost_complets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_tarifs: {
        Row: {
          category_id: number
          modifie_le: string
          prix_xpf: number
        }
        Insert: {
          category_id: number
          modifie_le?: string
          prix_xpf: number
        }
        Update: {
          category_id?: number
          modifie_le?: string
          prix_xpf?: number
        }
        Relationships: [
          {
            foreignKeyName: "boost_tarifs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      boosts: {
        Row: {
          created_at: string
          debut: string | null
          fin: string | null
          id: number
          listing_id: number
          montant_xpf: number
          statut: string
        }
        Insert: {
          created_at?: string
          debut?: string | null
          fin?: string | null
          id?: never
          listing_id: number
          montant_xpf: number
          statut?: string
        }
        Update: {
          created_at?: string
          debut?: string | null
          fin?: string | null
          id?: never
          listing_id?: number
          montant_xpf?: number
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string
          icone: string
          id: number
          nom: string
          ordre: number
          slug: string
        }
        Insert: {
          description?: string
          icone: string
          id?: never
          nom: string
          ordre?: number
          slug: string
        }
        Update: {
          description?: string
          icone?: string
          id?: never
          nom?: string
          ordre?: number
          slug?: string
        }
        Relationships: []
      }
      contact_reveals: {
        Row: {
          created_at: string
          id: number
          listing_id: number | null
          shop_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          listing_id?: number | null
          shop_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          listing_id?: number | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_reveals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reveals_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts_b2b: {
        Row: {
          date_validation: string | null
          shop_id: string
          valide_par_admin: boolean
        }
        Insert: {
          date_validation?: string | null
          shop_id: string
          valide_par_admin?: boolean
        }
        Update: {
          date_validation?: string | null
          shop_id?: string
          valide_par_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_b2b_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          boost_jusqu_au: string | null
          category_id: number
          commune: string
          created_at: string
          description: string
          expire_le: string | null
          id: number
          ile: string
          modere_le: string | null
          modere_par: string | null
          motif_refus: string | null
          prix_xpf: number
          shop_id: string | null
          statut: string
          suffixe_prix: string | null
          termine_le: string | null
          titre: string
          user_id: string
          vendeur_nom: string
        }
        Insert: {
          boost_jusqu_au?: string | null
          category_id: number
          commune: string
          created_at?: string
          description: string
          expire_le?: string | null
          id?: never
          ile: string
          modere_le?: string | null
          modere_par?: string | null
          motif_refus?: string | null
          prix_xpf: number
          shop_id?: string | null
          statut?: string
          suffixe_prix?: string | null
          termine_le?: string | null
          titre: string
          user_id: string
          vendeur_nom: string
        }
        Update: {
          boost_jusqu_au?: string | null
          category_id?: number
          commune?: string
          created_at?: string
          description?: string
          expire_le?: string | null
          id?: never
          ile?: string
          modere_le?: string | null
          modere_par?: string | null
          motif_refus?: string | null
          prix_xpf?: number
          shop_id?: string | null
          statut?: string
          suffixe_prix?: string | null
          termine_le?: string | null
          titre?: string
          user_id?: string
          vendeur_nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_modere_par_fkey"
            columns: ["modere_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      numero_demandes: {
        Row: {
          adresse: string
          created_at: string
          id: number
          visiteur: string
        }
        Insert: {
          adresse: string
          created_at?: string
          id?: never
          visiteur: string
        }
        Update: {
          adresse?: string
          created_at?: string
          id?: never
          visiteur?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          chemin: string
          id: number
          listing_id: number
          ordre: number
        }
        Insert: {
          chemin: string
          id?: never
          listing_id: number
          ordre?: number
        }
        Update: {
          chemin?: string
          id?: never
          listing_id?: number
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nom: string
          role: string
          telephone: string
        }
        Insert: {
          created_at?: string
          id: string
          nom: string
          role?: string
          telephone: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          role?: string
          telephone?: string
        }
        Relationships: []
      }
      pub_tarifs: {
        Row: {
          emplacement: string
          modifie_le: string
          prix_xpf: number
        }
        Insert: {
          emplacement: string
          modifie_le?: string
          prix_xpf: number
        }
        Update: {
          emplacement?: string
          modifie_le?: string
          prix_xpf?: number
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          date_emission: string
          date_paiement: string | null
          id: number
          montant_xpf: number
          numero: string
          shop_id: string
          statut: string
        }
        Insert: {
          date_emission?: string
          date_paiement?: string | null
          id?: never
          montant_xpf: number
          numero: string
          shop_id: string
          statut?: string
        }
        Update: {
          date_emission?: string
          date_paiement?: string | null
          id?: never
          montant_xpf?: number
          numero?: string
          shop_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_private: {
        Row: {
          numero_tahiti: string
          shop_id: string
          telephone: string
        }
        Insert: {
          numero_tahiti: string
          shop_id: string
          telephone: string
        }
        Update: {
          numero_tahiti?: string
          shop_id?: string
          telephone?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_private_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          category_id: number
          commune: string
          created_at: string
          horaires: string[]
          id: string
          ile: string
          nom: string
          presentation: string
          secteur: string
          slug: string
          statut: string
          user_id: string
          verifie: boolean
        }
        Insert: {
          category_id: number
          commune: string
          created_at?: string
          horaires?: string[]
          id?: string
          ile: string
          nom: string
          presentation?: string
          secteur: string
          slug: string
          statut?: string
          user_id: string
          verifie?: boolean
        }
        Update: {
          category_id?: number
          commune?: string
          created_at?: string
          horaires?: string[]
          id?: string
          ile?: string
          nom?: string
          presentation?: string
          secteur?: string
          slug?: string
          statut?: string
          user_id?: string
          verifie?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shops_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signalements: {
        Row: {
          adresse: string
          created_at: string
          details: string | null
          id: number
          listing_id: number
          motif: string
          statut: string
          traite_le: string | null
          traite_par: string | null
          visiteur: string
        }
        Insert: {
          adresse: string
          created_at?: string
          details?: string | null
          id?: never
          listing_id: number
          motif: string
          statut?: string
          traite_le?: string | null
          traite_par?: string | null
          visiteur: string
        }
        Update: {
          adresse?: string
          created_at?: string
          details?: string | null
          id?: never
          listing_id?: number
          motif?: string
          statut?: string
          traite_le?: string | null
          traite_par?: string | null
          visiteur?: string
        }
        Relationships: [
          {
            foreignKeyName: "signalements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ajouter_photo: {
        Args: { annonce_id: number; chemin: string }
        Returns: number
      }
      annuler_boost: { Args: { boost_id: number }; Returns: undefined }
      boosts_admin: {
        Args: never
        Returns: {
          annonce_id: number
          annonce_statut: string
          categorie: string
          commande_le: string
          debut: string
          email: string
          fin: string
          id: number
          montant_xpf: number
          statut: string
          telephone: string
          titre: string
          vendeur: string
        }[]
      }
      commander_boost: {
        Args: { annonce_id: number }
        Returns: {
          commande_id: number
          libre_le: string
          montant_xpf: number
          statut: string
        }[]
      }
      creer_pub: {
        Args: {
          annonceur: string
          categorie: string
          emplacement: string
          lien: string
          visuel: string
        }
        Returns: number
      }
      decider_boost: {
        Args: { boost_id: number; geste: string }
        Returns: undefined
      }
      decider_pub: {
        Args: { geste: string; pub_id: number }
        Returns: string
      }
      decider_vitrine: {
        Args: { geste: string; vitrine_id: string }
        Returns: undefined
      }
      etat_boost: {
        Args: { annonce_id: number }
        Returns: {
          commande_fin: string
          commande_id: number
          commande_montant: number
          commande_statut: string
          libre_le: string
          places: number
          places_prises: number
          prix_xpf: number
        }[]
      }
      gerer_annonce: {
        Args: { annonce_id: number; geste: string }
        Returns: string
      }
      moderer_annonce: {
        Args: { annonce_id: number; decision: string; motif?: string }
        Returns: undefined
      }
      modifier_annonce: {
        Args: {
          annonce_id: number
          categorie: string
          commune: string
          description: string
          ile: string
          prix_xpf: number
          titre: string
        }
        Returns: undefined
      }
      modifier_vitrine: {
        Args: {
          categorie: string
          commune: string
          horaires: string[]
          ile: string
          presentation: string
        }
        Returns: undefined
      }
      photo_en_premier: { Args: { photo_id: number }; Returns: undefined }
      rechercher_annonces: {
        Args: { recherche: string }
        Returns: {
          boost_jusqu_au: string | null
          category_id: number
          commune: string
          created_at: string
          description: string
          expire_le: string | null
          id: number
          ile: string
          modere_le: string | null
          modere_par: string | null
          motif_refus: string | null
          prix_xpf: number
          shop_id: string | null
          statut: string
          suffixe_prix: string | null
          termine_le: string | null
          titre: string
          user_id: string
          vendeur_nom: string
        }[]
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      signaler_annonce: {
        Args: {
          adresse: string
          annonce_id: number
          details: string
          motif: string
          visiteur: string
        }
        Returns: undefined
      }
      supprimer_photo: { Args: { photo_id: number }; Returns: string }
      traiter_signalements: {
        Args: { annonce_id: number; geste: string; motif?: string }
        Returns: undefined
      }
      vitrines_admin: {
        Args: never
        Returns: {
          annonces_en_ligne: number
          commune: string
          creee_le: string
          email: string
          id: string
          ile: string
          nom: string
          numero_tahiti: string
          secteur: string
          slug: string
          statut: string
          telephone: string
          verifie: boolean
        }[]
      }
      voir_numero_annonce: {
        Args: { adresse: string; annonce_id: number; visiteur: string }
        Returns: string
      }
      voir_numero_vitrine: {
        Args: { adresse: string; visiteur: string; vitrine_slug: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
