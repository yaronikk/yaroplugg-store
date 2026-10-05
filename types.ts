export type Category = 'Все'|'Футболки'|'Худи'|'Брюки'|'Куртки';
export type Product = {id:string;name:string;category:Exclude<Category,'Все'>;price:number;description:string;composition:string;sizes:string[];colors:{name:string;hex:string}[];images:string[];featured?:boolean};
export type CartItem = {product:Product;size:string;color:string;quantity:number};
