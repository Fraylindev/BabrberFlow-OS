'use client';

import { useId, useRef, useState } from 'react';
import { FieldWrapper } from '@/components/ui/Field';
import { changePhoneNumber, countrySearch, PHONE_COUNTRIES, phoneDisplay, type PhoneDraft } from '@/lib/public-phone';

function Flag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || code === 'other') return <span aria-hidden="true" className="text-xs uppercase">{code === 'other' ? '+' : code}</span>;
  // Only a static country code is sent to the image provider.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://flagcdn.com/w40/${code}.png`} alt="" width={20} height={15} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export function PhoneField({ draft, onChange, error, onBlur }: {
  draft: PhoneDraft; onChange: (draft: PhoneDraft) => void; error?: string; onBlur: () => void;
}) {
  const popupId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const country = PHONE_COUNTRIES.find(item => item.code === draft.country);
  const options = [...PHONE_COUNTRIES, { code: 'other', name: 'Otro prefijo', dial: '' }].filter(item =>
    countrySearch(`${item.name} +${item.dial}`).includes(countrySearch(search)));
  function close() { setOpen(false); setSearch(''); trigger.current?.focus(); }
  return <FieldWrapper label="Teléfono" htmlFor="public-clientPhone" error={error}>
    <div className="phone-field" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close(); } }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setSearch(''); onBlur(); } }}>
      <div className="phone-input-group">
        <button ref={trigger} type="button" aria-label={`País y prefijo: ${country?.name ?? 'Otro prefijo'}${draft.dial ? ` +${draft.dial}` : ''}`}
          aria-expanded={open} aria-controls={popupId} onClick={() => { setOpen(value => !value); setSearch(''); if (!open) requestAnimationFrame(() => searchInput.current?.focus()); }} className="phone-country-trigger">
          <Flag key={draft.country} code={draft.country} /><span>{country ? `+${country.dial}` : 'Otro'}</span><span aria-hidden="true" className="text-xs">⌄</span>
        </button>
        {draft.country === 'other' && <input aria-label="Prefijo internacional" className="phone-custom-prefix" inputMode="tel" type="tel" placeholder="+" value={draft.dial ? `+${draft.dial}` : ''}
          onChange={event => onChange({ ...draft, dial: event.target.value.replace(/^\+/, '') })} />}
        <input id="public-clientPhone" name="nationalPhone" className="phone-national" type="tel" inputMode="tel" autoComplete="tel-national" required
          aria-invalid={Boolean(error)} aria-describedby={error ? 'public-clientPhone-error' : undefined}
          value={phoneDisplay(draft)} onChange={event => {
            const input = event.currentTarget;
            const position = input.selectionStart ?? input.value.length;
            const digitsBefore = input.value.slice(0, position).replace(/\D/g, '').length;
            const next = changePhoneNumber(draft, input.value); onChange(next);
            if (next.country === draft.country && next.dial === draft.dial) requestAnimationFrame(() => {
              if (document.activeElement !== input) return;
              let caret = 0, seen = 0;
              while (caret < input.value.length && seen < digitsBefore) { if (/\d/.test(input.value[caret])) seen++; caret++; }
              input.setSelectionRange(caret, caret);
            });
          }} />
      </div>
      {open && <div id={popupId} className="phone-country-popup" role="region" aria-label="Elegir país y prefijo">
        <label htmlFor={`${popupId}-search`} className="sr-only">Buscar país o prefijo</label>
        <input id={`${popupId}-search`} ref={searchInput} className="booking-input" type="search" autoComplete="off" placeholder="Buscar país o prefijo…" value={search} onChange={event => setSearch(event.target.value)} />
        <ul>{options.map(item => <li key={item.code}><button type="button" aria-pressed={draft.country === item.code} onClick={() => {
          onChange({ country: item.code, dial: item.dial, national: draft.national }); close();
        }}><Flag code={item.code} /><span>{item.name}</span><span>{item.dial ? `+${item.dial}` : ''}</span></button></li>)}</ul>
        {!options.length && <p role="status">No encontramos ese país o prefijo.</p>}
      </div>}
    </div>
  </FieldWrapper>;
}
