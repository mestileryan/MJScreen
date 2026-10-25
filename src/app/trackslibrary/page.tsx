import type { Metadata } from 'next'
import TracksLibraryScreen from '@/components/TracksLibraryScreen'

export const metadata: Metadata = {
  title: 'Bibliothèque de pistes',
}

export default function TracksLibraryPage() {
  return <TracksLibraryScreen />
}
