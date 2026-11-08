/* TEST: themed half-hour picker; original selects and change handlers remain authoritative. */
(function(){
  const controls=[];
  for(const id of ['reminderEveningTime','reminderMorningTime']){
    const select=document.getElementById(id);
    if(!select)continue;
    const wrapper=document.createElement('span');wrapper.className='reminder-time-control';
    select.parentNode.insertBefore(wrapper,select);wrapper.appendChild(select);
    const trigger=document.createElement('button');trigger.type='button';trigger.className='reminder-time-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    const menu=document.createElement('div');menu.className='reminder-time-menu';menu.setAttribute('role','listbox');menu.hidden=true;
    const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
    for(const opt of select.options){
      const item=document.createElement('button');item.type='button';item.textContent=opt.textContent;item.dataset.value=opt.value;item.setAttribute('role','option');
      item.addEventListener('click',()=>{select.value=opt.value;select.dispatchEvent(new Event('change',{bubbles:true}));close();trigger.focus()});
      menu.appendChild(item);
    }
    const refresh=()=>{trigger.textContent=select.options[select.selectedIndex]?.textContent||select.value;menu.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===select.value)))};
    select.addEventListener('change',refresh);refresh();
    trigger.addEventListener('click',()=>{const opening=menu.hidden;controls.forEach(c=>c.close());if(opening){menu.hidden=false;trigger.setAttribute('aria-expanded','true');const active=menu.querySelector('[aria-selected="true"]');if(active)active.scrollIntoView({block:'nearest'})}});
    trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){if(menu.hidden){e.preventDefault();trigger.click()}}});
    wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){close();trigger.focus()}});
    wrapper.append(trigger,menu);controls.push({wrapper,close});
  }
  document.addEventListener('pointerdown',e=>{for(const c of controls)if(!c.wrapper.contains(e.target))c.close()});
})();

