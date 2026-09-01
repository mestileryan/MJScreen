/**
 * Réglages avancés d'une piste : fondus, latéralisation, hauteur et effets.
 * Chaque champ a une valeur *neutre* — une piste neutre se lit exactement comme
 * avant l'existence de cette fonctionnalité, sans passer par la Web Audio API.
 */
export default interface TrackEffects {
  /**
   * Fondu d'entrée à la lecture, en secondes. 0 = aucun.
   * Absent = la piste suit le fondu par défaut de sa playlist.
   */
  fadeIn?: number
  /** Fondu de sortie à l'arrêt, en secondes. Mêmes conventions que `fadeIn`. */
  fadeOut?: number
  /** Latéralisation, de -1 (gauche) à 1 (droite). 0 = centre. */
  pan: number
  /** Désaccordage en demi-tons. Modifie aussi la vitesse, comme une bande. */
  detune: number
  /** Proportion de réverbération, 0 à 1. 0 = aucune. */
  reverbMix: number
  /** Taille de la salle, 0 à 1 (placard → cathédrale). */
  reverbSize: number
  /** Fréquence de coupure du passe-bas, en Hz. `LOWPASS_OFF` = désactivé. */
  lowpass: number
  /** Proportion d'écho, 0 à 1. 0 = aucun. */
  echoMix: number
  /** Délai entre deux répétitions, en secondes. */
  echoTime: number
  /** Réinjection, 0 à 1 : plus c'est haut, plus il y a de répétitions. */
  echoFeedback: number
  /** Intensité de la distorsion, 0 à 1. 0 = aucune. */
  distortion: number
}

/** Au-delà de cette coupure le filtre ne retire plus rien d'audible. */
export const LOWPASS_OFF = 20000

export const MIN_DETUNE = -12
export const MAX_DETUNE = 12

/** Effets dont les fondus sont résolus : l'héritage playlist est déjà appliqué. */
export type ResolvedTrackEffects = TrackEffects & { fadeIn: number; fadeOut: number }

export const DEFAULT_EFFECTS: TrackEffects = {
  pan: 0,
  detune: 0,
  reverbMix: 0,
  reverbSize: 0.5,
  lowpass: LOWPASS_OFF,
  echoMix: 0,
  echoTime: 0.3,
  echoFeedback: 0.3,
  distortion: 0,
}

/**
 * Complète un enregistrement partiel ou absent avec les valeurs neutres.
 * Les fondus restent volontairement absents s'ils ne sont pas enregistrés :
 * cette absence signifie « hérite de la playlist », voir `resolveFades`.
 */
export function withDefaults(effects?: Partial<TrackEffects> | null): TrackEffects {
  return effects ? { ...DEFAULT_EFFECTS, ...effects } : DEFAULT_EFFECTS
}

/** Fondus par défaut d'une playlist, tels qu'attendus par `resolveFades`. */
export interface PlaylistFades {
  fadeIn: number
  fadeOut: number
}

/**
 * Applique l'héritage des fondus : la valeur de la piste si elle en a une,
 * sinon celle de la playlist, sinon aucun fondu.
 */
export function resolveFades(fx: TrackEffects, playlist?: PlaylistFades): ResolvedTrackEffects {
  return {
    ...fx,
    fadeIn: fx.fadeIn ?? playlist?.fadeIn ?? 0,
    fadeOut: fx.fadeOut ?? playlist?.fadeOut ?? 0,
  }
}

/**
 * Vrai si un réglage impose de router la piste dans un graphe Web Audio.
 *
 * `detune` en est volontairement absent : il s'obtient via `playbackRate` sur
 * l'élément `<audio>`, donc sans graphe — et donc sans perdre `setSinkId` sur
 * l'élément pour les pistes qui n'utilisent que ça.
 */
export function needsAudioGraph(fx: TrackEffects): boolean {
  return (
    (fx.fadeIn ?? 0) > 0 ||
    (fx.fadeOut ?? 0) > 0 ||
    fx.pan !== 0 ||
    fx.reverbMix > 0 ||
    fx.lowpass < LOWPASS_OFF ||
    fx.echoMix > 0 ||
    fx.distortion > 0
  )
}

/**
 * Vrai si la piste est dans son état d'origine (bouton « Réinitialiser » inutile).
 * À évaluer sur les réglages *enregistrés*, pas résolus : un fondu à 0 explicite
 * écrase le fondu de la playlist, ce n'est plus un état neutre.
 */
export function isNeutral(fx: TrackEffects): boolean {
  return (
    fx.fadeIn === undefined &&
    fx.fadeOut === undefined &&
    fx.pan === 0 &&
    fx.detune === 0 &&
    fx.reverbMix === 0 &&
    fx.lowpass >= LOWPASS_OFF &&
    fx.echoMix === 0 &&
    fx.distortion === 0
  )
}
