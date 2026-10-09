const dashed = '1.5px dashed var(--faint)';

/**
 * Zero-match preview: shakes on mount (`nope`), dashed laptop with "0", up to 3 one-tap fixes.
 * Give it a changing `key` to replay the shake and the fix rail.
 */
export function EmptyState({ fixes }: { fixes: { label: string; onClick: () => void }[] }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, animation: 'nope 520ms cubic-bezier(.3,.7,.3,1) backwards' }}>
      <span aria-hidden style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 96 }}>
        <span style={{ width: 92, aspectRatio: '16 / 10', boxSizing: 'border-box', border: dashed, borderRadius: '5px 5px 1px 1px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 300, color: 'var(--sub)' }}>0</span>
        <span style={{ width: 106, height: 5, border: dashed, borderTop: 0, borderRadius: '0 0 5px 5px', boxSizing: 'border-box' }} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 16 }}>Nothing fits this brief yet. Try one of these:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fixes.slice(0, 3).map((fx, i) => (
            <button
              key={fx.label}
              className="ring"
              onClick={fx.onClick}
              style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', fontSize: 14, fontWeight: 400, cursor: 'pointer', animation: `railInShort ${800 + i * 120}ms cubic-bezier(.12,.9,.25,1) ${i * 70}ms backwards` }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              {fx.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
