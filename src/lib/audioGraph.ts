/**
 * Graphe Web Audio d'une piste du lecteur.
 *
 * Il n'est construit que pour les pistes dont au moins un effet est actif
 * (`needsAudioGraph`) : une piste neutre continue de sortir directement par son
 * élément `<audio>`, et conserve donc `HTMLMediaElement.setSinkId`.
 *
 * Chaîne : source → fondu → passe-bas → distorsion → panoramique, puis
 * répartition entre le signal sec, un départ réverbération et un départ écho,
 * tous trois sommés dans le bus de sortie.
 */
import type TrackEffects from '@/models/TrackEffects'
import { LOUDNESS_EXPONENT } from './loudness'

let context: AudioContext | null = null

/** Contexte partagé par toutes les pistes — les navigateurs en limitent le nombre. */
export function playbackContext(): AudioContext {
  if (!context) context = new AudioContext()
  return context
}

/** Un contexte démarre parfois suspendu : à réveiller sur un geste utilisateur. */
export function resumePlaybackContext(): void {
  if (context?.state === 'suspended') void context.resume().catch(() => {})
}

/**
 * Applique le canal de sortie au contexte. Une fois une piste routée dans le
 * graphe, son son ne passe plus par l'élément : c'est ici que `setSinkId` doit
 * agir. Uniquement disponible sur Chromium, ailleurs c'est un no-op silencieux.
 */
export function setPlaybackSink(sinkId: string): void {
  if (!context || !sinkId) return
  const withSink = context as unknown as { setSinkId?: (id: string) => Promise<void> }
  if (typeof withSink.setSinkId !== 'function') return
  withSink.setSinkId(sinkId).catch(() => {})
}

/** Réponse impulsionnelle synthétique : bruit blanc à décroissance exponentielle. */
function buildImpulseResponse(ctx: AudioContext, size: number): AudioBuffer {
  // 0 → placard (0,2 s), 1 → cathédrale (4 s)
  const seconds = 0.2 + size * 3.8
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      // Une décroissance plus douce sur les grandes salles
      const decay = 2 + (1 - size) * 4
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

/**
 * Courbe de saturation douce classique ; `amount` de 0 à 1.
 *
 * La formule brute atténue d'environ 3× quel que soit le réglage : on la renormalise
 * pour que sa crête vaille 1, sinon activer la distorsion ferait chuter le niveau.
 */
function buildDistortionCurve(amount: number): Float32Array {
  const k = amount * 100
  const samples = 2048
  const curve = new Float32Array(samples)
  let peak = 0

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    const y = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
    curve[i] = y
    if (Math.abs(y) > peak) peak = Math.abs(y)
  }

  if (peak > 0) {
    for (let i = 0; i < samples; i++) curve[i] /= peak
  }
  return curve
}

/**
 * Gain de rattrapage de la distorsion.
 *
 * Saturer écrase les crêtes : à niveau crête égal, l'énergie — donc le volume
 * perçu — augmente fortement. On mesure le rapport des RMS entrée/sortie de la
 * courbe sur une sinusoïde de référence et on compense, pour que changer
 * l'intensité de l'effet ne change pas le volume de la piste.
 */
function measureMakeupGain(curve: Float32Array): number {
  const samples = 1024
  let inputPower = 0
  let outputPower = 0

  for (let i = 0; i < samples; i++) {
    const x = Math.sin((2 * Math.PI * i) / samples) * 0.5
    const index = Math.min(
      curve.length - 1,
      Math.max(0, Math.round(((x + 1) / 2) * (curve.length - 1))),
    )
    inputPower += x * x
    outputPower += curve[index] * curve[index]
  }

  const inputRms = Math.sqrt(inputPower / samples)
  const outputRms = Math.sqrt(outputPower / samples)
  // Jamais d'amplification : on ne fait que rattraper un excès.
  return outputRms > 0 ? Math.min(1, inputRms / outputRms) : 1
}

