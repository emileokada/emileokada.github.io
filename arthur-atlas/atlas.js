
(async function () {
  const status = document.getElementById('loading');
  try {
    async function readData(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to download ' + url);
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    }
    const index = Number(document.body.dataset.orbitIndex);
    const [group, payload] = await Promise.all([
      readData('group.json.gz'), readData('orbit-' + index + '.json.gz')
    ]);
    if (payload.format !== 'arthur-atlas.compact.v1') throw new Error('Unsupported orbit format');
    const current = payload.case_data;
    for (const [alias, canonical] of Object.entries(payload.aliases)) current[alias] = current[canonical];
    const data = {...group, cases: [current], orbit_index: index};


const escapeText=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const orbitLabel=x=>String(x).replace(/\\+tilde\s*A/g,'Ã').replace(/\{\+\}/g,' + ').replace(/_(\d)/g,(_,d)=>'₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
const series=id=>data.series_sources.find(s=>s.series===id)?.display_label||String(id);
function polynomial(p){return p.length?p.slice().sort((a,b)=>b[0]-a[0]).map(([e,c])=>e===0?escapeText(c):(String(c)==='1'?'':escapeText(c))+'<i>q</i>'+(e===1?'':'<sup>'+escapeText(e)+'</sup>')).join(' + '):'<span class="zero">0</span>';}
function table(head,rows,cls=''){return '<div class="scroll"><table class="'+cls+'"><thead><tr>'+head.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
function diagram(c){const dims=[...new Set(c.orbits.map(o=>o.dimension))].sort((a,b)=>a-b);const pos={};dims.forEach((d,k)=>{const os=c.orbits.filter(o=>o.dimension===d);os.forEach((o,i)=>pos[o.id]=[300*(i+1)/(os.length+1),360-k*330/Math.max(1,dims.length-1)]);});let s='<svg class="diagram" viewBox="0 0 300 395" role="img" aria-label="Closure diagram; larger orbit dimensions are above smaller dimensions"><title>Closure relations for the selected grading</title>';for(const [a,b]of c.covers){const p=pos[a],q=pos[b];if(p&&q)s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="currentColor" stroke-width="1"/>`;}for(const o of c.orbits){const[x,y]=pos[o.id];s+=`<circle cx="${x}" cy="${y}" r="4" fill="currentColor"/><text x="${x+10}" y="${y+5}" font-size="15" font-family="Georgia">O${o.id}</text>`;}return s+'</svg>';}
function orbitSystems(c,o){return o.ic_parameters.map(id=>{const b=c.kl.find(b=>b.ic_ids.includes(id));const ls=b?.local_systems[b.ic_ids.indexOf(id)];const param=c.parameters.find(p=>p.ic===id);return 'IC '+id+': '+escapeText(ls?.character||param?.chevie_name||'not recorded')+' (rank '+escapeText(ls?.rank??param?.rank??'?')+')';}).join('<br>');}
function orbitFourier(c,o){
 const images=new Map(c.ft.map(f=>[f.ic,f.image]));
 return o.ic_parameters.map(id=>{
  const target=images.get(id),p=c.parameters.find(p=>p.ic===target);
  if(!p)return 'not available';
  return 'IC '+target;
 }).join('<br>');
}
function render(){const c=data.cases[0];document.getElementById('grading-title').textContent='Orbit '+orbitLabel(c.ambient_orbit);document.getElementById('neutral').textContent='h = ('+c.neutral_element.join(', ')+')';let html='<p class="meta">'+c.orbits.length+' graded orbits · '+c.parameters.length+' IC parameters · '+c.kl.length+' KL blocks</p><h3>Orbits and local systems</h3>'+table(['Orbit','Dimension','Ambient saturation','Component group','Local systems','Fourier image'],c.orbits.map(o=>['O'+o.id,o.dimension,escapeText(orbitLabel(o.saturation.name)),escapeText(o.component_group||(o.group_order===1?'1 (trivial)':'not recorded')),orbitSystems(c,o),orbitFourier(c,o)]));html+='<section id="polynomials"><h3>Kazhdan–Lusztig polynomials</h3><p class="note">Rows and columns are labelled by IC parameter. Each cuspidal series is displayed separately.</p>';html+='</section><div class="dual"><section><h3>Closure order</h3>'+diagram(c)+'<p class="note">Edges reproduce the exported covering relations. Orbit dimension increases upwards.</p></section></div><h3>Arthur packets</h3>'+table(['Arthur orbit','Dual orbit','Members (IC : multiplicity)'],(c.arthur_packets||[]).map(p=>['O'+p.arthur_orbit,'O'+p.dual_arthur_orbit,p.members.map(m=>m.ic+' : '+m.multiplicity).join(', ')]))+'';document.getElementById('case-content').innerHTML=html;document.getElementById('verified').textContent=String(c.recipe.verify);document.getElementById('checksum').textContent=c.sha256;}
document.getElementById('grading').innerHTML=data.orbit_navigation.map((c,i)=>'<option value="'+i+'">'+escapeText(orbitLabel(c.ambient_orbit))+'</option>').join('');document.getElementById('grading').value=String(data.orbit_index);document.getElementById('grading').addEventListener('change',render);render();

function packetModel(c,packet,subset){
 const params=new Map(c.parameters.map(p=>[p.ic,p])),groups=new Map();
 for(const m of packet.members){const p=params.get(m.ic);if(!p)throw Error('Missing packet parameter '+m.ic);const orbit=packet.constituent?m.arthur_orbit:p.orbit;if(!groups.has(orbit))groups.set(orbit,[]);groups.get(orbit).push({...m,parameter:p});}
 const all=c.orbits.map(o=>o.id),reach=new Map(all.map(i=>[i,new Set()]));
 for(const[a,b]of c.covers)reach.get(a).add(b);
 for(const k of all)for(const i of all)if(reach.get(i).has(k))for(const j of reach.get(k))reach.get(i).add(j);
 const ids=subset?all.filter(i=>groups.has(i)):all;
 const edges=subset?ids.flatMap(i=>ids.filter(j=>i!==j&&reach.get(i).has(j)&&!ids.some(k=>k!==i&&k!==j&&reach.get(i).has(k)&&reach.get(k).has(j))).map(j=>[i,j])):c.covers;
 const levels=new Map();function level(i,vis=new Set()){if(levels.has(i))return levels.get(i);if(vis.has(i))throw Error('Cyclic closure');vis.add(i);const n=Math.max(0,...edges.filter(e=>e[1]===i).map(e=>1+level(e[0],new Set(vis))));levels.set(i,n);return n;}ids.forEach(i=>level(i));
 return {ids,edges,groups,levels};
}
function packetDiagram(c,packet,subset){
 const model=packetModel(c,packet,subset),{ids,edges,groups,levels}=model;
 const layers=[];for(const i of ids){const l=levels.get(i);(layers[l]??=[]).push(i);}
 for(let sweep=0;sweep<8;sweep++){const order=[...layers.keys()];if(sweep%2)order.reverse();for(const l of order){const loc=new Map(layers.flatMap(row=>row.map((id,j)=>[id,(j+.5)/row.length])));const score=i=>{const ns=edges.filter(e=>e[sweep%2?0:1]===i).map(e=>e[sweep%2?1:0]);return ns.length?ns.reduce((s,j)=>s+loc.get(j),0)/ns.length:loc.get(i);};layers[l].sort((a,b)=>score(a)-score(b)||a-b);}}
 const label=m=>{const p=m.parameter;const block=c.kl.find(b=>b.ic_ids.includes(m.ic));const index=block?.ic_ids.indexOf(m.ic);const character=block?.local_systems[index]?.character||p.chevie_name||'unlabelled';return packet.constituent?'IC '+m.ic+' · multiplicity '+m.multiplicity:'IC '+m.ic+' · '+series(p.series)+' / '+character+' · m='+m.multiplicity;};
 const sizes=new Map(ids.map(id=>{const members=groups.get(id)||[];return [id,{w:members.length?Math.max(170,...members.map(m=>label(m).length*6.9+30)):58,h:members.length?38+22*members.length:30}];}));
 const rowWidth=row=>row.reduce((sum,id)=>sum+sizes.get(id).w,0)+24*Math.max(0,row.length-1);
 const width=Math.max(360,...layers.map(row=>rowWidth(row)+40));const pos=new Map();let cursor=22;
 for(let l=layers.length-1;l>=0;l--){const row=layers[l],height=Math.max(...row.map(id=>sizes.get(id).h));let x=(width-rowWidth(row))/2;for(const id of row){const size=sizes.get(id);pos.set(id,{x:x+size.w/2,y:cursor+(height-size.h)/2,...size});x+=size.w+24;}cursor+=height+38;}
 let svg=`<svg viewBox="0 0 ${width} ${cursor}" width="${width}" height="${cursor}" role="img" aria-label="${packet.constituent?'Packets containing IC '+packet.constituent:'Arthur packet for orbit O'+packet.arthur_orbit}, ${subset?'restricted closure order':'full closure order'}"><title>${packet.constituent?'Arthur packets containing IC '+packet.constituent:'Packet support'} on ${groups.size} orbits</title>`;
 for(const[a,b]of edges){const p=pos.get(a),q=pos.get(b);const direct=c.covers.some(e=>e[0]===a&&e[1]===b);svg+=`<line data-packet-edge="${a},${b}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y+q.h}" stroke="#a5afb6" stroke-width="1.2" ${direct?'':'stroke-dasharray="4 4"'}/>`;}
 for(const i of ids){const p=pos.get(i),members=groups.get(i)||[],active=members.length>0,source=!packet.constituent&&i===packet.arthur_orbit,o=c.orbits.find(o=>o.id===i);svg+=`<g data-packet-orbit="${i}" data-active="${active}" opacity="${packet.constituent&&!active?.4:1}"><title>O${i} · dimension ${o.dimension} · ${escapeText(orbitLabel(o.saturation.name))}</title><rect x="${p.x-p.w/2}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${active?8:15}" fill="${active?'#f1f6fa':'#fafbf9'}" stroke="${source?'#294d70':active?'#8fa7b8':'#c7ced1'}" stroke-width="${source?2:1}"/><text x="${p.x}" y="${p.y+20}" text-anchor="middle" font-family="Georgia" font-size="14" fill="#253f50">O${i}${packet.constituent&&active?' · packet':source?' · Arthur':''}${active?' · dim '+o.dimension:''}</text>`;if(active)svg+=`<line x1="${p.x-p.w/2+10}" y1="${p.y+28}" x2="${p.x+p.w/2-10}" y2="${p.y+28}" stroke="#d9e3ea"/>`;members.forEach((m,j)=>svg+=`<text x="${p.x}" y="${p.y+47+j*22}" text-anchor="middle" font-family="Georgia" font-size="13" fill="#294d70">${escapeText(label(m))}</text>`);svg+='</g>';}
 return svg+'</svg>';
}
// Invert packet membership without downloading or changing the exported data.
function constituentPackets(c){
 const memberships=new Map();
 for(const packet of c.arthur_packets)for(const member of packet.members){
  if(!memberships.has(member.ic))memberships.set(member.ic,[]);
  memberships.get(member.ic).push({...member,arthur_orbit:packet.arthur_orbit});
 }
 return memberships;
}
function constituentLabel(c,ic){
 const p=c.parameters.find(p=>p.ic===ic),b=c.kl.find(b=>b.ic_ids.includes(ic));
 const character=b?.local_systems?.[b.ic_ids.indexOf(ic)]?.character||p?.chevie_name||'unlabelled';
 return 'IC '+ic+' · O'+p.orbit+' · '+character+' · '+series(p.series);
}
const explorerChoices={packet:'0',ic:null};
function populateExplorer(){
 const c=data.cases[0],mode=document.getElementById('packet-explore').value;
 const choice=document.getElementById('packet-choice');
 document.getElementById('packet-choice-label').textContent=mode==='ic'?'IC constituent':'Packet';
 choice.innerHTML=mode==='ic'?[...constituentPackets(c).keys()].sort((a,b)=>a-b).map(ic=>'<option value="'+ic+'">'+escapeText(constituentLabel(c,ic))+'</option>').join(''):c.arthur_packets.map((p,i)=>'<option value="'+i+'">Arthur orbit O'+p.arthur_orbit+' · dual O'+p.dual_arthur_orbit+'</option>').join('');
 if([...choice.options].some(o=>o.value===explorerChoices[mode]))choice.value=explorerChoices[mode];
 document.getElementById('packet-help').textContent=mode==='ic'?'Highlighted orbits index packets containing this IC. Multiplicity is shown for each packet. Packet support only shows those Arthur orbits.':'Each node lists the selected packet’s IC constituents, their series, local-system character, and multiplicity m.';
 showPacket();
}
function showPacket(){
 const c=data.cases[0],mode=document.getElementById('packet-explore').value;
 const choice=document.getElementById('packet-choice').value,subset=document.getElementById('packet-mode').value==='subset';
 explorerChoices[mode]=choice;
 const packet=mode==='ic'?{constituent:Number(choice),members:constituentPackets(c).get(Number(choice))||[]}:c.arthur_packets[Number(choice)];
 if(!packet)return;
 const model=packetModel(c,packet,subset);
 document.getElementById('packet-graphic').innerHTML=packetDiagram(c,packet,subset);
 const explanation=subset?'Covering relations in the restricted closure order. Dashed edges pass through omitted orbits.':'All original covering relations are retained.';
 document.getElementById('packet-caption').textContent=mode==='ic'?'IC '+choice+' occurs in '+model.groups.size+' Arthur packet'+(model.groups.size===1?'':'s')+'. '+explanation:'Arthur orbit O'+packet.arthur_orbit+'; dual orbit O'+packet.dual_arthur_orbit+'. '+packet.members.length+' IC constituents supported on '+model.groups.size+' orbits. '+explanation;
}
const renderBase=render;
render=function(){
 renderBase();const c=data.cases[0];if(!c.arthur_packets?.length)return;
 const section=document.createElement('section');section.id='packet-diagrams';
 section.innerHTML='<h3>Arthur packets on the closure order</h3><div class="selection packet-selectors"><div><label for="packet-explore">Explore by</label><select id="packet-explore"><option value="packet">Arthur packet</option><option value="ic">IC constituent</option></select></div><div><label id="packet-choice-label" for="packet-choice">Packet</label><select id="packet-choice" aria-describedby="packet-help"></select></div><div><label for="packet-mode">View</label><select id="packet-mode"><option value="subset">Packet support only</option><option value="full">Full Hasse diagram</option></select></div></div><p id="packet-help" class="note"></p><div id="packet-graphic" class="scroll" tabindex="0" role="region" aria-label="Scrollable packet Hasse diagram"></div><p id="packet-caption" class="note" aria-live="polite"></p>';
 document.getElementById('case-content').prepend(section);
 document.getElementById('packet-explore').addEventListener('change',populateExplorer);
 document.getElementById('packet-choice').addEventListener('change',()=>showPacket());
 document.getElementById('packet-mode').addEventListener('change',()=>showPacket());
 populateExplorer();
};
document.getElementById('grading').removeEventListener('change',renderBase);document.getElementById('grading').addEventListener('change',render);render();

const activeCase=()=>data.cases[0];
function drawMatrix(){const b=activeCase().kl[Number(document.getElementById('matrix-block').value)];let h='<table class="matrix"><thead><tr><th scope="col">IC</th>'+b.ic_ids.map(id=>'<th scope="col">'+id+'</th>').join('')+'</tr></thead><tbody>';for(let i=0;i<b.ic_ids.length;i++){h+='<tr><th scope="row">'+b.ic_ids[i]+'</th>';for(let j=0;j<b.ic_ids.length;j++)h+='<td><button class="matrix-cell" type="button" data-row="'+i+'" data-col="'+j+'" aria-label="Inspect row IC '+b.ic_ids[i]+', column IC '+b.ic_ids[j]+'">'+polynomial(b.q_matrix[i][j])+'</button></td>';h+='</tr>';}document.getElementById('matrix-window').innerHTML=h+'</tbody></table>';document.getElementById('matrix-range').textContent=b.ic_ids.length+' × '+b.ic_ids.length+' · Orientation: '+b.orientation+'. Scroll to explore the full matrix.';document.getElementById('matrix-entry').textContent='Select an entry to read its polynomial and parameter labels.';}
function setupMatrix(){document.getElementById('polynomials').innerHTML='<h3>Kazhdan–Lusztig polynomials</h3><div class="selection"><label for="matrix-block">Series / block</label><select id="matrix-block">'+activeCase().kl.map((b,i)=>'<option value="'+i+'">'+escapeText(series(b.series))+' · block '+b.block+' · '+b.ic_ids.length+' × '+b.ic_ids.length+'</option>').join('')+'</select></div><p id="matrix-range" class="note"></p><div id="matrix-window" class="matrix-viewport" tabindex="0" role="region" aria-label="Scrollable full KL matrix"></div><p id="matrix-entry" class="entry-detail" aria-live="polite"></p>';document.getElementById('matrix-block').addEventListener('change',drawMatrix);document.getElementById('matrix-window').addEventListener('click',e=>{const cell=e.target.closest('.matrix-cell');if(!cell)return;const b=activeCase().kl[Number(document.getElementById('matrix-block').value)],i=Number(cell.dataset.row),j=Number(cell.dataset.col);document.getElementById('matrix-entry').innerHTML='<strong>IC '+b.ic_ids[i]+' → IC '+b.ic_ids[j]+'</strong> · '+escapeText(b.labels[i])+' → '+escapeText(b.labels[j])+'<br>Polynomial: '+polynomial(b.q_matrix[i][j]);});drawMatrix();}
function addPanControls(toolbar,box,name){
 const controls=document.createElement('span');controls.setAttribute('role','group');controls.setAttribute('aria-label','Pan '+name);controls.style.cssText='display:inline-flex;gap:4px;align-items:center';
 const label=document.createElement('span');label.textContent='Pan';controls.appendChild(label);
 for(const[direction,arrow,dx,dy]of [['left','←',-1,0],['up','↑',0,-1],['down','↓',0,1],['right','→',1,0]]){
  const button=document.createElement('button');button.type='button';button.textContent=arrow;button.title='Pan '+direction;button.setAttribute('aria-label','Pan '+name+' '+direction);
  button.addEventListener('click',()=>box.scrollBy({left:dx*Math.max(80,box.clientWidth*.65),top:dy*Math.max(80,box.clientHeight*.65),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));controls.appendChild(button);
 }
 toolbar.appendChild(controls);
}
let diagramScale=1,diagramFit=false;
function scaleDiagram(fit=false){const box=document.getElementById('packet-graphic'),svg=box?.querySelector('svg');if(!svg)return;const v=svg.viewBox.baseVal;if(fit)diagramScale=Math.min(1,(box.clientWidth-24)/v.width);svg.setAttribute('width',v.width*diagramScale);svg.setAttribute('height',v.height*diagramScale);const indicator=document.getElementById('diagram-zoom-value');if(indicator)indicator.textContent=Math.round(diagramScale*100)+'%';}
const packetBeforeZoom=showPacket;
showPacket=function(){packetBeforeZoom();scaleDiagram(diagramFit);};
function setupDiagram(){const box=document.getElementById('packet-graphic');if(!box)return;box.classList.add('diagram-viewport');const tools=document.createElement('div');tools.className='matrix-tools';tools.innerHTML='<button id="diagram-fit" type="button">Fit to width</button><button id="diagram-readable" type="button">Readable size</button><button id="diagram-out" type="button" aria-label="Zoom out">−</button><span id="diagram-zoom-value" aria-live="polite">100%</span><button id="diagram-in" type="button" aria-label="Zoom in">+</button>';box.before(tools);addPanControls(tools,box,'packet diagram');const note=document.createElement('p');note.className='note';note.textContent='Use the pan arrows or scroll within the diagram to explore. Fit to width gives an overview; readable size restores full-size labels. The packet-only view removes unrelated orbits.';box.after(note);document.getElementById('diagram-fit').addEventListener('click',()=>{diagramFit=true;scaleDiagram(true);});document.getElementById('diagram-readable').addEventListener('click',()=>{diagramFit=false;diagramScale=1;scaleDiagram();});for(const[id,mult]of [['diagram-out',.8],['diagram-in',1.25]])document.getElementById(id).addEventListener('click',()=>{diagramFit=false;diagramScale=Math.max(.15,Math.min(2.5,diagramScale*mult));scaleDiagram();});scaleDiagram();}
const renderBeforeExplorer=render;
render=function(){renderBeforeExplorer();setupMatrix();setupDiagram();};
document.getElementById('grading').removeEventListener('change',renderBeforeExplorer);document.getElementById('grading').addEventListener('change',render);render();
window.addEventListener('resize',()=>{if(diagramFit)scaleDiagram(true);});

function setupClosure(){
 const old=document.querySelector('#case-content .diagram');if(!old)return;
 const c=activeCase();
 // Closure-only layout: compact orbit nodes on dimension rows.
 const dimensions=[...new Set(c.orbits.map(o=>o.dimension))].sort((a,b)=>b-a);
 const layers=dimensions.map(d=>c.orbits.filter(o=>o.dimension===d).map(o=>o.id));
 // Alternating neighbour sweeps reduce crossings while preserving dimension rows.
 for(let sweep=0;sweep<10;sweep++){
  const order=[...layers.keys()];if(sweep%2)order.reverse();
  for(const k of order){
   const positions=new Map(layers.flatMap(row=>row.map((id,j)=>[id,(j+.5)/row.length])));
   const score=id=>{const adjacent=c.covers.filter(e=>e[sweep%2?0:1]===id).map(e=>e[sweep%2?1:0]);return adjacent.length?adjacent.reduce((sum,n)=>sum+positions.get(n),0)/adjacent.length:positions.get(id);};
   layers[k].sort((a,b)=>score(a)-score(b)||a-b);
  }
 }
 const width=Math.max(420,90+Math.max(...layers.map(row=>row.length))*82),height=60+layers.length*58;
 const positions=new Map();layers.forEach((row,k)=>row.forEach((id,j)=>positions.set(id,{x:70+(width-90)*(j+.5)/row.length,y:42+k*58})));
 let svgText=`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Closure order of graded orbits"><title>Closure order, arranged by orbit dimension</title><text x="12" y="18" fill="#777" font-size="11">dim</text>`;
 layers.forEach((row,k)=>{const y=42+k*58;svgText+=`<line x1="52" y1="${y}" x2="${width-12}" y2="${y}" stroke="#eaeae5" stroke-dasharray="2 4"/><text x="38" y="${y+4}" text-anchor="end" font-size="12" fill="#777">${dimensions[k]}</text>`;});
 for(const[a,b]of c.covers){const p=positions.get(a),q=positions.get(b);svgText+=`<line data-edge="${a},${b}" x1="${p.x}" y1="${p.y-14}" x2="${q.x}" y2="${q.y+14}" stroke="#a5afb6" stroke-width="1.2"/>`;}
 for(const o of c.orbits){const p=positions.get(o.id);svgText+=`<g data-orbit="${o.id}" tabindex="0" role="button" aria-label="Orbit O${o.id}, dimension ${o.dimension}" style="cursor:pointer"><title>O${o.id} · dimension ${o.dimension} · ${escapeText(orbitLabel(o.saturation.name))}</title><rect x="${p.x-27}" y="${p.y-14}" width="54" height="28" rx="14" fill="#f8fafb" stroke="#657b8a"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-family="Georgia" font-size="14" fill="#253f50">O${o.id}</text></g>`;}
 svgText+='</svg>';
 const box=document.createElement('div');box.className='diagram-viewport scroll';box.tabIndex=0;box.setAttribute('role','region');box.setAttribute('aria-label','Scrollable closure-order diagram');box.innerHTML=svgText;old.replaceWith(box);
 const tools=document.createElement('div');tools.className='matrix-tools';tools.innerHTML='<button type="button" data-action="fit">Fit to width</button><button type="button" data-action="readable">Readable size</button><button type="button" data-action="out" aria-label="Zoom out closure diagram">−</button><span aria-live="polite">100%</span><button type="button" data-action="in" aria-label="Zoom in closure diagram">+</button>';box.before(tools);
 const detail=document.createElement('p');detail.className='note';detail.textContent='Larger dimensions are above smaller ones. Select an orbit to highlight its immediate neighbours; select it again to clear.';box.after(detail);
 let selected=null;
 const selectOrbit=id=>{
  selected=selected===id?null:id;
  const neighbours=new Set([selected]);for(const[a,b]of c.covers){if(a===selected)neighbours.add(b);if(b===selected)neighbours.add(a);}
  box.querySelectorAll('[data-orbit]').forEach(node=>{const n=Number(node.dataset.orbit);node.style.opacity=selected===null||neighbours.has(n)?'1':'.25';node.querySelector('rect').setAttribute('fill',n===selected?'#d5e8f4':'#f8fafb');node.setAttribute('aria-pressed',String(n===selected));});
  box.querySelectorAll('[data-edge]').forEach(edge=>{const active=edge.dataset.edge.split(',').map(Number).includes(selected);edge.style.opacity=selected===null||active?'1':'.12';edge.setAttribute('stroke-width',active?'2.5':'1.2');edge.setAttribute('stroke',active?'#294d70':'#a5afb6');});
  const o=c.orbits.find(o=>o.id===selected);detail.textContent=o?'O'+o.id+' · dimension '+o.dimension+' · saturation '+orbitLabel(o.saturation.name)+' · '+o.ic_parameters.length+' local systems. Highlighted edges show immediate closure neighbours.':'Larger dimensions are above smaller ones. Select an orbit to highlight its immediate neighbours; select it again to clear.';
 };
 box.addEventListener('click',event=>{const node=event.target.closest('[data-orbit]');if(node)selectOrbit(Number(node.dataset.orbit));});
 box.addEventListener('keydown',event=>{const node=event.target.closest('[data-orbit]');if(node&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectOrbit(Number(node.dataset.orbit));}});
 const svg=box.querySelector('svg'),v=svg.viewBox.baseVal;let scale=1,fit=false;
 const update=()=>{if(fit)scale=Math.min(1,Math.max(1,box.clientWidth-24)/v.width);svg.setAttribute('width',v.width*scale);svg.setAttribute('height',v.height*scale);tools.querySelector('span').textContent=Math.round(scale*100)+'%';};
 tools.addEventListener('click',e=>{const action=e.target.closest('button')?.dataset.action;if(!action)return;if(action==='fit')fit=true;else{fit=false;scale=action==='readable'?1:Math.max(.15,Math.min(2.5,scale*(action==='in'?1.25:.8)));}update();});
 const observer=new ResizeObserver(()=>{if(fit)update();});observer.observe(box);box._cleanup=()=>observer.disconnect();update();addPanControls(tools,box,'closure diagram');
}
const renderBeforeClosure=render;
render=function(){document.querySelectorAll('.diagram-viewport').forEach(e=>e._cleanup?.());renderBeforeClosure();setupClosure();};
document.getElementById('grading').removeEventListener('change',renderBeforeClosure);document.getElementById('grading').addEventListener('change',render);setupClosure();


let sectionObserver;
function organizeExploration(){
 const content=document.getElementById('case-content'),c=activeCase();
 document.getElementById('grading-summary').innerHTML=[[c.orbits.length,'Graded orbits'],[c.parameters.length,'Local systems'],[c.kl.length,'KL blocks'],[c.arthur_packets.length,'Arthur packets']].map(([n,label])=>'<span><strong>'+n+'</strong>'+label+'</span>').join('');
 const overview=document.createElement('section');overview.id='overview';overview.innerHTML='<h3>Overview</h3><div class="overview-grid"></div>';
 const grid=overview.querySelector('div'),closure=content.querySelector('[aria-label="Scrollable closure-order diagram"]')?.parentElement;
 if(closure){const heading=closure.querySelector('h3');if(heading){const h=document.createElement('h4');h.textContent=heading.textContent;heading.replaceWith(h);}grid.appendChild(closure);}
 const orbitHeading=[...content.children].find(e=>e.tagName==='H3'&&e.textContent==='Orbits and local systems');
 if(orbitHeading){const table=orbitHeading.nextElementSibling,panel=document.createElement('div');panel.className='orbit-table-panel';panel.innerHTML='<h4>Orbits and local systems</h4>';panel.appendChild(table);orbitHeading.remove();grid.appendChild(panel);}
 content.querySelector(':scope > .meta')?.remove();
 const packetHeading=[...content.children].find(e=>e.tagName==='H3'&&e.textContent==='Arthur packets');
 let packets=content.querySelector('#packet-diagrams');
 if(!packets){packets=document.createElement('section');packets.id='packet-diagrams';packets.innerHTML='<h3>Arthur packets</h3><p class="note">No packet diagrams are available for this grading.</p>';}
 const packetTable=document.createElement('section');packetTable.id='arthur-packets';packetTable.innerHTML='<h3>Arthur packets</h3>';
 if(packetHeading){const table=packetHeading.nextElementSibling,panel=document.createElement('div');panel.className='packet-table-panel';panel.appendChild(table);packetHeading.remove();packetTable.appendChild(panel);}
 packets.querySelector('h3').textContent='Explore packets on the closure order';
 const kl=content.querySelector('#polynomials');
 content.replaceChildren(overview,packetTable,...[kl,packets].filter(Boolean));
 sectionObserver?.disconnect();
 const links=[...document.querySelectorAll('.section-nav a')];
 const mark=id=>links.forEach(a=>{if(a.hash==='#'+id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
 sectionObserver=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length)mark(visible[0].target.id);},{rootMargin:'-80px 0px -55% 0px'});
 document.querySelectorAll('#case-content>section,#conventions').forEach(e=>sectionObserver.observe(e));mark('overview');
 links.forEach(a=>a.onclick=()=>mark(a.hash.slice(1)));
}
const renderBeforeLayout=render;
render=function(){renderBeforeLayout();organizeExploration();};
document.getElementById('grading').removeEventListener('change',renderBeforeLayout);document.getElementById('grading').addEventListener('change',render);organizeExploration();

document.getElementById('grading').addEventListener('change',function(event){
  event.stopImmediatePropagation();
  location.assign('orbit-'+this.value+'.html'+location.hash);
},true);

    status.remove();
    // Section bookmarks can arrive before the asynchronous content exists.
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    status.textContent = 'Unable to load this orbit. Please reload using a current browser. ' + error.message;
  }
})();
