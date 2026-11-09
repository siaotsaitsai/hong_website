export function artworkMedium(value:unknown):string {
 return typeof value==='string'&&value.trim()?value.trim():'Oil on canvas'
}
