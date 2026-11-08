import {defineArrayMember, defineField, defineType} from 'sanity'

const artwork = defineType({
  name: 'artwork', title: 'Artworks', type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required(), initialValue: 'Untitled work'}),
    defineField({name: 'slug', title: 'URL slug', type: 'slug', options: {source: 'title', maxLength: 96}, description: 'Click Generate to create a URL slug. For non-Latin titles, check the result or enter a short English name.', validation: (r) => r.required()}),
    defineField({name: 'image', title: 'Main image', type: 'image', options: {hotspot: true}, validation: (r) => r.required().assetRequired(), fields: [
      defineField({name: 'alt', title: 'Image description', type: 'string', description: 'Describe the image for visitors using screen readers.', validation: (r) => r.required()}),
    ]}),
    defineField({name: 'additionalImages', title: 'Details and additional views', type: 'array', of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string', validation: (r) => r.required()})]})]}),
    defineField({name: 'year', title: 'Year', type: 'string', description: 'For example: 2026 or 2025–2026.'}),
    defineField({name: 'medium', title: 'Medium', type: 'string', description: 'For example: Oil on canvas.'}),
    defineField({name: 'dimensions', title: 'Dimensions', type: 'string', description: 'Default unit: inches. For example: 24 × 36 in. Dimensions entered without a unit are displayed in inches. Include cm explicitly if needed.'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 5}),
  ],
  preview: {select: {title: 'title', subtitle: 'year', media: 'image'}},
})

const collection = defineType({
  name: 'collection', title: 'Collections', type: 'document',
  fields: [
    defineField({name: 'title', title: 'Collection title', type: 'string', validation: (r) => r.required(), initialValue: 'New collection'}),
    defineField({name: 'slug', title: 'URL slug', type: 'slug', options: {source: 'title'}, validation: (r) => r.required()}),
    defineField({name: 'description', title: 'Collection description', type: 'text', rows: 4}),
    defineField({name: 'showDescription', title: 'Show description on website', type: 'boolean', initialValue: true, description: 'Turn on to display the collection introduction beneath its title.'}),
    defineField({name: 'artworks', title: 'Artworks in this collection', type: 'array', description: 'Add existing artworks. Drag to change their order.', of: [defineArrayMember({type: 'reference', to: [{type: 'artwork'}]})], validation: (r) => r.unique()}),
  ],
})

const artistProfile = defineType({
  name: 'artistProfile', title: 'About', type: 'document',
  initialValue: {name: 'Hong Yang', introduction: 'Introduce your work, inspirations, and artistic practice.'},
  fields: [
    defineField({name: 'name', title: 'Name / artist name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'portrait', title: 'Portrait', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string', validation: (r) => r.required()})]}),
    defineField({name: 'introduction', title: 'Introduction', type: 'text', rows: 4}),
    defineField({name: 'statement', hidden: true, title: 'Artist statement', type: 'array', of: [defineArrayMember({type: 'block', styles: [{title: 'Paragraph', value: 'normal'}, {title: 'Heading', value: 'h2'}], marks: {decorators: [{title: 'Bold', value: 'strong'}, {title: 'Italic', value: 'em'}], annotations: []}})]}),
    defineField({name: 'cv', hidden: true, title: 'Exhibitions, education, and residencies', type: 'array', description: 'Drag to change the display order.', of: [defineArrayMember({name: 'cvEntry', title: 'Experience', type: 'object', fields: [
      defineField({name: 'category', title: 'Category', type: 'string', options: {list: [{title: 'Exhibition', value: 'exhibition'}, {title: 'Education', value: 'education'}, {title: 'Residency', value: 'residency'}, {title: 'Other', value: 'other'}]}, validation: (r) => r.required()}),
      defineField({name: 'year', title: 'Year', type: 'string'}),
      defineField({name: 'title', title: 'Title and location', type: 'string', validation: (r) => r.required()}),
    ], preview: {select: {title: 'title', subtitle: 'year'}}})]}),
  ],
})

