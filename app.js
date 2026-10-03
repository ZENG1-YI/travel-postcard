(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const canvas = $('#postcardCanvas');
  const ctx = canvas.getContext('2d');
  const finalCanvas = $('#finalCanvas');
  const finalCtx = finalCanvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const defaults = () => ({template:'vintage',photo:null,photoSrc:'',x:0,y:0,zoom:1,filter:'original',message:'',stamp:'air',stampText:'',place:''});
  let state = defaults(), history = [], drag = null, lastMoveSave = 0;

  const themes = {
    vintage:{name:'复古旅行',paper:'#ead9b9',ink:'#4e4037',accent:'#985c43'},
    modern:{name:'极简现代',paper:'#eeeee9',ink:'#263746',accent:'#be5d44'},
    journal:{name:'手账拼贴',paper:'#e6d5b9',ink:'#443b32',accent:'#8f543c'}
  };

  function snapshot(){return {...state,photo:null}}
  function saveHistory(){history.push(snapshot());if(history.length>50)history.shift();$('#undoBtn').disabled=!history.length}
  function restore(s){const img=state.photo;state={...s,photo:img};syncUI();render()}
  function update(mutator, save=true){if(save)saveHistory();mutator();render();syncUI()}

  function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
  function drawPhoto(c, box){
    c.save();roundedRect(c,box.x,box.y,box.w,box.h,box.r||0);c.clip();
    if(!state.photo){c.fillStyle=box.placeholder||'#aeb5ae';c.fillRect(box.x,box.y,box.w,box.h);c.fillStyle='rgba(255,255,255,.7)';c.textAlign='center';c.font='500 22px Arial';c.fillText('上传一张旅途照片',box.x+box.w/2,box.y+box.h/2-6);c.font='14px Arial';c.fillText('拖动照片，可以调整画面构图',box.x+box.w/2,box.y+box.h/2+25);c.restore();return}
    const iw=state.photo.naturalWidth,ih=state.photo.naturalHeight;
    const sc=Math.max(box.w/iw,box.h/ih)*state.zoom;
    const dw=iw*sc,dh=ih*sc;
    const dx=box.x+(box.w-dw)/2+state.x*(box.w/W);
    const dy=box.y+(box.h-dh)/2+state.y*(box.h/H);
    c.filter={original:'none',warm:'saturate(1.08) sepia(.12) brightness(1.03)',vintage:'sepia(.38) contrast(.9) saturate(.82)',mono:'grayscale(1) contrast(1.05)'}[state.filter];
    c.drawImage(state.photo,dx,dy,dw,dh);c.filter='none';
    c.restore();
  }
  function textFit(c,text,maxWidth,start,min=18){let size=start;c.font=`700 ${size}px Georgia, serif`;while(c.measureText(text).width>maxWidth&&size>min){size--;c.font=`700 ${size}px Georgia, serif`}return size}
  function drawStamp(c,x,y,scale,angle){const t=themes[state.template];c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.strokeStyle=t.accent;c.fillStyle=t.accent;c.lineWidth=3;c.textAlign='center';
    if(state.stamp==='air'){c.beginPath();c.arc(0,0,66,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,56,0,Math.PI*2);c.stroke();c.font='700 15px Georgia';c.fillText('AIR MAIL',0,-28);c.font='28px serif';c.fillText('✦',0,10);c.font='700 11px Arial';c.fillText(state.stampText||'BON VOYAGE',0,38)}
    else if(state.stamp==='date'){c.strokeRect(-64,-45,128,90);c.strokeRect(-57,-38,114,76);c.font='700 30px Georgia';c.fillText('26',0,-3);c.font='700 13px Arial';c.fillText((state.stampText||'AUG 2026').toUpperCase(),0,27)}
    else{c.scale(1.25,.8);c.beginPath();c.ellipse(0,0,67,48,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(0,0,58,39,0,0,Math.PI*2);c.stroke();c.scale(.8,1.25);c.font='700 20px Georgia';c.fillText('P · C',0,-4);c.font='700 10px Arial';c.fillText((state.stampText||'POST CARD').toUpperCase(),0,22)}c.restore()}
  function drawBase(c){c.clearRect(0,0,W,H);c.fillStyle=themes[state.template].paper;c.fillRect(0,0,W,H)}
  function renderVintage(c){const t=themes.vintage;drawBase(c);drawPhoto(c,{x:40,y:45,w:745,h:710,r:3,placeholder:'#abb1aa'});c.fillStyle='rgba(250,243,222,.8)';c.fillRect(800,0,400,H);c.strokeStyle='rgba(96,71,55,.22)';c.setLineDash([5,12]);c.beginPath();c.moveTo(805,30);c.lineTo(805,770);c.stroke();c.setLineDash([]);c.fillStyle=t.ink;c.font='italic 700 23px Georgia';c.fillText('MY JOURNEY',850,88);c.font='italic 700 43px Georgia';c.fillText((state.place||'未知目的地').toUpperCase(),850,145);c.fillStyle='rgba(78,64,55,.45)';c.font='14px Arial';c.fillText('A GLIMPSE OF MEMORY',850,191);c.strokeStyle='rgba(78,64,55,.24)';c.beginPath();c.moveTo(850,220);c.lineTo(1144,220);c.stroke();c.fillStyle=t.ink;c.font='12px Arial';c.fillText('MESSAGE',850,259);c.font='700 22px Georgia';wrapText(c,state.message||'写下一句想留住的话',850,294,290,31);drawBarcode(c,850,625,t.ink);drawStamp(c,1060,635,.8,-.13);c.fillStyle='rgba(78,64,55,.5)';c.font='12px Arial';c.fillText('N° 026  ·  TRAVEL NOTES',850,727)}
  function renderModern(c){const t=themes.modern;drawBase(c);drawPhoto(c,{x:36,y:36,w:1128,h:540,r:0,placeholder:'#9ca9ad'});c.fillStyle=t.ink;c.font='700 17px Arial';c.letterSpacing='3px';c.fillText('TRAVEL / 026',40,635);c.font='700 45px Georgia';const place=(state.place||'在路上').toUpperCase();c.fillText(place,40,694);c.fillStyle='#6d777b';c.font='17px Arial';c.fillText(state.message||'写下一句想留住的话',42,742);c.fillStyle=t.accent;c.fillRect(877,630,4,108);drawStamp(c,1025,682,.58,.08)}
  function renderJournal(c){const t=themes.journal;drawBase(c);c.save();c.translate(365,365);c.rotate(-.025);drawPhoto(c,{x:-325,y:-285,w:700,h:570,r:2,placeholder:'#999e94'});c.strokeStyle='#fff9ed';c.lineWidth=18;c.strokeRect(-325,-285,700,570);c.restore();c.fillStyle='#c49c70';c.save();c.translate(285,56);c.rotate(-.08);c.fillRect(-70,-14,140,28);c.restore();c.fillStyle='#f5edda';c.save();c.translate(912,180);c.rotate(.045);roundedRect(c,-190,-115,350,290,3);c.fill();c.restore();c.fillStyle=t.ink;c.font='italic 700 20px Georgia';c.fillText('FIELD NOTES',765,104);c.font='700 42px Georgia';wrapText(c,(state.place||'我的旅程').toUpperCase(),765,157,310,47);c.strokeStyle='rgba(68,59,50,.3)';c.setLineDash([7,8]);c.beginPath();c.moveTo(765,260);c.lineTo(1085,260);c.stroke();c.setLineDash([]);c.font='19px "Songti SC",serif';wrapText(c,state.message||'写下一句想留住的话',765,309,310,32);drawStamp(c,970,555,.72,-.09);c.fillStyle=t.accent;c.font='700 15px Arial';c.fillText('MEMORY, KEPT.',790,704);c.strokeStyle=t.accent;c.beginPath();c.moveTo(790,720);c.lineTo(1095,720);c.stroke()}
  function drawBarcode(c,x,y,color){c.fillStyle=color;for(let i=0;i<34;i++){const w=i%3===0?5:2;const h=18+(i*13%37);c.fillRect(x+i*7,y-h,w,h)}}
  function wrapText(c,text,x,y,max,line){let row='',yy=y;for(const ch of text){const test=row+ch;if(c.measureText(test).width>max&&row){c.fillText(row,x,yy);row=ch;yy+=line}else row=test}if(row)c.fillText(row,x,yy)}
  function render(){({vintage:renderVintage,modern:renderModern,journal:renderJournal}[state.template])(ctx)}
  function syncUI(){
    $$('.template-card').forEach(b=>b.classList.toggle('selected',b.dataset.template===state.template));$$('#filterButtons button').forEach(b=>b.classList.toggle('selected',b.dataset.filter===state.filter));$$('.stamp-choice').forEach(b=>b.classList.toggle('selected',b.dataset.stamp===state.stamp));
    $('#messageInput').value=state.message;$('#stampTextInput').value=state.stampText;$('#placeInput').value=state.place;$('#zoomRange').value=state.zoom;$('#zoomRange').disabled=!state.photo;$('#zoomOutput').value=Math.round(state.zoom*100)+'%';$('#resetPhotoBtn').disabled=!state.photo;$('#templateName').textContent=themes[state.template].name;$('#messageCount').textContent=state.message.length+' / 36';$('#stampCount').textContent=state.stampText.length+' / 16';$('#placeCount').textContent=state.place.length+' / 20';$('#photoHint').textContent=state.photo?'拖动照片调整画面':'上传照片后可拖动调整';$('#undoBtn').disabled=!history.length;
  }
  $$('.step-tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.step-tab').forEach(x=>x.classList.remove('active'));$$('.tool-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.panel).classList.add('active')}));
  $$('.template-card').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.template!==state.template)update(()=>state.template=btn.dataset.template)}));
  $('#photoInput').addEventListener('change',async e=>{
    const input=e.target,file=input.files[0];if(!file)return;
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    const isHeic=['heic','heif'].includes(ext)||['image/heic','image/heif'].includes(file.type);
    if(!isHeic&&!['image/jpeg','image/png'].includes(file.type)){alert('请选择 JPG、PNG 或 HEIC 图片');input.value='';return}
    if(file.size>25*1024*1024){alert('图片过大，请选择 25MB 以内的文件');input.value='';return}
    const uploadLabel=$('.upload-box strong'),originalLabel=uploadLabel.textContent;
    try{
      uploadLabel.textContent=isHeic?'正在转换 HEIC…':'正在读取照片…';
      let imageBlob=file;
      if(isHeic){
        if(typeof window.heic2any!=='function')throw new Error('HEIC decoder unavailable');
        const converted=await window.heic2any({blob:file,toType:'image/jpeg',quality:.94});
        imageBlob=Array.isArray(converted)?converted[0]:converted;
      }
      const url=URL.createObjectURL(imageBlob),img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
      saveHistory();state.photo=img;state.photoSrc='';state.x=0;state.y=0;state.zoom=1;syncUI();render();
      URL.revokeObjectURL(url);
    }catch(error){console.error(error);alert('无法读取这张照片。请确认文件未损坏，或先在相册中转换为 JPG 后重试。')}
    finally{uploadLabel.textContent=originalLabel;input.value=''}
  });
  $('#zoomRange').addEventListener('pointerdown',e=>{e.currentTarget.dataset.before=state.zoom});
  $('#zoomRange').addEventListener('input',e=>{state.zoom=+e.target.value;$('#zoomOutput').value=Math.round(state.zoom*100)+'%';render()});
  $('#zoomRange').addEventListener('change',e=>{const before=Number(e.currentTarget.dataset.before);if(Number.isFinite(before)&&before!==state.zoom){const now=state.zoom;state.zoom=before;saveHistory();state.zoom=now;syncUI()}});
  $$('#filterButtons button').forEach(b=>b.addEventListener('click',()=>{if(state.filter!==b.dataset.filter)update(()=>state.filter=b.dataset.filter)}));$$('.stamp-choice').forEach(b=>b.addEventListener('click',()=>{if(state.stamp!==b.dataset.stamp)update(()=>state.stamp=b.dataset.stamp)}));
  [['#messageInput','message'],['#stampTextInput','stampText'],['#placeInput','place']].forEach(([sel,key])=>{const el=$(sel);el.addEventListener('focus',()=>{el.dataset.before=state[key]});el.addEventListener('input',()=>{state[key]=el.value;syncUI();render()});el.addEventListener('change',()=>{const before=el.dataset.before;if(before!==state[key]){const now=state[key];state[key]=before;saveHistory();state[key]=now;syncUI()}})});
  $('#undoBtn').onclick=()=>{const s=history.pop();if(s)restore(s)};$('#resetPhotoBtn').onclick=()=>update(()=>{state.x=0;state.y=0;state.zoom=1});
  function pointer(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
  canvas.addEventListener('pointerdown',e=>{if(!state.photo)return;canvas.setPointerCapture(e.pointerId);const p=pointer(e);drag={p,startX:state.x,startY:state.y,before:snapshot()};$('#canvasWrap').classList.add('dragging')});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=pointer(e);state.x=drag.startX+(p.x-drag.p.x);state.y=drag.startY+(p.y-drag.p.y);render()});
  function endDrag(){if(!drag)return;if(state.x!==drag.startX||state.y!==drag.startY)history.push(drag.before);drag=null;$('#canvasWrap').classList.remove('dragging');syncUI()}
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
  canvas.addEventListener('wheel',e=>{if(!state.photo)return;e.preventDefault();if(Date.now()-lastMoveSave>500)saveHistory();lastMoveSave=Date.now();state.zoom=Math.max(1,Math.min(3,state.zoom-e.deltaY*.001));syncUI();render()},{passive:false});
  $('#previewBtn').onclick=()=>{render();finalCtx.clearRect(0,0,W,H);finalCtx.drawImage(canvas,0,0);$('#previewScreen').hidden=false;document.body.style.overflow='hidden'};$('#backToEdit').onclick=()=>{$('#previewScreen').hidden=true;document.body.style.overflow=''};
  function openWallDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('travel-postcard-wall',1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('postcards'))db.createObjectStore('postcards',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  async function publishToWall(){
    const button=$('#publishBtn'),original=button.innerHTML;button.disabled=true;button.textContent='正在保存…';
    try{
      render();const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Canvas export failed')),'image/png'));
      const db=await openWallDB();const item={id:Date.now()+'-'+Math.random().toString(36).slice(2,8),image:blob,place:state.place||'旅途未命名',message:state.message||'把这一程，留在此刻。',template:themes[state.template].name,createdAt:Date.now()};
      await new Promise((resolve,reject)=>{const tx=db.transaction('postcards','readwrite');tx.objectStore('postcards').put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();location.href='wall.html';
    }catch(error){console.error(error);alert('暂时无法保存到照片墙，请检查浏览器是否允许本地存储后重试。');button.disabled=false;button.innerHTML=original}
  }
  $('#publishBtn').onclick=publishToWall;
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('#undoBtn').click()}if(e.key==='Escape'&&!$('#previewScreen').hidden)$('#backToEdit').click()});
  syncUI();render();
})();
