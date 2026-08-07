// L'application est publiée sur GitHub Pages sous https://<user>.github.io/MJScreen/.
// `NEXT_PUBLIC_BASE_PATH` permet de la servir ailleurs (racine d'un domaine par ex.)
// en passant NEXT_PUBLIC_BASE_PATH="" au build.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/MJScreen'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export statique : aucun serveur Node n'est nécessaire, tout tourne dans le navigateur.
  output: 'export',
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Rend la valeur disponible côté client pour construire les URLs de `public/`.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default nextConfig
