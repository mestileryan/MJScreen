export class Cookies {
  /** 
   * Écrit un cookie name=value; expires en days jours; path par défaut '/'
   */
  static set(name: string, value: string, days = 365, path = '/') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `expires=${expires}`,
      `path=${path}`
    ].join('; ');
  }

  /**
   * Lit le cookie name, ou null si absent
   */
  static get(name: string): string | null {
    const match = document.cookie
      .split('; ')
      .find(cookie => cookie.startsWith(`${encodeURIComponent(name)}=`));
    if (!match) return null;
    // On découpe sur le premier '=' pour récupérer la valeur
    const [, rawValue] = match.split(/=(.+)/);
    return rawValue ? decodeURIComponent(rawValue) : null;
  }

  /**
   * Supprime le cookie (expires au passé)
   */
  static delete(name: string, path = '/') {
    this.set(name, '', -1, path);
  }
}
