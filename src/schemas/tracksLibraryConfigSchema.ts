import type TracksLibraryConfig from '@/models/TracksLibraryConfig'
import { CONFIG_SCHEMA_VERSION } from '@/models/TracksLibraryConfig'
import type { DocumentSchema } from './documentSchema'
import { expectArray, expectObject, expectRelativePath, expectString } from './validation'

export const tracksLibraryConfigSchema: DocumentSchema<TracksLibraryConfig> = {
  fileName: 'config.json',
  version: CONFIG_SCHEMA_VERSION,
  // Ajouter ici `n: doc => …` à chaque montée de version, sans jamais en retirer :
  // une bibliothèque restée longtemps sans être ouverte doit toujours se recharger.
  migrations: {},
  validate: document => ({
    // Les champs inconnus sont conservés : ils survivent à une réécriture du fichier.
    ...document,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    id: expectString(document.id, 'id'),
    name: expectString(document.name, 'name'),
    tracksDir: expectRelativePath(document.tracksDir, 'tracksDir'),
    outputs: expectArray(document.outputs, 'outputs').map((output, i) => expectObject(output, `outputs[${i}]`)),
    createdAt: expectString(document.createdAt, 'createdAt'),
  }),
}
