const domain=import.meta.env.VITE_PLAUSIBLE_DOMAIN as string|undefined
let initialized=false
export function track(event:string,props?:Record<string,string|number>){
 if(!domain)return
 if(!initialized){initialized=true;const script=document.createElement('script');script.defer=true;script.dataset.domain=domain;script.src='https://plausible.io/js/script.js';document.head.appendChild(script)}
 const plausible=(window as Window & {plausible?: (name:string,options?:{props?:Record<string,string|number>})=>void}).plausible
 plausible?.(event,props?{props}:undefined)
}
