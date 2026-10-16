'use client';

import { useRef, useState, type AnimationEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import type { AdvancedFilters, Brief } from '@shared/brief';
import { BATTERY_MAX, BUDGET_STEPS, BUDGET_TOP, RAM_STEPS, SCREEN_SIZES, STORAGE_STEPS } from '@shared/brief';
import type { CpuBrand, GpuBrand } from '@shared/catalog';
import { CPU_FAMILIES, GPU_FAMILIES } from '@shared/hardware';
import { DEFAULT_ADVANCED, SCREEN_TYPES, advancedActive } from '@/lib/advanced';
import { FORMS, USE_CASES, budgetValue, fmtStorage, step } from '@/lib/brief';
import { getLaptops, rankForBrief } from '@/lib/catalog';
import { useFitlap, useHydrated } from '@/store/useFitlap';
import { Logo } from '@/components/layout/Logo';
import { ScrollRow } from '@/components/layout/ScrollRow';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Odometer } from '@/components/controls/Odometer';
import { CircleToggle } from '@/components/controls/CircleToggle';
import { Pill } from '@/components/controls/Pill';
import { Stepper } from '@/components/controls/Stepper';
import { RangeTrack } from '@/components/controls/RangeTrack';
import { DualRange } from '@/components/controls/DualRange';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import s from './brief.module.css';

const RAIL_EASE = 'cubic-bezier(.12,.9,.25,1)';
const pct = (n: number) => 8 + ((n - BUDGET_STEPS[0]) / (BUDGET_TOP - BUDGET_STEPS[0])) * 92;
const PRINT = 'printIn 900ms cubic-bezier(.7,0,.2,1) backwards';
const WIPE_OUT = 'printOut 320ms cubic-bezier(.7,0,.2,1) forwards';
const WIPE_IN = 'printIn 620ms cubic-bezier(.7,0,.2,1) backwards';
const BRANDS = [...new Set(getLaptops().map((l) => l.brand))].sort();
const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function BriefClient() {
  const brief = useFitlap((st) => st.brief);
  const hydrated = useHydrated();
  const done = [brief.mode === 'advanced' ? advancedActive(brief.advanced) > 0 : brief.uses.length > 0, brief.forms.length > 0, true];

  return (
    <div className={s.wrap}>
      <header className={s.header}>
        <Logo />
        <div className={s.progress}>
          <span>Brief</span>
          <span className={s.dots}>
            {done.map((d, k) => (
              <span
                key={k}
                className={s.dot}
                style={{
                  animation: `popDot 500ms cubic-bezier(.3,1.6,.5,1) ${200 + k * 120}ms backwards`,
                  ...(d ? { background: 'var(--ink)', border: '1px solid var(--ink)' } : { border: '1px solid var(--faint)' }),
                }}
              />
            ))}
          </span>
          <span>{done.filter(Boolean).length} / 3</span>
        </div>
        <div className={s.actions}>
          <ThemeToggle />
          <Link href="/results" className={`ring ${s.skip}`}>Skip to results</Link>
        </div>
      </header>
      {/* Panels wait for the persisted brief so the defaults don't animate into it. */}
      {hydrated && <Panels brief={brief} />}
    </div>
  );
}

