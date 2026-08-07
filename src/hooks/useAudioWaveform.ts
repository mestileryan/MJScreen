'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'

/**
 * Remplace `useAVWaveform` de `vue-audio-visual` : décode la piste, en extrait les
 * crêtes puis dessine la forme d'onde sur un canvas, la portion déjà jouée dans une
 * couleur distincte. Un clic sur le canvas déplace la lecture.
 */
export interface WaveformOptions {
  canvWidth: number
  canvHeight: number
  playedLineColor: string
  noplayedLineColor: string
  playtimeFontColor: string
}

export const DEFAULT_WAVEFORM_OPTIONS: WaveformOptions = {
  canvWidth: 300,
  canvHeight: 25,
  playedLineColor: '#777',
  noplayedLineColor: '#077',
  playtimeFontColor: '#aaa',
}

// Les navigateurs limitent le nombre d'AudioContext : une seule instance partagée
// suffit pour décoder toutes les pistes.
let sharedContext: AudioContext | null = null

function audioContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext()
  }
  return sharedContext
}

/** Réduit le buffer décodé à une crête par colonne de pixels. */
function extractPeaks(buffer: AudioBuffer, columns: number): number[] {
  const channel = buffer.getChannelData(0)
  const blockSize = Math.floor(channel.length / columns) || 1
  const peaks: number[] = []
  let max = 0

  for (let i = 0; i < columns; i++) {
    const start = i * blockSize
    let peak = 0
    for (let j = 0; j < blockSize; j++) {
      const value = Math.abs(channel[start + j] ?? 0)
      if (value > peak) peak = value
    }
    peaks.push(peak)
    if (peak > max) max = peak
  }

  // Normalisation pour occuper toute la hauteur disponible
  return max > 0 ? peaks.map(peak => peak / max) : peaks
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00'
  const total = Math.floor(seconds)
  const mins = String(Math.floor(total / 60)).padStart(2, '0')
  const secs = String(total % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

export function useAudioWaveform(
  audioRef: RefObject<HTMLAudioElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  src: string,
  options: WaveformOptions = DEFAULT_WAVEFORM_OPTIONS,
) {
  const peaksRef = useRef<number[]>([])
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  // Dessin : appelé au décodage, à chaque déplacement et pendant la lecture.
  // Ne lit que des refs, la fonction est donc stable.
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { canvWidth, canvHeight, playedLineColor, noplayedLineColor, playtimeFontColor } =
      optionsRef.current
    const peaks = peaksRef.current
    const duration = audio?.duration ?? 0
    const currentTime = audio?.currentTime ?? 0
    const progress = duration > 0 ? currentTime / duration : 0
    const playedColumns = Math.round(progress * peaks.length)

    ctx.clearRect(0, 0, canvWidth, canvHeight)

    for (let i = 0; i < peaks.length; i++) {
      const height = Math.max(1, peaks[i] * canvHeight)
      const y = (canvHeight - height) / 2
      ctx.fillStyle = i < playedColumns ? playedLineColor : noplayedLineColor
      ctx.fillRect(i, y, 1, height)
    }

    if (duration > 0) {
      ctx.fillStyle = playtimeFontColor
      ctx.font = '10px monospace'
      ctx.textBaseline = 'bottom'
      ctx.fillText(formatTime(currentTime), 4, canvHeight - 2)
    }
  }, [audioRef, canvasRef])

  // Décodage de la piste
  useEffect(() => {
    if (!src) return
    let cancelled = false

    ;(async () => {
      try {
        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = await audioContext().decodeAudioData(arrayBuffer)
        if (cancelled) return
        peaksRef.current = extractPeaks(buffer, optionsRef.current.canvWidth)
        draw()
      } catch (error) {
        console.error("Impossible de décoder la piste pour la forme d'onde :", error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [src, draw])

  // Rafraîchissement du curseur de lecture
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let frame = 0
    const loop = () => {
      draw()
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      if (!frame) frame = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      draw()
    }

    const redraw = () => draw()

    audio.addEventListener('play', start)
    audio.addEventListener('pause', stop)
    audio.addEventListener('ended', stop)
    audio.addEventListener('seeked', redraw)
    audio.addEventListener('loadedmetadata', redraw)

    if (!audio.paused) start()

    return () => {
      stop()
      audio.removeEventListener('play', start)
      audio.removeEventListener('pause', stop)
      audio.removeEventListener('ended', stop)
      audio.removeEventListener('seeked', redraw)
      audio.removeEventListener('loadedmetadata', redraw)
    }
  }, [audioRef, src, draw])

  // Clic sur le canvas : déplacement de la lecture
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const seek = (event: MouseEvent) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(audio.duration)) return
      const rect = canvas.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      audio.currentTime = Math.min(Math.max(ratio, 0), 1) * audio.duration
      draw()
    }

    canvas.addEventListener('click', seek)
    return () => canvas.removeEventListener('click', seek)
  }, [audioRef, canvasRef, draw])
}
