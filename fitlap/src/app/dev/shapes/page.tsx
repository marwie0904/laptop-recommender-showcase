import type { Metadata } from 'next';
import type { Archetype as LaptopShapeKey } from '@shared/catalog';
import { getLaptops } from '@/lib/catalog';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { LAPTOP_SHAPES } from '@/components/laptop/shapes';
import s from './shapes.module.css';

export const metadata: Metadata = { title: 'Laptop shapes' };

// Prototype drawing widths; everything else is 208px.
const WIDTHS: Partial<Record<LaptopShapeKey, number>> = { creator: 230, workstation: 236, gamingThick: 226, budget: 196, detachable: 196, convertible: 190 };

export default function ShapesPage() {
  const laptops = getLaptops();
  const keys = Object.keys(LAPTOP_SHAPES) as LaptopShapeKey[];
  return (
    <div className={s.page}>
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.titleBox}>
            <span className={s.eyebrow}>Component · laptop drawing</span>
            <h1 className={s.title}>12 laptop shapes</h1>
          </div>
          <span className={s.intro}>
            Each laptop in the catalogue gets one of these. Screen ratio, bezels, notch, chin, hinge and base thickness change; the orange screen stays the same.
          </span>
        </div>
        <div className={s.grid}>
          {keys.map((key, i) => {
            const usedBy = laptops.find((l) => l.archetype === key);
            return (
              <article key={key} className={s.card}>
                <div className={s.stage}>
                  <LaptopDrawing
                    shape={key}
                    size={WIDTHS[key] ?? 208}
                    lidStyle={{ animation: `lid 1000ms cubic-bezier(.3,.7,.3,1) ${200 + i * 90}ms backwards` }}
                  />
                </div>
                <div className={s.nameRow}>
                  <span className={s.name}>{LAPTOP_SHAPES[key].name}</span>
                  <span className={s.key}>{key}</span>
                </div>
                <span className={s.note}>{LAPTOP_SHAPES[key].note}</span>
                <span className={`${s.used} ${usedBy ? s.usedOn : s.usedOff}`}>
                  {usedBy ? 'Used for: ' + usedBy.model : 'Not used by sample data yet'}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