const siteSettings = defineType({
  name: 'siteSettings', title: 'Home', type: 'document',
  initialValue: {siteTitle: 'Artist portfolio', description: 'Paintings, studies, and everyday observations.'},
  fields: [
    defineField({name: 'siteTitle', title: 'Site title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'description', title: 'Site description', type: 'text', rows: 3, description: 'Used for search and sharing descriptions.'}),
    defineField({name: 'heroArtwork', title: 'Featured artwork', type: 'reference', to: [{type: 'artwork'}]}),
    defineField({name: 'homeImage', title: 'Homepage image', description: 'Upload a homepage image, or leave empty to use the featured artwork below.', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string', validation: r => r.required()})]}),
    defineField({name: 'homeCaption', title: 'Homepage caption', type: 'string', description: 'Optional caption. Overrides the artwork title on the homepage only.'}),
    defineField({name: 'homeText', title: 'Homepage text', type: 'text', rows: 4}),
    defineField({name: 'portfolioLinkLabel', title: 'Portfolio link text', type: 'string', initialValue: 'Explore portfolio'}),
    defineField({name: 'collections', hidden: true, title: 'Visible collections and order', type: 'array', description: 'Choose published collections and drag to arrange them.', of: [defineArrayMember({type: 'reference', to: [{type: 'collection'}]})], validation: (r) => r.unique()}),
    defineField({name: 'email', hidden: true, title: 'Public contact email', type: 'string', validation: (r) => r.email()}),
    defineField({name: 'instagram', hidden: true, title: 'Instagram URL', type: 'url', validation: (r) => r.uri({scheme: ['https']})}),
  ],
})

const portfolioSettings = defineType({
  name: 'portfolioSettings', title: 'Portfolio — collection order', type: 'document',
  initialValue: async (_params, context) => ({collections: await context.getClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'drafts', useCdn: false}).fetch('*[_id=="siteSettings"][0].collections') ?? []}),
  fields: [defineField({name: 'collections', title: 'Collections to display', type: 'array', description: 'Add collections, then drag to arrange them. Publish the collections and their artworks as well. An empty list hides all collections.', of: [defineArrayMember({type: 'reference', to: [{type: 'collection'}]})], validation: r => r.unique()})],
})
const cvPage = defineType({
  name: 'cvPage', title: 'CV', type: 'document',
  initialValue: async (_params, context) => ({entries: await context.getClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'drafts', useCdn: false}).fetch('*[_id=="artistProfile"][0].cv') ?? []}),
  fields: [defineField({name: 'entries', title: 'CV entries', type: 'array', description: 'Add exhibitions, education, residencies, or other experience. Drag to change the order. Older CV content is kept until you publish this page.', of: [defineArrayMember({name: 'cvEntry', title: 'Experience', type: 'object', fields: [
    defineField({name: 'category', title: 'Category', type: 'string', options: {list: [{title: 'Exhibition', value: 'exhibition'}, {title: 'Education', value: 'education'}, {title: 'Residency', value: 'residency'}, {title: 'Other', value: 'other'}]}, validation: r => r.required()}),
    defineField({name: 'year', title: 'Year', type: 'string'}),
    defineField({name: 'title', title: 'Title and location', type: 'string', validation: r => r.required()}),
  ], preview: {select: {title: 'title', subtitle: 'year'}}})]})],
})
const statementPage = defineType({
  name: 'statementPage', title: 'Artist Statement', type: 'document',
  initialValue: async (_params, context) => ({body: await context.getClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'drafts', useCdn: false}).fetch('*[_id=="artistProfile"][0].statement') ?? []}),
  fields: [defineField({name: 'body', title: 'Artist statement', type: 'array', description: 'Older statement content is kept until you publish this page.', of: [defineArrayMember({type: 'block', styles: [{title: 'Paragraph', value: 'normal'}, {title: 'Heading', value: 'h2'}], marks: {decorators: [{title: 'Bold', value: 'strong'}, {title: 'Italic', value: 'em'}], annotations: []}})]})],
})
export const schemaTypes = [artwork, collection, artistProfile, siteSettings, portfolioSettings, cvPage, statementPage]
