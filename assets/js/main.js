(function(){
  const el = id=>document.getElementById(id);
  const dEl=el('d'), hEl=el('h'), mEl=el('m'), sEl=el('s');
  const statusEl=el('statusText');
  const yearLabel=el('yearLabel');
  const dateLabel=el('dateLabel');
  const todayBanner=el('todayBanner');
  const grid=el('grid');
  const foot=el('foot');

  // Helpers
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);

  function getThanksgivingDate(year){
    // 4th Thursday of November (US Thanksgiving)
    const nov1 = new Date(year, 10, 1); // 10 = novembre
    const day = nov1.getDay(); // 0=Dim..6=Sam
    const firstThu = 1 + ((4 - day + 7) % 7); // 1er jeudi
    const fourthThu = firstThu + 21;          // +3 semaines
    return new Date(year, 10, fourthThu);
  }
  function getBlackFridayDate(year){
    const tg = getThanksgivingDate(year);
    const bf = new Date(tg); bf.setDate(tg.getDate()+1);
    return bf; // heure locale
  }

  function formatDateLong(d){
    return new Intl.DateTimeFormat('fr-FR', {weekday:'long', year:'numeric', month:'long', day:'numeric'}).format(d);
  }

  function computeTarget(now){
    const yearNow = now.getFullYear();
    const bfThis = getBlackFridayDate(yearNow);
    const bfStart = startOfDay(bfThis);
    const bfEnd = endOfDay(bfThis);
    if (now < bfStart) return {year: yearNow, when: bfStart, state:'before'};
    if (now >= bfStart && now <= bfEnd) return {year: yearNow, when: bfStart, state:'today'};
    // Après le Black Friday -> année suivante
    const next = getBlackFridayDate(yearNow+1);
    return {year: next.getFullYear(), when: startOfDay(next), state:'after'};
  }

  let rafId = null;
  function tick(){
    const now = new Date();
    const target = computeTarget(now);
    const {year, when, state} = target;

    yearLabel.textContent = year;
    dateLabel.textContent = `Prochain Black Friday : ${formatDateLong(when)}`;

    // UI state
    if(state === 'today'){
      statusEl.textContent = `C'est aujourd'hui !`;
      grid.style.display = 'none';
      todayBanner.style.display = 'flex';
    } else {
      statusEl.textContent = `Prochain évènement`;
      grid.style.display = 'grid';
      todayBanner.style.display = 'none';
    }

    const diff = when - now; // ms jusqu'au début du jour J
    if (diff > 0) {
      const sec = Math.floor(diff/1000);
      const days = Math.floor(sec / 86400);
      const hours = Math.floor((sec % 86400)/3600);
      const mins = Math.floor((sec % 3600)/60);
      const secs = sec % 60;

      dEl.textContent = days.toString();
      hEl.textContent = hours.toString().padStart(2,'0');
      mEl.textContent = mins.toString().padStart(2,'0');
      sEl.textContent = secs.toString().padStart(2,'0');
    }

    const bfThisYear = getBlackFridayDate(new Date().getFullYear());
    const info = (state==='today') ? `Jour J : ${formatDateLong(bfThisYear)}` : `Calcul basé sur le 4ᵉ jeudi de novembre (Thanksgiving) + 1 jour.`;
    foot.textContent = info;

    rafId = window.requestAnimationFrame(tick);
  }

  // Boutons
  el('copyDate').addEventListener('click', () => {
    const now = new Date();
    const {when} = computeTarget(now);
    navigator.clipboard.writeText(formatDateLong(when)).then(()=>{
      statusEl.textContent = 'Date copiée dans le presse-papiers';
      setTimeout(()=>statusEl.textContent='Prochain évènement', 1600);
    }).catch(()=>{});
  });

  el('addCalendar').addEventListener('click', () => {
    const now = new Date();
    const {when} = computeTarget(now);
    // évènement journée entière
    const dtStart = new Date(when.getFullYear(), when.getMonth(), when.getDate());
    const dtEnd = new Date(when.getFullYear(), when.getMonth(), when.getDate()+1);
    const fmt = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//bf-countdown//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:bf-${when.getFullYear()}@local`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART;VALUE=DATE:${fmt(dtStart).slice(0,8)}`,
      `DTEND;VALUE=DATE:${fmt(dtEnd).slice(0,8)}`,
      `SUMMARY:Black Friday ${when.getFullYear()}`,
      'DESCRIPTION:Black Friday – évènement annuel',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], {type:'text/calendar'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `black-friday-${when.getFullYear()}.ics`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  tick();
  window.addEventListener('visibilitychange', ()=>{ if(document.hidden){cancelAnimationFrame(rafId);} else {tick();} });
})();
