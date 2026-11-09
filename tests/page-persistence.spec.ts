import {test,expect} from '@playwright/test'
import {sanityServer} from './helpers/sanityServer'
import {createPageGateway,reference,rootIds,type DocumentModel} from '../studio/easy/pageGateway'

test('Paintings drafts use valid weak references, publish atomically, and keep work that is removed from view',async()=>{
 const fixture=await sanityServer([
   {_id:'asset',_type:'sanity.imageAsset',url:'https://cdn.sanity.io/images/htq7wor5/production/asset.jpg'},
   {_id:'old-work',_type:'artwork',_rev:'work-1',title:'Original work',image:{asset:{_ref:'asset'}}},
   {_id:'old-series',_type:'collection',title:'Original series',artworks:[{_ref:'old-work'}]},
   {_id:'siteSettings',_type:'siteSettings',siteTitle:'Home unchanged',collections:[{_ref:'old-series'}]},
 ])
 try{
   const gateway=createPageGateway(fixture.client);const snapshot=await gateway.load('portfolio')
   const model={...snapshot.model,[rootIds.portfolio]:{...snapshot.model.portfolioSettings,collections:[reference('new-series')]},'new-series':{_id:'new-series',_type:'collection',title:'New series',artworks:[reference('new-work')]},'new-work':{_id:'new-work',_type:'artwork',title:'New work',image:{asset:{_type:'reference',_ref:'asset'}},dimensions:'24 × 36'}}
   const saved=await gateway.save(model,snapshot)
   expect(fixture.documents.has('portfolioSettings')).toBe(false)
   expect((fixture.documents.get('drafts.portfolioSettings')!.collections as {_weak:boolean}[])[0]._weak).toBe(true)
   expect((fixture.documents.get('drafts.new-series')!.artworks as {_weak:boolean}[])[0]._weak).toBe(true)
   expect(fixture.documents.has('old-work')).toBe(true)
   expect((fixture.documents.get('drafts.new-work')!.slug as {current:string}).current).toContain('new-work')
   fixture.documents.set('drafts.new-work',{...fixture.documents.get('drafts.new-work')!,_rev:'another-member'})
   await expect(gateway.publish(saved)).rejects.toMatchObject({statusCode:409})
   expect(fixture.documents.has('portfolioSettings')).toBe(false)
   expect(fixture.documents.has('drafts.portfolioSettings')).toBe(true)
   const latest=await gateway.load('portfolio');await gateway.publish(latest)
   expect((fixture.documents.get('portfolioSettings')!.collections as {_ref:string;_weak?:boolean}[])[0]).toMatchObject({_ref:'new-series'})
   expect((fixture.documents.get('portfolioSettings')!.collections as {_weak?:boolean}[])[0]._weak).toBeUndefined()
   expect(fixture.documents.get('new-work')?.dimensions).toBe('24 × 36')
   expect(fixture.documents.has('drafts.new-work')).toBe(false)
   expect(fixture.documents.has('old-work')).toBe(true)
   expect(fixture.documents.has('old-series')).toBe(true)
   expect(fixture.documents.get('siteSettings')?.siteTitle).toBe('Home unchanged')
 }finally{await fixture.close()}
})
test('CV and Statement inherit legacy values, and About preserves legacy fields while removing a portrait',async()=>{
 const cv=[{_key:'cv-1',_type:'cvEntry',category:'education',year:'2020',title:'Existing education'}]
 const body=[{_key:'statement-1',_type:'block',style:'normal',children:[{_key:'span-1',_type:'span',text:'Existing statement',marks:[]}]}]
 const fixture=await sanityServer([{_id:'portrait',_type:'sanity.imageAsset',url:'https://cdn.sanity.io/images/htq7wor5/production/portrait.jpg'},{_id:'artistProfile',_type:'artistProfile',_rev:'profile-1',name:'Hong Yang',portrait:{asset:{_ref:'portrait'}},introduction:'Old biography',cv,statement:body}])
 try{
   const gateway=createPageGateway(fixture.client)
   const initialCV=await gateway.load('cv');expect(initialCV.model.cvPage.entries).toEqual(cv)
   const cvSaved=await gateway.save(initialCV.model,initialCV);await gateway.publish(cvSaved)
   expect(fixture.documents.get('cvPage')?.entries).toEqual(cv)
   const initialStatement=await gateway.load('statement');expect(initialStatement.model.statementPage.body).toEqual(body)
   const statementSaved=await gateway.save(initialStatement.model,initialStatement);await gateway.publish(statementSaved)
   expect(fixture.documents.get('statementPage')?.body).toEqual(body)
   const about=await gateway.load('about');const changed:DocumentModel={...about.model,artistProfile:{...about.model.artistProfile,introduction:'New biography'}};delete changed.artistProfile.portrait
   const saved=await gateway.save(changed,about);await gateway.publish(saved)
   expect(fixture.documents.get('artistProfile')?.portrait).toBeUndefined()
   expect(fixture.documents.get('artistProfile')?.introduction).toBe('New biography')
   expect(fixture.documents.get('artistProfile')?.cv).toEqual(cv)
   expect(fixture.documents.get('artistProfile')?.statement).toEqual(body)
 }finally{await fixture.close()}
})

test('saving a draft does not forget a published revision changed by another member',async()=>{
 const fixture=await sanityServer([{_id:'artistProfile',_type:'artistProfile',_rev:'first-version',name:'Hong Yang',introduction:'First biography'}])
 try{
   const gateway=createPageGateway(fixture.client)
   const initial=await gateway.load('about')
   fixture.documents.set('artistProfile',{...fixture.documents.get('artistProfile')!,_rev:'other-version',introduction:'Another member’s biography'})
   const saved=await gateway.save({...initial.model,artistProfile:{...initial.model.artistProfile,introduction:'My changed biography'}},initial)
   await expect(gateway.publish(saved)).rejects.toMatchObject({statusCode:409})
   expect(fixture.documents.get('artistProfile')?.introduction).toBe('Another member’s biography')
   expect(fixture.documents.get('drafts.artistProfile')?.introduction).toBe('My changed biography')
 }finally{await fixture.close()}
})
