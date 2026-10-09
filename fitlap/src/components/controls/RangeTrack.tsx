const EASE = '.6s cubic-bezier(.2,.8,.2,1)';

function Knob({ left, move }: { left: number; move?: boolean }) {
  return (
    <span style={{ position: 'absolute', top: -9, marginLeft: -9, width: 18, height: 18, borderRadius: '50%', background: 'var(--knob)', display: 'flex', alignItems: 'center', justifyContent: 'center', left: `${left}%`, transition: move ? `left ${EASE}` : undefined }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--ink)' }} />
    </span>
  );
}

/** Visual budget range: 1px track, ink fill between `from` and `to` (percent), 18px knobs. The max end glides over .6s. */
export function RangeTrack({ from, to }: { from: number; to: number }) {
  return (
    <div aria-hidden style={{ flex: 1, position: 'relative', height: 1, background: 'var(--track)' }}>
      <div style={{ position: 'absolute', left: `${from}%`, top: 0, height: 1, background: 'var(--ink)', transition: `right ${EASE}`, right: `${100 - to}%` }} />
      <Knob left={from} />
      <Knob left={to} move />
    </div>
  );
}
