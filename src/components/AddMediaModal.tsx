'use client'

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { CircleX, LoaderCircle, Upload } from 'lucide-react'
import { fetchRemoteMedia } from '@/lib/remoteMedia'

interface AddMediaModalProps {
  isOpen: boolean
  onClose: () => void
  /** Range les fichiers dans la bibliothèque ; la modale se ferme au succès. */
  onFilesSelected: (files: File[]) => Promise<void> | void
}

export default function AddMediaModal({
  isOpen,
  onClose,
  onFilesSelected,
}: AddMediaModalProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || typeof document === 'undefined') return null

  function reset() {
    setUrl('')
    setName('')
    setError(null)
    setBusy(false)
    setIsDragOver(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit(files: File[]) {
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      await onFilesSelected(files)
      close()
    } catch {
      setError("L’ajout a échoué. Le fichier est peut-être illisible.")
      setBusy(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
    if (event.dataTransfer?.files?.length) {
      void submit(Array.from(event.dataTransfer.files))
    }
  }

  function onFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Permet de resélectionner le même fichier après une erreur.
    event.target.value = ''
    void submit(files)
  }

  async function addFromUrl() {
    if (!url.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const file = await fetchRemoteMedia(url, name)
      await onFilesSelected([file])
      close()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={close}
    >
      <div
        className="w-[28rem] max-w-[90vw] rounded-lg bg-gray-800 p-6"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-purple-300">Ajouter des médias</h3>
          <button
            className="text-white transition-colors hover:text-red-400"
            onClick={close}
            aria-label="Fermer"
          >
            <CircleX />
          </button>
        </div>

        {/* Zone de dépôt, également cliquable pour ouvrir le sélecteur de fichiers.
            Les événements de glissement sont arrêtés ici : sans cela l'overlay de la
            bibliothèque, en dessous, s'afficherait aussi. */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg
            border-2 border-dashed p-8 text-center transition-colors ${
              isDragOver
                ? 'border-purple-400 bg-purple-400/10'
                : 'border-gray-500 hover:border-purple-500 hover:bg-gray-700/40'
            }`}
          onClick={() => !busy && fileInput.current?.click()}
          onDragEnter={event => {
            event.preventDefault()
            event.stopPropagation()
            setIsDragOver(true)
          }}
          onDragOver={event => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onDragLeave={event => {
            event.preventDefault()
            event.stopPropagation()
            setIsDragOver(false)
          }}
          onDrop={onDrop}
        >
          <Upload className="h-8 w-8 text-purple-400" />
          <p className="text-white">Glissez vos fichiers ici</p>
          <p className="text-xs text-gray-400">ou cliquez pour les choisir</p>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*,image/*"
            multiple
            className="hidden"
            onChange={onFilePicked}
          />
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-700" />
          <span className="text-xs uppercase tracking-wide text-gray-500">ou</span>
          <span className="h-px flex-1 bg-gray-700" />
        </div>

        <label className="mb-1 block text-sm text-gray-300" htmlFor="media-url">
          Lien direct vers un fichier audio ou une image
        </label>
        <div className="flex gap-2">
          <input
            id="media-url"
            type="url"
            value={url}
            onChange={event => setUrl(event.target.value)}
            onKeyUp={event => {
              if (event.key === 'Enter') void addFromUrl()
            }}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded bg-gray-700 px-2 py-1 text-white placeholder:text-gray-500"
          />
          <button
            className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-white transition-colors
              hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600"
            onClick={() => void addFromUrl()}
            disabled={busy || !url.trim()}
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Ajouter
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Nom (facultatif)"
          className="mt-2 w-full rounded bg-gray-700 px-2 py-1 text-white placeholder:text-gray-500"
        />

        <p className="mt-2 text-xs text-gray-500">
          Le lien doit pointer sur le fichier lui-même, pas sur une page qui le contient.
          Certains sites refusent le téléchargement depuis une autre page.
        </p>

        {error && (
          <p className="mt-3 rounded border border-red-500 bg-red-900/30 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
