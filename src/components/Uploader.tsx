'use client'

import { Plus } from 'lucide-react'
import type { ChangeEvent } from 'react'

interface UploaderProps {
  onFileSelected: (file: File) => void
}

export default function Uploader({ onFileSelected }: UploaderProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelected(file)
    }
  }

  return (
    <label
      className="w-8 cursor-pointer bg-purple-600 hover:bg-purple-500 px-2 py-1
            rounded-lg flex items-center gap-2 transition-colors justify-center"
    >
      <Plus />
      <input type="file" accept="audio/*,image/*" onChange={handleFileChange} className="hidden" />
    </label>
  )
}
