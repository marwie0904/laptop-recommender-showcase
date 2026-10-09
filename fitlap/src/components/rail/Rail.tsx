import { Skeleton } from '@/components/feedback/Skeleton';
import { ScrollRow } from '@/components/layout/ScrollRow';
import type { Scored } from '@shared/scoring/fit';
import { MatchCard } from './MatchCard';
import s from './rail.module.css';

interface Props {
  items: Scored[];
  currentId: string;
  /** Card width from the density control. */
  width: number;
  /** Show 7 skeleton cards instead of the matches. */
  loading: boolean;
  /** Bump to replay the sleeper track. */
  replay: number;
  onPick: (id: string) => void;
}

/** Results match rail: cards arrive like braking cars over a scrolling sleeper track (section 5). */
export function Rail({ items, currentId, width, loading, replay, onPick }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ScrollRow className={`rail ${s.row}`}>
        {loading
          ? Array.from({ length: 7 }, (_, i) => <Skeleton key={i} width={width} index={i} />)
          : items.map((it, i) => (
              <span key={it.laptop.slug} style={{ flex: 'none', display: 'block', animation: `railIn ${1250 + i * 110}ms cubic-bezier(.12,.9,.25,1) ${i * 60}ms backwards` }}>
                <MatchCard item={it} rank={i + 1} selected={it.laptop.slug === currentId} width={width} onPick={() => onPick(it.laptop.slug)} />
              </span>
            ))}
      </ScrollRow>
      <div key={replay} className={s.track} style={{ animation: 'sleepers 1700ms cubic-bezier(.12,.9,.25,1) backwards' }} />
    </div>
  );
}
