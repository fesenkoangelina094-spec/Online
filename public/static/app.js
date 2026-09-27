const $=id=>document.getElementById(id);
let publicServices=[],adminServices=[],adminKey='';
const params=new URLSearchParams(location.search);
const source=['telegram','instagram','viber'].includes(params.get('source'))?params.get('source'):'web';
const webApp=window.Telegram?.WebApp;
if(webApp?.initData){webApp.ready();webApp.expand();$('myBookingsButton').hidden=false}
async function api(path,options={}){
 const headers={'Content-Type':'application/json',...(adminKey&&path.includes('/admin/')?{'X-Admin-Key':adminKey}:{}),...(webApp?.initData?{'X-Telegram-Init-Data':webApp.initData}:{})};
 const response=await fetch(path,{...options,headers});const data=await response.json();
 if(!response.ok)throw Error(data.error||'Помилка запиту');return data;
}
function message(id,text,success=false){const el=$(id);el.textContent=text;el.classList.toggle('success',success)}
function option(select,value,text){let o=document.createElement('option');o.value=value;o.textContent=text;select.add(o)}
function fill(select,items,placeholder){select.replaceChildren();option(select,'',placeholder);items.forEach(item=>option(select,item.value,item.text))}
function groupedServices(list){return list.map(s=>({value:s.id,text:`${s.category} · ${s.name} — ${s.price} ₴`}))}
async function loadPublic(){publicServices=await api('/api/services');fill($('service'),groupedServices(publicServices),'Оберіть послугу');
 fill($('manualService'),groupedServices(publicServices),'Оберіть послугу');await loadDays();const profile=await api('/api/public-info');$('publicInfo').textContent=[profile.address,profile.contact].filter(Boolean).join(' · ')}
async function loadDays(){const days=await api('/api/days');fill($('day'),days.map(d=>({value:d,text:new Date(d+'T12:00:00').toLocaleDateString('uk-UA',{weekday:'long',day:'numeric',month:'long'})})),days.length?'Оберіть дату':'Майстер ще не відкрив години')}
async function loadSlots(serviceId,day,target){if(!serviceId||!day){fill($(target),[], 'Оберіть послугу й дату');return}
 const slots=await api(`/api/slots?service_id=${encodeURIComponent(serviceId)}&day=${encodeURIComponent(day)}`);
 fill($(target),slots.map(x=>({value:x,text:x})),slots.length?'Оберіть час':'Вільного часу немає')}
$('service').onchange=()=>{const s=publicServices.find(x=>x.id===$('service').value*1);$('serviceDetail').textContent=s?`${Math.floor(s.minutes/60)} год ${s.minutes%60} хв · ${s.price} ₴`:'';loadSlots($('service').value,$('day').value,'slot').catch(e=>message('clientMessage',e.message))};
$('day').onchange=()=>loadSlots($('service').value,$('day').value,'slot').catch(e=>message('clientMessage',e.message));
$('bookingForm').onsubmit=async e=>{e.preventDefault();message('clientMessage','Зберігаємо запис…');try{
 const data=await api('/api/bookings',{method:'POST',body:JSON.stringify({service_id:$('service').value,day:$('day').value,time:$('slot').value,name:$('name').value,phone:$('phone').value,source,booking_token:params.get('booking_token'),telegram_init_data:webApp?.initData})});
 message('clientMessage',`✓ Ви записані: ${data.day} о ${data.start}, ${data.service}. Збережіть дату та час.`,true);
 $('slot').value='';await loadSlots($('service').value,$('day').value,'slot');if(webApp?.initData)await loadMyBookings();
 }catch(err){message('clientMessage',err.message);await loadSlots($('service').value,$('day').value,'slot')}};
$('adminToggle').onclick=()=>{$('client').hidden=true;$('admin').hidden=false};
$('adminClose').onclick=()=>{$('admin').hidden=true;$('client').hidden=false};
async function loadMyBookings(){const list=await api('/api/my-bookings');const area=$('myBookings');area.replaceChildren();
 if(!list.length){area.textContent='Майбутніх записів немає';return}
 list.forEach(b=>{const box=document.createElement('div');box.className='booking';const label=document.createElement('b');label.textContent=`${b.day} ${String(Math.floor(b.start_min/60)).padStart(2,'0')}:${String(b.start_min%60).padStart(2,'0')} · ${b.service_name}`;
 const button=document.createElement('button');button.type='button';button.textContent='Скасувати';button.onclick=async()=>{if(!confirm('Скасувати запис?'))return;try{await api(`/api/my-bookings/${b.id}/cancel`,{method:'POST',body:'{}'});await loadMyBookings();await loadSlots($('service').value,$('day').value,'slot')}catch(e){message('clientMessage',e.message)}};
 const move=document.createElement('button');move.type='button';move.textContent='Перенести';move.onclick=async()=>{const day=prompt('Нова дата (РРРР-ММ-ДД)',b.day);if(!day)return;const slot=prompt('Час (ГГ:ХХ)');if(!slot)return;try{await api(`/api/my-bookings/${b.id}/move`,{method:'POST',body:JSON.stringify({day,time:slot})});await loadMyBookings()}catch(e){message('clientMessage',e.message)}};
 box.append(label,move,button);area.append(box)})}
