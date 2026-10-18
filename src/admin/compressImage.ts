export async function createWebpVariants(file:File):Promise<{full:Blob;thumbnail:Blob}>{
 const bitmap=await createImageBitmap(file)
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')
 if(!ctx){bitmap.close();throw new Error('Image processing is unavailable in this browser.')}
 const blob=(width:number,quality:number)=>new Promise<Blob>((resolve,reject)=>{const scale=Math.min(1,width/bitmap.width);canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);canvas.toBlob(result=>result?resolve(result):reject(new Error('Could not compress this image.')),'image/webp',quality)})
 try{const [full,thumbnail]=await Promise.all([blob(1600,.82),blob(480,.78)]);return {full,thumbnail}}finally{bitmap.close()}
}
