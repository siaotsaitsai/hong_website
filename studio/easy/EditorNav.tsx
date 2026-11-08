export type EditorPage='home'|'portfolio'|'cv'|'statement'|'about'
export const editorPages:[EditorPage,string][]=[['home','Home'],['portfolio','Portfolio'],['cv','CV'],['statement','Artist Statement'],['about','About']]
export function EditorNav({active,onNavigate,mobile=false}:{active:EditorPage;onNavigate:(page:EditorPage)=>void;mobile?:boolean}) {
 return <nav className={mobile?'easy-mobile-nav':'easy-page-nav'} aria-label={mobile?'Mobile editor pages':'Editor pages'}>{editorPages.map(([id,title])=><button key={id} type="button" aria-current={active===id?'page':undefined} onClick={()=>{if(active!==id)onNavigate(id)}}>{title}</button>)}</nav>
}
