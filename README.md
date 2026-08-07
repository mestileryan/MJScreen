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