/**
 * Plancher du fondu, environ -32 dB.
 *
 * Partir du silence absolu gâche le début d'un fondu long : la première seconde
 * se déroule sous le seuil de perception et s'entend comme un retard.
 */
const FADE_FLOOR = 0.025

/**
 * Facteur de fondu à l'avancement `t` (0 au début, 1 à la fin).
 *
 * L'interpolation est faite dans le domaine de la *sonie*, pas de l'amplitude :
 * à mi-parcours on entend la moitié du volume final, pas la moitié du signal.
 * Une rampe exponentielle concentrait tout sur la fin, un quart de sinusoïde
 * concentre tout sur le début — celle-ci répartit régulièrement.
 */
function fadeFactor(t: number): number {
  const floorLoudness = Math.pow(FADE_FLOOR, LOUDNESS_EXPONENT)
  const loudness = floorLoudness + (1 - floorLoudness) * t
  return Math.pow(loudness, 1 / LOUDNESS_EXPONENT)
}

/**
 * Programme un fondu par rampes linéaires enchaînées.
 *
 * `setValueCurveAtTime` serait plus direct mais lève `NotSupportedError` dès
 * qu'un événement tombe dans sa fenêtre — ce que produit justement
 * `cancelAndHoldAtTime` juste avant. Les rampes n'ont pas cette contrainte.
 */
function scheduleFade(
  ctx: AudioContext,
  param: AudioParam,
  peak: number,
  seconds: number,
  direction: 'in' | 'out',
): void {
  const now = ctx.currentTime
  const steps = 48

  param.cancelScheduledValues(now)
  param.setValueAtTime(peak * fadeFactor(direction === 'in' ? 0 : 1), now)

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const factor = direction === 'in' ? fadeFactor(t) : fadeFactor(1 - t)
    // Le fondu de sortie termine au silence complet, pas au plancher.
    const value = direction === 'out' && i === steps ? 0 : peak * factor
    param.linearRampToValueAtTime(value, now + seconds * t)
  }
}

export interface TrackAudioGraph {
  /** Répercute les réglages sur les nœuds, en douceur pour éviter les clics. */
  apply(fx: TrackEffects): void
  /** Rebranche la sortie après un `dispose`. Voir le cache par élément. */
  reconnect(): void
  /** Programme le fondu d'entrée. À appeler juste avant `play()`. */
  fadeIn(seconds: number): void
  /** Programme le fondu de sortie ; la promesse se résout à la fin du fondu. */
  fadeOut(seconds: number): Promise<void>
  /** Annule un fondu en cours et remet le gain à plein. */
  cancelFade(): void
  dispose(): void
}

/**
 * `createMediaElementSource` ne peut être appelé qu'une seule fois par élément :
 * un second appel lève `InvalidStateError`. React montant les effets deux fois en
 * développement (StrictMode), on mémorise le graphe par élément et on le rebranche
 * plutôt que d'en construire un autre.
 */
const graphs = new WeakMap<HTMLAudioElement, TrackAudioGraph>()

