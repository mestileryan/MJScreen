'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddMediaModal from './AddMediaModal'

interface UploaderProps {
  onFilesSelected: (files: File[]) => Promise<void> | void
}

export default function Uploader({ onFilesSelected }: UploaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className="w-8 cursor-pointer bg-purple-600 hover:bg-purple-500 px-2 py-1
            rounded-lg flex items-center gap-2 transition-colors justify-center"
        onClick={() => setIsOpen(true)}
        title="Ajouter des médias"
        aria-label="Ajouter des médias"
      >
        <Plus />
      </button>

      <AddMediaModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onFilesSelected={onFilesSelected}
      />
    </>
  )
}
