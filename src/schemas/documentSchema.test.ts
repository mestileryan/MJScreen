import { describe, expect, it } from 'vitest'
import { parseDocument, parseDocumentValue, serializeDocument, type DocumentSchema } from './documentSchema'
import { expectString } from './validation'

// Schéma fictif en version 3, pour éprouver la chaîne de migrations
// sans attendre que les vrais fichiers changent de format.
interface Fictif {
  schemaVersion: 3
  title: string
  tags: string[]
}

const fictif: DocumentSchema<Fictif> = {
  fileName: 'fictif.json',
  version: 3,
  migrations: {
    // v1 → v2 : `name` devient `title`
    1: ({ name, ...rest }) => ({ ...rest, title: name }),
    // v2 → v3 : apparition des tags
    2: doc => ({ ...doc, tags: [] }),
  },
  validate: doc => ({
    schemaVersion: 3,
    title: expectString(doc.title, 'title'),
    tags: doc.tags as string[],
  }),
}

describe('parseDocument', () => {
  it('lit un document à la version courante sans migration', () => {
    const result = parseDocument(fictif, '{"schemaVersion":3,"title":"Taverne","tags":["calme"]}')
    expect(result).toEqual({
      status: 'ok',
      value: { schemaVersion: 3, title: 'Taverne', tags: ['calme'] },
      migratedFrom: null,
    })
  })

  it('enchaîne les migrations depuis une ancienne version', () => {
    const result = parseDocumentValue(fictif, { schemaVersion: 1, name: 'Taverne' })
    expect(result).toEqual({
      status: 'ok',
      value: { schemaVersion: 3, title: 'Taverne', tags: [] },
      migratedFrom: 1,
    })
  })

  it('part de la version intermédiaire sans rejouer les migrations précédentes', () => {
    const result = parseDocumentValue(fictif, { schemaVersion: 2, title: 'Taverne' })
    expect(result).toMatchObject({ status: 'ok', migratedFrom: 2, value: { title: 'Taverne', tags: [] } })
  })

  it('signale un document plus récent que ce que l\'application connaît', () => {
    expect(parseDocumentValue(fictif, { schemaVersion: 4 })).toEqual({
      status: 'too-new',
      version: 4,
      supported: 3,
    })
  })

  it('signale un trou dans la chaîne de migrations', () => {
    const lacunaire = { ...fictif, migrations: { 2: fictif.migrations[2] } }
    const result = parseDocumentValue(lacunaire, { schemaVersion: 1, name: 'Taverne' })
    expect(result.status).toBe('invalid')
  })

  it('signale une migration qui échoue', () => {
    const fragile = {
      ...fictif,
      migrations: {
        ...fictif.migrations,
        1: () => {
          throw new Error('boum')
        },
      },
    }
    const result = parseDocumentValue(fragile, { schemaVersion: 1 })
    expect(result).toMatchObject({ status: 'invalid' })
    expect(result.status === 'invalid' && result.reason).toContain('boum')
  })

  it.each([
    ['un JSON illisible', '{"schemaVersion": 3,'],
    ['un tableau', '[]'],
    ['une valeur nulle', 'null'],
    ['un document sans version', '{"title":"Taverne"}'],
    ['une version non entière', '{"schemaVersion":"3"}'],
    ['une version nulle', '{"schemaVersion":0}'],
    ['un champ manquant', '{"schemaVersion":3,"tags":[]}'],
  ])('refuse %s', (_, text) => {
    expect(parseDocument(fictif, text).status).toBe('invalid')
  })
})

describe('serializeDocument', () => {
  it('produit un JSON indenté terminé par un saut de ligne', () => {
    expect(serializeDocument({ a: 1 })).toBe('{\n  "a": 1\n}\n')
  })
})
