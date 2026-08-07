'use client'

interface ConfirmationModalProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

// Composant affichant une boîte de dialogue de confirmation générique
export default function ConfirmationModal({
  message,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    // Arrière-plan semi-transparent bloquant
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-80 text-center">
        <p className="text-white mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 bg-gray-600 rounded text-white">
            Annuler
          </button>
          <button onClick={onConfirm} className="px-3 py-1 bg-purple-600 rounded text-white">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}
