export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const norm=a=>Math.hypot(...a);
export const mv=(A,x)=>A.map(r=>dot(r,x));
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const eye=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
export function cholesky(A){
 const n=A.length;if(n<4||A.some(r=>r.length!==n||r.some(x=>!Number.isFinite(x))))throw Error('Se requiere una matriz cuadrada finita de orden al menos 4.');
 const scale=Math.max(1,...A.flat().map(Math.abs));
 for(let i=0;i<n;i++)for(let j=0;j<i;j++)if(Math.abs(A[i][j]-A[j][i])>1e-11*scale)throw Error('La matriz no es simétrica.');
 const L=A.map(()=>Array(n).fill(0));
 for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let v=A[i][j];for(let k=0;k<j;k++)v-=L[i][k]*L[j][k];if(i===j){if(!(v>0))throw Error('La matriz no es definida positiva (falló Cholesky).');L[i][j]=Math.sqrt(v);}else L[i][j]=v/L[j][j];}
 return L;
}
export function solveChol(L,b){const n=L.length,y=Array(n),x=Array(n);for(let i=0;i<n;i++){let s=b[i];for(let j=0;j<i;j++)s-=L[i][j]*y[j];y[i]=s/L[i][i];}for(let i=n-1;i>=0;i--){let s=y[i];for(let j=i+1;j<n;j++)s-=L[j][i]*x[j];x[i]=s/L[i][i];}return x;}
export function eigenSym(A){
 const B=A.map(r=>r.slice()),n=B.length;
 for(let step=0;step<150*n*n;step++){
  let p=0,q=1,big=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(B[i][j])>big){big=Math.abs(B[i][j]);p=i;q=j;}
  if(big<1e-14*Math.max(1,...B.map((r,i)=>Math.abs(r[i]))))break;
  const angle=.5*Math.atan2(2*B[p][q],B[q][q]-B[p][p]),c=Math.cos(angle),s=Math.sin(angle);
  const app=B[p][p],aqq=B[q][q],apq=B[p][q];
  for(let k=0;k<n;k++)if(k!==p&&k!==q){const a=B[k][p],b=B[k][q];B[k][p]=B[p][k]=c*a-s*b;B[k][q]=B[q][k]=s*a+c*b;}
  B[p][p]=c*c*app-2*s*c*apq+s*s*aqq;B[q][q]=s*s*app+2*s*c*apq+c*c*aqq;B[p][q]=B[q][p]=0;
 }
 return B.map((r,i)=>r[i]).sort((a,b)=>a-b);
}
export function condition2(A,spd=false){
 const n=A.length;let ev;
 if(spd){ev=eigenSym(A);return ev.at(-1)/ev[0];}
 const AtA=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>A.reduce((s,r)=>s+r[i]*r[j],0)));
 ev=eigenSym(AtA);return ev[0]>0?Math.sqrt(ev.at(-1)/ev[0]):Infinity;
}
export function cg(A,b,{x0=b.map(()=>0),tol=1e-6,maxIter=100,preconditioner='jacobi'}={}){
 let x=x0.slice(),r=sub(b,mv(A,x)),denom=norm(b)||1;
 const apply=v=>v.map((s,i)=>preconditioner==='jacobi'?s/A[i][i]:s);
 let z=apply(r),p=z.slice(),rz=dot(r,z),history=[norm(r)/denom];
 if(history[0]<tol)return{x,iterations:0,residual:history[0],history,converged:true};
 for(let k=1;k<=maxIter;k++){
  const ap=mv(A,p),pap=dot(p,ap);if(!(pap>0)||!Number.isFinite(pap))return{x,iterations:k-1,residual:history.at(-1),history,converged:false};
  const alpha=rz/pap;x=x.map((v,i)=>v+alpha*p[i]);r=r.map((v,i)=>v-alpha*ap[i]);
  const actual=norm(sub(b,mv(A,x)))/denom;history.push(actual);
  if(actual<tol)return{x,iterations:k,residual:actual,history,converged:true};
  z=apply(r);const rzNew=dot(r,z),beta=rzNew/rz;p=z.map((v,i)=>v+beta*p[i]);rz=rzNew;
 }
 return{x,iterations:maxIter,residual:history.at(-1),history,converged:false};
}
export const units=['Infraestructura','Desarrollo','Operaciones','Seguridad'];
export function scenario(name='ideal'){
 const q=name==='estres'?[4.8,6,7.2,8.4]:name==='mal'?[.001,.1,10,1000]:[4,5,6,7];
 const target=name==='estres'?[60,44,33,28]:[50,40,30,20];
 const w=name==='mal'?.001:name==='estres'?.6:.4;
 const edges=[[0,1],[1,2],[2,3],[3,0]];
 const A=q.map((v,i)=>q.map((_,j)=>i===j?v:0));
 edges.forEach(([i,j])=>{A[i][i]+=w;A[j][j]+=w;A[i][j]-=w;A[j][i]-=w;});
 return {A,b:q.map((v,i)=>v*target[i]),q,target,w};
}
export function financial(A,b,options={}){
 if(b.length!==A.length||b.some(x=>!Number.isFinite(x)))throw Error('El vector b debe contener números finitos.');
 if(!options.x0||options.x0.length!==b.length||options.x0.some(x=>!Number.isFinite(x)))options={...options,x0:b.map(()=>0)};
 if(!(options.tol>0&&options.tol<1)||!Number.isInteger(options.maxIter)||options.maxIter<1||options.maxIter>2000)throw Error('Tolerancia entre 0 y 1; máximo de iteraciones entero entre 1 y 2000.');
 const L=cholesky(A),reference=solveChol(L,b),pcg=cg(A,b,options),plain=cg(A,b,{...options,preconditioner:'none'});
 const B=A.map((r,i)=>r.map(v=>options.preconditioner==='none'?v:v/A[i][i]));
 const errors=reference.map((v,i)=>{const abs=Math.abs(v-pcg.x[i]);return{abs,relative:v===0?null:abs/Math.abs(v),percent:v===0?null:100*abs/Math.abs(v)};});
 const minors=L.map((_,i)=>L.slice(0,i+1).reduce((s,r,k)=>s*r[k]*r[k],1));
 return{L,reference,pcg,plain,errors,minors,condition:condition2(A,true),preCondition:condition2(B),eigen:eigenSym(A)};
}
export const rocketDefaults={m:1000,thrust:15000,g:9.81,c:100,v0:0,z0:0,end:20,h:2};
export function analytic(p,t){
 const a=p.thrust/p.m-p.g,k=p.c/p.m;
 if(k===0)return[p.v0+a*t,p.z0+p.v0*t+.5*a*t*t];
 const vi=a/k,E=Math.exp(-k*t);return[vi+(p.v0-vi)*E,p.z0+vi*t+(p.v0-vi)*(-Math.expm1(-k*t))/k];
}
export function rocket(p,method='euler'){
 if(Object.values(p).some(x=>!Number.isFinite(x))||!(p.m>0)||p.c<0||p.g<0||p.end<=0||p.h<=0||Math.ceil(p.end/p.h)>4000)throw Error('Revisa los datos: masa, tiempo y paso positivos; gravedad y resistencia no negativas; máximo 4000 pasos.');
 let t=0,y=[p.v0,p.z0];const rows=[];
 const rhs=y=>[p.thrust/p.m-p.g-p.c/p.m*y[0],y[0]];
 const add=(a,b,s)=>a.map((v,i)=>v+s*b[i]);
 function record(){const exact=analytic(p,t);rows.push({t,v:y[0],z:y[1],exactV:exact[0],exactZ:exact[1],errorV:Math.abs(y[0]-exact[0]),errorZ:Math.abs(y[1]-exact[1])});}
 record();
 while(t<p.end-1e-12){const dt=Math.min(p.h,p.end-t),k1=rhs(y);
  if(method==='heun'){const k2=rhs(add(y,k1,dt));y=y.map((v,i)=>v+dt/2*(k1[i]+k2[i]));}
  else if(method==='rk4'){const k2=rhs(add(y,k1,dt/2)),k3=rhs(add(y,k2,dt/2)),k4=rhs(add(y,k3,dt));y=y.map((v,i)=>v+dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]));}
  else y=add(y,k1,dt);
  t+=dt;record();
 }
 return rows;
}
