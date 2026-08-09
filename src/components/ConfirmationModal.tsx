'use client'

import { CircleX } from 'lucide-react'

interface ConfirmationModalProps {
  message: string
  confirmLabel?: string
  /** Signale une action destructrice, à teinter en rouge. */
  confirmTone?: 'normal' | 'danger'
  /** Troisième issue facultative, pour proposer une porte de sortie plus sûre. */
  secondaryLabel?: string
  onSecondary?: () => void
  onConfirm: () => void
  onCancel: () => void
}

// Composant affichant une boîte de dialogue de confirmation générique
export default function ConfirmationModal({
  message,
  confirmLabel = 'Confirmer',
  confirmTone = 'normal',
  secondaryLabel,
  onSecondary,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    // Arrière-plan semi-transparent bloquant
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 max-w-[90vw] rounded-lg bg-gray-800 p-6 pt-3 text-center">
        {/* L'annulation passe par la croix, comme dans les autres modales.
            Elle occupe sa propre ligne plutôt qu'un placement absolu : un
            message long viendrait sinon buter dessus. */}
        <div className="mb-1 flex justify-end">
          <button
            onClick={onCancel}
            className="text-white transition-colors hover:text-red-400"
            title="Annuler"
            aria-label="Annuler"
          >
            <CircleX className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-white">{message}</p>

        <div className="flex flex-wrap justify-end gap-2">
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="rounded bg-purple-600 px-3 py-1 text-white transition-colors hover:bg-purple-500"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`rounded px-3 py-1 text-white transition-colors ${
              confirmTone === 'danger'
                ? 'bg-red-700 hover:bg-red-600'
                : 'bg-purple-600 hover:bg-purple-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
