type Umami={track:(event:string,data?:Record<string,string|number>)=>void}
declare global{interface Window{umami?:Umami}}
const scriptUrl=import.meta.env.VITE_ANALYTICS_SCRIPT_URL as string|undefined
const websiteId=import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string|undefined
let initialized=false
export function track(event:string,props?:Record<string,string|number>){
 if(!scriptUrl||!websiteId)return
 if(!initialized){
  try{if(new URL(scriptUrl).protocol!=='https:')return}catch{return}
  initialized=true
  const script=document.createElement('script');script.defer=true;script.src=scriptUrl;script.dataset.websiteId=websiteId;script.dataset.autoPageview='false';script.dataset.doNotTrack='true';document.head.appendChild(script)
 }
 window.umami?.track(event,props)
}
