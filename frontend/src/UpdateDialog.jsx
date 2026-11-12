import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function UpdateDialog({ open, onClose, title, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    else if (!open && ref.current.open) ref.current.close();
  }, [open]);
  return createPortal(<dialog ref={ref} className="update-dialog" aria-labelledby={titleId}
    onClose={onClose} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" autoFocus onClick={onClose} aria-label={`Close ${title}`} title="Close"><X size={24} /></button></header>
    <div className="update-dialog-content">{children}</div>
  </dialog>, document.body);
}
