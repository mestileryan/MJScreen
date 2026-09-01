import { readCookie, writeCookie } from './cookieStore'

/**
 * Titre du projet : purement cosmétique, il vit dans un cookie comme les autres
 * préférences d'interface. Il voyage avec la bibliothèque par le *nom du
 * fichier* d'export (`<titre>.mjs`), et se retrouve au moment de l'import.
 */
export const PROJECT_TITLE_COOKIE = 'projectTitle'
export const DEFAULT_PROJECT_TITLE = 'Projet sans nom'

/** Titre courant, pour les usages hors React (nom du fichier d'export). */
export function currentProjectTitle(): string {
  return readCookie(PROJECT_TITLE_COOKIE) || DEFAULT_PROJECT_TITLE
}

export function saveProjectTitle(title: string): void {
  writeCookie(PROJECT_TITLE_COOKIE, title.trim())
}

/** Titre déduit d'un fichier importé : son nom, sans l'extension. */
export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').trim() || DEFAULT_PROJECT_TITLE
}

/**
 * Caractères impossibles dans un nom de fichier (mêmes règles que
 * `sanitizeName` côté export) : refusés dès la saisie du titre, plutôt que
 * remplacés en silence au moment d'exporter.
 */
export const FORBIDDEN_TITLE_CHARS = /[/\\:*?"<>|]/g
export const FORBIDDEN_TITLE_CHARS_LABEL = '/ \\ : * ? " < > |'

export function stripForbiddenTitleChars(title: string): string {
  return title.replace(FORBIDDEN_TITLE_CHARS, '')
}
