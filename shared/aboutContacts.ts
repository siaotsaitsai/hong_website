export const contactDefaults:{instagram?:string;email?:string}={instagram:'https://www.instagram.com/yang_hong90/',email:'yang.ophe@gmail.com'}
type Contacts={instagram?:unknown;email?:unknown}
export function instagramHref(value:unknown):string|null {
 if(typeof value!=='string'||!value.trim())return null
 let handle=value.trim().replace(/^@/,'')
 if(handle.includes('://')){
   try{const url=new URL(handle);if(url.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(url.hostname)||url.username||url.password||url.port)return null;handle=url.pathname.replace(/^\/|\/$/g,'')}catch{return null}
 }
 if(!/^[A-Za-z0-9._]{1,30}$/.test(handle))return null
 return `https://www.instagram.com/${handle}/`
}
export function emailHref(value:unknown):string|null {
 if(typeof value!=='string'||!value.trim())return null
 const email=value.trim();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return null
 return `mailto:${encodeURIComponent(email).replace('%40','@')}`
}
export function aboutContacts(profile:unknown,settings?:unknown){
 const p=(profile&&typeof profile==='object'?profile:{}) as Contacts
 const s=(settings&&typeof settings==='object'?settings:{}) as Contacts
 return {instagram:p.instagram??s.instagram??contactDefaults.instagram??'',email:p.email??s.email??contactDefaults.email??''}
}

