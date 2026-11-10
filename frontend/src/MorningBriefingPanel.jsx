import { useEffect, useState } from 'react';
import './MorningBriefingPanel.css';

const timeLabel = value => new Date(value).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});
function Events({ events, empty }) {
  return events.length ? <ul>{events.map((event,index) => <li key={`${event.title}-${index}`}>
    <span>{event.all_day ? 'All day' : event.start ? timeLabel(event.start) : 'Time not specified'}</span>
    <div><strong>{event.title}</strong><small>{event.sources.join(' · ')}</small></div>
  </li>)}</ul> : <p>{empty}</p>;
}

export default function MorningBriefingPanel() {
  const [data,setData]=useState(null);
  const [error,setError]=useState(false);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    let alive=true,controller;
    const load=async()=>{
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),65000);
      try {
        const response=await fetch('/api/morning-briefing',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Unavailable');
        const result=await response.json();
        if(!result.schedule || !Array.isArray(result.agenda))throw new Error('Invalid response');
        if(alive){setData(result);setError(false);}
      }catch{if(alive)setError(true);}
      finally{clearTimeout(timeout);}
    };
    load();const timer=setInterval(load,300000);
    return()=>{alive=false;clearInterval(timer);controller?.abort();};
  },[]);
  return <section className="morning-panel" aria-label="Morning briefing">
    <button className="morning-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="morning-briefing-content">
      <span>☀ Morning briefing <small>{data?.schedule.enabled ? 'Weekdays · 7:30 AM Eastern · All Speakers' : 'Preview only · Scheduled playback disabled'}</small></span>
      <span>{open?'Close preview ↑':'Read preview ↓'}</span>
    </button>
    {open && <div id="morning-briefing-content" className="morning-content">
      {error ? <p role="alert">The preview could not be refreshed. No announcement was sent.</p> : !data ? <p>Checking calendars and weather…</p> : <>
        <div className="morning-heading"><div><p className="morning-eyebrow">{data.schedule.enabled?'Morning briefing':'Awaiting your approval'}</p>
          <h2>{new Date(`${data.date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</h2>
          <p>7:30 AM Eastern · Monday–Friday · Dashboard + All Speakers</p></div>
          <span className="morning-badge">{data.schedule.enabled?'Scheduled':'Not enabled'}</span>
        </div>
        <p className="morning-note">Sources checked {new Date(data.generated_at*1000).toLocaleString('en-US',{timeZone:'America/New_York'})} Eastern. Forecasts and events may change. {data.school_note}</p>
        {data.warnings.length>0 && <div className="morning-warning" role="alert">{data.warnings.map(w=><p key={w}>{w}</p>)}</div>}
        {data.delivery && <p className="morning-note">Scheduled run: {data.delivery.status.replaceAll('_',' ')}. This is a software result, not confirmation that sound was heard.</p>}
        <div className="morning-grid">
          <article><h3>Weather in Bethel</h3><p>{data.weather.summary}</p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Forecast: Open-Meteo</a></article>
          <article><h3>Bus-alert health</h3><p>{data.bus.summary}</p><small>This is not a bus-arrival announcement.</small></article>
          <article><h3>Family calendar</h3><Events events={data.agenda} empty={data.warnings.length?'Calendar information may be incomplete.':'No other events found in the calendars checked.'}/></article>
          <article><h3>School reminders</h3><Events events={data.school_reminders} empty="No reminders found in calendar titles. This does not confirm that school is open."/></article>
        </div>
        <details className="morning-script"><summary>Exact spoken preview · about {data.estimated_seconds} seconds</summary><p>{data.speech}</p></details>
        <p className="morning-note">No audio plays from this preview. {!data.schedule.enabled && 'Playback remains disabled until you approve it in chat. '}Bus alerts take priority; a briefing will skip a busy speaker group instead of interrupting it.</p>
      </>}
    </div>}
  </section>;
}
