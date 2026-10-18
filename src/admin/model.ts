export type AdminImage={url:string;thumbnailUrl?:string;existing:boolean}
export type AdminColor={name:string;hex:string}
export type AdminProductForm={name:string;brand:string;price:string;category:string;description:string;composition:string;sizes:string[];sizeLabel:string;measurements:string;defects:string;condition:'new_with_tags'|'excellent'|'good'|'defects';resaleStatus:'available'|'reserved'|'sold';lengths:string[];colors:AdminColor[];stock:string;isActive:boolean;isNew:boolean;featured:boolean;sortOrder:string;images:AdminImage[]}
export const MAX_PRODUCT_IMAGES=8
export const MAX_IMAGE_SIZE=10*1024*1024
export const ALLOWED_IMAGE_TYPES=['image/jpeg','image/png','image/webp']
export const COLOR_PALETTE:AdminColor[]=[
 {name:'Black',hex:'#0b0b0b'},{name:'White',hex:'#ffffff'},{name:'Cream',hex:'#e9e2d6'},
 {name:'Grey',hex:'#8b8b8b'},{name:'Light Grey',hex:'#c8c8c8'},{name:'Red',hex:'#f52222'},
 {name:'Burgundy',hex:'#6d1020'},{name:'Navy',hex:'#18243a'},{name:'Blue',hex:'#2457a6'},
 {name:'Green',hex:'#315b3c'},{name:'Olive',hex:'#687044'},{name:'Brown',hex:'#6b4935'},
 {name:'Beige',hex:'#c9b79c'},{name:'Pink',hex:'#d97893'},{name:'Purple',hex:'#6e4c8f'},
 {name:'Orange',hex:'#d96b24'},{name:'Yellow',hex:'#d6aa24'}
]

export const emptyForm:AdminProductForm={name:'',brand:'',price:'',category:'',description:'',composition:'',sizes:[],sizeLabel:'',measurements:'',defects:'',condition:'good',resaleStatus:'available',lengths:[],colors:[{name:'Black',hex:'#0b0b0b'}],stock:'0',isActive:true,isNew:true,featured:false,sortOrder:'0',images:[]}
