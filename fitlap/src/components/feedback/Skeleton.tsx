/** Rail placeholder card while results load (`skel` pulse, staggered .12 s). */
export function Skeleton({ width, index }: { width: number; index: number }) {
  return (
    <span
      aria-hidden
      style={{ flex: 'none', display: 'block', width, height: 236, borderRadius: 18, background: 'var(--skel)', animation: `skel 1.2s ease-in-out ${(index * 0.12).toFixed(2)}s infinite` }}
    />
  );
}
