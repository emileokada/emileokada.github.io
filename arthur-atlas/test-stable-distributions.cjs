// Run with node arthur-atlas/test-stable-distributions.cjs.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'atlas.js'),'utf8');
const helpers=source.slice(source.indexOf('function centralPhaseSign('),source.indexOf('function render(){'));
const {kottwitzSign,stableTerms,packetSum}=new Function('escapeText',helpers+';return {kottwitzSign,stableTerms,packetSum};')(String);
const read=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const group=name=>read(path.join(__dirname,name,'group.json.gz'));
// Independent classical checks: PGL_N inner forms have e=(-1)^(N-N/d),
// where d is the order of their central character.
const gcd=(a,b)=>b?gcd(b,a%b):a;
for(let n=1;n<=8;n++){
 const g=group('A'+n),N=n+1;
 for(const s of g.series_sources){const [a,b=1]=s.ambient_central_character[0].split('/').map(Number),d=b/gcd(a,b);assert.equal(kottwitzSign(g,s),(-1)**(N-N/d));}
}
// Spin and symplectic principal-involution evaluations, including low-rank
// B2=C2 and D3=A3 compatibility. E6 has odd-order centre, hence sign +1.
const expected={B2:[1,-1],B3:[1,1],B5:[1,1,-1],C3:[1,-1,-1],C4:[1,-1,-1],C6:[1,-1,-1,1],C7:[1,-1,-1,1],D4:[1,1,1,1],D5:[1,1,1,1,1,1],D6:[1,1,-1,-1],D7:[1,1,-1,-1,-1,-1],E6:[1,1,1,1,1],E7:[1,-1,-1],E8:[1,1],F4:[1,1],G2:[1,1]};
for(const [name,signs]of Object.entries(expected)){const g=group(name);assert.deepEqual(g.series_sources.map(s=>kottwitzSign(g,s)),signs,name);}
let cases=0,packets=0,terms=0,negative=0;
for(const name of fs.readdirSync(__dirname).filter(n=>/^[A-G]\d+$/.test(n))){
 const g=group(name);
 for(const s of g.series_sources)assert([1,-1].includes(kottwitzSign(g,s)));
 for(const file of fs.readdirSync(path.join(__dirname,name)).filter(n=>/^orbit-\d+\.json\.gz$/.test(n))){
  const c=read(path.join(__dirname,name,file)).case_data;
  const params=new Map(c.parameters.map(p=>[p.ic,p]));
  const sign=p=>kottwitzSign(g,g.series_sources.find(s=>s.series===p.series));
  // Fourier preserves the central character and hence the inner-form sign.
  for(const p of c.parameters)assert.equal(sign(p),sign(params.get(p.fourier)));
  for(const packet of c.arthur_packets){
   const result=stableTerms(g,c,packet);assert.equal(result.length,packet.members.length);
   result.forEach((t,i)=>{assert.equal(Math.abs(t.coefficient),packet.members[i].multiplicity);assert.equal(t.ic,packet.members[i].ic);terms++;if(t.coefficient<0)negative++;
    if(params.get(t.ic).orbit===packet.arthur_orbit)assert.equal(Math.sign(t.coefficient),sign(params.get(t.ic)));
   });
   const html=packetSum(g,c,packet);assert(!/NaN|undefined/.test(html));packets++;
  }
  cases++;
 }
}
// Explicit dimension-parity example with mixed signs and coefficient >1.
const g=group('F4'),c={orbits:[{id:1,dimension:0},{id:2,dimension:1}],parameters:[{ic:1,orbit:1,series:1},{ic:2,orbit:2,series:1}]},p={arthur_orbit:1,members:[{ic:1,multiplicity:1},{ic:2,multiplicity:3}]};
assert.deepEqual(stableTerms(g,c,p),[{ic:1,coefficient:1},{ic:2,coefficient:-3}]);
assert(packetSum(g,c,p).includes('− 3Θ<sub>2</sub>'));
assert.throws(()=>stableTerms(g,c,{...p,members:[{ic:999,multiplicity:1}]}));
console.log(`Validated ${cases} cases, ${packets} distributions, ${terms} terms (${negative} negative).`);
