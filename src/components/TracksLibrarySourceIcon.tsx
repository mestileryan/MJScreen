'use client'

import { HardDrive } from 'lucide-react'
import type { StorageKind } from '@/storage/StorageProvider'

interface TracksLibrarySourceIconProps {
  kind: StorageKind
  /** Gris tant que la source n’est pas ouverte, aux couleurs du service sinon. */
  active: boolean
  className?: string
}

/** Couleur de marque de chaque service. */
const COLORS: Partial<Record<StorageKind, string>> = {
  dropbox: '#0061FF',
  'google-drive': '#1FA463',
  onedrive: '#0078D4',
}

/** Logo de la source : disque pour l’ordinateur, marque du service pour un cloud. */
export default function TracksLibrarySourceIcon({ kind, active, className = 'h-5 w-5' }: TracksLibrarySourceIconProps) {
  const color = active ? (COLORS[kind] ?? 'currentColor') : undefined
  const shared = { className: `shrink-0 ${className} ${active ? '' : 'text-gray-500'}`, style: color ? { color } : undefined }

  switch (kind) {
    case 'dropbox':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...shared}>
          <path d="M6 1.807 0 5.629l6 3.822 6.001-3.822L6 1.807zm12 0-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zm18-3.822-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z" />
        </svg>
      )
    case 'google-drive':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...shared}>
          <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" />
        </svg>
      )
    case 'onedrive':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...shared}>
          <path d="M14.5 5.5a6 6 0 0 1 5.8 4.5A4.25 4.25 0 0 1 19.75 18.5H6.5a4.5 4.5 0 0 1-.9-8.9A6 6 0 0 1 14.5 5.5zm-4.2 3.1a4 4 0 0 0-2.9 3.9l-.05.9-.9.1a2.5 2.5 0 0 0 .05 5h13.25a2.25 2.25 0 0 0 .3-4.48l-.7-.1-.15-.7a4 4 0 0 0-7.2-1.5l-.45.6-.7-.3a3.9 3.9 0 0 0-.55-.15z" />
        </svg>
      )
    default:
      return <HardDrive aria-hidden {...shared} style={active ? { color: '#a78bfa' } : undefined} />
  }
}
