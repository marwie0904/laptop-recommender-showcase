import type { CSSProperties } from 'react';
import type { Price } from '@shared/catalog';
import { discountTierStyle, usedDiscountPct } from '@/lib/price';

interface Props {
  price: Price;
  /** Base font size; the ≥50% tier switches to `big`. */
  size?: number;
  big?: number;
  suffix?: string;
  style?: CSSProperties;
}

/** "−30%" used vs SRP in its discount colour tier (section 10). Text only. Renders nothing without both prices. */
export function PriceDelta({ price, size = 12, big = 15, suffix = '', style }: Props) {
  if (price.srpPhp === undefined || price.usedPhp === undefined) return null;
  const pct = usedDiscountPct(price.srpPhp, price.usedPhp);
  return (
    <span title="Used vs SRP" style={{ fontSize: size, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...discountTierStyle(pct, big), ...style }}>
      −{pct}%{suffix}
    </span>
  );
}
