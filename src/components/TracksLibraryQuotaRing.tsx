'use client'

import { useTooltip } from '@/hooks/useTooltip'
import { formatBytes } from '@/lib/formatBytes'

interface TracksLibraryQuotaRingProps {
  used: number
  total?: number
  /** Part de la bibliothèque dans `used`. */
  library: number
}

const SIZE = 28
const STROKE = 4
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Espace du compte en anneau : gris pour le reste du compte, violet pour la bibliothèque. */
export default function TracksLibraryQuotaRing({ used, total, library }: TracksLibraryQuotaRingProps) {
  const text = total
    ? `${formatBytes(used)} utilisés sur ${formatBytes(total)}, dont ${formatBytes(library)} pour la bibliothèque`
    : `${formatBytes(used)} utilisés sur le compte`
  const ref = useTooltip(text)
  if (!total) return null

  const usedRatio = Math.min(1, used / total)
  const libraryRatio = Math.min(usedRatio, library / total)
  const arc = (ratio: number) => `${ratio * CIRCUMFERENCE} ${CIRCUMFERENCE}`

  return (
    <svg ref={ref} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0 -rotate-90" role="img" aria-label={text}>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-gray-700" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} strokeDasharray={arc(usedRatio)} className="text-gray-400" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} strokeDasharray={arc(libraryRatio)} className="text-purple-400" />
    </svg>
  )
}
