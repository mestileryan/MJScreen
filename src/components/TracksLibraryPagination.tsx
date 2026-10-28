'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Numéros à afficher : la première, la dernière, la courante et ses voisines ; `null` marque un trou. */
export function pageNumbers(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter(p => p >= 1 && p <= pageCount))
  const numbers: (number | null)[] = []
  for (let p = 1; p <= pageCount; p++) {
    if (wanted.has(p)) numbers.push(p)
    else if (numbers[numbers.length - 1] !== null) numbers.push(null)
  }
  return numbers
}

interface TracksLibraryPaginationProps {
  page: number
  pageCount: number
  total: number
  onChange: (page: number) => void
}

/** ‹ 1 2 … n › avec le total ; ne s’affiche pas s’il n’y a qu’une page. */
export default function TracksLibraryPagination({ page, pageCount, total, onChange }: TracksLibraryPaginationProps) {
  if (pageCount <= 1) return null
  const button = 'rounded-lg px-2.5 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1 text-sm text-gray-400">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Page précédente" className={`${button} hover:bg-gray-700 hover:text-white`}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageNumbers(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} className="px-1">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`${button} ${n === page ? 'bg-purple-600 text-on-accent' : 'hover:bg-gray-700 hover:text-white'}`}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Page suivante" className={`${button} hover:bg-gray-700 hover:text-white`}>
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="ml-2 text-xs text-gray-500">{total} pistes</span>
    </nav>
  )
}

/**
 * Page courante d’une liste paginée, liée à une « signature » (recherche, filtres) :
 * dès qu’elle change, on revient à la première page, sans effet ni état superflu.
 */
export function pageFor(paging: { signature: string; page: number }, signature: string, total: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(paging.signature === signature ? paging.page : 1, pageCount)
  return { page, pageCount, slice: <T,>(items: T[]) => items.slice((page - 1) * pageSize, page * pageSize) }
}
