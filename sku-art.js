/* Cassola SKU Art v0.1 · original illustrations for every SKU
   - Drawn in code (inline SVG): no image files, no network, crisp at any size,
     cached by the service worker together with the app.
   - Generic, unbranded packaging and food: colours hint at the real product,
     but no logos or brand designs are reproduced.
   - Chubby style to match the Fat UI. The background tile colour comes from CSS
     (.art-tile.k-*), so it follows the light / dark theme.
   - Priority in the UI: device photo > specific illustration > the SKU's own
     emoji > category illustration > default emoji.
   - Display only: nothing here is stored in SKU data or sent to Cloud. */
(function(){
  /* ---------- colour helpers ---------- */
  function hex(c){c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(c.slice(i,i+2),16))}
  function mix(c,to,a){const x=hex(c),y=hex(to);return'#'+x.map((v,i)=>Math.round(v+(y[i]-v)*a).toString(16).padStart(2,'0')).join('')}
  const dk=(c,a=.2)=>mix(c,'#000000',a), lt=(c,a=.35)=>mix(c,'#ffffff',a);
  const isLight=c=>{const [r,g,b]=hex(c);return (0.2126*r+0.7152*g+0.0722*b)/255>0.86};
  const edge=c=>isLight(c)?' stroke="#000" stroke-opacity=".14" stroke-width="1"':'';
  const shadow=(w=15,y=54.5)=>`<ellipse cx="32" cy="${y}" rx="${w}" ry="3" fill="#000" opacity=".16"/>`;
  const shine=(x,y,w,h,r=1.5,o=.34)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" opacity="${o}"/>`;
  const dots=(pts,r,c,o=1)=>pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`).join('');

  /* ---------- containers ---------- */
  function bottle({c='#5a3a2a',cap='#c9473b',label='#f3ead7',kind='std',band=''}={}){
    if(kind==='tall')return shadow(11)+
      `<path d="M24 33 C24 26 28 24 30 23 L30 11 L34 11 L34 23 C36 24 40 26 40 33 L40 52 Q40 55 37 55 L27 55 Q24 55 24 52 Z" fill="${c}"/>`+
      `<rect x="29.3" y="7" width="5.4" height="6" rx="1.4" fill="${cap}"/>`+
      `<rect x="24" y="37" width="16" height="10" rx="1.5" fill="${label}"/>`+shine(26,28,2.6,21);
    if(kind==='square')return shadow(13)+
      `<path d="M22 29 L28 22 L28 13 L36 13 L36 22 L42 29 L42 52 Q42 55 39 55 L25 55 Q22 55 22 52 Z" fill="${c}"/>`+
      `<rect x="27" y="8.5" width="10" height="6" rx="1.6" fill="${cap}"/>`+
      `<rect x="22" y="35" width="20" height="12" rx="1.5" fill="${label}"/>`+shine(24.5,31,2.8,20);
    if(kind==='round')return shadow(14)+
      `<rect x="29" y="12" width="6" height="12" rx="1.5" fill="${c}"/>`+
      `<circle cx="32" cy="40" r="14" fill="${c}"/>`+
      `<rect x="28" y="8" width="8" height="6" rx="1.8" fill="${cap}"/>`+
      `<rect x="21" y="37" width="22" height="9" rx="2" fill="${label}"/>`+
      `<path d="M23 33 A11 11 0 0 1 30 28" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".34"/>`;
    if(kind==='syrup')return shadow(11)+
      `<path d="M24 31 C24 25 28 23 30 22 L30 13 L34 13 L34 22 C36 23 40 25 40 31 L40 52 Q40 55 37 55 L27 55 Q24 55 24 52 Z" fill="${c}"/>`+
      `<path d="M29 13 L29 8 L34 7 L37 9 L35 13 Z" fill="${cap}"/>`+
      `<rect x="24" y="36" width="16" height="11" rx="1.5" fill="${label}"/>`+shine(26,27,2.6,22);
    if(kind==='small')return shadow(10)+
      `<path d="M25 34 C25 28 28 27 29.5 26 L29.5 19 L34.5 19 L34.5 26 C36 27 39 28 39 34 L39 52 Q39 55 36 55 L28 55 Q25 55 25 52 Z" fill="${c}"/>`+
      `<rect x="28.5" y="13" width="7" height="7" rx="2.5" fill="${cap}"/>`+
      `<rect x="25" y="39" width="14" height="9" rx="1.5" fill="${label}"/>`+shine(27,30,2.4,18);
    if(kind==='tokkuri')return shadow(13)+
      `<path d="M32 13 C28 13 28 17 29 20 C22 24 20 33 22 41 C24 50 28 54 32 54 C36 54 40 50 42 41 C44 33 42 24 35 20 C36 17 36 13 32 13 Z" fill="${c}"${edge(c)}/>`+
      `<path d="M23.3 34 C30 36 34 36 40.7 34 L41.5 40 C34 42 30 42 22.5 40 Z" fill="${band||'#3d6fb6'}"/>`+
      `<ellipse cx="32" cy="13.5" rx="4" ry="1.6" fill="${dk(c,.15)}"/>`+shine(26,26,2.6,16,1.3,.4);
    /* std */
    return shadow(12)+
      `<path d="M23 31 C23 25 27 23 29 22 L29 14 L35 14 L35 22 C37 23 41 25 41 31 L41 52 Q41 55 38 55 L26 55 Q23 55 23 52 Z" fill="${c}"/>`+
      `<rect x="28" y="9" width="8" height="6.5" rx="2" fill="${cap}"/>`+
      `<rect x="23" y="35" width="18" height="11" rx="1.5" fill="${label}"/>`+(band?`<rect x="23" y="44" width="18" height="2.5" fill="${band}"/>`:'')+shine(25.5,27,2.6,22);
  }
  function bigBox({c='#e9e1cf',tap='#c9473b',label='#3d4a5c'}={}){ /* 18–20L bag-in-box */
    return shadow(17)+
      `<rect x="14" y="20" width="36" height="33" rx="3.5" fill="${c}"/>`+
      `<path d="M14 23.5 Q14 20 17.5 20 L46.5 20 Q50 20 50 23.5 L50 27 L14 27 Z" fill="${dk(c,.12)}"/>`+
      `<rect x="19" y="32" width="18" height="12" rx="2" fill="${label}"/>`+
      `<rect x="21.5" y="35.5" width="13" height="2" rx="1" fill="#fff" opacity=".75"/><rect x="21.5" y="39" width="8" height="2" rx="1" fill="#fff" opacity=".5"/>`+
      `<rect x="40" y="43" width="7" height="6" rx="1.5" fill="${tap}"/><rect x="42" y="49" width="3" height="3" rx=".8" fill="${dk(tap,.25)}"/>`;
  }
  function can({c='#d8343a',band='#ffffff',top='#c9ced6'}={}){
    return shadow(12)+
      `<rect x="21" y="16" width="22" height="37" rx="5" fill="${c}"/>`+
      `<ellipse cx="32" cy="16.5" rx="11" ry="3.2" fill="${top}"/><ellipse cx="32" cy="16.5" rx="7.5" ry="1.8" fill="${dk(top,.18)}"/>`+
      `<rect x="21" y="31" width="22" height="8" fill="${band}" opacity=".9"/>`+
      `<rect x="21" y="50" width="22" height="3" rx="1.5" fill="${dk(c,.2)}"/>`+shine(24,20,2.6,28);
  }
  function tin({c='#d9dde3',band='#2f6db5',icon=''}={}){
    return shadow(15)+
      `<rect x="16" y="26" width="32" height="27" rx="4" fill="${c}"/>`+
      `<ellipse cx="32" cy="26.5" rx="16" ry="4" fill="${lt(c,.25)}"/><ellipse cx="32" cy="26.5" rx="12" ry="2.6" fill="${dk(c,.12)}"/>`+
      `<rect x="16" y="33" width="32" height="13" fill="${band}"/>`+icon+shine(19,30,2.6,19);
  }
  function carton({c='#f4f6f8',accent='#3f7fd0',badge=''}={}){
    return shadow(12)+
      `<path d="M22 21 L27 12 L37 12 L42 21 Z" fill="${lt(c,.1)}"/>`+
      `<rect x="22" y="21" width="20" height="33" rx="2" fill="${c}"${edge(c)}/>`+
      `<rect x="36" y="21" width="6" height="33" fill="#000" opacity=".07"/>`+
      `<circle cx="31" cy="16.5" r="2.6" fill="${accent}"/>`+
      `<rect x="22" y="34" width="20" height="9" fill="${accent}"/>`+badge;
  }
  function sack({c='#efe6d2',label='#c4473a',grain='#ffffff'}={}){
    return shadow(16)+
      `<path d="M26 16 L28 10 L36 10 L38 16 Z" fill="${dk(c,.14)}"/>`+
      `<path d="M19 24 C18 18 22 15 26 15 L38 15 C42 15 46 18 45 24 L47 48 C47 52 45 54 41 54 L23 54 C19 54 17 52 17 48 Z" fill="${c}"/>`+
      `<rect x="22" y="29" width="20" height="15" rx="3.5" fill="${label}"/>`+
      dots([[27,34],[31,36.5],[35,34],[29,39.5],[33,40]],1.7,grain)+
      `<path d="M21 22 C21 19 23 18 25 18" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".4"/>`;
  }
  function pouch({c='#c99a52',windowFill='',content=''}={}){
    return shadow(14)+
      `<path d="M20 15 L44 15 L45.5 50 C45.6 52.6 44 54 42 54 L22 54 C20 54 18.4 52.6 18.5 50 Z" fill="${c}"/>`+
      `<rect x="20" y="15" width="24" height="5.5" fill="${dk(c,.18)}"/>`+
      `<circle cx="32" cy="37" r="10" fill="${windowFill||'#fffaf0'}"/>`+content+
      shine(22.5,23,2.4,24,1.2,.3);
  }
  function box({c='#cfe2f2',lid='',badge=''}={}){
    return shadow(18)+
      `<rect x="13" y="25" width="38" height="28" rx="3.5" fill="${c}"/>`+
      `<rect x="11.5" y="19" width="41" height="9" rx="3" fill="${lid||dk(c,.12)}"/>`+badge;
  }
  const snow=(cx=32,cy=40,r=7,col='#5b8fc7')=>`<g stroke="${col}" stroke-width="2.1" stroke-linecap="round"><path d="M${cx} ${cy-r} V${cy+r} M${cx-r*.87} ${cy-r/2} L${cx+r*.87} ${cy+r/2} M${cx-r*.87} ${cy+r/2} L${cx+r*.87} ${cy-r/2}"/></g>`;
  function frozen(food){ /* frozen box with a food badge */
    return box({c:'#e4eef8',lid:'#bcd3ea',badge:`<circle cx="32" cy="40" r="10.5" fill="#fff" opacity=".9"/>`+food})+snow(45,22,3.4,'#ffffff');
  }
  function tub({c='#f6f3ea',lid='#f0c64b',handle=true}={}){
    return shadow(15)+
      `<path d="M18 24 L46 24 L43 51 C42.8 53 41.5 54 39.5 54 L24.5 54 C22.5 54 21.2 53 21 51 Z" fill="${c}"${edge(c)}/>`+
      `<rect x="15.5" y="18" width="33" height="8" rx="3" fill="${lid}"/>`+
      (handle?`<path d="M18 30 C12 30 12 40 19.5 40" stroke="${dk(c,.3)}" stroke-width="2" fill="none"/>`:'')+
      `<rect x="22" y="33" width="20" height="9" rx="2" fill="${lid}" opacity=".85"/>`+shine(22,28,2.4,18);
  }
  function smallTub({c='#f4f7fb',lid='#9fc3e8'}={}){
    return shadow(16)+
      `<path d="M16 32 L48 32 L46 50 C45.7 52.5 44 54 41.5 54 L22.5 54 C20 54 18.3 52.5 18 50 Z" fill="${c}"${edge(c)}/>`+
      `<rect x="14" y="26" width="36" height="8" rx="3.5" fill="${lid}"/>`+
      `<rect x="22" y="39" width="20" height="7" rx="2" fill="${lid}" opacity=".7"/>`;
  }
  function jar({glass='#e8f1f4',lid='#3b3f47',content='#2b2622',bits=''}={}){
    return shadow(13)+
      `<rect x="20" y="24" width="24" height="30" rx="6" fill="${glass}"/>`+
      `<rect x="22.5" y="31" width="19" height="20.5" rx="4.5" fill="${content}"/>`+bits+
      `<rect x="19" y="16" width="26" height="9" rx="3" fill="${lid}"/>`+shine(23,28,2.4,20,1.2,.45);
  }
  function block({c='#f6d65a',wrap='#f3efe2'}={}){ /* butter */
    return shadow(17)+
      `<path d="M14 30 L24 21 L52 21 L42 30 Z" fill="${lt(c,.25)}"/>`+
      `<path d="M42 30 L52 21 L52 44 L42 53 Z" fill="${dk(c,.12)}"/>`+
      `<rect x="14" y="30" width="28" height="23" fill="${c}"/>`+
      `<rect x="14" y="36" width="28" height="11" fill="${wrap}"/>`+
      `<rect x="18" y="39.5" width="14" height="2.2" rx="1.1" fill="${dk(c,.2)}" opacity=".6"/>`;
  }
  function sachet({c='#9bb84a',edge='#ffffff'}={}){
    const zig=(y)=>Array.from({length:9},(_,i)=>`${15+i*4} ${y+(i%2?2:0)}`).join(' L');
    return shadow(15)+
      `<path d="M15 20 L${zig(18)} L47 20 L47 48 L${Array.from({length:9},(_,i)=>`${47-i*4} ${50+(i%2?2:0)}`).join(' L')} L15 48 Z" fill="${c}"/>`+
      `<rect x="20" y="27" width="24" height="14" rx="3" fill="${edge}" opacity=".85"/>`+
      `<circle cx="32" cy="34" r="3.6" fill="${dk(c,.15)}"/>`;
  }
  function tube({c='#7fbf4d',cap='#ffffff'}={}){ /* wasabi */
    return shadow(15)+
      `<g transform="rotate(-28 32 34)"><path d="M24 14 L40 14 L38.5 46 Q38 50 34 50 L30 50 Q26 50 25.5 46 Z" fill="${c}"/>`+
      `<rect x="22.5" y="11" width="19" height="5" rx="1.5" fill="${dk(c,.2)}"/>`+
      `<rect x="28.5" y="50" width="7" height="7" rx="2" fill="${cap}"/>`+shine(27,18,2.4,24)+`</g>`;
  }
  function cup({layers=['#f3e7c9','#c84d5c'],top='#f7f2e8',topping='#d9534f',dotsTop=false}={}){ /* dessert glass */
    const ys=[46,38];
    return shadow(12)+
      `<path d="M19 21 L45 21 L41.5 50 C41.2 52.6 39.3 54 37 54 L27 54 C24.7 54 22.8 52.6 22.5 50 Z" fill="#ffffff" opacity=".55"/>`+
      layers.map((col,i)=>{const y=ys[i]||30;const inset=(54-y)*0.12;return `<path d="M${21.5+(y-21)*0.105} ${y-8} L${42.5-(y-21)*0.105} ${y-8} L${41.6-(y-21)*0.12+inset*0} ${y} L${22.4+(y-21)*0.12} ${y} Z" fill="${col}"/>`}).join('')+
      `<path d="M22.6 46 L41.4 46 L41 49.5 C40.8 51.8 39.2 52.5 37 52.5 L27 52.5 C24.8 52.5 23.2 51.8 23 49.5 Z" fill="${layers[0]}"/>`+
      `<path d="M20 22 C22 15 28 14 32 16 C36 13 43 15 44 22 Z" fill="${top}"/>`+
      (dotsTop?dots([[27,18.5],[32,17],[37,19],[30,20.5],[35,21]],1.3,topping):`<circle cx="33" cy="15" r="3.4" fill="${topping}"/>`)+
      `<rect x="21.5" y="24" width="2.2" height="22" rx="1.1" fill="#fff" opacity=".45"/>`;
  }
  function balls({c='#f4c542',n=2,dust='#ffffff'}={}){ /* mochi / tartufo */
    const pos=n===1?[[32,37,13]]:[[25,40,10],[40,36,10.5]];
    return shadow(16)+pos.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"${edge(c)}/>`+
      `<circle cx="${x-r*.35}" cy="${y-r*.38}" r="${r*.28}" fill="#fff" opacity=".35"/>`).join('')+
      dots([[22,44],[28,45],[37,40],[43,42],[40,31]],.9,dust,.7);
  }
  function ramekin({dish='#f4f1ea',fillC='#6b3f2a',dome=true}={}){
    return shadow(17)+
      (dome?`<path d="M18 36 C18 24 46 24 46 36 Z" fill="${fillC}"/>`:`<ellipse cx="32" cy="35" rx="15" ry="4" fill="${fillC}"/>`)+
      `<rect x="15" y="34" width="34" height="18" rx="5" fill="${dish}"/>`+
      `<rect x="15" y="38" width="34" height="2.2" fill="${dk(dish,.1)}"/><rect x="15" y="44" width="34" height="2.2" fill="${dk(dish,.1)}"/>`+
      (dome?`<circle cx="27" cy="29" r="2.3" fill="#fff" opacity=".3"/>`:`<ellipse cx="27" cy="34" rx="5" ry="1.2" fill="#fff" opacity=".35"/>`);
  }
  function slice({layers=['#f2e2c3','#7a4a2c','#f2e2c3','#7a4a2c'],top='#5b3420'}={}){ /* tiramisu */
    return shadow(17)+
      `<path d="M14 29 L24 21 L52 21 L42 29 Z" fill="${top}"/>`+
      `<path d="M42 29 L52 21 L52 45 L42 53 Z" fill="${dk(layers[0],.12)}"/>`+
      layers.map((col,i)=>`<rect x="14" y="${29+i*6}" width="28" height="6" fill="${col}"/>`).join('')+
      dots([[20,25],[30,24],[38,23],[45,23.5],[26,27]],.9,'#3a2014',.8);
  }

  /* ---------- produce ---------- */
  function avocado(skin='#5aa33a',ripe=0){
    return shadow(14)+
      `<path d="M32 11 C26 11 24.5 17 24.5 23 C24.5 28 18 33 18 41.5 C18 49.5 24 55 32 55 C40 55 46 49.5 46 41.5 C46 33 39.5 28 39.5 23 C39.5 17 38 11 32 11 Z" fill="${skin}"/>`+
      dots([[27,26],[35,31],[25,40],[38,45],[31,48],[40,37],[29,34]],.9,dk(skin,.3),.55)+
      `<rect x="31" y="8" width="2.4" height="5" rx="1.2" fill="#6b4a2b"/>`+
      `<path d="M23 36 C23 31 25 29 27 27" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="${ripe?.18:.32}"/>`;
  }
  function mango(c1='#8cc84b',c2='#f2c94c'){
    return shadow(15)+
      `<path d="M19 40 C15 27 26 13 40 16 C51 18 53 33 46 43 C40 52 23 54 19 40 Z" fill="${c1}"/>`+
      `<path d="M24 45 C30 50 41 49 46 41 C48 35 47 28 44 24 C46 34 38 45 24 45 Z" fill="${c2}" opacity=".85"/>`+
      `<path d="M39 16 C40 12 43 10 46 10" stroke="#6b4a2b" stroke-width="2" fill="none" stroke-linecap="round"/>`+
      `<path d="M23 34 C23 27 28 22 33 20" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".32"/>`;
  }
  function lime(){
    return shadow(16)+
      `<circle cx="28" cy="35" r="15" fill="#6fb83f"/>`+dots([[22,30],[30,27],[34,36],[24,41],[31,44]],.8,'#4d8f2a',.6)+
      `<ellipse cx="28" cy="20.5" rx="2.2" ry="1.6" fill="#4d8f2a"/>`+
      `<circle cx="44" cy="44" r="9" fill="#d7ef9a"/><circle cx="44" cy="44" r="9" fill="none" stroke="#6fb83f" stroke-width="2"/>`+
      `<g stroke="#a9d465" stroke-width="1.2"><path d="M44 36.5 V51.5 M36.5 44 H51.5 M38.7 38.7 L49.3 49.3 M49.3 38.7 L38.7 49.3"/></g>`+
      `<circle cx="22.5" cy="29.5" r="3.2" fill="#fff" opacity=".3"/>`;
  }
  function apple(c='#d9473f'){
    return shadow(15)+
      `<path d="M32 21 C26 16 15 19 16 32 C17 45 24 54 32 51 C40 54 47 45 48 32 C49 19 38 16 32 21 Z" fill="${c}"/>`+
      `<path d="M32 21 C32 17 33 14 35 12" stroke="#6b4a2b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`+
      `<path d="M35 15 C38 10 44 11 45 13 C42 17 38 17 35 15 Z" fill="#5aa33a"/>`+
      `<ellipse cx="23" cy="30" rx="3" ry="5" fill="#fff" opacity=".3"/>`;
  }
  function strawberry(){
    return shadow(14)+
      `<path d="M32 54 C22 48 16 38 18 29 C20 22 28 21 32 23 C36 21 44 22 46 29 C48 38 42 48 32 54 Z" fill="#e0393f"/>`+
      dots([[25,31],[32,30],[39,31],[28,38],[36,38],[32,45],[24,40],[40,40]],1,'#ffd76a',.95)+
      `<path d="M22 24 L28 21 L32 15 L36 21 L42 24 L36 26 L32 25 L28 26 Z" fill="#4f9a39"/>`;
  }
  function passion(){
    return shadow(16)+
      `<circle cx="27" cy="35" r="14" fill="#6e3a73"/>`+dots([[21,30],[29,27],[33,36],[23,41],[31,44]],.9,'#8f5a93',.8)+
      `<circle cx="44" cy="43" r="10" fill="#6e3a73"/><circle cx="44" cy="43" r="8" fill="#f5c84b"/>`+
      dots([[41,40],[45,39],[47,43],[43,45],[40,45],[46,47]],1.2,'#2b2118')+
      `<circle cx="22" cy="29" r="3" fill="#fff" opacity=".25"/>`;
  }
  function cucumber(){
    return shadow(17)+
      `<g transform="rotate(-38 32 35)"><rect x="12" y="28" width="40" height="13" rx="6.5" fill="#3f8a3a"/>`+
      dots([[18,32],[25,36],[31,31.5],[38,36],[45,32]],.9,'#a6d68a',.7)+
      `<rect x="16" y="30.5" width="28" height="2" rx="1" fill="#fff" opacity=".25"/></g>`;
  }
  function radish(){
    return shadow(13)+
      `<path d="M26 22 C22 13 24 9 27 9 C28 13 29 17 30 22 Z M34 22 C36 13 40 10 42 12 C40 16 37 19 35 23 Z M30 22 C30 12 33 8 35 9 C35 13 34 18 33 22 Z" fill="#5aa33a"/>`+
      `<circle cx="32" cy="35" r="13" fill="#d8344a"/>`+
      `<path d="M32 48 C32 51 31 54 29.5 56" stroke="#f3e8e8" stroke-width="2" fill="none" stroke-linecap="round"/>`+
      `<ellipse cx="27" cy="31" rx="3" ry="4.5" fill="#fff" opacity=".3"/>`;
  }
  function daikon(){
    return shadow(17)+
      `<path d="M15 20 C14 12 17 9 19 10 C20 14 21 17 22 21 Z M20 18 C22 9 27 8 28 10 C26 14 24 17 23 21 Z" fill="#5aa33a"/>`+
      `<path d="M20 19 C26 17 30 21 34 26 L50 48 C52 51 50 54 47 52 L22 31 C17 27 15 21 20 19 Z" fill="#f4f1ea"${edge('#f4f1ea')}/>`+
      `<path d="M21 22 C25 21 28 23 30 26" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>`+
      `<path d="M30 31 L33 30 M37 37 L40 36 M43 43 L45 42.5" stroke="#cfc6b6" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  function lettuce(){
    return shadow(17)+
      `<circle cx="22" cy="38" r="10" fill="#6fb83f"/><circle cx="42" cy="38" r="10" fill="#6fb83f"/><circle cx="32" cy="30" r="12" fill="#86c95a"/>`+
      `<circle cx="32" cy="42" r="11" fill="#5aa33a"/>`+
      `<path d="M32 33 V52 M32 41 L25 36 M32 46 L39 40" stroke="#c6e8a6" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  }
  function basil(){
    const leaf=(r,x,y,c)=>`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 C-7 -6 -6 -17 0 -21 C6 -17 7 -6 0 0 Z" fill="${c}"/><path d="M0 -2 V-18" stroke="#c6e8a6" stroke-width="1.2" opacity=".8"/></g>`;
    return shadow(14)+leaf(-35,30,50,'#4f9a39')+leaf(30,34,50,'#5aa33a')+leaf(0,32,46,'#6fb83f');
  }
  function eggs(){
    const egg=(x,y,r)=>`<ellipse cx="${x}" cy="${y}" rx="${r*.8}" ry="${r}" fill="#efe3c8"/>`+dots([[x-3,y-4],[x+2,y-1],[x-1,y+4],[x+3,y+5],[x-4,y+2]],1.2,'#7a5a3a',.85)+`<ellipse cx="${x-r*.3}" cy="${y-r*.4}" rx="${r*.18}" ry="${r*.28}" fill="#fff" opacity=".45"/>`;
    return shadow(16)+egg(25,38,11)+egg(41,35,11);
  }

  /* ---------- seafood ---------- */
  function shrimp({c='#f07f4f',stripe='#ffd3bf',feelers=false,claws=false}={}){
    return shadow(15)+
      (feelers?`<path d="M42 19 C48 12 52 10 56 9 M40 18 C44 10 47 7 51 5" stroke="${dk(c,.15)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`:'')+
      `<path d="M40 18 C50 22 52 36 44 46 C38 53 26 54 20 48 L24 44 C29 47 36 46 39 41 C44 34 41 26 35 24 Z" fill="${c}"/>`+
      `<path d="M20 48 L12 52 L16 45 L11 41 L22 44 Z" fill="${dk(c,.1)}"/>`+
      `<path d="M41.5 25 L37 28 M44.5 32 L39.5 33.5 M43.5 39.5 L38.5 38.5 M38.5 45 L35 42" stroke="${stripe}" stroke-width="1.6" stroke-linecap="round"/>`+
      (claws?`<path d="M36 25 C30 22 24 24 22 28 C27 28 30 29 33 31 Z" fill="${dk(c,.08)}"/><path d="M38 23 C34 16 28 15 25 17 C29 19 32 21 34 25 Z" fill="${dk(c,.08)}"/>`:'')+
      `<circle cx="41.5" cy="21" r="1.6" fill="#2b2118"/>`;
  }
  function lobster(){
    return shadow(17)+
      `<path d="M26 14 C20 9 14 11 13 16 C17 16 20 18 23 21 Z M38 14 C44 9 50 11 51 16 C47 16 44 18 41 21 Z" fill="#c9302c"/>`+
      `<rect x="24" y="18" width="16" height="13" rx="6" fill="#d8392f"/>`+
      `<path d="M25 31 L39 31 L37 38 L27 38 Z M26.5 38 L37.5 38 L36 44 L28 44 Z M28 44 L36 44 L35 49 L29 49 Z" fill="#e0483c"/>`+
      `<path d="M29 49 L24 55 L32 52 L40 55 L35 49 Z" fill="#c9302c"/>`+
      `<circle cx="29" cy="21" r="1.5" fill="#2b2118"/><circle cx="35" cy="21" r="1.5" fill="#2b2118"/>`;
  }
  function octopus(c='#c86b9a'){
    const arm=(d)=>`<path d="${d}" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return shadow(17)+arm('M24 36 C18 42 16 48 21 51')+arm('M29 38 C27 46 28 51 32 53')+arm('M35 38 C37 46 36 51 32 53')+arm('M40 36 C46 42 48 48 43 51')+
      `<ellipse cx="32" cy="27" rx="13" ry="14" fill="${c}"/>`+
      `<circle cx="27.5" cy="30" r="2" fill="#2b2118"/><circle cx="36.5" cy="30" r="2" fill="#2b2118"/>`+
      `<ellipse cx="27" cy="20" rx="3" ry="4" fill="#fff" opacity=".28"/>`;
  }
  function eel(){
    const piece=(x,y)=>`<rect x="${x}" y="${y}" width="26" height="11" rx="4" fill="#9a5a2a"/><rect x="${x}" y="${y}" width="26" height="4" rx="2" fill="#5e3416"/>`+
      `<path d="M${x+6} ${y+5} V${y+10} M${x+13} ${y+5} V${y+10} M${x+20} ${y+5} V${y+10}" stroke="#5e3416" stroke-width="1.6" opacity=".7"/>`;
    return shadow(17)+piece(13,23)+piece(25,37);
  }
  function scallop(){
    const ribs=[-48,-24,0,24,48].map(a=>`<path d="M32 48 L${32+Math.sin(a*Math.PI/180)*22} ${48-Math.cos(a*Math.PI/180)*30}" stroke="#e7a98a" stroke-width="1.6"/>`).join('');
    return shadow(16)+
      `<path d="M32 50 C18 50 10 38 12 28 C14 18 24 13 32 13 C40 13 50 18 52 28 C54 38 46 50 32 50 Z" fill="#f6c7a8"/>`+ribs+
      `<path d="M26 50 L32 56 L38 50 Z" fill="#e7a98a"/>`;
  }
  function salmon(){
    return shadow(17)+
      `<path d="M12 36 C14 24 30 19 46 22 C54 24 54 34 50 40 C45 48 26 52 16 46 C13 44 11.5 40 12 36 Z" fill="#f28a5b"/>`+
      `<path d="M20 26 C24 34 24 40 21 47 M29 22 C33 31 33 41 30 50 M38 21 C42 30 42 40 39 48 M46 23 C49 30 49 37 47 42" stroke="#ffe0cf" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/>`;
  }
  function tunaBlock(){
    return shadow(17)+
      `<path d="M14 30 L22 22 L52 22 L44 30 Z" fill="#e05a6a"/><path d="M44 30 L52 22 L52 44 L44 52 Z" fill="#9e2836"/>`+
      `<rect x="14" y="30" width="30" height="22" fill="#c7354a"/>`+
      `<path d="M16 36 C24 34 32 38 42 35 M16 44 C24 42 32 46 42 43" stroke="#e98494" stroke-width="1.4" fill="none" opacity=".8"/>`;
  }
  function fish(c='#a9b8c6'){
    return shadow(17)+
      `<path d="M10 34 C18 22 36 20 46 30 L54 23 L52 34 L54 45 L46 38 C36 48 18 46 10 34 Z" fill="${c}"/>`+
      `<path d="M18 32 C24 29 34 29 40 33" stroke="${lt(c,.45)}" stroke-width="2" fill="none" stroke-linecap="round"/>`+
      `<path d="M26 26 L31 19 L34 27 Z" fill="${dk(c,.15)}"/>`+
      `<circle cx="18" cy="32" r="2" fill="#2b2118"/><path d="M23 30 C24 33 24 36 23 39" stroke="${dk(c,.2)}" stroke-width="1.4" fill="none"/>`;
  }
  function surimi(){
    const stick=(x,y,r)=>`<g transform="rotate(${r} ${x} ${y})"><rect x="${x-17}" y="${y-4.5}" width="34" height="9" rx="4.5" fill="#f6f1ea"/><rect x="${x-17}" y="${y-4.5}" width="34" height="4.5" rx="2.25" fill="#e24b3b"/></g>`;
    return shadow(16)+stick(30,30,-18)+stick(34,40,-18)+stick(31,49,-18);
  }
  function roe(c='#f27a2a',r=4.6){
    const pts=[[24,40],[32,42],[40,40],[28,34],[36,34],[32,27],[22,47],[30,48],[38,47],[44,46],[20,33],[44,34]];
    return shadow(15)+pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x-1.4}" cy="${y-1.5}" r="${r*.32}" fill="#fff" opacity=".7"/>`).join('');
  }
  function tobiko(){
    return shadow(15)+
      `<path d="M14 34 L50 34 L46 50 C45.5 52.6 43.5 54 41 54 L23 54 C20.5 54 18.5 52.6 18 50 Z" fill="#f4f1ea"/>`+
      `<path d="M15 34 C18 22 46 22 49 34 Z" fill="#f2862e"/>`+
      dots([[22,31],[27,28],[32,26],[37,28],[42,31],[25,33],[30,31],[35,31],[40,33],[33,29.5]],1.2,'#ffc27a')+
      `<rect x="14" y="34" width="36" height="3" fill="#dcd6cb"/>`;
  }
  function wakame(){
    const frond=(d,c)=>`<path d="${d}" fill="${c}"/>`;
    return shadow(16)+frond('M22 54 C14 42 18 28 26 18 C26 28 30 36 28 54 Z','#2f7d4a')+frond('M30 54 C26 40 30 26 38 14 C38 26 40 40 36 54 Z','#3f9a5a')+frond('M38 54 C38 44 42 34 50 26 C48 36 46 46 42 54 Z','#2a6e41');
  }
  function nori(){
    return shadow(17)+
      `<g transform="rotate(-8 32 34)"><rect x="13" y="16" width="38" height="36" rx="3" fill="#1f3a2c"/>`+
      `<path d="M13 28 H51 M13 40 H51 M25.7 16 V52 M38.3 16 V52" stroke="#2f5a43" stroke-width="1.2"/>`+
      `<rect x="16" y="19" width="10" height="2" rx="1" fill="#fff" opacity=".18"/></g>`;
  }
  function kombu(){
    return shadow(17)+
      `<g transform="rotate(-12 32 34)"><rect x="12" y="20" width="40" height="9" rx="3" fill="#2f3b2a"/><rect x="14" y="31" width="38" height="9" rx="3" fill="#3a4a33"/><rect x="12" y="42" width="40" height="9" rx="3" fill="#2a3524"/>`+
      dots([[20,24],[34,25],[44,23],[24,35],[40,36],[18,46],[32,47],[46,46]],.9,'#e9efe0',.35)+`</g>`;
  }
  function nest(c='#e2b25b'){ /* kadaifi */
    const s=[0,1,2,3,4,5].map(i=>`<path d="M${14+i} ${40-i*2} C${22+i} ${26-i} ${42-i} ${26-i} ${50-i} ${40-i*2}" stroke="${i%2?c:dk(c,.12)}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('');
    return shadow(17)+`<ellipse cx="32" cy="43" rx="18" ry="9" fill="${dk(c,.08)}"/>`+s+`<ellipse cx="32" cy="43" rx="12" ry="5" fill="${c}"/>`;
  }
  function nigiri(top='#f07f4f',stripe='#ffd3bf'){
    return shadow(17)+
      `<rect x="14" y="34" width="36" height="16" rx="8" fill="#f8f6f1"${edge('#f8f6f1')}/>`+dots([[20,40],[27,44],[35,41],[42,45],[24,47],[39,48]],1.2,'#e7e2d6')+
      `<path d="M12 33 C18 22 44 21 52 31 C48 37 18 39 12 33 Z" fill="${top}"/>`+
      `<path d="M20 28 L22 34 M28 26 L30 34 M36 26 L37 34 M44 28 L44 33" stroke="${stripe}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  function maki(center='#f07f4f'){
    return shadow(16)+
      `<circle cx="32" cy="36" r="17" fill="#1f3a2c"/><circle cx="32" cy="36" r="14.5" fill="#f8f6f1"/>`+
      dots([[25,30],[39,30],[24,42],[40,42],[32,47],[32,25]],1.3,'#e7e2d6')+
      `<circle cx="32" cy="36" r="6.5" fill="${center}"/><circle cx="34" cy="38" r="3" fill="#86c95a"/>`;
  }
  function polipoSlices(){
    const disc=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#c86b9a"/><circle cx="${x}" cy="${y}" r="${r*.68}" fill="#f6efe9"/>`;
    return shadow(17)+disc(23,38,9)+disc(40,34,9.5)+disc(33,45,8);
  }
  function bits(c='#f4a6a0'){
    return shadow(16)+`<ellipse cx="32" cy="45" rx="17" ry="7" fill="${dk(c,.1)}"/>`+
      dots([[20,42],[25,38],[31,36],[37,38],[43,42],[24,45],[30,43],[36,43],[41,46],[33,40],[28,48],[35,48]],3.2,c)+
      dots([[24,40],[33,38],[40,44]],1.2,'#fff',.45);
  }

  /* ---------- dry goods content for pouches ---------- */
  const seeds=(c)=>dots([[27,33],[31,31],[36,33],[25,38],[30,37],[34,39],[38,37],[28,42],[33,43],[37,42]],1.3,c);
  const nuts=(c)=>[[27,33],[35,32],[30,39],[38,39],[26,41]].map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.3" transform="rotate(${i*35} ${x} ${y})" fill="${c}"/>`).join('');
  const flakes=(c)=>[[26,33],[33,31],[38,35],[27,40],[34,39],[31,44]].map(([x,y],i)=>`<path d="M${x-3} ${y} Q${x} ${y-3} ${x+3} ${y} Q${x} ${y+1.6} ${x-3} ${y} Z" fill="${c}" transform="rotate(${i*30} ${x} ${y})"/>`).join('');
  const crumbs=(c)=>dots([[26,33],[30,31],[35,32],[38,36],[27,38],[32,37],[36,41],[29,42],[33,44],[25,36]],1.8,c);
  function chips(){
    const tri=(x,y,r)=>`<path d="M${x} ${y-9} L${x+9} ${y+6} L${x-9} ${y+6} Z" fill="#f2c14e" transform="rotate(${r} ${x} ${y})"/>`;
    return shadow(16)+tri(25,40,-12)+tri(39,38,14)+tri(32,30,4)+dots([[24,40],[39,38],[32,31]],.9,'#d99a2b');
  }
  function taco(){
    return shadow(17)+`<path d="M12 46 C12 28 52 28 52 46 Z" fill="#f2c14e"/><path d="M16 46 C17 33 47 33 48 46 Z" fill="#e6a93a"/>`+
      dots([[22,38],[30,34],[40,36],[45,42],[18,43]],1,'#c98a2b');
  }
  function inari(){
    const p=(x,y)=>`<rect x="${x}" y="${y}" width="18" height="13" rx="5" fill="#c9893d"/><rect x="${x}" y="${y}" width="18" height="5" rx="2.5" fill="#a86d2a"/>`+dots([[x+5,y+8],[x+12,y+9]],.9,'#e6b26b');
    return shadow(17)+p(13,34)+p(33,34)+p(23,22);
  }
  function glove(size='M'){
    return shadow(15)+
      `<path d="M22 52 L22 34 L19 24 C18.5 21 22 20 23 23 L25 29 L25 16 C25 13 29 13 29 16 L29 27 L30 13 C30 10 34 10 34 13 L34 27 L35 15 C35 12 39 12 39 15 L39 29 L41 22 C42 19 45.5 20 45 23 L43 37 L42 52 Z" fill="#f4f6f8"${edge('#f4f6f8')}/>`+
      `<rect x="22" y="46" width="20" height="6" rx="1.5" fill="#dfe5ec"/>`+
      `<circle cx="44" cy="44" r="7.5" fill="#3d4a5c"/><text x="44" y="47.6" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${size}</text>`;
  }
  function leaves(){
    return shadow(17)+
      `<path d="M14 50 C20 30 34 16 52 12 C46 30 32 44 14 50 Z" fill="#4f9a39"/>`+
      `<path d="M14 50 C28 38 40 24 52 12" stroke="#a6d68a" stroke-width="1.4" fill="none"/>`+
      `<path d="M20 54 C30 42 42 34 54 30 C46 44 34 52 20 54 Z" fill="#3f8a3a"/>`;
  }
  function gingerSlices(c='#f2a6b0'){
    const s=(x,y,r)=>`<ellipse cx="${x}" cy="${y}" rx="11" ry="7" transform="rotate(${r} ${x} ${y})" fill="${c}"/><ellipse cx="${x}" cy="${y}" rx="7.5" ry="4.2" transform="rotate(${r} ${x} ${y})" fill="${lt(c,.35)}"/>`;
    return shadow(16)+s(24,42,-20)+s(38,40,15)+s(31,31,-5);
  }
  function truffle(){
    return jar({glass:'#eef1ea',lid:'#2b2f36',content:'#f0e9dc',bits:`<circle cx="32" cy="42" r="7.5" fill="#2e2620"/>`+dots([[29,39],[34,40],[31,45],[36,44]],1,'#4a3d33')});
  }
  function mustard(){
    return jar({glass:'#f5f1df',lid:'#3b3f47',content:'#d9a82b',bits:dots([[26,36],[31,34],[37,37],[27,43],[33,42],[38,46],[29,48]],1.5,'#f2d16b')});
  }

  /* ---------- spec catalogue ---------- */
  const fishBadge=`<path d="M24 40 C28 35 36 35 39 40 L43 37 L42 40 L43 43 L39 40 C36 45 28 45 24 40 Z" fill="#fff"/>`;
  const peachBadge=`<circle cx="32" cy="39.5" r="4.6" fill="#f6a34a"/><path d="M32 35 C33 33 35 33 36 34" stroke="#5aa33a" stroke-width="1.4" fill="none"/>`;
  const dropBadge=`<path d="M32 34 C35 38 36 40 36 41.5 C36 44 34 45.5 32 45.5 C30 45.5 28 44 28 41.5 C28 40 29 38 32 34 Z" fill="#fff"/>`;
  const mushroomBadge=`<rect x="0" y="0" width="0" height="0"/>`+`<path d="M26 39 C26 34 38 34 38 39 Z" fill="#8a5a3a"/><rect x="30.5" y="39" width="3" height="3.5" rx="1" fill="#f3e6d2"/>`;
  const frozenFood={
    shrimp:`<path d="M37 33 C42 35 42 42 38 46 C35 49 29 49 26 46 L28 44 C30 46 33 46 35 44 C37 41 36 37 33 36 Z" fill="#f07f4f"/>`,
    scallop:`<path d="M32 47 C25 47 22 41 23 37 C24 33 28 31 32 31 C36 31 40 33 41 37 C42 41 39 47 32 47 Z" fill="#f6c7a8"/>`,
    eel:`<rect x="23" y="35" width="18" height="9" rx="3" fill="#9a5a2a"/><rect x="23" y="35" width="18" height="3" rx="1.5" fill="#5e3416"/>`,
    roe:dots([[28,38],[33,37],[37,40],[30,43],[35,44]],2.6,'#f27a2a'),
    seaweed:`<path d="M27 47 C24 41 26 35 30 31 C30 37 32 41 31 47 Z M33 47 C33 41 35 36 39 33 C38 39 37 43 36 47 Z" fill="#3f9a5a"/>`,
    nest:`<ellipse cx="32" cy="41" rx="8" ry="4.5" fill="#e2b25b"/><path d="M24 41 C27 34 37 34 40 41" stroke="#c99a42" stroke-width="1.6" fill="none"/>`,
    surimi:`<g transform="rotate(-18 32 40)"><rect x="22" y="36" width="20" height="7" rx="3.5" fill="#f6f1ea"/><rect x="22" y="36" width="20" height="3.5" rx="1.75" fill="#e24b3b"/></g>`,
    octopus:`<ellipse cx="32" cy="37" rx="6" ry="6.5" fill="#c86b9a"/><path d="M27 42 C25 46 27 48 29 47 M32 43 V48 M37 42 C39 46 37 48 35 47" stroke="#c86b9a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  };

  /* Exact SKUs (ids from the live catalogue and the built-in seed list). */
  const BY_ID={
    rice20:{k:'base',a:()=>sack({c:'#f1ead9',label:'#c4473a'})},
    soy20:{k:'base',a:()=>bigBox({c:'#efe3cf',tap:'#c9473b',label:'#3a2a24'})},
    mirin18:{k:'base',a:()=>bigBox({c:'#f3e6c4',tap:'#d9a42b',label:'#8a5a1e'})},
    sake18:{k:'base',a:()=>bottle({kind:'tokkuri',c:'#f1ece0',band:'#3d6fb6'})},
    shiragiku20:{k:'base',a:()=>bigBox({c:'#eef1f3',tap:'#4a8bd0',label:'#5b7b9a'})},
    nori:{k:'base',a:()=>nori()},
    ginger10:{k:'base',a:()=>gingerSlices('#f4b8a8')},
    wasabi:{k:'base',a:()=>tube({c:'#7fbf4d'})},
    blackrice1:{k:'dry',a:()=>pouch({c:'#5b4a6b',windowFill:'#efe8f3',content:seeds('#3a2a45')})},
    pistacchio1:{k:'dry',a:()=>pouch({c:'#8aa84a',content:crumbs('#93c25a')})},
    onion400:{k:'dry',a:()=>pouch({c:'#c99a52',content:crumbs('#d99a3b')})},
    mandorle500:{k:'dry',a:()=>pouch({c:'#c4955e',content:flakes('#e8c99a')})},
    almondgrain1:{k:'dry',a:()=>pouch({c:'#b88655',content:crumbs('#e3c193')})},
    peanut1:{k:'dry',a:()=>pouch({c:'#c4433a',content:nuts('#d9a066')})},
    sesamewhite1:{k:'dry',a:()=>pouch({c:'#9aa3ad',content:seeds('#e9e1cc')})},
    sesameblack1:{k:'dry',a:()=>pouch({c:'#3b3f47',content:seeds('#2b2b2b')})},
    kombu:{k:'dry',a:()=>kombu()},
    tacos135:{k:'dry',a:()=>taco()},
    cornchips450:{k:'dry',a:()=>chips()},
    inari20:{k:'dry',a:()=>inari()},
    chili450:{k:'sauce',a:()=>bottle({kind:'std',c:'#d8352c',cap:'#2f8a3a',label:'#f6efe3'})},
    yuzu1:{k:'sauce',a:()=>bottle({kind:'std',c:'#e6c23a',cap:'#2f8a3a',label:'#f6efe3'})},
    ponzu1:{k:'sauce',a:()=>bottle({kind:'std',c:'#5a3a24',cap:'#e8b23a',label:'#f6efe3'})},
    sesameoil175:{k:'sauce',a:()=>bottle({kind:'small',c:'#b8742a',cap:'#c9473b',label:'#f6efe3'})},
    peach240:{k:'sauce',a:()=>tin({c:'#dfe3e8',band:'#f6c27a',icon:peachBadge})},
    condensed397:{k:'dairy',a:()=>tin({c:'#dfe3e8',band:'#3f7fd0',icon:dropBadge})},
    mayo505:{k:'dairy',a:()=>tub({c:'#f7f2e3',lid:'#f0c64b'})},
    phila165:{k:'dairy',a:()=>smallTub({c:'#f4f7fb',lid:'#9fc3e8'})},
    butter500:{k:'dairy',a:()=>block()},
    butter250:{k:'dairy',a:()=>block()},
    panna200:{k:'dairy',a:()=>carton({c:'#f4f6f8',accent:'#3f7fd0'})},
    panna125:{k:'dairy',a:()=>carton({c:'#f4f6f8',accent:'#3f7fd0'})},
    pannafungo125:{k:'dairy',a:()=>carton({c:'#f4f6f8',accent:'#8a5a3a',badge:`<circle cx="32" cy="27" r="4.6" fill="#fff"/><path d="M28.5 28 C28.5 24 35.5 24 35.5 28 Z" fill="#8a5a3a"/><rect x="31" y="28" width="2" height="2.6" fill="#e6d4bd"/>`})},
    orange750:{k:'dairy',a:()=>bottle({kind:'std',c:'#f39a2b',cap:'#f6efe3',label:'#ffffff'})},
    passionpuree1:{k:'dairy',a:()=>pouch({c:'#6e3a73',windowFill:'#f5c84b',content:dots([[28,35],[33,33],[36,38],[30,40],[34,42]],1.3,'#2b2118')})},
    mangopuree1:{k:'dairy',a:()=>pouch({c:'#f2a33a',windowFill:'#ffd36b',content:''})},
    tonno13:{k:'dairy',a:()=>tin({c:'#dfe3e8',band:'#2f6db5',icon:fishBadge})},
    lime:{k:'produce',a:()=>lime()},
    greenapple:{k:'produce',a:()=>apple('#8cc63f')},
    redapple:{k:'produce',a:()=>apple('#d9473f')},
    salad:{k:'produce',a:()=>lettuce()},
    quail12:{k:'produce',a:()=>eggs()},quail18:{k:'produce',a:()=>eggs()},
    strawberry:{k:'produce',a:()=>strawberry()},
    mango_hard:{k:'produce',a:()=>mango('#7fbf4d','#c9d94a')},
    mango_soft:{k:'produce',a:()=>mango('#f2b84b','#e8583a')},
    passion:{k:'produce',a:()=>passion()},
    cucumber:{k:'produce',a:()=>cucumber()},
    avocado_hard:{k:'produce',a:()=>avocado('#5aa33a')},
    avocado_half:{k:'produce',a:()=>avocado('#3f6e2c')},
    avocado_soft:{k:'produce',a:()=>avocado('#3a3324',1)},
    daikon:{k:'produce',a:()=>daikon()},
    radish:{k:'produce',a:()=>radish()},
    basil:{k:'produce',a:()=>basil()},
    gamberi_s800:{k:'frozen',a:()=>shrimp({c:'#d8343f',stripe:'#ffc2c2',feelers:true})},
    gamberi_l800:{k:'frozen',a:()=>shrimp({c:'#c9283a',stripe:'#ffb3b3',feelers:true})},
    scampi_l800:{k:'frozen',a:()=>shrimp({c:'#f2a07a',stripe:'#ffe3d3',claws:true})},
    scampi_s800:{k:'frozen',a:()=>shrimp({c:'#f2a07a',stripe:'#ffe3d3',claws:true})},
    amaebi_c1_2:{k:'frozen',a:()=>frozen(frozenFood.shrimp)},
    anguilla:{k:'frozen',a:()=>eel()},
    capesante900:{k:'frozen',a:()=>scallop()},
    ikura1:{k:'frozen',a:()=>roe('#f27a2a',4.6)},ikura500:{k:'frozen',a:()=>roe('#f27a2a',4.6)},
    tobiko500:{k:'frozen',a:()=>tobiko()},
    kataifi1:{k:'frozen',a:()=>nest()},
    surimi1:{k:'frozen',a:()=>surimi()},surimi_hf1:{k:'frozen',a:()=>surimi()},
    wakame1:{k:'frozen',a:()=>wakame()},
    polipo_raw:{k:'frozen',a:()=>octopus('#c86b9a')},
    nigiri_shrimp:{k:'prep',a:()=>nigiri('#f07f4f','#ffd3bf')},
    maki_shrimp:{k:'prep',a:()=>maki('#f07f4f')},
    nigiri_amaebi:{k:'prep',a:()=>nigiri('#f4a6a0','#ffe3e0')},
    maki_amaebi:{k:'prep',a:()=>maki('#f4a6a0')},
    polipo_processed:{k:'prep',a:()=>polipoSlices()},
    'amaebi碎':{k:'prep',a:()=>bits('#f4a6a0')},
    lobster:{k:'prep',a:()=>lobster()},
    zongye:{k:'supply',a:()=>leaves()},
    glove_m:{k:'supply',a:()=>glove('M')},glove_l:{k:'supply',a:()=>glove('L')}
  };

  /* Same picture for SKUs re-created under a new id but with the same name. */
  const NAME_ALIAS={"寿司米": "rice20", "寿司酱油": "soy20", "寿司美林": "mirin18", "寿司清酒": "sake18", "寿司白菊": "shiragiku20", "寿司紫菜": "nori", "寿司生姜": "ginger10", "Wasabi": "wasabi", "寿司黑米": "blackrice1", "Pistacchio碎": "pistacchio1", "洋葱碎": "onion400", "Mandorle杏仁片": "mandorle500", "杏仁粒": "almondgrain1", "花生仁": "peanut1", "白芝麻": "sesamewhite1", "黑芝麻": "sesameblack1", "昆布": "kombu", "Tacos片": "tacos135", "玉米薯片": "cornchips450", "豆皮": "inari20", "仙女牌辣椒酱": "chili450", "食研芥末柚子汁": "yuzu1", "Ponzu Kikkoman": "ponzu1", "芝麻油": "sesameoil175", "桃子罐头": "peach240", "Maionese": "mayo505", "炼乳": "condensed397", "Philadelphia": "phila165", "Burro": "butter500", "Panna": "panna200", "Panna蘑菇": "pannafungo125", "橙汁": "orange750", "浓缩百香果汁": "passionpuree1", "浓缩芒果": "mangopuree1", "Tonno罐头": "tonno13", "青柠檬": "lime", "青苹果": "greenapple", "红苹果": "redapple", "摆盘沙拉菜": "salad", "鹌鹑蛋": "quail18", "草莓": "strawberry", "硬芒果": "mango_hard", "软芒果": "mango_soft", "百香果": "passion", "黄瓜": "cucumber", "Avocado硬": "avocado_hard", "Avocado半硬": "avocado_half", "Avocado软": "avocado_soft", "白萝卜": "daikon", "水萝卜": "radish", "Basilico": "basil", "Kadaifi": "kataifi1", "gamberi rossi小": "gamberi_s800", "gamberi rossi大": "gamberi_l800", "Scampi大": "scampi_l800", "Scampi小": "scampi_s800", "Amaebi C1": "amaebi_c1_2", "Capesante": "capesante900", "Wakame": "wakame1", "Tobiko": "tobiko500", "Ikura": "ikura1", "Surimi": "surimi1", "Surimi恒丰": "surimi_hf1", "Anguilla": "anguilla", "Polipo原料": "polipo_raw", "Nigiri虾": "nigiri_shrimp", "Maki虾": "maki_shrimp", "Nigiri Amaebi": "nigiri_amaebi", "碎Amaebi": "amaebi碎", "Polipo": "polipo_processed", "Maki Amaebi": "maki_amaebi", "龙虾": "lobster", "粽叶": "zongye", "白M手套": "glove_m", "白L手套": "glove_l"};
  /* Name keywords (Bar / Sala catalogue, new SKUs with familiar names). */
  const D={ /* dessert colours */
    mango:'#f4c542',fragola:'#ef6f86',coco:'#f6f1ea',matcha:'#8fbf5a',cioccolato:'#6b3f2a',tropical:'#f7a03a',
    pistacchio:'#93c25a',amarena:'#a3243b',arachide:'#c99a52',pesca:'#f6a77a',caffe:'#7a4a2c',bianco:'#f3eee4'
  };
  const flavour=n=>{for(const k of Object.keys(D))if(n.includes(k))return D[k];return null};
  const KEYWORDS=[
    [/mochi/,n=>({k:'dessert',a:()=>balls({c:flavour(n)||'#f4c542',dust:'#ffffff'})})],
    [/tartufo bianco/,()=>({k:'dessert',a:()=>balls({c:'#f3eee4',n:1,dust:'#d9cbb3'})})],
    [/tartufo pistacchio/,()=>({k:'dessert',a:()=>balls({c:'#93c25a',n:1,dust:'#e7f1d3'})})],
    [/tartufo/,()=>({k:'dairy',a:()=>truffle()})],
    [/tiramisu/,()=>({k:'dessert',a:()=>slice()})],
    [/souffle/,n=>({k:'dessert',a:()=>ramekin({fillC:flavour(n)||'#6b3f2a',dish:'#f4f1ea'})})],
    [/catalana/,()=>({k:'dessert',a:()=>ramekin({fillC:'#d9902b',dish:'#c9744a',dome:false})})],
    [/coppa|croccante|cremoso|passion$|esotica|glosa|segreta|ricotta|twitty|hip pop|bacio|black biscuits/,n=>{
      const c=flavour(n)||(/passion|esotica/.test(n)?'#f2b13a':/black biscuits/.test(n)?'#2e2a2a':/twitty|ricotta|bacio/.test(n)?'#f3eee4':/glosa/.test(n)?'#c98a6a':'#ef6f86');
      return{k:'dessert',a:()=>cup({layers:['#f3e7c9',c],top:/croccante/.test(n)?c:'#f7f2e8',topping:/croccante/.test(n)?'#c98a2b':c,dotsTop:/croccante/.test(n)})};
    }],
    [/sciroppo/,n=>{const c=/fragola/.test(n)?'#d8343f':/menta/.test(n)?'#3fae6a':/passion/.test(n)?'#f2a13a':/violetta/.test(n)?'#8a5ac8':/sambuca/.test(n)?'#e6eef2':'#f3efe4';
      return{k:'syrup',a:()=>bottle({kind:'syrup',c,cap:'#9aa3ad',label:'#ffffff'})}}],
    [/baileys/,()=>({k:'alcohol',a:()=>bottle({kind:'round',c:'#3a2a24',cap:'#c9a24b',label:'#efe2c8'})})],
    [/limoncello/,()=>({k:'alcohol',a:()=>bottle({kind:'tall',c:'#f2d33a',cap:'#e6e6e6',label:'#3c7a3a'})})],
    [/branca menta|melonne/,()=>({k:'alcohol',a:()=>bottle({kind:'tall',c:'#3f9a5a',cap:'#1f2a22',label:'#f2ead7'})})],
    [/jager/,()=>({k:'alcohol',a:()=>bottle({kind:'square',c:'#2a4a32',cap:'#d9a42b',label:'#f2ead7'})})],
    [/sambuca/,()=>({k:'alcohol',a:()=>bottle({kind:'tall',c:'#dfe9ee',cap:'#3a5a8a',label:'#3a5a8a'})})],
    [/prugne|uvaviva/,()=>({k:'alcohol',a:()=>bottle({kind:'tall',c:'#6a3a6a',cap:'#c9a24b',label:'#f2ead7'})})],
    [/liquirizia|fernet/,()=>({k:'alcohol',a:()=>bottle({kind:'square',c:'#22201f',cap:'#c9473b',label:'#f2ead7'})})],
    [/amaro|montenegro|brandy|piave/,()=>({k:'alcohol',a:()=>bottle({kind:'square',c:'#7a4a22',cap:'#c9a24b',label:'#f2ead7'})})],
    [/coca zero/,()=>({k:'drink',a:()=>can({c:'#2b2b2e',band:'#d8343f'})})],
    [/coca/,()=>({k:'drink',a:()=>can({c:'#d8343f',band:'#ffffff'})})],
    [/fanta|crodini/,()=>({k:'drink',a:()=>can({c:'#f28a2b',band:'#ffffff'})})],
    [/gingerino/,()=>({k:'drink',a:()=>can({c:'#e8503a',band:'#f6d65a'})})],
    [/limon soda|te limone/,()=>({k:'drink',a:()=>can({c:'#f2d33a',band:'#ffffff'})})],
    [/te pesca/,()=>({k:'drink',a:()=>can({c:'#f6a77a',band:'#ffffff'})})],
    [/tonica pompelmo/,()=>({k:'drink',a:()=>can({c:'#f08a8a',band:'#ffffff'})})],
    [/tonica/,()=>({k:'drink',a:()=>can({c:'#a9d3e8',band:'#ffffff'})})],
    [/^latte$/,()=>({k:'drink',a:()=>carton({c:'#f4f6f8',accent:'#3f7fd0'})})],
    [/olio/,()=>({k:'sala',a:()=>sachet({c:'#9bb84a'})})],
    [/sale in bustina/,()=>({k:'sala',a:()=>sachet({c:'#cfd6de'})})],
    [/panna/,()=>({k:'dairy',a:()=>carton({c:'#f4f6f8',accent:'#3f7fd0'})})],
    [/soia/,n=>({k:'sala',a:()=>bottle({kind:'small',c:'#3a2a24',cap:/meno sale/.test(n)?'#3fae6a':'#e8b23a',label:'#f6efe3'})})],
    [/zenzer/,()=>({k:'sala',a:()=>gingerSlices('#e8607a')})],
    [/branzino/,()=>({k:'fish',a:()=>fish('#a9b8c6')})],
    [/salmone/,()=>({k:'fish',a:()=>salmon()})],
    [/^tonno$/,()=>({k:'fish',a:()=>tunaBlock()})],
    [/芥末籽|senape/,()=>({k:'dairy',a:()=>mustard()})],
    [/amaebi/,()=>({k:'frozen',a:()=>frozen(frozenFood.shrimp)})],
    [/avocado/,()=>({k:'produce',a:()=>avocado('#5aa33a')})]
  ];

  /* Category fallback for new SKUs without a specific drawing. */
  const BY_CATEGORY={
    '寿司基础':{k:'base',a:()=>bottle({kind:'std',c:'#3a2a24',cap:'#c9473b',label:'#f3ead7'})},
    '干货':{k:'dry',a:()=>pouch({c:'#c99a52',content:crumbs('#d9b27a')})},
    '酱料':{k:'sauce',a:()=>bottle({kind:'std',c:'#b8742a',cap:'#2f8a3a',label:'#f6efe3'})},
    '冷藏':{k:'dairy',a:()=>carton({c:'#f4f6f8',accent:'#3f7fd0'})},
    '冷藏配料':{k:'dairy',a:()=>jar({content:'#d9a82b'})},
    '蔬果':{k:'produce',a:()=>lettuce()},
    '冷冻':{k:'frozen',a:()=>box({c:'#e4eef8',lid:'#bcd3ea',badge:snow(32,40,8)})},
    '处理库存':{k:'prep',a:()=>bits('#f0a07a')},
    '耗材':{k:'supply',a:()=>box({c:'#d9cbb3',lid:'#c4b493'})},
    '甜点':{k:'dessert',a:()=>cup({})},
    '酒水':{k:'alcohol',a:()=>bottle({kind:'tall',c:'#7a4a22',cap:'#c9a24b',label:'#f2ead7'})},
    '糖浆':{k:'syrup',a:()=>bottle({kind:'syrup',c:'#d8343f',cap:'#9aa3ad',label:'#ffffff'})},
    '饮料':{k:'drink',a:()=>can({c:'#3fae9a',band:'#ffffff'})},
    'Sala调味':{k:'sala',a:()=>sachet({c:'#cfd6de'})},
    '鲜鱼':{k:'fish',a:()=>fish('#a9b8c6')}
  };

  function specific(s){
    if(!s)return null;
    const id=String(s.id??s.skuId??'');
    if(Object.prototype.hasOwnProperty.call(BY_ID,id))return BY_ID[id];
    const raw=String(s.name??s.skuName??'').trim();
    if(Object.prototype.hasOwnProperty.call(NAME_ALIAS,raw))return BY_ID[NAME_ALIAS[raw]];
    const n=raw.toLowerCase();
    for(const [re,make] of KEYWORDS)if(re.test(n))return make(n);
    return null;
  }
  function fallback(s){
    const c=String(s?.category??'').trim();
    return Object.prototype.hasOwnProperty.call(BY_CATEGORY,c)?BY_CATEGORY[c]:null;
  }
  const cache=new Map();
  function render(spec,key){
    if(cache.has(key))return cache.get(key);
    const out='<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect class="art-tile k-'+spec.k+'" width="64" height="64"/>'+spec.a()+'</svg>';
    cache.set(key,out);
    return out;
  }
  /* specific(s) -> exact drawing; category(s) -> generic drawing for the category */
  function svg(s,{allowCategory=true}={}){
    const sp=specific(s);
    if(sp)return render(sp,'s:'+(s.id??s.skuId)+':'+(s.name??s.skuName));
    if(!allowCategory)return '';
    const fb=fallback(s);
    return fb?render(fb,'c:'+s.category):'';
  }
  window.CassolaSkuArt={svg,hasSpecific:s=>!!specific(s),_kit:{BY_ID,KEYWORDS,BY_CATEGORY}};
})();
