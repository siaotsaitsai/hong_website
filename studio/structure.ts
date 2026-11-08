import {ImagesIcon, UserIcon, CogIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

export const singletonTypes = new Set(['artistProfile', 'siteSettings'])

export const structure: StructureResolver = (S) => S.list()
  .title('Content')
  .items([
    S.documentTypeListItem('artwork').title('Artworks').icon(ImagesIcon),
    S.documentTypeListItem('collection').title('Collections'),
    S.divider(),
    S.listItem().title('Artist profile').icon(UserIcon).child(
      S.document().schemaType('artistProfile').documentId('artistProfile').title('Artist profile'),
    ),
    S.listItem().title('Home & contact').icon(CogIcon).child(
      S.document().schemaType('siteSettings').documentId('siteSettings').title('Home & contact'),
    ),
  ])
