export function rowLabel(n) { let s=''; for(n++;n;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
export const unitMm={mm:1,cm:10,inch:25.4};
export function geometry({rows,cols,paper,orientation,overlap,mode,posterSize},iw,ih) {
 let [pw,ph]=paper==='a4'?[210,297]:[215.9,279.4];
 if(orientation==='landscape') [pw,ph]=[ph,pw];
 const margin=10,maxW=pw-2*margin,maxH=ph-2*margin;
 let w=maxW,h=maxH,width,height;
 if(posterSize){
  ({width,height}=posterSize);
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw new Error('Enter a width and height of at least 1 mm.');
  cols=Math.max(1,Math.ceil((width-overlap)/(maxW-overlap)-1e-10));
  rows=Math.max(1,Math.ceil((height-overlap)/(maxH-overlap)-1e-10));
  if(rows>20||cols>20)throw new Error('This size needs more than 20 rows or columns. Choose a smaller poster size.');
  w=(width+(cols-1)*overlap)/cols;
  h=(height+(rows-1)*overlap)/rows;
 }else{
  width=cols*(w-overlap)+overlap;height=rows*(h-overlap)+overlap;
 }
 const sx=w-overlap,sy=h-overlap;
 const scale=(mode==='fit'?Math.min:Math.max)(width/iw,height/ih);
 return {pw,ph,margin,w,h,sx,sy,width,height,rows,cols,image:{x:(width-iw*scale)/2,y:(height-ih*scale)/2,w:iw*scale,h:ih*scale},tiles:Array.from({length:rows*cols},(_,i)=>{const r=Math.floor(i/cols),c=i%cols;return {r,c,x:c*sx,y:r*sy,w,h,label:rowLabel(r)+(c+1)};})};
}
