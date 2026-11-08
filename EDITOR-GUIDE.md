# Editing Hong Yang’s website

Sign in with your invited account at:
<https://hong-portfolio-htq7wor5.sanity.studio/>

The left menu matches the website. Choose **Edit** to make changes and **Website
preview** to check them. The preview includes drafts and the current unsaved form;
it does not publish anything. Choose **Mobile width** to check a narrow layout.
**Open published website** opens the real public page, which does not include drafts.
Preview content is sent between the authenticated editor and its website frame;
no content-edit token is embedded in the public website.

## Home

- **Homepage image**: upload a file, or leave empty to use **Featured artwork**.
- **Featured artwork**: select an existing work when you want the homepage to use
  that work's image and information. Publish the artwork as well.
- **Homepage caption**: optional title below the image. This overrides the artwork
  title only on Home; it does not rename the actual work.
- **Homepage text**: optional text beneath the image. Leave empty for the minimal layout.
- **Portfolio link text**: for example, “Explore portfolio”.
- **Site title / Site description**: browser title and search/share description.

## Portfolio

1. Under **Artworks — upload or edit**, create a work. Upload its main image,
   describe it for screen readers, and enter its title, year, medium, dimensions,
   and description. Optional extra images appear as detail views in the artwork dialog.
2. Generate a URL slug. Check the result, especially for non-English titles.
3. Publish the work.
4. Under **Collections — add or edit**, create or rename a collection. Add existing
   artworks through the reference field, or use that field's Create option.
   Drag the list items to change the artwork order.
5. Add an optional collection description. Enable **Show description on website**
   only if you want it visible below the collection title. Existing hidden descriptions
   stay hidden until this switch is enabled.
6. Publish the collection.
7. Under **Collection order**, add the collections to show and drag to order them.
   Publish the order. An explicitly empty order hides all collections.

Dimensions default to inches: `24 × 36` displays as `24 × 36 in`.
You can explicitly enter another unit, such as `60 × 80 cm`.

An individual artwork/collection preview focuses on that item, even before you
have added it to the published portfolio. Use the Collection order preview or
published website to verify the final visible selection and order.

## CV

Add exhibitions, education, residencies, and other experience. Enter the category,
year, and title/location. Drag entries to control the display order, then publish.

## Artist Statement

Write the statement using paragraphs, headings, bold, and italic text. Publish it
when ready. An empty published statement clears the page's statement text.

## About

Edit the artist name, portrait, and introduction. The artist name also appears in
the website navigation and copyright. CV and Artist Statement are edited separately.

## Preserving earlier content

Existing artwork and collection document IDs are unchanged. Older CV and statement
fields on Artist profile, and the older collection order on Home, remain stored.
On first creating the new CV, Artist Statement or Collection order document, the
editor copies the corresponding earlier field into the new form. The website
continues reading old published fields until the corresponding new page is
published. Publishing an empty new page intentionally clears its content.

No existing documents are deleted or automatically republished during this setup.

## Publishing and checking

Sanity automatically saves drafts while you edit. Use **Website preview** before
publishing. Publish each modified work, collection, order, or page separately;
publishing one document does not publish its referenced documents.

After clicking **Publish**, refresh the public website:
<https://siaotsaitsai.github.io/hong_website/>

Content changes do not require a GitHub code deployment. An already open website
does not automatically refresh. Normal website visitors only receive published
content, even if they add preview parameters to a standalone URL.

If you see “Could not load preview content”, check that you accepted the project
invitation and that your role permits reading/editing drafts. The deployment token
cannot be used as a content editor account. Do not share passwords or tokens.
