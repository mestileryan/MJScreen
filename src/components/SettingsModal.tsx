'use client'

import { useState, type ChangeEvent } from 'react'
import { CircleX } from 'lucide-react'
import { exportLibrary, importLibrary } from '@/persistance/ImportExportService'
import ConfirmationModal from './ConfirmationModal'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Fichier sélectionné pour l'import
  const [toImport, setToImport] = useState<File | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Génère l'archive et déclenche le téléchargement
  async function triggerExport() {
    setErrorMessage(null)
    try {
      const blob = await exportLibrary()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'library.mjszip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setErrorMessage("Erreur lors de l'export : " + ((e as Error)?.message || 'inconnue'))
    }
  }

  // Stocke le fichier choisi pour importation
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null)
    const file = event.target.files?.[0]
    if (file) {
      setToImport(file)
      setShowConfirmation(true)
    }
  }

  // Applique l'import et recharge la page
  async function confirmImport() {
    if (!toImport) return
    setErrorMessage(null)
    try {
      setShowConfirmation(false)
      await importLibrary(toImport)
      setToImport(null)
      onClose()
      window.location.reload()
    } catch (e) {
      setErrorMessage("Erreur lors de l'import : " + ((e as Error)?.message || 'inconnue'))
    }
  }

  return (
    <div className="relative">
      {/* Fenêtre modale contenant les options */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-gray-800 p-6 rounded-lg w-80">
            <div className="flex items-center justify-between">
              <h3 className="text-purple-300 text-lg font-bold mb-4">Paramétrage</h3>
              <button
                className="px-3 py-2 mb-4 rounded text-white hover:text-red-400 transition-colors"
                onClick={onClose}
              >
                <CircleX />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {/* Lance l'export de la bibliothèque */}
              <button
                onClick={triggerExport}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white"
              >
                Exporter
              </button>
              {/* Sélecteur de fichier pour l'import */}
              <label className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white text-center cursor-pointer">
                Importer
                <input type="file" className="hidden" onChange={onFileChange} />
              </label>
            </div>

            {/* Affichage d'une erreur */}
            {errorMessage && (
              <p className="mt-4 text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded border border-red-500">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modale de confirmation avant l'import */}
      {showConfirmation && (
        <ConfirmationModal
          message="Importer ce fichier écrasera tout le travail en cours. Continuer ?"
          onConfirm={confirmImport}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    </div>
  )
}
