# mjscreen.client

Jukebox et écran de présentation pour meneur de jeu, construit avec Next.js (App Router),
React et Tailwind CSS.

L'application est entièrement cliente : la bibliothèque (audio, images, playlists) est
stockée dans IndexedDB via Dexie, et le site est publié en **export statique** sur GitHub
Pages sous `/MJScreen/`.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

L'application est servie sur http://localhost:3200/MJScreen/ (le `basePath` est appliqué
aussi en développement, pour coller à la production).

Le port est fixé explicitement dans le script `dev` : sans cela Next glisse
silencieusement sur le port libre suivant si 3000 est occupé, et la configuration de
lancement de VS Code (F5) ne tombe plus en face.

### Type-Check, Compile and Minify for Production

```sh
npm run build      # génère le sprite d'icônes puis exporte le site dans ./out
npm run preview    # sert ./out en local
```

`npm run build-no-icons` saute la génération du sprite lorsque `public/icon-sprite.svg`
est déjà à jour.

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Tests unitaires avec [Vitest](https://vitest.dev/)

```sh
npm test             # une passe, comme en CI (la publication échoue si un test casse)
npm run test:watch   # relance à chaque modification
```

Les tests (`src/**/*.test.ts`) tournent sous Node : IndexedDB est imité par
`fake-indexeddb`, les dossiers locaux par `src/test/fakeFileSystem.ts`.

## Bibliothèque de pistes

Page autonome, servie sur `/MJScreen/trackslibrary/`. Une seule bibliothèque, faite de
plusieurs **sources** : des dossiers de l'ordinateur aujourd'hui, Dropbox, Google Drive
et OneDrive ensuite. La liste des pistes fusionne toutes les sources ; le jukebox s'en
servira plus tard pour ajouter des pistes.

Contrairement au jukebox, **aucune piste n'est stockée dans le navigateur**. Il ne retient
que les sources branchées (IndexedDB, base `TracksSources` : handle du dossier, source
par défaut). Tout le reste vit dans chaque source :

```
<racine de la source>/
  .mjlib/config.json     configuration (nom, identifiant, sorties réservées)
  .mjlib/index.json      métadonnées, tags et empreinte SHA-256 de chaque piste
  .mjlib/sauvegardes/    copies faites avant toute réécriture d'un fichier abîmé ou migré
  pistes/…               fichiers audio ajoutés depuis l'outil
```

Ces fichiers suffisent à rebrancher la source à l'identique sur une autre machine ou un
autre navigateur. À l'ouverture, chaque source est parcourue (fichiers ajoutés, modifiés
ou disparus hors de l'outil), puis durées et empreintes sont complétées en arrière-plan ;
une piste dont le contenu existe déjà ailleurs dans la bibliothèque reçoit l'étiquette
`doublon`. « Ajouter des pistes » (ou un glisser-déposer sur la page) copie les fichiers
dans le dossier `pistes/` de la source par défaut, sans jamais écraser un fichier existant.

Chaque piste porte un nom, un **type** (musique, ambiance, effet sonore) et des
**étiquettes** libres (les univers de jeu, par exemple), modifiables directement dans la
liste. La recherche (MiniSearch, en mémoire) tolère les fautes et les accents et cherche
dans le nom, les étiquettes, le type et le dossier ; des pastilles filtrent par type, par
étiquette, ou sur les pistes restant à qualifier. Sans recherche, les dernières ajoutées
viennent en premier.

- **Schémas versionnés** (`src/schemas/`) : chaque fichier porte un `schemaVersion`.
  Un fichier plus ancien est migré en mémoire et ne sera réécrit qu'après sauvegarde.
  Un fichier plus récent est signalé et n'est jamais écrasé.
- **Stockage** (`src/storage/`) : interface `StorageProvider` commune à tous les
  fournisseurs : dossier local (File System Access API, Chromium seulement, accès à
  réautoriser à chaque session), Dropbox, Google Drive et OneDrive (`src/storage/cloud/`).

### Clouds : configuration OAuth

Chaque cloud demande un **identifiant client** (public, sans secret), obtenu en déclarant
MJScreen comme application chez le service. Les identifiants vont dans un fichier
`.env.local` (non versionné, voir `.env.example`) :

```sh
NEXT_PUBLIC_DROPBOX_CLIENT_ID=…
NEXT_PUBLIC_GOOGLE_CLIENT_ID=…
NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=…
```

Un cloud sans identifiant reste grisé (« Non configuré »). En développement,
`.env.development` active `NEXT_PUBLIC_CLOUD_MOCK=true` : les trois clouds sont simulés
en mémoire, sans connexion réelle.

Adresses de retour à déclarer chez chaque service (la page de la bibliothèque) :
`https://mestileryan.github.io/MJScreen/trackslibrary/` et
`http://localhost:3200/MJScreen/trackslibrary/`.

| Service | Où créer l'application | Type / réglages | Flux |
| --- | --- | --- | --- |
| Dropbox | [App Console](https://www.dropbox.com/developers/apps) | Scoped access, **App folder** (la bibliothèque vit dans `Apps/MJScreen/`), permissions `account_info.read`, `files.metadata.read`, `files.content.read`, `files.content.write` | code + PKCE, jeton rafraîchi |
| Google Drive | [Google Cloud Console](https://console.cloud.google.com/apis/credentials), API Drive activée | Client OAuth « Application Web », portée `drive.file` (MJScreen ne voit que ce qu'il a créé, dans un dossier `MJScreen/`) ; en mode test, ajouter son compte aux testeurs | implicite (Google n'échange pas de code sans secret pour une page web) : reconnexion à chaque session |
| OneDrive | [Entra ID, inscriptions d'applications](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps) | Plateforme **Application monopage (SPA)**, comptes personnels et professionnels, permissions `Files.ReadWrite.AppFolder`, `User.Read`, `offline_access` (dossier `Apps/MJScreen/`) | code + PKCE, jeton rafraîchi |

Les jetons ne vivent qu'en `sessionStorage` : ils disparaissent avec l'onglet et ne
contiennent rien de la bibliothèque.
- **Service** (`src/persistance/TracksLibraryService.ts`) : ouverture (sans écriture),
  initialisation d'un dossier (sans toucher à ses fichiers) et réparation sur demande.

## Icônes

Les icônes de jeu vivent dans `src/assets/game-icons/`. `npm run build-icons` les
agrège en un sprite `public/icon-sprite.svg` (plusieurs Mo) et en une liste de noms
`src/assets/icon-list.json`. Les deux fichiers sont générés et non versionnés.

Le sprite est récupéré par le navigateur après le montage (`IconSpriteLoader`) puis
référencé via `<use href="#nom-de-licone" />`.

## Déploiement ailleurs qu'à la racine `/MJScreen/`

Le préfixe est piloté par `NEXT_PUBLIC_BASE_PATH` :

```sh
NEXT_PUBLIC_BASE_PATH="" npm run build   # publication à la racine d'un domaine
```