$('myBookingsButton').onclick=()=>loadMyBookings().catch(e=>message('clientMessage',e.message));
function addInterval(start='10:00',end='18:00'){
 const row=document.createElement('div');row.className='interval';
 const a=document.createElement('input');a.type='time';a.value=start;
 const z=document.createElement('input');z.type='time';z.value=end;
 const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Видалити проміжок';remove.onclick=()=>row.remove();row.append(a,z,remove);$('intervals').append(row);
}
$('addInterval').onclick=()=>addInterval();
async function loadAdminDay(){const day=$('adminDay').value;if(!day)return;
 const data=await api('/api/admin/day?day='+encodeURIComponent(day));$('intervals').replaceChildren();data.openings.forEach(x=>addInterval(x.start,x.end));
 const container=$('bookings');container.replaceChildren();if(!data.bookings.length){container.textContent='Записів немає';}
 data.bookings.forEach(b=>{const card=document.createElement('div');card.className='booking';const title=document.createElement('b');title.textContent=`${b.start}–${b.end} · ${b.client_name}`;
 const info=document.createElement('small');info.textContent=`${b.service_name} · ${b.price} ₴ · ${b.phone} · ${b.source}`;
 const cancel=document.createElement('button');cancel.textContent='Скасувати';cancel.onclick=async()=>{if(!confirm('Скасувати цей запис?'))return;try{await api(`/api/admin/bookings/${b.id}/cancel`,{method:'POST',body:'{}'});await refreshAdmin()}catch(e){message('hoursMessage',e.message)}};
 const move=document.createElement('button');move.textContent='Перенести';move.onclick=async()=>{const newDay=prompt('Нова дата (РРРР-ММ-ДД)',b.day);if(!newDay)return;const newTime=prompt('Новий час (ГГ:ХХ)',b.start);if(!newTime)return;try{await api(`/api/admin/bookings/${b.id}/move`,{method:'POST',body:JSON.stringify({day:newDay,time:newTime})});await refreshAdmin()}catch(e){message('hoursMessage',e.message)}};
 const done=document.createElement('button');done.textContent='Виконано';done.onclick=async()=>{try{await api(`/api/admin/bookings/${b.id}/complete`,{method:'POST',body:'{}'});await refreshAdmin()}catch(e){message('hoursMessage',e.message)}};
 card.append(title,info,move,done,cancel);container.append(card)});await loadSlots($('manualService').value,day,'manualSlot');}
async function refreshAdmin(){await loadAdminDay();await loadClients();await loadStats();await loadDays()}
$('adminDay').onchange=()=>loadAdminDay().catch(e=>message('hoursMessage',e.message));
$('saveHours').onclick=async()=>{const intervals=[...document.querySelectorAll('#intervals .interval')].map(row=>({start:row.children[0].value,end:row.children[1].value}));
 try{await api('/api/admin/openings',{method:'PUT',body:JSON.stringify({day:$('adminDay').value,intervals})});message('hoursMessage','Години збережено',true);await loadDays();await loadAdminDay()}catch(e){message('hoursMessage',e.message)}};
