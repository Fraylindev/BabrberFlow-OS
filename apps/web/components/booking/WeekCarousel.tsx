'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

/** Native pan/scroll and snap keep vertical touch scrolling available. */
export function WeekCarousel({ weekStart, previous, next, children, disabled, onChange }: {
  weekStart: string; previous?: ReactNode; next?: ReactNode; children: ReactNode;
  disabled: boolean; onChange: (direction: number) => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const settled = useRef(true);
  const suppressClick = useRef(0);
  const wheelGesture = useRef({ last: 0, total: 0, moved: false });
  const pointer = useRef<{ x: number; y: number; left: number; mouse: boolean } | null>(null);
  const hasPrevious = previous !== undefined;
  const hasNext = next !== undefined;
  const change = useRef(onChange);
  useLayoutEffect(() => { change.current = onChange; }, [onChange]);
  useLayoutEffect(() => {
    const node = rail.current;
    if (!node) return;
    settled.current = true;
    const align = () => { node.scrollLeft = hasPrevious ? node.clientWidth : 0; };
    align();
    window.addEventListener('resize', align);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(align) : null;
    observer?.observe(node);
    return () => { observer?.disconnect(); window.removeEventListener('resize', align); };
  }, [weekStart, hasPrevious]);
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout>;
    const origin = () => hasPrevious ? node.clientWidth : 0;
    const scroll = () => {
      clearTimeout(timer);
      if (Math.abs(node.scrollLeft - origin()) > 8) suppressClick.current = Date.now() + 350;
      timer = setTimeout(() => {
        if (!settled.current || pointer.current) return;
        const distance = node.scrollLeft - origin();
        const direction = Math.abs(distance) >= node.clientWidth / 2 ? Math.sign(distance) : 0;
        if (!disabled && (direction < 0 && hasPrevious || direction > 0 && hasNext)) {
          settled.current = false;
          change.current(direction);
        } else if (Math.abs(distance) > 1) node.scrollTo({ left: origin(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }, 140);
    };
    const wheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (disabled || !settled.current || delta < 0 && !hasPrevious || delta > 0 && !hasNext) return;
      event.preventDefault();
      const gesture = wheelGesture.current;
      const now = Date.now();
      if (now - gesture.last > 200 || Math.sign(delta) !== Math.sign(gesture.total)) { gesture.total = 0; gesture.moved = false; }
      gesture.last = now;
      if (gesture.moved) return;
      const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1);
      gesture.total += pixels;
      if (Math.abs(gesture.total) < 40) return;
      gesture.moved = true;
      suppressClick.current = now + 350;
      node.scrollTo({ left: origin() + Math.sign(gesture.total) * node.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    node.addEventListener('scroll', scroll, { passive: true });
    node.addEventListener('wheel', wheel, { passive: false });
    return () => { clearTimeout(timer); node.removeEventListener('scroll', scroll); node.removeEventListener('wheel', wheel); };
  }, [disabled, hasPrevious, hasNext, weekStart]);
  return <div ref={rail} className="week-carousel" aria-label="Días próximos" aria-busy={disabled}
    onClickCapture={event => { if (Date.now() < suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}
    onPointerDown={event => {
      pointer.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, mouse: event.pointerType === 'mouse' };
    }}
    onPointerMove={event => {
      const start = pointer.current;
      if (!start || disabled) return;
      const dx = event.clientX - start.x;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
        suppressClick.current = Date.now() + 350;
        if (start.mouse) {
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.dragging = 'true';
          event.currentTarget.scrollLeft = start.left - dx;
        }
      }
    }}
    onPointerUp={event => { pointer.current = null; delete event.currentTarget.dataset.dragging; event.currentTarget.dispatchEvent(new Event('scroll')); }}
    onPointerCancel={() => { pointer.current = null; }}>
    {hasPrevious && <div className="week-panel" aria-hidden="true" inert>{previous}</div>}
    <div className="week-panel">{children}</div>
    {next !== undefined && <div className="week-panel" aria-hidden="true" inert>{next}</div>}
  </div>;
}
