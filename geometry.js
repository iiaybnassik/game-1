export function rowLabel(n) { let s=''; for(n++;n;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
export function geometry({rows,cols,paper,orientation,overlap,mode},iw,ih) {
 let [pw,ph]=paper==='a4'?[210,297]:[215.9,279.4];
 if(orientation==='landscape') [pw,ph]=[ph,pw];
 const margin=10,w=pw-2*margin,h=ph-2*margin,sx=w-overlap,sy=h-overlap;
 const width=cols*sx+overlap,height=rows*sy+overlap;
 const scale=(mode==='fit'?Math.min:Math.max)(width/iw,height/ih);
 return {pw,ph,margin,w,h,sx,sy,width,height,image:{x:(width-iw*scale)/2,y:(height-ih*scale)/2,w:iw*scale,h:ih*scale},tiles:Array.from({length:rows*cols},(_,i)=>{const r=Math.floor(i/cols),c=i%cols;return {r,c,x:c*sx,y:r*sy,w,h,label:rowLabel(r)+(c+1)};})};
}