export function createTrackGraph(element: HTMLAudioElement): TrackAudioGraph {
  const cached = graphs.get(element)
  if (cached) {
    cached.reconnect()
    return cached
  }

  const ctx = playbackContext()
  // Router un élément dans un contexte suspendu le rend muet. La création du
  // graphe fait suite à un geste de l'utilisateur, la reprise est donc autorisée.
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})

  const source = ctx.createMediaElementSource(element)

  const fade = ctx.createGain()
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  const shaper = ctx.createWaveShaper()
  shaper.oversample = '2x'
  // Compense le gain de la saturation, juste après elle.
  const makeup = ctx.createGain()
  const panner = ctx.createStereoPanner()

  const dry = ctx.createGain()
  const convolver = ctx.createConvolver()
  const reverbSend = ctx.createGain()
  const delay = ctx.createDelay(5)
  const feedback = ctx.createGain()
  const echoSend = ctx.createGain()
  const master = ctx.createGain()

  source.connect(fade)
  fade.connect(lowpass)
  lowpass.connect(shaper)
  shaper.connect(makeup)
  makeup.connect(panner)

  panner.connect(dry).connect(master)
  panner.connect(convolver).connect(reverbSend).connect(master)
  // Boucle de réinjection : autorisée par la spec car elle traverse un DelayNode.
  panner.connect(delay)
  delay.connect(feedback).connect(delay)
  delay.connect(echoSend).connect(master)
  master.connect(ctx.destination)

  reverbSend.gain.value = 0
  echoSend.gain.value = 0

  // Regénérer la réponse impulsionnelle ou la courbe à chaque rendu coûterait cher :
  // on ne les reconstruit que lorsque le réglage correspondant bouge vraiment.
  let lastReverbSize = -1
  let lastDistortion = -1

  const smooth = (param: AudioParam, value: number) => {
    param.setTargetAtTime(value, ctx.currentTime, 0.02)
  }

  const graph: TrackAudioGraph = {
    apply(fx) {
      smooth(lowpass.frequency, fx.lowpass)
      smooth(panner.pan, fx.pan)

      if (fx.distortion > 0) {
        if (fx.distortion !== lastDistortion) {
          const curve = buildDistortionCurve(fx.distortion)
          shaper.curve = curve
          smooth(makeup.gain, measureMakeupGain(curve))
          lastDistortion = fx.distortion
        }
      } else if (lastDistortion !== 0) {
        shaper.curve = null
        smooth(makeup.gain, 1)
        lastDistortion = 0
      }

      if (fx.reverbMix > 0) {
        if (fx.reverbSize !== lastReverbSize) {
          convolver.buffer = buildImpulseResponse(ctx, fx.reverbSize)
          lastReverbSize = fx.reverbSize
        }
      }
      smooth(reverbSend.gain, fx.reverbMix)
      // On garde du signal sec même à réverbération maximale, sinon la piste
      // devient une bouillie sans attaque.
      smooth(dry.gain, 1 - fx.reverbMix * 0.5)

      smooth(delay.delayTime, fx.echoTime)
      // Plafonné sous 1 : au-delà la boucle diverge au lieu de s'éteindre.
      smooth(feedback.gain, Math.min(fx.echoFeedback, 0.9))
      smooth(echoSend.gain, fx.echoMix)
    },

    fadeIn(seconds) {
      if (seconds <= 0) {
        const now = ctx.currentTime
        fade.gain.cancelScheduledValues(now)
        fade.gain.setValueAtTime(1, now)
        return
      }
      scheduleFade(ctx, fade.gain, 1, seconds, 'in')
    },

    fadeOut(seconds) {
      // On repart du niveau réellement atteint : un fondu d'entrée a pu être
      // interrompu en cours de route. La lecture doit précéder l'annulation.
      const current = fade.gain.value
      if (seconds <= 0) {
        const now = ctx.currentTime
        fade.gain.cancelScheduledValues(now)
        fade.gain.setValueAtTime(0, now)
        return Promise.resolve()
      }
      scheduleFade(ctx, fade.gain, current, seconds, 'out')
      return new Promise(resolve => setTimeout(resolve, seconds * 1000))
    },

    cancelFade() {
      const now = ctx.currentTime
      fade.gain.cancelScheduledValues(now)
      fade.gain.setValueAtTime(1, now)
    },

    reconnect() {
      // Une connexion déjà présente est ignorée par la spec : appel idempotent.
      master.connect(ctx.destination)
    },

    dispose() {
      // On coupe seulement la sortie, sans démonter le graphe : il doit rester
      // rebranchable, la source d'un élément ne pouvant pas être recréée.
      master.disconnect()
    },
  }

  graphs.set(element, graph)
  return graph
}
