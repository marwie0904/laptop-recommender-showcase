import type { CSSProperties } from 'react';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { PriceDelta } from '@/components/price/PriceDelta';
import { fmtUsd } from '@/lib/price';
import type { Scored } from '@/lib/scoring';
import s from './rail.module.css';

/** 1-based rank → "#01". */
export const rankTag = (n: number) => '#' + String(n).padStart(2, '0');
/** RAM · storage as on the prototype pills: "16 · 512", "32 · 1T". */
export const cfgLabel = (ramGb: number, storageGb: number) => `${ramGb} · ${storageGb >= 1024 ? storageGb / 1024 + 'T' : storageGb}`;

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
  const medal = MEDALS[rank - 1];
  const cls = [s.card, medal && s.medal, selected && s.sel].filter(Boolean).join(' ');
  return (
    <button className={cls} style={{ width, '--medal': medal } as CSSProperties} onClick={onPick} aria-pressed={selected}>
      <span className={s.top}><span className={medal && s.badge}>{rankTag(rank)}</span><span>{item.fit}%</span></span>
      <LaptopDrawing
        shape={l.shape}
        hot={item.hot}
        size={120}
        className={s.drawing}
        style={{ alignSelf: 'center' }}
        screen={<span className={s.cfg}>{cfgLabel(l.config.ramGb, l.config.storageGb)}</span>}
      />
      <span className={s.name}>{l.name}</span>
      <span className={s.prices}>
        <span className={s.priceText}>New {fmtUsd(l.price.newUsd)} · Used {fmtUsd(l.price.usedAvgUsd)}</span>
        <PriceDelta newUsd={l.price.newUsd} usedUsd={l.price.usedAvgUsd} style={{ flex: 'none' }} />
      </span>
      <span className={s.coupler} style={{ width: selected ? '44%' : '0%' }} />
    </button>
  );
}
