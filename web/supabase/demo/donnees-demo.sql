-- Hoko : données de la démo client. À exécuter UNE fois, sur le projet Supabase de démo
-- seulement, après les migrations (supabase/migrations). Jamais sur la vraie base.
--
-- Généré depuis les anciennes données d'exemple du site (8 annonces de particuliers,
-- 6 vitrines, 15 annonces pro). Les numéros de téléphone sont fictifs.
-- Catégories attendues : vehicules, immobilier, emploi, services, maison, multimedia, mode, sports, nautisme, animaux.

-- Comptes des vendeurs d'exemple : sans mot de passe, ils ne peuvent pas se connecter.
-- Le déclencheur handle_new_user crée leur profil, et la vitrine des pros.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  (md5('hoko-demo-teva')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teva@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Teva","telephone":"87 00 00 01"}'::jsonb, now(), now()),
  (md5('hoko-demo-hinano')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hinano@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Hinano","telephone":"87 00 00 02"}'::jsonb, now(), now()),
  (md5('hoko-demo-maeva')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maeva@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Maeva","telephone":"87 00 00 03"}'::jsonb, now(), now()),
  (md5('hoko-demo-manutea')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manutea@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Manutea","telephone":"87 00 00 05"}'::jsonb, now(), now()),
  (md5('hoko-demo-vaea')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vaea@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Vaea","telephone":"87 00 00 06"}'::jsonb, now(), now()),
  (md5('hoko-demo-tamatoa')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tamatoa@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Tamatoa","telephone":"87 00 00 07"}'::jsonb, now(), now()),
  (md5('hoko-demo-raimana')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'raimana@demo.hoko.invalid', now(), '{"type":"particulier","nom":"Raimana","telephone":"87 00 00 08"}'::jsonb, now(), now()),
  (md5('hoko-demo-fare-plomberie')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fare-plomberie@demo.hoko.invalid', now(), '{"type":"pro","nom":"Fare Plomberie","telephone":"40 00 00 01","numeroTahiti":"DEMO","secteur":"services","ile":"Tahiti","commune":"Pirae"}'::jsonb, now(), now()),
  (md5('hoko-demo-moana-auto')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'moana-auto@demo.hoko.invalid', now(), '{"type":"pro","nom":"Moana Auto","telephone":"40 00 00 02","numeroTahiti":"DEMO","secteur":"vehicules","ile":"Tahiti","commune":"Faa''a"}'::jsonb, now(), now()),
  (md5('hoko-demo-jardins-de-la-presquile')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jardins-de-la-presquile@demo.hoko.invalid', now(), '{"type":"pro","nom":"Jardins de la Presqu''île","telephone":"40 00 00 03","numeroTahiti":"DEMO","secteur":"services","ile":"Tahiti","commune":"Taravao"}'::jsonb, now(), now()),
  (md5('hoko-demo-immo-motu')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'immo-motu@demo.hoko.invalid', now(), '{"type":"pro","nom":"Immo Motu","telephone":"40 00 00 04","numeroTahiti":"DEMO","secteur":"immobilier","ile":"Moorea","commune":"Maharepa"}'::jsonb, now(), now()),
  (md5('hoko-demo-tech-fenua')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech-fenua@demo.hoko.invalid', now(), '{"type":"pro","nom":"Tech Fenua","telephone":"40 00 00 05","numeroTahiti":"DEMO","secteur":"multimedia","ile":"Tahiti","commune":"Papeete"}'::jsonb, now(), now()),
  (md5('hoko-demo-atelier-tifaifai')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atelier-tifaifai@demo.hoko.invalid', now(), '{"type":"pro","nom":"Atelier Tifaifai","telephone":"40 00 00 06","numeroTahiti":"DEMO","secteur":"mode","ile":"Raiatea","commune":"Uturoa"}'::jsonb, now(), now());

-- Vitrines : adresse, présentation et horaires d'exemple, en ligne et vérifiées
update public.shops set slug = 'fare-plomberie', secteur = 'Plomberie', presentation = 'Dépannage et installation de plomberie sur toute l''île de Tahiti. Fuites, chauffe-eau solaires, salles de bains : nous intervenons chez les particuliers et les entreprises.', horaires = array['Lundi au vendredi : 7 h à 16 h', 'Samedi : 7 h à 11 h', 'Urgences : sur appel']::text[], statut = 'actif', verifie = true where user_id = md5('hoko-demo-fare-plomberie')::uuid;
update public.shops set slug = 'moana-auto', secteur = 'Véhicules', presentation = 'Vente de véhicules d''occasion révisés et garantis. Chaque voiture passe par notre atelier avant d''être mise en vente. Reprise de votre ancien véhicule possible.', horaires = array['Lundi au vendredi : 7 h 30 à 17 h', 'Samedi : 8 h à 12 h']::text[], statut = 'actif', verifie = true where user_id = md5('hoko-demo-moana-auto')::uuid;
update public.shops set slug = 'jardins-de-la-presquile', secteur = 'Jardinage', presentation = 'Entretien de jardins, élagage et création d''espaces verts à la Presqu''île. Contrats à l''année ou interventions ponctuelles.', horaires = array['Lundi au vendredi : 6 h 30 à 15 h']::text[], statut = 'actif', verifie = true where user_id = md5('hoko-demo-jardins-de-la-presquile')::uuid;
update public.shops set slug = 'immo-motu', secteur = 'Immobilier', presentation = 'Agence immobilière à Moorea : locations à l''année, ventes de maisons et de terrains. Nous connaissons chaque quartier de l''île.', horaires = array['Lundi au vendredi : 8 h à 16 h 30', 'Samedi : sur rendez-vous']::text[], statut = 'actif', verifie = true where user_id = md5('hoko-demo-immo-motu')::uuid;
update public.shops set slug = 'tech-fenua', secteur = 'Informatique', presentation = 'Vente et réparation d''ordinateurs, de téléphones et de tablettes. Matériel neuf et reconditionné, garanti en magasin.', horaires = array['Lundi au vendredi : 8 h à 17 h', 'Samedi : 8 h à 12 h']::text[], statut = 'actif', verifie = true where user_id = md5('hoko-demo-tech-fenua')::uuid;
update public.shops set slug = 'atelier-tifaifai', secteur = 'Couture', presentation = 'Tifaifai cousus main, robes et chemises sur mesure. Chaque pièce est réalisée à l''atelier, à Uturoa.', horaires = array['Mardi au samedi : 8 h à 15 h']::text[], statut = 'actif', verifie = true where user_id = md5('hoko-demo-atelier-tifaifai')::uuid;

-- Annonces de particuliers, en ligne. La date suit le libellé d'exemple (« hier », « il y a 2 jours »…).
insert into public.listings (user_id, category_id, titre, description, prix_xpf, suffixe_prix, ile, commune, vendeur_nom, statut, boost_jusqu_au, created_at) values
  (md5('hoko-demo-teva')::uuid, (select id from public.categories where slug = 'vehicules'), 'Scooter 125 cm³, 14 000 km', 'Scooter 125 cm³ de 2021, 14 000 km, toujours entretenu chez le concessionnaire.
Pneus et plaquettes changés il y a deux mois. Vendu avec un casque et un top-case.
Visible à Papeete en fin de journée.', 220000, null, 'Tahiti', 'Papeete', 'Teva', 'active', now() + interval '365 days', now() - interval '0 days' - interval '0 minutes'),
  (md5('hoko-demo-hinano')::uuid, (select id from public.categories where slug = 'nautisme'), 'Pirogue V1 carbone avec rame', 'Pirogue V1 en carbone, très bon état, une seule saison de course.
Vendue avec sa rame et ses supports de transport.
Essai possible à la marina de Punaauia.', 180000, null, 'Tahiti', 'Punaauia', 'Hinano', 'active', null, now() - interval '0 days' - interval '7 minutes'),
  (md5('hoko-demo-maeva')::uuid, (select id from public.categories where slug = 'immobilier'), 'Studio meublé proche du quai', 'Studio meublé de 28 m² à cinq minutes à pied du quai d''Uturoa.
Cuisine équipée, climatisation, eau chaude solaire.
Libre au début du mois prochain. Charges non comprises.', 95000, ' / mois', 'Raiatea', 'Uturoa', 'Maeva', 'active', null, now() - interval '1 days' - interval '14 minutes'),
  (md5('hoko-demo-teva')::uuid, (select id from public.categories where slug = 'maison'), 'Canapé d''angle 5 places', 'Canapé d''angle 5 places en tissu gris, déhoussable.
Acheté il y a deux ans, vendu pour cause de déménagement.
À venir chercher à Mahina, prévoir un pick-up.', 60000, null, 'Tahiti', 'Mahina', 'Teva', 'active', null, now() - interval '1 days' - interval '21 minutes'),
  (md5('hoko-demo-manutea')::uuid, (select id from public.categories where slug = 'sports'), 'Ukulélé de concert en kou', 'Ukulélé de concert fabriqué à la main en bois de kou.
Son chaud, mécaniques neuves, livré avec sa housse.', 35000, null, 'Moorea', 'Afareaitu', 'Manutea', 'active', null, now() - interval '1 days' - interval '28 minutes'),
  (md5('hoko-demo-vaea')::uuid, (select id from public.categories where slug = 'multimedia'), 'Ordinateur portable 15 pouces', 'Ordinateur portable 15 pouces, 16 Go de mémoire, disque SSD de 512 Go.
Batterie en bon état, vendu avec son chargeur et une sacoche.', 85000, null, 'Tahiti', 'Faa''a', 'Vaea', 'active', null, now() - interval '2 days' - interval '35 minutes'),
  (md5('hoko-demo-tamatoa')::uuid, (select id from public.categories where slug = 'vehicules'), 'Pick-up 4x4 double cabine, 2018', 'Pick-up 4x4 double cabine de 2018, diesel, 92 000 km.
Contrôle technique à jour, carnet d''entretien complet.
Idéal pour les routes de l''île.', 2400000, null, 'Bora Bora', 'Vaitape', 'Tamatoa', 'active', null, now() - interval '2 days' - interval '42 minutes'),
  (md5('hoko-demo-raimana')::uuid, (select id from public.categories where slug = 'sports'), 'Planche de surf 6''2 avec housse', 'Planche de surf 6''2, quelques réparations propres sur le rail.
Vendue avec housse, leash et jeu de dérives.', 40000, null, 'Tahiti', 'Teahupoo', 'Raimana', 'active', null, now() - interval '3 days' - interval '49 minutes');

-- Annonces des vitrines
insert into public.listings (user_id, shop_id, category_id, titre, description, prix_xpf, suffixe_prix, ile, commune, vendeur_nom, statut, created_at) values
  (md5('hoko-demo-fare-plomberie')::uuid, (select id from public.shops where slug = 'fare-plomberie'), (select id from public.categories where slug = 'services'), 'Dépannage de fuite à domicile', 'Recherche et réparation de fuite, déplacement compris sur la zone urbaine de Tahiti.
Devis gratuit avant toute intervention plus importante.', 8000, null, 'Tahiti', 'Pirae', 'Fare Plomberie', 'active', now() - interval '4 days' - interval '0 hours'),
  (md5('hoko-demo-fare-plomberie')::uuid, (select id from public.shops where slug = 'fare-plomberie'), (select id from public.categories where slug = 'services'), 'Pose de chauffe-eau solaire 200 L', 'Fourniture et pose d''un chauffe-eau solaire de 200 litres.
Installation en une journée, garantie pièces et main-d''œuvre.', 185000, null, 'Tahiti', 'Pirae', 'Fare Plomberie', 'active', now() - interval '4 days' - interval '1 hours'),
  (md5('hoko-demo-fare-plomberie')::uuid, (select id from public.shops where slug = 'fare-plomberie'), (select id from public.categories where slug = 'services'), 'Rénovation complète de salle de bains', 'Dépose de l''ancien équipement, plomberie, pose de la douche et du meuble vasque.
Prix de départ pour une salle de bains de 4 m².', 450000, null, 'Tahiti', 'Pirae', 'Fare Plomberie', 'active', now() - interval '4 days' - interval '2 hours'),
  (md5('hoko-demo-moana-auto')::uuid, (select id from public.shops where slug = 'moana-auto'), (select id from public.categories where slug = 'vehicules'), 'Citadine 5 portes, 2020, 38 000 km', 'Citadine essence de 2020, première main, 38 000 km.
Révisée dans notre atelier, garantie 6 mois.', 1450000, null, 'Tahiti', 'Faa''a', 'Moana Auto', 'active', now() - interval '4 days' - interval '0 hours'),
  (md5('hoko-demo-moana-auto')::uuid, (select id from public.shops where slug = 'moana-auto'), (select id from public.categories where slug = 'vehicules'), 'SUV 7 places diesel, 2019', 'SUV 7 places de 2019, diesel, boîte automatique, 71 000 km.
Contrôle technique à jour, garantie 6 mois.', 2950000, null, 'Tahiti', 'Faa''a', 'Moana Auto', 'active', now() - interval '4 days' - interval '1 hours'),
  (md5('hoko-demo-moana-auto')::uuid, (select id from public.shops where slug = 'moana-auto'), (select id from public.categories where slug = 'vehicules'), 'Utilitaire fourgon, 2021', 'Fourgon utilitaire de 2021, 45 000 km, idéal pour les artisans.
Cloison de séparation et plancher bois.', 2200000, null, 'Tahiti', 'Faa''a', 'Moana Auto', 'active', now() - interval '4 days' - interval '2 hours'),
  (md5('hoko-demo-jardins-de-la-presquile')::uuid, (select id from public.shops where slug = 'jardins-de-la-presquile'), (select id from public.categories where slug = 'services'), 'Entretien de jardin au mois', 'Tonte, taille des haies et ramassage des déchets verts, deux passages par mois.
Tarif pour un jardin jusqu''à 500 m².', 25000, ' / mois', 'Tahiti', 'Taravao', 'Jardins de la Presqu''île', 'active', now() - interval '4 days' - interval '0 hours'),
  (md5('hoko-demo-jardins-de-la-presquile')::uuid, (select id from public.shops where slug = 'jardins-de-la-presquile'), (select id from public.categories where slug = 'services'), 'Élagage de cocotier', 'Élagage et nettoyage d''un cocotier, noix et palmes évacuées.
Prix par arbre, dégressif à partir de cinq.', 6000, null, 'Tahiti', 'Taravao', 'Jardins de la Presqu''île', 'active', now() - interval '4 days' - interval '1 hours'),
  (md5('hoko-demo-immo-motu')::uuid, (select id from public.shops where slug = 'immo-motu'), (select id from public.categories where slug = 'immobilier'), 'Maison F3 avec jardin à Maharepa', 'Maison F3 de 85 m² avec jardin clos, à cinq minutes des commerces.
Location à l''année, libre le mois prochain.', 180000, ' / mois', 'Moorea', 'Maharepa', 'Immo Motu', 'active', now() - interval '4 days' - interval '0 hours'),
  (md5('hoko-demo-immo-motu')::uuid, (select id from public.shops where slug = 'immo-motu'), (select id from public.categories where slug = 'immobilier'), 'Terrain viabilisé de 800 m² côté montagne', 'Terrain plat de 800 m², eau et électricité en bordure.
Vue dégagée sur la baie.', 14500000, null, 'Moorea', 'Maharepa', 'Immo Motu', 'active', now() - interval '4 days' - interval '1 hours'),
  (md5('hoko-demo-tech-fenua')::uuid, (select id from public.shops where slug = 'tech-fenua'), (select id from public.categories where slug = 'multimedia'), 'Ordinateur portable reconditionné 14 pouces', 'Portable 14 pouces reconditionné, 8 Go de mémoire, SSD 256 Go.
Garanti 12 mois en magasin.', 65000, null, 'Tahiti', 'Papeete', 'Tech Fenua', 'active', now() - interval '4 days' - interval '0 hours'),
  (md5('hoko-demo-tech-fenua')::uuid, (select id from public.shops where slug = 'tech-fenua'), (select id from public.categories where slug = 'multimedia'), 'Remplacement d''écran de téléphone', 'Remplacement de l''écran en une heure pour les modèles courants.
Prix de départ, pièce et main-d''œuvre comprises.', 15000, null, 'Tahiti', 'Papeete', 'Tech Fenua', 'active', now() - interval '4 days' - interval '1 hours'),
  (md5('hoko-demo-tech-fenua')::uuid, (select id from public.shops where slug = 'tech-fenua'), (select id from public.categories where slug = 'multimedia'), 'Tablette 10 pouces neuve', 'Tablette 10 pouces, 64 Go, livrée avec sa coque.
Garantie 2 ans.', 42000, null, 'Tahiti', 'Papeete', 'Tech Fenua', 'active', now() - interval '4 days' - interval '2 hours'),
  (md5('hoko-demo-atelier-tifaifai')::uuid, (select id from public.shops where slug = 'atelier-tifaifai'), (select id from public.categories where slug = 'mode'), 'Tifaifai deux personnes cousu main', 'Tifaifai pour lit deux personnes, motif uru, entièrement cousu à la main.
Couleurs au choix, délai de trois semaines.', 95000, null, 'Raiatea', 'Uturoa', 'Atelier Tifaifai', 'active', now() - interval '4 days' - interval '0 hours'),
  (md5('hoko-demo-atelier-tifaifai')::uuid, (select id from public.shops where slug = 'atelier-tifaifai'), (select id from public.categories where slug = 'mode'), 'Chemise sur mesure en tissu local', 'Chemise homme sur mesure, tissu à choisir à l''atelier.
Prête en une semaine.', 9500, null, 'Raiatea', 'Uturoa', 'Atelier Tifaifai', 'active', now() - interval '4 days' - interval '1 hours');
