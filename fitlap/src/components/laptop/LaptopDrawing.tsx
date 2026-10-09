import type { CSSProperties, ReactNode } from 'react';
import type { LaptopShapeKey } from '@/data/types';
import { laptopShape } from './shapes';

interface Props {
  shape: LaptopShapeKey;
  /** Orange screen (high fit) vs grey. */
  hot?: boolean;
  /** 'lid' = lid open + power on (results); 'crt' = CRT power on (details). Override timings with lidStyle / screenStyle. */
  animate?: 'lid' | 'crt' | false;
  /** Wrapper width. Every inner dimension is a % of it. */
  size?: number | string;
  /** Hero screens: wider stripes, darker grey, 6px radius. */
  big?: boolean;
  /** Content on the screen. */
  screen?: ReactNode;
  screenStyle?: CSSProperties;
  lidStyle?: CSSProperties;
  style?: CSSProperties;
  className?: string;
  /** 1px floor line under the base. */
  floor?: boolean;
}

/** 100% CSS laptop. One component from 56px marquee chips to the 560px hero. */
export function LaptopDrawing({ shape, hot = true, animate = false, size = '100%', big = false, screen, screenStyle, lidStyle, style, className, floor = false }: Props) {
  const sh = laptopShape(shape);
  const screenBase: CSSProperties = {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: big ? 6 : 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hot ? 'var(--accent)' : big ? '#9C9C9C' : '#B8B8B8',
    backgroundImage: big
      ? 'repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0 2px, transparent 2px 13px)'
      : 'repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0 1px, transparent 1px 6px)',
    ...(animate === 'lid' && { animation: 'power 1500ms linear 150ms backwards' }),
    ...(animate === 'crt' && { animation: 'crtOn 1100ms cubic-bezier(.6,0,.2,1) 250ms backwards' }),
  };
  return (
    <div className={className} style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <div
        style={{
          ...sh.lid,
          transformOrigin: '50% 100%',
          ...(animate === 'lid' && { animation: 'lid 1000ms cubic-bezier(.3,.7,.3,1) 150ms backwards' }),
          ...lidStyle,
        }}
      >
        {sh.notch && <span style={sh.notch} />}
        <div style={{ ...screenBase, ...screenStyle }}>{screen}</div>
        {sh.chin && <span style={sh.chin} />}
      </div>
      {sh.hinge && (
        <div style={sh.hinge}>
          {sh.hl && <span style={sh.hl} />}
          {sh.hr && <span style={sh.hr} />}
        </div>
      )}
      <div style={sh.base}>
        {sh.bd1 && <span style={sh.bd1} />}
        {sh.bd2 && <span style={sh.bd2} />}
      </div>
      {floor && <div style={{ width: '118%', height: 1, background: 'var(--faint)', marginTop: 10 }} />}
    </div>
  );
}
