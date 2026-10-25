import { describe, expect, it } from 'vitest'
import { CONFIG_SCHEMA_VERSION, createTracksLibraryConfig } from '@/models/TracksLibraryConfig'
import { tracksLibraryConfigSchema } from './tracksLibraryConfigSchema'
import { parseDocument, parseDocumentValue, serializeDocument } from './documentSchema'

const valid = {
  schemaVersion: 1,
  id: '4d1c2b8e-0d7e-4f0a-9d0e-1b2c3d4e5f60',
  name: 'Campagne Ravenloft',
  tracksDir: 'pistes',
  outputs: [],
  createdAt: '2026-10-25T10:00:00.000Z',
}

describe('tracksLibraryConfigSchema', () => {
  it('relit à l\'identique la configuration qu\'il a créée', () => {
    const config = createTracksLibraryConfig('Ma bibliothèque')
    const result = parseDocument(tracksLibraryConfigSchema, serializeDocument(config))
    expect(result).toEqual({ status: 'ok', value: config, migratedFrom: null })
  })

  it('accepte une configuration valide', () => {
    expect(parseDocumentValue(tracksLibraryConfigSchema, valid)).toMatchObject({ status: 'ok', value: valid })
  })

  it('conserve les champs inconnus et le contenu des sorties', () => {
    const output = { id: 'o1', target: 'export/mjscreen', rules: [{ tag: 'combat' }] }
    const result = parseDocumentValue(tracksLibraryConfigSchema, { ...valid, outputs: [output], theme: 'sombre' })
    expect(result).toMatchObject({ status: 'ok', value: { outputs: [output], theme: 'sombre' } })
  })

  it('refuse un fichier écrit par une version plus récente', () => {
    const result = parseDocumentValue(tracksLibraryConfigSchema, { ...valid, schemaVersion: CONFIG_SCHEMA_VERSION + 1 })
    expect(result.status).toBe('too-new')
  })

  it.each([
    ['sans identifiant', { id: undefined }],
    ['au nom vide', { name: '  ' }],
    ['dont le dossier des pistes sort de la racine', { tracksDir: '../ailleurs' }],
    ['dont le dossier des pistes est absolu', { tracksDir: '/pistes' }],
    ['dont les sorties ne sont pas une liste', { outputs: {} }],
    ['dont une sortie n\'est pas un objet', { outputs: ['export'] }],
  ])('refuse une configuration %s', (_, patch) => {
    const result = parseDocumentValue(tracksLibraryConfigSchema, { ...valid, ...patch })
    expect(result.status).toBe('invalid')
  })

  it('situe le champ fautif dans le message', () => {
    const result = parseDocumentValue(tracksLibraryConfigSchema, { ...valid, outputs: ['export'] })
    expect(result.status === 'invalid' && result.reason).toContain('outputs[0]')
  })
})
