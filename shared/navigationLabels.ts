// Retain custom captions while updating the old default stored in Sanity.
export function paintingsLinkLabel(value:unknown):string {
 const label=typeof value==='string'?value.trim():''
 return !label||label.toLowerCase()==='explore portfolio'?'Explore paintings':label
}
