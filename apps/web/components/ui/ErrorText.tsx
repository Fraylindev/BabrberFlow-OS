'use client';

import { useEffect, useState } from 'react';

/** El código solo llega cuando el formateador identifica un error inesperado. */
export function ErrorText({ message, tone = 'light' }: { message: string; tone?: 'light' | 'dark' }) {
  const [text, code] = message.split('\nCódigo de soporte: ');
  const validCode = code && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(code);
  return <>{text}{validCode && <SupportCode key={code} code={code} tone={tone} />}</>;
}

function SupportCode({ code, tone }: { code: string; tone: 'light' | 'dark' }) {
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (feedback !== 'Copiado') return;
    const timer = window.setTimeout(() => setFeedback(''), 2000);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setFeedback('Copiado');
    } catch {
      setFeedback('No se pudo copiar el código. Vuelve a intentarlo.');
    }
  }
  return (
    <span className={`mt-1 flex min-w-0 items-center gap-2 text-xs font-normal ${tone === 'light' ? 'text-gray-600' : 'text-[var(--color-muted)]'}`}>
      <span className="min-w-0 flex-1 truncate" title={`Código de soporte: ${code}`}>
        Código de soporte: {code}
      </span>
      <button
        type="button"
        aria-label="Copiar código de soporte"
        className="shrink-0 rounded px-2 py-1 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        onClick={() => void copy()}
      >
        {feedback === 'Copiado' ? 'Copiado' : 'Copiar'}
      </button>
      <span role="status" className="sr-only">{feedback}</span>
    </span>
  );
}
