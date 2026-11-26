export const f=(x,d=6)=>x==null?'No definido':!Number.isFinite(x)?'∞':Math.abs(x)!==0&&(Math.abs(x)<1e-4||Math.abs(x)>1e7)?x.toExponential(4):Number(x).toLocaleString('es-BO',{maximumFractionDigits:d});
export const vector=x=>'['+x.map(v=>f(v,6)).join('; ')+']';
export function table(head,rows){return `<div class="table-wrap"><table><thead><tr>${head.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
export function chart(series,{xLabel='Iteración',yLabel='Residuo relativo',log=false}={}){
 const W=800,H=330,L=76,R=24,T=24,B=54,colors=['#82dfc8','#ffc982','#a0bfff','#ef9ed0'];
 let vals=series.flatMap(s=>s.points.map(p=>p[1])).filter(Number.isFinite);if(!vals.length)return'';
 const convert=y=>log?Math.log10(Math.max(1e-16,y)):y;
 let ymin=Math.min(...vals.map(convert)),ymax=Math.max(...vals.map(convert));if(ymin===ymax)ymax=ymin+1;
 let xmax=Math.max(1,...series.flatMap(s=>s.points.map(p=>p[0])));
 const xx=x=>L+x/xmax*(W-L-R),yy=y=>H-B-(convert(y)-ymin)/(ymax-ymin)*(H-T-B);
 let svg=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${yLabel} frente a ${xLabel}">`;
 for(let i=0;i<5;i++){const v=ymin+(ymax-ymin)*i/4,y=H-B-i/4*(H-T-B);svg+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#2d415b"/><text x="${L-9}" y="${y+5}" text-anchor="end" fill="#bdcad8">${log?'10^'+v.toFixed(1):f(v,2)}</text>`;}
 svg+=`<text x="${W/2}" y="${H-8}" text-anchor="middle" fill="#c5d3e2">${xLabel} (0 a ${f(xmax,2)})</text>`;
 series.forEach((s,i)=>{svg+=`<polyline fill="none" stroke="${colors[i]}" stroke-width="2.5" points="${s.points.filter(p=>Number.isFinite(p[1])).map(p=>xx(p[0])+','+yy(p[1])).join(' ')}"/>`;});
 svg+='</svg><div class="small">'+series.map((s,i)=>`<span style="color:${colors[i]}">${s.name}</span>`).join(' &nbsp; · &nbsp; ')+'</div>';return svg;
}
