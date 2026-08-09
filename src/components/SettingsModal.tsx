'use client'

import { useState, type ChangeEvent } from 'react'
import { CircleX, LoaderCircle } from 'lucide-react'
import {
  clearLibrary,
  exportLibrary,
  exportSharedArchive,
  importLibrary,
} from '@/persistance/ImportExportService'
import ConfirmationModal from './ConfirmationModal'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Déclenche le téléchargement d'un blob sous le nom donné. */
function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Fichier sélectionné pour l'import
  const [toImport, setToImport] = useState<File | null>(null)
  const [showImportConfirmation, setShowImportConfirmation] = useState(false)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Génère l'archive et déclenche le téléchargement
  async function triggerExport() {
    setErrorMessage(null)
    setBusy(true)
    try {
      download(await exportLibrary(), 'library.mjszip')
    } catch (e) {
      setErrorMessage("Erreur lors de l'export : " + ((e as Error)?.message || 'inconnue'))
    } finally {
      setBusy(false)
    }
  }

  // Archive lisible par n'importe qui : les fichiers audio, rangés par playlist
  async function triggerSharedExport() {
    setErrorMessage(null)
    setBusy(true)
    try {
      download(await exportSharedArchive(), 'mjscreen-partage.zip')
    } catch (e) {
      setErrorMessage("Erreur lors de l'export : " + ((e as Error)?.message || 'inconnue'))
    } finally {
      setBusy(false)
    }
  }

  // Stocke le fichier choisi pour importation
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null)
    const file = event.target.files?.[0]
    if (file) {
      setToImport(file)
      setShowImportConfirmation(true)
    }
  }

  // Applique l'import et recharge la page
  async function confirmImport() {
    if (!toImport) return
    setErrorMessage(null)
    try {
      setShowImportConfirmation(false)
      await importLibrary(toImport)
      setToImport(null)
      onClose()
      window.location.reload()
    } catch (e) {
      setErrorMessage("Erreur lors de l'import : " + ((e as Error)?.message || 'inconnue'))
    }
  }

  async function confirmClear() {
    setErrorMessage(null)
    setShowClearConfirmation(false)
    try {
      await clearLibrary()
      onClose()
      window.location.reload()
    } catch (e) {
      setErrorMessage('Erreur lors du vidage : ' + ((e as Error)?.message || 'inconnue'))
    }
  }

  /** Sauvegarde d'abord, vide ensuite — la porte de sortie sûre. */
  async function backupThenClear() {
    setShowClearConfirmation(false)
    await triggerExport()
    // Le téléchargement est lancé par un clic synthétique : on laisse au
    // navigateur le temps de s'en saisir avant de recharger la page.
    window.setTimeout(() => void confirmClear(), 1500)
  }

  return (
    <div className="relative">
      {/* Fenêtre modale contenant les options */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-80 max-w-[90vw] rounded-lg bg-gray-800 p-6">
            <div className="flex items-center justify-between">
              <h3 className="mb-4 text-lg font-bold text-purple-300">Paramétrage</h3>
              <button
                className="mb-4 rounded px-3 py-2 text-white transition-colors hover:text-red-400"
                onClick={onClose}
              >
                <CircleX />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Lance l'export de la bibliothèque */}
              <button
                onClick={triggerExport}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded bg-purple-600 px-3 py-2 text-white
                  transition-colors hover:bg-purple-500 disabled:opacity-50"
              >
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Exporter
              </button>

              {/* Sélecteur de fichier pour l'import */}
              <label className="cursor-pointer rounded bg-purple-600 px-3 py-2 text-center text-white transition-colors hover:bg-purple-500">
                Importer
                <input type="file" className="hidden" onChange={onFileChange} />
              </label>

              <button
                onClick={triggerSharedExport}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded bg-purple-600 px-3 py-2 text-white
                  transition-colors hover:bg-purple-500 disabled:opacity-50"
              >
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Exporter pour partage
              </button>
              <p className="-mt-2 text-xs text-gray-400">
                Les fichiers audio et les images, rangés dans un dossier par playlist.
                Lisible sans l’application.
              </p>

              <button
                onClick={() => setShowClearConfirmation(true)}
                disabled={busy}
                className="mt-2 rounded border border-red-700 px-3 py-2 text-red-400 transition-colors
                  hover:bg-red-700 hover:text-white disabled:opacity-50"
              >
                Vider la bibliothèque
              </button>
            </div>

            {/* Affichage d'une erreur */}
            {errorMessage && (
              <p className="mt-4 rounded border border-red-500 bg-red-900/30 px-3 py-2 text-sm text-red-400">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modale de confirmation avant l'import */}
      {showImportConfirmation && (
        <ConfirmationModal
          message="Importer ce fichier écrasera tout le travail en cours. Continuer ?"
          onConfirm={confirmImport}
          onCancel={() => setShowImportConfirmation(false)}
        />
      )}

      {/* Vidage : on propose la sauvegarde avant, la perte étant irréversible */}
      {showClearConfirmation && (
        <ConfirmationModal
          message="Toute la bibliothèque va être effacée : playlists, pistes et images. C’est irréversible. Voulez-vous sauvegarder d’abord ?"
          secondaryLabel="Sauvegarder puis vider"
          onSecondary={() => void backupThenClear()}
          confirmLabel="Vider sans sauvegarder"
          confirmTone="danger"
          onConfirm={() => void confirmClear()}
          onCancel={() => setShowClearConfirmation(false)}
        />
      )}
    </div>
  )
}