$('copyWeek').onclick=async()=>{try{await api('/api/admin/copy-week',{method:'POST',body:JSON.stringify({day:$('adminDay').value})});message('hoursMessage','Розклад скопійовано на наступний тиждень',true);await loadDays()}catch(e){message('hoursMessage',e.message)}};
$('login').onclick=async()=>{adminKey=$('adminKey').value;try{adminServices=await api('/api/admin/services');$('adminKey').value='';$('loginPanel').hidden=true;$('adminContent').hidden=false;
 const now=new Date();const local=new Date(now.toLocaleString('en-US',{timeZone:'Europe/Kyiv'}));$('adminDay').value=`${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;
 renderEditor();await refreshAdmin();const settings=await api('/api/admin/settings');$('buffer').value=settings.buffer_minutes;$('address').value=settings.address||'';$('contact').value=settings.contact||''}catch(e){adminKey='';message('loginMessage',e.message)}};
if(webApp?.initData){api('/api/admin/services').then(()=>{$('adminToggle').click();$('login').click()}).catch(()=>{})}
$('manualService').onchange=()=>loadSlots($('manualService').value,$('adminDay').value,'manualSlot').catch(e=>message('manualMessage',e.message));
$('manualForm').onsubmit=async e=>{e.preventDefault();try{const b=await api('/api/admin/bookings',{method:'POST',body:JSON.stringify({service_id:$('manualService').value,day:$('adminDay').value,time:$('manualSlot').value,name:$('manualName').value,phone:$('manualPhone').value})});message('manualMessage',`Запис №${b.id} створено`,true);$('manualName').value='';$('manualPhone').value='';await refreshAdmin()}catch(err){message('manualMessage',err.message)}};
function renderEditor(){fill($('editService'),adminServices.map(s=>({value:s.id,text:`${s.name} · ${s.price} ₴${s.active?'':' (приховано)'}`})),'+ Нова послуга');$('editService').onchange=()=>{const s=adminServices.find(x=>x.id===$('editService').value*1);$('category').value=s?.category||'';$('serviceName').value=s?.name||'';$('minutes').value=s?.minutes||'';$('price').value=s?.price??'';$('active').checked=s?Boolean(s.active):true};}
$('serviceForm').onsubmit=async e=>{e.preventDefault();try{const data={id:$('editService').value||undefined,category:$('category').value,name:$('serviceName').value,minutes:$('minutes').value,price:$('price').value,active:$('active').checked};
 const result=await api('/api/admin/services',{method:'POST',body:JSON.stringify(data)});adminServices=await api('/api/admin/services');renderEditor();$('editService').value=result.id;$('editService').dispatchEvent(new Event('change'));await loadPublic();message('serviceMessage','Послугу збережено',true)}catch(err){message('serviceMessage',err.message)}};
async function loadClients(){const clients=await api('/api/admin/clients');const area=$('clients');area.replaceChildren();
 clients.forEach(c=>{const card=document.createElement('div');card.className='booking';const title=document.createElement('b');title.textContent=`${c.name} · ${c.phone}`;
 const details=document.createElement('small');details.textContent=`Завершених візитів: ${c.visits} · Оплачено: ${c.spent} ₴`;
 const open=document.createElement('button');open.textContent='Історія та нотатка';open.onclick=async()=>{const list=await api(`/api/admin/clients/${c.id}`);const box=$('clientHistory');box.replaceChildren();const h=document.createElement('h3');h.textContent=c.name;box.append(h);
 list.forEach(b=>{const line=document.createElement('p');line.textContent=`${b.day} · ${b.service_name} · ${b.status}`;box.append(line)});
 const note=document.createElement('textarea');note.value=c.note||'';note.maxLength=1000;note.placeholder='Нотатка майстра';const save=document.createElement('button');save.textContent='Зберегти нотатку';save.className='secondary';save.onclick=async()=>{await api(`/api/admin/clients/${c.id}/note`,{method:'POST',body:JSON.stringify({note:note.value})});await loadClients()};box.append(note,save)};
 card.append(title,details,open);area.append(card)})}
async function loadStats(){const data=await api('/api/admin/stats');const area=$('stats');area.replaceChildren();
 const summary=document.createElement('p');summary.textContent=`Клієнтів: ${data.summary.clients} · Записів: ${data.summary.bookings} · Завершено на ${data.summary.revenue} ₴ · Попереду: ${data.upcoming}`;area.append(summary);
 data.sources.forEach(x=>{const line=document.createElement('p');line.textContent=`${x.source}: ${x.count}`;area.append(line)})}
$('saveBuffer').onclick=async()=>{try{await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({buffer_minutes:$('buffer').value})});message('settingsMessage','Проміжок між клієнтами збережено',true);await loadAdminDay()}catch(e){message('settingsMessage',e.message)}};
$('saveProfile').onclick=async()=>{try{await api('/api/admin/profile',{method:'PUT',body:JSON.stringify({address:$('address').value,contact:$('contact').value})});message('settingsMessage','Контакти збережено',true);await loadPublic()}catch(e){message('settingsMessage',e.message)}};
$('calendarLink').onclick=async()=>{try{const result=await api('/api/admin/calendar-link');const box=$('calendarMessage');box.replaceChildren();const a=document.createElement('a');a.href=result.url;a.textContent=result.url;box.append(a)}catch(e){message('calendarMessage',e.message)}};
$('connectTelegram').onclick=async()=>{try{await api('/api/admin/connect-telegram',{method:'POST',body:'{}'});message('telegramMessage','Бота підключено',true)}catch(e){message('telegramMessage',e.message)}};
loadPublic().catch(err=>message('clientMessage',err.message));
