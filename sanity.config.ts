import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './studio/schemaTypes'
import {structure, singletonTypes, defaultDocumentNode} from './studio/structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
if (!projectId) {
  throw new Error('Copy .env.example to .env and enter your Sanity Project ID. See README.md.')
}

export default defineConfig({
  name: 'hong-portfolio',
  title: 'Artist Portfolio · Studio',
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({title: 'Website', structure, defaultDocumentNode})],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => !singletonTypes.has(template.schemaType)),
  },
  document: {
    actions: (actions, context) => singletonTypes.has(context.schemaType)
      ? actions.filter(({action}) => action !== 'delete' && action !== 'duplicate' && action !== 'unpublish')
      : actions,
  },
})
