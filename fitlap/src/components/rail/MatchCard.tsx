import type { CSSProperties } from 'react';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { PriceDelta } from '@/components/price/PriceDelta';
import { priceLine } from '@/lib/price';
import type { Scored } from '@shared/scoring/fit';
import s from './rail.module.css';

/** 1-based rank → "#01". */
export const rankTag = (n: number) => '#' + String(n).padStart(2, '0');

/** Gold, silver, bronze for ranks 1–3. */
const MEDALS = ['#D4A62A', '#A9B0BA', '#B9773F'];

interface Props {
  item: Scored;
  rank: number;
  selected: boolean;
  width: number;
  onPick: () => void;
}

/** Results rail card: rank, fit, drawing with config pill, name, new/used prices. */
export function MatchCard({ item, rank, selected, width, onPick }: Props) {
  const l = item.laptop;
  const c = item.config;
  const medal = MEDALS[rank - 1];
  const cls = [s.card, medal && s.medal, selected && s.sel].filter(Boolean).join(' ');
  return (
    <button className={cls} style={{ width, '--medal': medal } as CSSProperties} onClick={onPick} aria-pressed={selected}>
      <span className={s.top}><span className={medal && s.badge}>{rankTag(rank)}</span><span>{item.fit}%</span></span>
      <LaptopDrawing
        shape={l.archetype}
        hot={item.hot}
        size={120}
        className={s.drawing}
        style={{ alignSelf: 'center' }}
        screen={<span className={s.cfg}>{c.label}</span>}
      />
      <span className={s.name}>{l.model}</span>
      <span className={s.prices}>
        <span className={s.priceText}>{priceLine(c.price)}</span>
        <PriceDelta price={c.price} style={{ flex: 'none' }} />
      </span>
      <span className={s.coupler} style={{ width: selected ? '44%' : '0%' }} />
    </button>
  );
}
