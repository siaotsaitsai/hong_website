import {ImagesIcon, UserIcon, CogIcon} from '@sanity/icons'
import type {DefaultDocumentNodeResolver, StructureResolver} from 'sanity/structure'
import {WebsitePreview} from './WebsitePreview'

export const singletonTypes = new Set(['artistProfile', 'siteSettings', 'portfolioSettings', 'cvPage', 'statementPage'])
export const defaultDocumentNode: DefaultDocumentNodeResolver = (S) => S.document().views([
  S.view.form().title('Edit'),
  S.view.component(WebsitePreview).title('Website preview'),
])

export const structure: StructureResolver = (S) => {
  const singleton = (title: string, type: string, id = type) => S.listItem().title(title).child(
    S.document().schemaType(type).documentId(id).title(title).views([S.view.form().title('Edit'), S.view.component(WebsitePreview).title('Website preview')]),
  )
  return S.list().title('Website').items([
    singleton('Home', 'siteSettings').icon(CogIcon),
    S.listItem().title('Portfolio').icon(ImagesIcon).child(S.list().title('Portfolio').items([
      singleton('Collection order', 'portfolioSettings'),
      S.documentTypeListItem('collection').title('Collections — add or edit'),
      S.documentTypeListItem('artwork').title('Artworks — upload or edit'),
    ])),
    singleton('CV', 'cvPage'),
    singleton('Artist Statement', 'statementPage'),
    singleton('About', 'artistProfile').icon(UserIcon),
  ])
}
