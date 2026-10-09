import type { CSSProperties } from 'react';
import { discountTierStyle, usedDiscountPct } from '@/lib/price';

interface Props {
  newUsd: number;
  usedUsd: number;
  /** Base font size; the ≥50% tier switches to `big`. */
  size?: number;
  big?: number;
  suffix?: string;
  style?: CSSProperties;
}

/** "−30%" in its discount colour tier (section 10). Text only. */
export function PriceDelta({ newUsd, usedUsd, size = 12, big = 15, suffix = '', style }: Props) {
  const pct = usedDiscountPct(newUsd, usedUsd);
  return (
    <span title="Used vs new" style={{ fontSize: size, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...discountTierStyle(pct, big), ...style }}>
      −{pct}%{suffix}
    </span>
  );
}
