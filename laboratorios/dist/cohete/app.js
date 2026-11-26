import {rocket,analytic,rocketDefaults as base} from '../core.js';
import {f,table,chart} from '../ui.js';
const $=s=>document.querySelector(s);
const fields=[['m','Masa (kg)'],['thrust','Empuje (N)'],['g','Gravedad (m/s²)'],['c','Resistencia (kg/s)'],['v0','Velocidad inicial (m/s)'],['z0','Altura inicial (m)'],['end','Tiempo final (s)'],['h','Paso h (s)']];
$('#inputs').innerHTML=fields.map(([k,title])=>`<label>${title}<input type="number" step="any" id="${k}" value="${base[k]}"></label>`).join('');
let current=[];
function read(){return Object.fromEntries(fields.map(([k])=>[k,$('#'+k).value.trim()===''?NaN:Number($('#'+k).value)]));}
function update(){
 try{
 const p=read(),euler=rocket(p),heun=rocket(p,'heun'),rk=rocket(p,'rk4'),last=euler.at(-1),exact=analytic(p,p.end);current=euler;
 $('#status').textContent='Cálculo actualizado.';$('#status').className='pass';
 $('#stats').innerHTML=[[f(last.v)+' m/s','Velocidad final · Euler'],[f(last.z)+' m','Altura final · Euler'],[f(last.errorZ)+' m','Error absoluto de altura']].map(([v,l])=>`<div class="stat"><strong>${v}</strong><span>${l}</span></div>`).join('');
 const series=[{name:'Euler',data:euler},{name:'Heun',data:heun},{name:'RK4',data:rk}];
 for(const [id,attr,exactattr,label] of [['speed','v','exactV','Velocidad (m/s)'],['height','z','exactZ','Altura (m)']])$('#'+id).innerHTML=chart([...series.map(s=>({name:s.name,points:s.data.map(r=>[r.t,r[attr]])})),{name:'Analítica',points:euler.map(r=>[r.t,r[exactattr]])}],{xLabel:'Tiempo (s)',yLabel:label});
 $('#methods').innerHTML=table(['Método','Velocidad (m/s)','Altura (m)','Error v (m/s)','Error z (m)'],[...series.map(s=>{const r=s.data.at(-1);return[s.name,f(r.v),f(r.z),f(r.errorV),f(r.errorZ)];}),['Analítica',f(exact[0]),f(exact[1]),'0','0']]);
 const steps=[2,1,.5,.25].map(h=>{try{const r=rocket({...p,h}).at(-1);return[h,f(r.v),f(r.errorV),f(r.z),f(r.errorZ)];}catch{return[h,'Excede 4000 pasos','—','—','—'];}});
 $('#steps').innerHTML=table(['Paso (s)','v final','Error v','z final','Error z'],steps);
 $('#stepConclusion').textContent='Con los datos base, disminuir el paso reduce ambos errores. Los resultados de esta tabla usan tus parámetros actuales y los pasos de 2, 1, 0,5 y 0,25 segundos.';
 $('#iterations').innerHTML=table(['t (s)','Euler v','Analítica v','Error v','Euler z','Analítica z','Error z'],euler.map(r=>[f(r.t,3),f(r.v),f(r.exactV),f(r.errorV),f(r.z),f(r.exactZ),f(r.errorZ)]));
 }catch(e){$('#status').className='error';$('#status').textContent=e.message;current=[];for(const id of ['stats','speed','height','methods','steps','iterations'])$('#'+id).innerHTML='';}
}
let timer;$('#inputs').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,200);});
$('#base').onclick=()=>{fields.forEach(([k])=>$('#'+k).value=base[k]);update();};
$('#csv').onclick=()=>{if(!current.length)return;const text=['t_s,v_euler_m_s,z_euler_m,v_analitica_m_s,z_analitica_m,error_v,error_z',...current.map(r=>[r.t,r.v,r.z,r.exactV,r.exactZ,r.errorV,r.errorZ].join(','))].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='cohete_euler.csv';a.click();URL.revokeObjectURL(url);};
const checks=[];const test=(name,fn)=>{try{checks.push([name,fn()?'Correcto':'Fallo']);}catch{checks.push([name,'Fallo']);}};
test('Euler base: z(20) = 574,7272007 m',()=>Math.abs(rocket(base).at(-1).z-574.7272006656)<1e-7);
test('Analítica: v(20) ≈ 44,8761 m/s',()=>Math.abs(analytic(base,20)[0]-44.8761)<.0001);
test('Último paso parcial llega a 20 s',()=>Math.abs(rocket({...base,h:.3}).at(-1).t-20)<1e-10);
test('c = 0: solución analítica sin división por cero',()=>Math.abs(analytic({...base,c:0},20)[1]-1038)<1e-8);
test('Paso menor reduce error de altura en el caso base',()=>rocket({...base,h:1}).at(-1).errorZ<rocket(base).at(-1).errorZ);
$('#qa').innerHTML=table(['Prueba ejecutada','Resultado'],checks);update();