function Panels({ brief }: { brief: Brief }) {
  const { toggleUse, toggleForm, stepBudget, stepRam, stepStorage, setBrief } = useFitlap.getState();

  // Bumps on every real brief change: re-rails the minis and replays the empty-state shake.
  const sig = JSON.stringify(brief);
  const [seen, setSeen] = useState({ sig, n: 0 });
  if (seen.sig !== sig) setSeen({ sig, n: seen.n + 1 });

  const advanced = brief.mode === 'advanced';
  const active = advancedActive(brief.advanced);
  const setAdv = (patch: Partial<AdvancedFilters>) => setBrief({ advanced: { ...brief.advanced, ...patch } });

  // Mode swap: the old section wipes out, then the new one wipes in while the panel eases to its height.
  // `shown` lags brief.mode until the wipe-out ends; the panel height is pinned for the duration.
  const [shown, setShown] = useState(brief.mode);
  const [entering, setEntering] = useState(brief.mode === 'advanced');
  const [swaps, setSwaps] = useState(0);
  const [pinH, setPinH] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const swapRef = useRef<HTMLDivElement>(null);
  const leaving = shown !== brief.mode;
  const shownAdv = shown === 'advanced';
  const setMode = (mode: Brief['mode']) => {
    if (mode === brief.mode) return;
    setSwaps((n) => n + 1);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setShown(mode);
    else setPinH(mode === shown ? null : wrapRef.current!.offsetHeight); // switching back mid-wipe keeps the old section
    setBrief({ mode });
  };
  const onSwapEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (leaving) {
      flushSync(() => { setShown(brief.mode); setEntering(true); });
      setPinH(swapRef.current!.offsetHeight);
    } else {
      setEntering(false);
      setPinH(null);
    }
  };
  const swapAnim = leaving ? WIPE_OUT : entering ? WIPE_IN : undefined;

  const ranked = rankForBrief(brief);
  const count = ranked.length;
  const ramIdx = RAM_STEPS.indexOf(brief.minRamGb);
  const stoIdx = STORAGE_STEPS.indexOf(brief.minStorageGb);
  const topBudget = BUDGET_TOP;

  const fixes: { label: string; onClick: () => void }[] = [];
  if (advanced && active > 0) fixes.push({ label: 'Clear advanced filters', onClick: () => setAdv(DEFAULT_ADVANCED) });
  if (brief.budgetMax < topBudget) fixes.push({ label: 'Raise budget to ' + budgetValue(step(BUDGET_STEPS, brief.budgetMax, 1)), onClick: () => stepBudget(1) });
  if (brief.minRamGb > 16) fixes.push({ label: `Drop RAM to ${step(RAM_STEPS, brief.minRamGb, -1)} GB`, onClick: () => stepRam(-1) });
  if (brief.minStorageGb > 512) fixes.push({ label: 'Drop storage to ' + fmtStorage(step(STORAGE_STEPS, brief.minStorageGb, -1)), onClick: () => stepStorage(-1) });
  if (!brief.includeUsed) fixes.push({ label: 'Include used laptops', onClick: () => setBrief({ includeUsed: true }) });
  if (brief.forms.length > 1) fixes.push({ label: 'Loosen form filters', onClick: () => setBrief({ forms: brief.forms.includes('slim') ? ['slim'] : [] }) });

  return (
    <>
      <div className={s.top}>
        <section className={s.main}>
          <div className={s.titleRow}>
            <div className={s.titleCol}>
              <span className={s.label}>{shownAdv ? 'Advanced · pick any' : 'Use case · pick any'}</span>
              <h1 key={shown} className={s.title} style={{ animation: leaving ? WIPE_OUT : swaps ? WIPE_IN : PRINT }}>{shownAdv ? 'What’s inside?' : 'What’s it for?'}</h1>
            </div>
            <div className={s.titleSide}>
              <span className={s.label}>{shownAdv ? `${active} active` : `${brief.uses.length} selected`}</span>
              {shownAdv && active > 0 && <button className={s.clear} onClick={() => setAdv(DEFAULT_ADVANCED)}>Clear</button>}
              <ModeToggle advanced={advanced} onChange={setMode} />
            </div>
          </div>
          <div ref={wrapRef} style={pinH === null ? undefined : { height: pinH, overflow: 'hidden', transition: 'height .62s cubic-bezier(.7,0,.2,1)' }}>
          <div key={shown} ref={swapRef} style={swapAnim && { animation: swapAnim }} onAnimationEnd={onSwapEnd}>
            {shownAdv ? (
              <AdvancedPanel a={brief.advanced} set={setAdv} />
            ) : (
              <div className={s.grid}>
                {USE_CASES.map((u, i) => (
                  <CircleToggle key={u.key} className={s.uc} label={u.label} hint={u.hint} icon={u.icon} index={i} enter={swaps === 0} on={brief.uses.includes(u.key)} onClick={() => toggleUse(u.key)} />
                ))}
              </div>
            )}
          </div>
          </div>

          <div className={s.divider} style={{ animation: 'printIn 1200ms cubic-bezier(.7,0,.2,1) 500ms backwards' }} />

          <div className={s.formCol}>
            <h2 className={s.label}>Form</h2>
            <div className={s.pills}>
              {FORMS.map((f) => (
                <Pill key={f.key} on={brief.forms.includes(f.key)} onClick={() => toggleForm(f.key)}>{f.label}</Pill>
              ))}
            </div>
          </div>
        </section>

        <aside className={s.side}>
          <section className={s.budget}>
            <h2 className={s.label}>Budget</h2>
            <div className={s.budgetNum}>
              <span>{budgetValue(BUDGET_STEPS[0])}</span>
              <span className={s.to}>to</span>
              <Odometer value={budgetValue(brief.budgetMax)} rank={brief.budgetMax} height={44} />
            </div>
            <div className={s.budgetRow}>
              <button aria-label="Lower budget" className={`ring ${s.circle}`} onClick={() => stepBudget(-1)}>−</button>
              <RangeTrack from={8} to={pct(brief.budgetMax)} />
              <button aria-label="Raise budget" className={`ring ${s.circle}`} onClick={() => stepBudget(1)}>+</button>
            </div>
            <div className={s.center}>
              <button aria-pressed={brief.includeUsed} className={s.used} onClick={() => setBrief({ includeUsed: !brief.includeUsed })}>
                <span className={s.usedDot} style={{ background: brief.includeUsed ? 'var(--lime)' : 'var(--track)' }} />
                {brief.includeUsed ? 'Including used' : 'New only'}
              </button>
            </div>
          </section>
          <Stepper label="Memory (min)" note={brief.minRamGb >= 16 ? 'good for editing' : 'tight for editing'} value={`${brief.minRamGb} GB`} index={ramIdx} onStep={stepRam} />
          <Stepper label="Storage (min)" note="SSD" value={fmtStorage(brief.minStorageGb)} index={stoIdx} onStep={stepStorage} />
        </aside>
      </div>

      <section className={s.preview}>
        <div className={s.countCol}>
          <h2 className={s.label}>Live preview</h2>
          <span className={s.count}>
            <Odometer value={count} height={34} /> {count === 1 ? 'laptop fits' : 'laptops fit'}
          </span>
        </div>
        {count > 0 ? (
          <ScrollRow className={`no-scrollbar ${s.minis}`}>
            {ranked.map((r, i) => (
              <div key={`${seen.n}-${r.laptop.slug}`} className={s.mini} style={{ animation: `railInShort ${1000 + i * 90}ms ${RAIL_EASE} ${i * 50}ms backwards` }}>
                <LaptopDrawing shape={r.laptop.archetype} hot={r.hot} size="var(--mini-draw, 92px)" />
                <span className={s.miniName}>{r.laptop.model}</span>
              </div>
            ))}
          </ScrollRow>
        ) : (
          <EmptyState key={seen.n} fixes={fixes} />
        )}
        <Link
          href="/results"
          className={`cta ${s.cta}`}
          aria-disabled={count === 0}
          onClick={(e) => { if (count === 0) e.preventDefault(); }}
          style={count === 0 ? { background: 'var(--line2)', color: 'var(--sub)', pointerEvents: 'none' } : { background: 'var(--ink)', color: 'var(--on-ink)' }}
        >
          {count === 0 ? 'Adjust your brief' : `See ${count} ${count === 1 ? 'match' : 'matches'}`} <span className={`arw ${s.arw}`}>→</span>
        </Link>
      </section>
    </>
  );
}

