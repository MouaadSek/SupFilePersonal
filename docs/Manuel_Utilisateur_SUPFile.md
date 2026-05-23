# Manuel Utilisateur — SUPFile

## Table des matières

1. [Premiers pas](#1-premiers-pas)
2. [Connexion et inscription](#2-connexion-et-inscription)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Gestion des fichiers](#4-gestion-des-fichiers)
5. [Gestion des dossiers](#5-gestion-des-dossiers)
6. [Corbeille](#6-corbeille)
7. [Prévisualisation](#7-prévisualisation)
8. [Téléchargement](#8-téléchargement)
9. [Partage](#9-partage)
10. [Recherche](#10-recherche)
11. [Paramètres](#11-paramètres)
12. [Application mobile](#12-application-mobile)
13. [FAQ](#13-faq)

---

## 1. Premiers pas

SUPFile est accessible depuis un navigateur web à l'adresse fournie par votre administrateur (par défaut `http://localhost:4000`). Aucune installation n'est requise côté utilisateur.

Pour utiliser l'application mobile, installez l'APK ou scannez le QR code Expo depuis l'application Expo Go.

---

## 2. Connexion et inscription

### Créer un compte

1. Ouvrez la page d'accueil. Vous êtes redirigé vers `/register`.
2. Renseignez votre **adresse email**, un **mot de passe** (8 caractères minimum) et un **nom d'affichage** (optionnel).
3. Cliquez sur **Créer un compte**.
4. Vous êtes automatiquement connecté et redirigé vers le tableau de bord.

### Se connecter par email

1. Sur la page `/login`, saisissez votre **email** et votre **mot de passe**.
2. Cliquez sur **Se connecter**.
3. En cas d'erreur de saisie répétée (5 tentatives échouées en 15 minutes), le compte est temporairement bloqué pour des raisons de sécurité.

### Se connecter avec Google

1. Sur la page `/login`, cliquez sur le bouton **Continuer avec Google**.
2. Autorisez l'accès dans la fenêtre Google.
3. Vous êtes redirigé vers le tableau de bord.

> Si l'email de votre compte Google correspond à un compte existant créé par email, les deux comptes sont fusionnés automatiquement.

### Se déconnecter

Cliquez sur votre avatar ou initiale en haut à droite du tableau de bord, puis sur **Déconnexion**.

---

## 3. Tableau de bord

Le tableau de bord (`/dashboard`) est la page d'accueil après connexion. Il présente :

### Cartes de statistiques

Trois cartes affichent en un coup d'œil :
- **Stockage utilisé** : espace consommé (ex. `1.2 GB`) et total disponible (`30 GB`).
- **Fichiers récents** : nombre de fichiers modifiés récemment.
- **Quota** : barre de progression et espace libre restant.

### Répartition du stockage

Un **graphique donut** montre la répartition de votre espace par catégorie :

| Catégorie | Contenu |
|---|---|
| Images | `image/*` |
| Videos | `video/*` |
| Audio | `audio/*` |
| Documents | PDF + texte (`application/pdf`, `text/*`) |
| Other | Tout le reste |

La légende affiche, pour chaque catégorie, le nombre de fichiers, le pourcentage et la taille totale.

### Fichiers récents

Les 5 derniers fichiers modifiés sont listés. Cliquer sur l'un d'eux vous amène à la page des fichiers.

---

## 4. Gestion des fichiers

Accédez à vos fichiers via **Fichiers** dans la navigation (`/files`).

### Uploader un fichier

1. Cliquez sur le bouton **Uploader** (icône nuage ↑) en haut de la page.
2. Sélectionnez un ou plusieurs fichiers depuis votre ordinateur.
3. Le fichier apparaît dans la liste dès l'upload terminé.

> Si vous êtes à l'intérieur d'un dossier, le fichier est automatiquement déposé dans ce dossier.

**Limite de quota :** si votre espace de stockage est insuffisant, un message d'erreur s'affiche et le fichier n'est pas enregistré.

### Renommer un fichier

1. Survolez le fichier et cliquez sur les **trois points** (menu contextuel) ou sur l'icône **crayon** qui apparaît.
2. Sélectionnez **Renommer**.
3. Modifiez le nom dans le champ inline et appuyez sur **Entrée** (ou cliquez en dehors) pour confirmer.
4. Appuyez sur **Échap** pour annuler.

### Déplacer un fichier

1. Ouvrez le menu contextuel du fichier.
2. Sélectionnez **Déplacer vers…**.
3. Choisissez le dossier de destination dans la liste.

### Mettre un fichier en corbeille

1. Ouvrez le menu contextuel du fichier.
2. Sélectionnez **Supprimer** (corbeille).
3. Le fichier disparaît de la liste et se retrouve dans la [Corbeille](#6-corbeille).

> La suppression en corbeille est réversible. L'espace n'est libéré qu'à la suppression définitive.

---

## 5. Gestion des dossiers

### Créer un dossier

1. Cliquez sur **Nouveau dossier** dans la barre d'outils.
2. Saisissez le nom du dossier et confirmez.
3. Le dossier apparaît dans la liste.

### Naviguer dans les dossiers

- Cliquez sur un dossier pour en afficher le contenu.
- Un fil d'Ariane (breadcrumb) en haut de la page indique votre position. Cliquez sur un niveau pour remonter.

### Renommer un dossier

Identique à [renommer un fichier](#renommer-un-fichier) : menu contextuel → **Renommer**.

### Mettre un dossier en corbeille

La suppression d'un dossier est **récursive** : tous les sous-dossiers et fichiers qu'il contient sont également placés en corbeille.

### Partager un dossier avec un utilisateur

Voir la section [Partage interne](#partage-interne-de-dossiers-entre-utilisateurs).

---

## 6. Corbeille

Accédez à la corbeille via **Corbeille** dans la navigation (`/trash`).

### Contenu de la corbeille

La corbeille liste tous vos fichiers et dossiers supprimés, avec leur nom et la date de suppression.

### Restaurer un élément

1. Cliquez sur le bouton **Restaurer** (icône flèche) à côté de l'élément.
2. Le fichier ou dossier retrouve sa place d'origine dans vos fichiers.

> Pour les dossiers, les fichiers contenus sont également restaurés.

### Supprimer définitivement

1. Cliquez sur **Supprimer définitivement** (icône poubelle rouge) à côté de l'élément.
2. Confirmez l'action dans la boîte de dialogue.
3. Le fichier est effacé du disque et le quota est libéré.

> **Attention :** cette action est irréversible.

### Vider la corbeille

1. Cliquez sur **Vider la corbeille** en haut de la page.
2. Confirmez l'action.
3. Tous les éléments en corbeille sont supprimés définitivement et le quota correspondant est libéré.

---

## 7. Prévisualisation

SUPFile permet de prévisualiser les fichiers directement dans le navigateur, sans les télécharger.

### Ouvrir la prévisualisation

Cliquez sur un fichier pour ouvrir la prévisualisation intégrée (modal ou page dédiée).

### Types de fichiers supportés

| Type | Comportement |
|---|---|
| **Images** (`image/jpeg`, `image/png`, `image/gif`, `image/webp`, …) | Affichage direct dans le navigateur |
| **PDF** (`application/pdf`) | Rendu intégré via le viewer du navigateur |
| **Texte** (`text/plain`, `text/markdown`, …) | Affichage du contenu brut |
| **Audio** (`audio/mpeg`, `audio/ogg`, `audio/wav`, …) | Lecteur audio intégré |
| **Vidéo** (`video/mp4`, `video/webm`, …) | Lecteur vidéo intégré (streaming avec support Range) |

> Les fichiers chiffrés sont déchiffrés à la volée. Pour les vidéos/audios chiffrés, le seek (déplacement dans la timeline) n'est pas disponible car le chiffrement AES-CBC ne supporte pas l'accès aléatoire.

### Prévisualisation depuis un lien de partage public

Les mêmes types de fichiers sont prévisualisables sur la page `/share/[token]` sans être connecté, sous réserve que le lien soit valide et non expiré.

---

## 8. Téléchargement

### Télécharger un fichier

1. Ouvrez le menu contextuel du fichier.
2. Sélectionnez **Télécharger**.
3. Le navigateur lance le téléchargement avec le nom original du fichier.

### Télécharger un dossier en ZIP

1. Naviguez dans le dossier ou ouvrez son menu contextuel.
2. Cliquez sur **Télécharger en ZIP**.
3. Une archive `<nom-du-dossier>.zip` est générée à la volée et téléchargée.

> La génération du ZIP inclut tous les fichiers et sous-dossiers du dossier, y compris les fichiers chiffrés (déchiffrés avant compression).

---

## 9. Partage

### Créer un lien de partage public

Un lien de partage permet à n'importe qui (même sans compte) d'accéder à un fichier ou dossier.

1. Ouvrez le menu contextuel d'un fichier ou d'un dossier.
2. Cliquez sur **Partager**.
3. La modale de partage s'ouvre. Un lien est généré automatiquement.
4. Copiez le lien avec le bouton **Copier le lien**.

**Options disponibles :**

| Option | Description |
|---|---|
| **Mot de passe** | Protège le lien : seules les personnes connaissant le mot de passe peuvent accéder au contenu. |
| **Date d'expiration** | Le lien devient inactif après cette date (réponse `410 Gone`). |

> Ces options peuvent être combinées.

### Accéder à un lien de partage

1. Ouvrez l'URL de partage (`/share/<token>`) dans le navigateur.
2. Si le lien est protégé par un mot de passe, un champ de saisie s'affiche. Entrez le mot de passe et cliquez sur **Accéder**.
3. Le contenu est prévisualisé ou listé selon qu'il s'agit d'un fichier ou d'un dossier.
4. Cliquez sur **Télécharger** pour récupérer le fichier.

### Gérer ses liens de partage

1. Accédez à **Partagé** → **Mes liens** dans la navigation.
2. La liste affiche tous vos liens actifs avec le nom de la ressource, la présence d'un mot de passe et la date d'expiration éventuelle.
3. Cliquez sur **Révoquer** pour supprimer un lien. L'URL devient immédiatement inaccessible.

### Partage interne de dossiers entre utilisateurs

Le partage interne permet d'inviter un autre utilisateur enregistré à accéder à un dossier.

**Inviter un utilisateur**

1. Ouvrez le menu contextuel d'un dossier dont vous êtes propriétaire.
2. Cliquez sur **Partager avec…**.
3. Saisissez l'email de l'utilisateur à inviter.
4. Choisissez la permission : **Lecture seule** ou **Lecture et écriture**.
5. Cliquez sur **Inviter**.

**Accéder aux dossiers partagés**

1. Accédez à **Partagé avec moi** dans la navigation (`/shared`).
2. La liste affiche les dossiers que d'autres utilisateurs ont partagés avec vous, avec le nom du propriétaire et votre niveau de permission.
3. Cliquez sur un dossier pour le parcourir.

**Quitter un dossier partagé**

1. Dans la liste **Partagé avec moi**, cliquez sur **Quitter** à côté du dossier.
2. Confirmez l'action. Vous n'avez plus accès au dossier.

**Retirer un membre (propriétaire uniquement)**

1. Ouvrez le menu contextuel du dossier partagé.
2. Cliquez sur **Gérer les membres**.
3. Cliquez sur **Retirer** à côté de l'utilisateur à supprimer.

---

## 10. Recherche

### Barre de recherche

La barre de recherche est accessible depuis le haut de la page dans le layout du tableau de bord.

1. Cliquez sur la barre ou appuyez sur son icône loupe.
2. Commencez à taper un nom de fichier ou de dossier.
3. Les résultats apparaissent en temps réel dans un menu déroulant (autocomplétion).

### Page de résultats et filtres

Appuyez sur **Entrée** pour afficher la page de résultats complète (`/files?q=...`).

Des filtres supplémentaires sont disponibles :

| Filtre | Description |
|---|---|
| **Type** | Afficher uniquement les Images, Videos, Audio, Documents, etc. |
| **Date** | Afficher uniquement les éléments modifiés depuis une date donnée |

Les filtres peuvent être combinés. Cliquez sur une puce de filtre active pour la retirer.

---

## 11. Paramètres

Accédez aux paramètres via **Paramètres** dans la navigation ou via l'icône engrenage (`/settings`).

### Profil

- Modifiez votre **nom d'affichage** et votre **adresse email** dans les champs dédiés.
- Cliquez sur **Enregistrer** pour appliquer les modifications.

### Avatar

- Cliquez sur votre avatar actuel (ou sur l'initiale si aucun avatar n'est défini) pour ouvrir le sélecteur de fichier.
- Sélectionnez une image (JPEG, PNG…).
- L'avatar est mis à jour immédiatement dans toute l'interface.
- Cliquez sur **Supprimer l'avatar** pour revenir à l'initiale.

### Mot de passe

1. Saisissez votre **mot de passe actuel**.
2. Saisissez le **nouveau mot de passe** (8 caractères minimum).
3. Confirmez le nouveau mot de passe.
4. Cliquez sur **Changer le mot de passe**.

> Cette option n'est pas disponible pour les comptes créés uniquement via Google (aucun mot de passe défini).

### Thème

- Utilisez le **bouton Thème** (icône soleil / lune) en haut à droite pour basculer entre le mode **clair** et le mode **sombre**.
- Le choix est mémorisé dans le navigateur et appliqué immédiatement sans rechargement de page.

---

## 12. Application mobile

L'application mobile SUPFile (React Native / Expo) offre les mêmes fonctionnalités que la version web, optimisées pour les écrans tactiles.

### Écrans disponibles

| Écran | Description |
|---|---|
| **Connexion** (`/login`) | Email + mot de passe, bouton Google |
| **Inscription** (`/register`) | Création de compte |
| **Tableau de bord** (`/`) | Quota, stockage, fichiers récents, graphique de répartition |
| **Fichiers** (`/files`) | Navigation, upload, actions sur fichiers et dossiers |
| **Partages** (`/shares`) | Liens de partage et dossiers partagés avec moi |
| **Profil** (`/profile`) | Voir profil, modifier profil, changer mot de passe |
| **Corbeille** (`/trash`) | Restaurer ou supprimer définitivement |
| **Prévisualisation** (`/preview/[id]`) | Images, PDF, audio, vidéo, texte |

### Upload depuis le mobile

1. Sur l'écran **Fichiers**, appuyez sur le bouton **+** (FAB — Floating Action Button).
2. Choisissez **Importer depuis la galerie** ou **Importer un document**.
3. Sélectionnez le ou les fichiers.
4. Une barre de progression s'affiche pendant l'upload.

### Navigation dans les dossiers

- Appuyez sur un dossier pour entrer dedans.
- Utilisez le fil d'Ariane (breadcrumb) en haut de l'écran pour naviguer vers un niveau parent.
- Appuyez sur **Retour** pour remonter d'un niveau.

### Actions sur les fichiers (mobile)

Appuyez longuement sur un fichier ou un dossier (ou appuyez sur les **trois points**) pour accéder au menu d'actions :

- Renommer
- Déplacer
- Télécharger
- Partager (créer un lien)
- Mettre en corbeille
- Détails du fichier (nom, taille, type, date)

### Thème

L'application respecte le thème système (clair / sombre) par défaut. Vous pouvez le modifier dans l'écran **Profil → Thème**.

---

## 13. FAQ

**Mon upload a échoué avec une erreur de quota.**  
Votre espace de stockage est plein. Supprimez définitivement des fichiers depuis la corbeille pour libérer de l'espace, puis réessayez.

---

**Je ne vois plus un fichier que je venais de supprimer. Où est-il ?**  
Il se trouve dans la **Corbeille**. Un fichier supprimé n'est pas immédiatement effacé : il est marqué comme "en corbeille". Accédez à `/trash` pour le restaurer ou le supprimer définitivement.

---

**Le lien de partage que j'ai reçu indique "Lien expiré".**  
Le propriétaire du lien a défini une date d'expiration qui est dépassée. Demandez-lui de créer un nouveau lien.

---

**Le lien de partage demande un mot de passe que je n'ai pas.**  
Contactez la personne qui vous a envoyé le lien : le lien est protégé et seul le créateur connaît le mot de passe.

---

**Je ne peux pas me connecter avec Google.**  
Vérifiez que votre administrateur a configuré les variables `OAUTH_CLIENT_ID` et `OAUTH_CLIENT_SECRET`. Si vous obtenez une erreur `oauth_failed`, contactez l'administrateur.

---

**Puis-je uploader plusieurs fichiers en même temps ?**  
Oui. Sur la version web, le sélecteur de fichier accepte la sélection multiple (Ctrl+clic ou Shift+clic). Sur mobile, vous pouvez sélectionner plusieurs éléments depuis la galerie.

---

**Puis-je uploader des dossiers entiers ?**  
Non, l'upload se fait fichier par fichier. Créez d'abord le dossier via **Nouveau dossier**, puis uploadez les fichiers à l'intérieur.

---

**Mon avatar ne s'affiche pas après l'upload.**  
Attendez quelques secondes et rechargez la page. Si le problème persiste, vérifiez que le fichier image est dans un format supporté (JPEG, PNG, WebP).

---

**Comment savoir combien d'espace j'ai utilisé ?**  
La carte **Stockage utilisé** sur le tableau de bord affiche votre consommation en temps réel. Le quota total est de **30 Go** par défaut.

---

**Puis-je accéder à SUPFile depuis plusieurs appareils en même temps ?**  
Oui. Votre compte est accessible depuis n'importe quel navigateur ou depuis l'application mobile simultanément. Les modifications sont immédiatement visibles sur tous les appareils à la prochaine actualisation.

---

**Mon token de session est-il sécurisé ?**  
Le token JWT est stocké dans `localStorage` de votre navigateur. Il est valide pendant **7 jours**. Déconnectez-vous toujours depuis un ordinateur partagé ou public.

---

**La prévisualisation vidéo est lente ou saccade.**  
Pour les fichiers **non chiffrés**, le streaming vidéo supporte les requêtes Range (seek rapide). Si votre fichier a été uploadé avec le chiffrement activé sur le serveur, le stream complet doit être téléchargé avant de pouvoir avancer dans la vidéo.

---

**Comment partager un dossier avec une personne extérieure (sans compte) ?**  
Utilisez la fonctionnalité de **lien de partage public**. Créez un lien depuis le menu contextuel du dossier. La personne pourra accéder au contenu et le télécharger en ZIP sans avoir de compte.

---

**Je veux supprimer mon compte. Comment faire ?**  
La suppression de compte n'est pas disponible en libre-service depuis l'interface. Contactez l'administrateur de la plateforme.
