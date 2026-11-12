import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bus, AlertTriangle } from 'lucide-react';
import UpdateDialog from './UpdateDialog';
import './BusAlertPanel.css';

const labels = { pending: 'Waiting for announcement', submitted: 'Speech action completed',
  skipped: 'Skipped', failed: 'Announcement failed', unconfirmed: 'Announcement unconfirmed' };
const dateTime = value => value ? new Date(value * 1000).toLocaleString('en-US', {
  timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'
}) : 'Not available';

export default function BusAlertPanel({ toolbarTarget }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let alive = true;
    let controller;
    const poll = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('/api/bus-alerts', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        const result = await response.json();
        if (!Array.isArray(result.history) || !Array.isArray(result.warnings)) throw new Error('Invalid response');
        if (alive) { setData(result); setFailed(false); }
      } catch { if (alive) setFailed(true); }
      finally { clearTimeout(timeout); if (alive) setNow(Date.now()); }
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => { alive = false; clearInterval(timer); controller?.abort(); };
  }, []);
  const active = !failed && data?.active && now / 1000 - data.active.email_at < 600 ? data.active : null;
  const warnings = failed ? ['Dashboard cannot check bus alerts. Status is unknown; check FirstView directly.'] : data?.warnings || [];
  const history = data?.history || [];
  const status = warnings.length ? 'Needs attention' : data?.connected ? 'Monitoring connected' : 'Checking connection';
  return <>
    {toolbarTarget && createPortal(<button type="button" className={`calendar-update-button ${warnings.length ? 'needs-attention' : ''} ${active ? 'bus-active' : ''}`}
      aria-label="Bus monitor" title={`Bus monitor: ${status}`} aria-haspopup="dialog" aria-expanded={expanded} onClick={() => setExpanded(true)}>
      <Bus size={24} />{warnings.length > 0 && <AlertTriangle className="update-status-mark" size={14} />}
    </button>, toolbarTarget)}
    {active && <div className="bus-arrival" role="alert">
      <span aria-hidden="true">🚌</span><div><strong>Bus approaching — leave now</strong>
        <p>Bethel Middle School{active.children.length ? ` · ${active.children.join(' & ')}` : ''} · Email at {dateTime(active.email_at)}</p>
        <p>{labels[active.status]} · Check your stop; this is an email alert, not live bus tracking.</p></div>
    </div>}
    <UpdateDialog open={expanded} onClose={() => setExpanded(false)} title="Bus monitor">
    <section className="bus-panel" aria-label="School bus alerts">
    <p className="bus-help">{status}</p>
    {warnings.length > 0 && <div className="bus-warning" role="alert"><strong>Bus alert needs attention</strong>
      {warnings.map(warning => <p key={warning}>{warning}</p>)}
    </div>}
    {expanded && <div id="bus-history" className="bus-history">
      <p className="bus-help">Last checked: {dateTime(data?.checked_at)} Eastern. Keeps 30 days, up to 100 recent alerts shown. Speech completion does not prove sound was heard in every room. No-email mornings cannot be verified as failures.</p>
      {!history.length ? <p>No bus alerts recorded yet.</p> : <div className="bus-table-wrap"><table>
        <thead><tr><th>Email / received</th><th>Student</th><th>Result</th><th>Details</th></tr></thead>
        <tbody>{history.map(alert => <tr key={alert.key}>
          <td>{dateTime(alert.email_at)}<small>Detected {dateTime(alert.received)}</small></td>
          <td>{alert.children.join(' & ') || 'School bus'}</td>
          <td><span className={`bus-result bus-result-${alert.status}`}>{labels[alert.status]}</span></td>
          <td>{alert.detail}{alert.completed_at && <small>Completed {dateTime(alert.completed_at)}</small>}</td>
        </tr>)}</tbody>
      </table></div>}
      <p className="bus-help">History starts with the traces Home Assistant still retains, then records new alerts. Monitoring outages can leave gaps. Afternoon and duplicate alerts are listed as skipped.</p>
    </div>}
  </section>
  </UpdateDialog>
  </>;
}