/** Simple / Advanced segmented toggle with a sliding ink pill. */
function ModeToggle({ advanced, onChange }: { advanced: boolean; onChange: (m: Brief['mode']) => void }) {
  return (
    <div role="group" aria-label="Brief mode" className={s.modes}>
      <span className={s.modePill} style={{ transform: `translateX(${advanced ? 100 : 0}%)` }} />
      {(['simple', 'advanced'] as const).map((m) => {
        const on = (m === 'advanced') === advanced;
        return (
          <button key={m} aria-pressed={on} className={s.modeBtn} style={{ color: on ? 'var(--on-ink)' : 'var(--ink)' }} onClick={() => onChange(m)}>
            {m === 'simple' ? 'Simple' : 'Advanced'}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <div className={s.rowHead}>
        <span className={s.rowLabel}>{label}</span>
        <span className={s.rowHint}>{hint}</span>
      </div>
      <div className={s.rowBody}>{children}</div>
    </div>
  );
}

/** Range slider with tick labels under it (evenly spaced, so only ends or even steps) and the current span on the right. */
function RangeField({ label, min, max, value, onChange, format, ticks, readout }: {
  label: string; min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void;
  format: (n: number) => string; ticks: string[]; readout: string;
}) {
  return (
    <div className={s.rangeRow}>
      <div className={s.rangeCol}>
        <DualRange label={label} min={min} max={max} value={value} onChange={onChange} format={format} />
        <div className={s.ticks}>{ticks.map((t) => <span key={t}>{t}</span>)}</div>
      </div>
      <span className={s.readout}>{readout}</span>
    </div>
  );
}

/** Chip row of chip brands ("Any" first), then a model range within the picked brand. */
function BrandRange<B extends string>({ label, families, value, onChange }: {
  label: string;
  families: Record<B, string[]>;
  value: { brand: B | null; range: [number, number] };
  onChange: (v: { brand: B | null; range: [number, number] }) => void;
}) {
  const brands = Object.keys(families) as B[];
  const list = value.brand ? families[value.brand] : [];
  const [lo, hi] = value.range;
  const any = () => onChange({ brand: null, range: [0, 0] });
  return (
    <>
      <div className={s.chips}>
        <Pill on={!value.brand} onClick={any}>Any</Pill>
        {brands.map((b) => (
          <Pill key={b} on={value.brand === b} onClick={() => (value.brand === b ? any() : onChange({ brand: b, range: [0, families[b].length - 1] }))}>{b}</Pill>
        ))}
      </div>
      {list.length > 1 && (
        <div key={value.brand} style={{ animation: 'printIn 600ms cubic-bezier(.7,0,.2,1) backwards' }}>
          <RangeField
            label={label} min={0} max={list.length - 1} value={value.range} onChange={(range) => onChange({ brand: value.brand, range })}
            format={(i) => list[i]} ticks={[list[0], list[list.length - 1]]} readout={lo === hi ? list[lo] : `${list[lo]} to ${list[hi]}`}
          />
        </div>
      )}
    </>
  );
}

function batteryReadout([lo, hi]: [number, number]) {
  if (lo === 0 && hi === BATTERY_MAX) return 'Any';
  if (hi === BATTERY_MAX) return `${lo} h or more`;
  if (lo === 0) return `Up to ${hi} h`;
  return `${lo} to ${hi} h`;
}

/** Replaces "What's it for?" in advanced mode. Every group is a hard filter; empty means any. */
function AdvancedPanel({ a, set }: { a: AdvancedFilters; set: (patch: Partial<AdvancedFilters>) => void }) {
  return (
    <div className={s.adv}>
      <Row label="Brand" hint="any if none picked">
        <div className={s.chips}>
          {BRANDS.map((b) => <Pill key={b} on={a.brands.includes(b)} onClick={() => set({ brands: toggleIn(a.brands, b) })}>{b}</Pill>)}
        </div>
      </Row>
      <Row label="Processor" hint="brand, then model range">
        <BrandRange<CpuBrand> label="Processor model" families={CPU_FAMILIES} value={a.cpu} onChange={(cpu) => set({ cpu })} />
      </Row>
      <Row label="Graphics" hint="brand, then model range">
        <BrandRange<GpuBrand> label="Graphics model" families={GPU_FAMILIES} value={a.gpu} onChange={(gpu) => set({ gpu })} />
      </Row>
      <Row label="Battery life" hint="hours of web browsing">
        <RangeField
          label="Battery life" min={0} max={BATTERY_MAX} value={a.batteryH} onChange={(batteryH) => set({ batteryH })}
          format={(n) => (n === BATTERY_MAX ? `${n}+ hours` : `${n} hours`)} ticks={['0 h', '12 h', '24 h+']} readout={batteryReadout(a.batteryH)}
        />
      </Row>
      <Row label="Screen type" hint="any if none picked">
        <div className={s.chips}>
          {SCREEN_TYPES.map((t) => <Pill key={t.key} on={a.screens.includes(t.key)} onClick={() => set({ screens: toggleIn(a.screens, t.key) })}>{t.label}</Pill>)}
        </div>
      </Row>
      <Row label="Screen size" hint="any if none picked">
        <div className={s.chips}>
          {SCREEN_SIZES.map((n) => <Pill key={n} on={a.sizes.includes(n)} onClick={() => set({ sizes: toggleIn(a.sizes, n) })}>{n === 16 ? '16"+' : `${n}"`}</Pill>)}
        </div>
      </Row>
    </div>
  );
}
