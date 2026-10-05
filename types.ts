export type Category = 'All'|'T-Shirts'|'Hoodies'|'Pants'|'Jackets';
export type Product = {id:string;name:string;category:Exclude<Category,'All'>;price:number;description:string;composition:string;sizes:string[];colors:{name:string;hex:string}[];images:string[];featured?:boolean};
export type CartItem = {product:Product;size:string;color:string;quantity:number};
