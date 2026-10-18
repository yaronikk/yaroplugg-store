export type Category = string;
export type CategoryRecord={id:string;name:string;slug:string;name_ru?:string|null;name_et?:string|null;name_en?:string|null;category_type?:'clothing'|'footwear'|'accessories'}
export type ProductCondition='new_with_tags'|'excellent'|'good'|'defects'
export type ResaleStatus='available'|'reserved'|'sold'
export type Product = {id:string;name:string;slug:string;brand:string;category:Category;categoryType:'clothing'|'footwear'|'accessories';price:number;description:string;composition:string;sizes:string[];sizeLabel:string;measurements:string;defects:string;condition:ProductCondition;resaleStatus:ResaleStatus;stock:number;thumbnailUrls:string[];colors:{name:string;hex:string}[];images:string[];featured?:boolean};
export type CartItem = {product:Product;size:string;color:string;quantity:number};
