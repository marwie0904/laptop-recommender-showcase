import type { CSSProperties } from 'react';
import type { Brief } from '@shared/brief';
import type { Laptop } from '@shared/catalog';
import { scoreForDisplay } from '@/lib/catalog';
import { canonicalCode } from '@/lib/configs';
import { configChips } from '@/lib/format';
import s from './ConfigSwitcher.module.css';

interface Props {
  laptop: Laptop;
  brief: Brief;
  value: string;
  onChange: (code: string) => void;
  style?: CSSProperties;
}

/** One chip per config (PLAN §1). Orange dot = fits the brief, hollow = outside it. Renders nothing for a single-config model. */
export function ConfigSwitcher({ laptop, brief, value, onChange, style }: Props) {
  if (laptop.configs.length < 2) return null;
  const fits = (code: string) => scoreForDisplay(laptop, brief, code).passes;
  const on = canonicalCode(laptop.configs, value);  // an exact duplicate shares its twin's chip
  return (
    <div className={s.wrap} style={style}>
      <div role="group" aria-label={laptop.model + ' configuration'} className={s.chips}>
        {configChips(laptop.configs).map(([code, text]) => (
          <button
            key={code}
            aria-pressed={code === on}
            title={fits(code) ? undefined : 'Outside your brief'}
            aria-label={fits(code) ? undefined : text + ', outside your brief'}
            onClick={() => code !== on && onChange(code)}
            className={code === on ? `${s.chip} ${s.on}` : s.chip}
          >
            <span className={`${s.dot} ${fits(code) ? s.fits : s.out}`} />
            {text}
          </button>
        ))}
      </div>
      {!fits(value) && <span className={s.note}><span className={`${s.dot} ${s.out}`} />Outside your brief</span>}
    </div>
  );
}
