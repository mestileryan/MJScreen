'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { UserMessage } from '@/hooks/useTracksLibrary'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` pour l’action principale de l’écran, `danger` pour une action destructrice. */
  tone?: 'primary' | 'secondary' | 'danger'
}

const TONES = {
  primary: 'bg-purple-600 text-on-accent hover:bg-purple-500',
  secondary: 'bg-gray-700 text-white hover:bg-gray-600',
  danger: 'bg-red-700 text-on-accent hover:bg-red-600',
}

/** Bouton texte des écrans de la bibliothèque de pistes. */
export function ActionButton({ tone = 'secondary', className = '', type = 'button', ...props }: ActionButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]} ${className}`}
      {...props}
    />
  )
}

interface PanelProps {
  title: string
  icon?: ReactNode
  children: ReactNode
}

/** Carte qui porte l’étape en cours de la page. */
export function Panel({ title, icon, children }: PanelProps) {
  return (
    <section className="rounded-lg bg-gray-800 p-5 shadow">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        {icon}
        {title}
      </h2>
      <div className="space-y-3 text-sm text-gray-300">{children}</div>
    </section>
  )
}

/** Détail technique replié : l’utilisateur ne le voit que s’il le demande. */
export function TechnicalDetails({ children, label = 'Détails techniques' }: { children?: ReactNode; label?: string }) {
  if (!children) return null
  return (
    <details className="text-xs text-gray-400">
      <summary className="cursor-pointer select-none hover:text-gray-300">{label}</summary>
      <div className="mt-1 whitespace-pre-wrap break-words font-mono">{children}</div>
    </details>
  )
}

/** Message en langage courant, détail technique replié dessous. */
export function Message({ message, tone = 'normal' }: { message: UserMessage; tone?: 'normal' | 'error' }) {
  return (
    <div className="space-y-1">
      <p className={tone === 'error' ? 'text-red-300' : undefined}>{message.text}</p>
      <TechnicalDetails>{message.details}</TechnicalDetails>
    </div>
  )
}
