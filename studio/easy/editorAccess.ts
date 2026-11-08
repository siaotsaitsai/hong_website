// Fixed account IDs, verified against the owner's two supplied member emails.
// Emails and credentials are intentionally not stored in the public source.
export const allowedEditorIds=new Set(['pq0bZK5fi','pbFhwMxR5'])
export function canAccessEditor(userId:string|null|undefined){return !!userId&&allowedEditorIds.has(userId)}
