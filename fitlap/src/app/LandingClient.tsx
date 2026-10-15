'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Brief } from '@shared/brief';
import type { Archetype, Catalog, Price } from '@shared/catalog';
import { USE_CASES, budgetCap, fmtStorage } from '@/lib/brief';
import { fmtDate, fmtPhp, priceLine } from '@/lib/price';
import { LaptopDrawing } from '@/components/laptop/LaptopDrawing';
import { DotFitChart } from '@/components/charts/DotFitChart';
import { PriceDelta } from '@/components/price/PriceDelta';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { Logo } from '@/components/layout/Logo';
import { Accordion } from '@/components/layout/Accordion';
import { useFitlap } from '@/store/useFitlap';
import s from './landing.module.css';

// ── Props: scored at build time by page.tsx, so / never loads the catalog ─────
export type Chip = { slug: string; model: string; archetype: Archetype; hot: boolean; price: Price };
export type Match = Chip & { fit: number };
/** A demo brief with its ranking: fit count, best match's axes, top 3. */
export type Preset = { label: string; hint: string; brief: Brief; count: number; axes: [number, number, number, number]; top: Match[] };

const AUTO_MS = 4200;

const NAV = [['#demo', 'See it work'], ['#why', 'Why I built it'], ['#faq', 'FAQ']];
const FAQ = [
  { q: 'Where do used prices come from?', a: 'SRP is the brand’s official Philippine price. Used prices are estimates compiled from public sources with AI help, then reviewed by hand. Each laptop shows when its price was last checked.' },
  { q: 'How is fit scored?', a: 'Your use cases weight the specs. Your filters decide what makes the list.' },
  { q: 'Is it free?', a: 'Yes. No account needed.' },
  { q: 'Do you earn from links?', a: 'No — we don’t link to sellers.' },
];

/** Scroll-linked animation: shorthand first, then timeline and range (the shorthand resets them). */
const onView = (animation: string, range: string): CSSProperties => ({ animation, animationTimeline: 'view()', animationRange: range });

const HERO_SCREEN: CSSProperties = {
  animation: 'power 1600ms linear 450ms backwards',
  flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between',
  padding: '14px 16px', boxSizing: 'border-box', color: '#FFFFFF',
};

export function LandingClient({ top, marquee, presets, stats }: { top: Match; marquee: Chip[]; presets: Preset[]; stats: Catalog['stats'] }) {
  const [demo, setDemo] = useState({ preset: 0, run: 0 });
  const [auto, setAuto] = useState(true);
  const setBrief = useFitlap((st) => st.setBrief);
  const select = useFitlap((st) => st.select);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setDemo((d) => ({ preset: (d.preset + 1) % presets.length, run: d.run + 1 })), AUTO_MS);
    return () => clearInterval(t);
  }, [auto, presets.length]);

  const pick = (i: number) => {
    setAuto(false);
    setDemo((d) => ({ preset: i, run: d.run + 1 }));
  };

  const { brief, count, axes, top: matches } = presets[demo.preset];
  const vals = [['Budget', budgetCap(brief.budgetMax)], ['RAM', brief.minRamGb + ' GB'], ['Storage', fmtStorage(brief.minStorageGb)]];

  return (
    <>
      <header className={s.header}>
        <div className={s.hdr}>
          <Logo href="#top" />
          <nav aria-label="Page" className={s.nav}>
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className={`ring ${s.pill}`}>{label}</a>
            ))}
          </nav>
          <div className={s.hdrEnd}>
            <ThemeToggle />
            <Link href="/brief" className={`cta ${s.inkBtn} ${s.btnHdr}`}>
              Find my laptop <span className={`arw ${s.arwDot} ${s.arwSm}`}>→</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section id="top" className={s.hero}>
          <div className={s.hpad}>
            <div className={s.heroRow}>
              <div className={s.heroCopy}>
                <span className={s.tag} style={{ animation: 'floatIn 600ms cubic-bezier(.2,.9,.2,1) 100ms backwards' }}>
                  <span className={s.limeDot} />Prices hand-checked{stats.latestPriceCheck && ' · updated ' + fmtDate(stats.latestPriceCheck)}
                </span>
                <h1 className={s.h1}>
                  <span className={s.line} style={{ animation: 'printIn 900ms cubic-bezier(.7,0,.2,1) 150ms backwards' }}>The right laptop,</span>
                  <span className={s.line} style={{ animation: 'printIn 900ms cubic-bezier(.7,0,.2,1) 350ms backwards' }}>
                    priced <span className={s.orange}>new</span> and <span className={s.sub}>used.</span>
                  </span>
                </h1>
                <p className={s.lead} style={{ animation: 'floatIn 700ms cubic-bezier(.2,.9,.2,1) 650ms backwards' }}>
                  Your use case in. A ranked shortlist out, priced new and used.
                </p>
                <div className={s.ctas} style={{ animation: 'floatIn 700ms cubic-bezier(.2,.9,.2,1) 800ms backwards' }}>
                  <Link href="/brief" className={`cta ${s.inkBtn} ${s.btnHero} ${s.hbtn}`}>
                    Start my brief <span className={`arw ${s.arwDot}`}>→</span>
                  </Link>
                  <a href="#demo" className={`ring ${s.outBtn} ${s.hbtn}`}>Watch it work</a>
                </div>
              </div>

              <div className={s.heroArt}>
                <div className={s.hlap} style={{ animation: 'deckHero 900ms cubic-bezier(.2,.9,.2,1) 200ms backwards' }}>
                  <LaptopDrawing
                    shape={top.archetype}
                    hot={top.hot}
                    big
                    floor
                    lidStyle={{ animation: 'lidHero 1100ms cubic-bezier(.3,.7,.3,1) 450ms backwards' }}
                    screenStyle={HERO_SCREEN}
                    screen={
                      <>
                        <span className={s.scrTop}>FITLAP · #01</span>
                        <span className={s.scrFit}>{top.fit}%</span>
                        <span className={s.scrFoot}>fit for coding + editing</span>
                      </>
                    }
                  />
                </div>
                <div className={s.tagL} style={{ animation: 'floatIn 600ms cubic-bezier(.2,1.2,.4,1) 1500ms backwards' }}>
                  <div className={s.priceTag} style={{ animation: 'bob 4s ease-in-out 2.2s infinite' }}>
                    <span className={s.tagK}>SRP</span>
                    <span className={s.tagV}>{top.price.srpPhp !== undefined ? fmtPhp(top.price.srpPhp) : 'Used only'}</span>
                  </div>
                </div>
                <div className={s.tagR} style={{ animation: 'floatIn 600ms cubic-bezier(.2,1.2,.4,1) 1700ms backwards' }}>
                  <div className={`dark-scope ${s.priceTag} ${s.priceTagDark}`} style={{ animation: 'bob 4.6s ease-in-out 2.6s infinite' }}>
                    <span className={`${s.tagK} ${s.tagKDark}`}>Used estimate</span>
                    <span className={s.tagV}>
                      {top.price.usedPhp !== undefined ? fmtPhp(top.price.usedPhp) : '—'} <PriceDelta price={top.price} size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={s.hmarq}>
              <div className={`marq ${s.marqTrack}`}>
                {[...marquee, ...marquee].map((l, i) => (
                  <div key={`${l.slug}-${i}`} className={s.mchip} aria-hidden={i >= marquee.length || undefined}>
                    <LaptopDrawing shape={l.archetype} hot={l.hot} size={56} style={{ flex: 'none' }} />
                    <span className={s.mtext}>
                      <span className={s.mname}>{l.model}</span>
                      <span className={s.mprice}>
                        {priceLine(l.price)}{' '}
                        <PriceDelta price={l.price} size={12} big={13} />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className={`${s.sec} ${s.stats}`}>
          <div className={s.astats}>
            {[[String(stats.laptops), 'laptops tracked'], [String(stats.sources), 'sources cited'], ['~1 min', 'to your shortlist']].map(([v, k]) => (
              <div key={k} className={s.stat}>
                <span className={s.astat}>{v}</span>
                <span className={s.statK}>{k}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 01 · See it work ── */}
        <section id="demo" className={`${s.sec} ${s.demo}`}>
          <div className={s.secHead}>
            <div className={s.secTitle}>
              <span className={s.eyebrow}>01 · See it work</span>
              <h2 className={s.h2} style={onView('printIn 1s cubic-bezier(.7,0,.2,1) both', 'entry 10% cover 35%')}>
                Change the brief. Watch the list move.
              </h2>
            </div>
            <button className={`ring ${s.autoBtn}`} aria-pressed={auto} onClick={() => setAuto(!auto)}>
              <span className={s.autoDot} style={{ background: auto ? 'var(--accent)' : 'var(--track)' }} />
              {auto ? 'Auto-playing · pause' : 'Paused · play'}
            </button>
          </div>

          <div className={s.drow2}>
            <div className={`${s.dpanel} ${s.dbrief}`}>
              <span className={s.panelLabel}>The brief</span>
              <div className={s.presets}>
                {presets.map((p, i) => {
                  const on = i === demo.preset;
                  return (
                    <button key={p.label} aria-pressed={on} onClick={() => pick(i)} className={`${s.preset}${on ? ' ' + s.presetOn : ''}`}>
                      <span className={s.presetRow}><span>{p.label}</span><span className={s.presetHint}>{p.hint}</span></span>
                      <span className={s.presetBar} style={on && auto ? { animation: `loadbar ${AUTO_MS}ms linear backwards` } : { transform: 'scaleX(0)' }} />
                    </button>
                  );
                })}
              </div>
              <div className={s.dhide}>
                <span className={s.smallLabel}>Use case</span>
                <div className={s.uchips}>
                  {USE_CASES.map((u, i) => (
                    <span key={u.key} className={`${s.uchip}${brief.uses.includes(u.key) ? ' ' + s.uchipOn : ''}`} style={{ '--d': `${i * 0.04}s` } as CSSProperties}>
                      <span className={s.udot} />{u.chip}
                    </span>
                  ))}
                </div>
              </div>
              <div className={s.dvals}>
                {vals.map(([k, v], i) => (
                  <div key={k} className={s.val}>
                    <span className={s.valK}>{k}</span>
                    <span className={s.valBox}>
                      <span key={demo.run} className={s.valV} style={{ animation: `rollUp 450ms cubic-bezier(.2,.9,.2,1) ${i * 70}ms backwards` }}>{v}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${s.dpanel} ${s.dchart}`}>
              <span className={s.axisLabel}>Performance</span>
              <div className={s.chartRow}>
                <span className={`${s.axisLabel} ${s.vert} ${s.flip}`}>Value</span>
                <DotFitChart key={demo.run} fast axes={axes} className={s.dcg} />
                <span className={`${s.axisLabel} ${s.vert}`}>Portability</span>
              </div>
              <span className={s.axisLabel}>Battery</span>
            </div>

            <div className={s.dlist}>
              <div className={s.listHead}>
                <span className={s.panelLabel}>Top matches</span>
                <span className={s.count}>
                  <span className={s.countBox}>
                    <span key={demo.run} className={s.countV} style={{ animation: 'rollUp 450ms cubic-bezier(.2,.9,.2,1) backwards' }}>{count}</span>
                  </span>
                  <span className={s.countUnit}>fit</span>
                </span>
              </div>
              {count === 0 && <p className={s.empty}>Nothing fits this brief yet.</p>}
              {matches.map((r, i) => (
                <div
                  key={`${demo.run}-${r.slug}`}
                  className={s.match}
                  style={{ background: i === 0 ? 'var(--raised)' : 'var(--card2)', animation: `railInLanding ${1000 + i * 140}ms cubic-bezier(.12,.9,.25,1) ${i * 80}ms backwards` }}
                >
                  <span className={s.rank}>#0{i + 1}</span>
                  <LaptopDrawing shape={r.archetype} hot={r.hot} size={72} style={{ flex: 'none' }} />
                  <span className={s.mtext2}>
                    <span className={s.matchName}>{r.model}</span>
                    <span className={s.mprice}>
                      {priceLine(r.price)}{' '}
                      <PriceDelta price={r.price} size={12} big={13} />
                    </span>
                  </span>
                  <span className={s.matchFit}>{r.fit}<span className={s.pct}>%</span></span>
                </div>
              ))}
              <Link href="/results" onClick={() => { setBrief(brief); select(matches[0]?.slug ?? ''); }} className={`cta ${s.lineBtn}`}>Open the full results <span className="arw">→</span></Link>
            </div>
          </div>
        </section>

        {/* ── 02 · Why I built this (always dark) ── */}
        <section id="why" className={s.sec}>
          <div className={`dark-scope ${s.why}`}>
            <div className={s.wimg}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images: a plain img with srcSet does the same */}
              <img
                src="/marwie-halftone-600.webp"
                srcSet="/marwie-halftone-600.webp 600w, /marwie-halftone-1100.webp 1100w"
                sizes="(max-width: 640px) 300px, 520px"
                width={1100}
                height={900}
                alt="Mar Wie Ang"
                loading="lazy"
                decoding="async"
                className={s.portrait}
                style={onView('windReveal 1.6s steps(18, end) both', 'entry 5% cover 45%')}
              />
            </div>
            <div className={s.whyText}>
              <span className={s.whyEyebrow}>02 · Why I built this</span>
              <p className={s.quote} style={onView('printIn 1.2s cubic-bezier(.7,0,.2,1) both', 'entry 10% cover 40%')}>
                &quot;You kept asking on my lives which laptop to buy. So I built <span className={s.orange}>the answer</span>.&quot;
              </p>
              <p className={s.whyLine}>
                Pick your use case and budget, and FITLAP ranks the laptops that actually fit, priced at SRP and used. I built it as the showcase
                project for my free course on going from an AI workflow to a production-ready app.
              </p>
              <div className={s.whyLinks}>
                <span className={s.whyName}>Mar Wie Ang</span>
                <a href="https://marwieang.com" className={s.whyLink}>marwieang.com</a>
                <a href="https://www.tiktok.com/@marwie_ang" className={s.whyLink}>TikTok @marwie_ang</a>
                <a href="https://course.marwieang.com" className={s.whyLink}>Take the free course →</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 · FAQ ── */}
        <section id="faq" className={`${s.sec} ${s.faq}`}>
          <div className={s.faqHead}>
            <span className={s.eyebrow}>03 · FAQ</span>
            <h2 className={s.h2}>Questions, answered.</h2>
          </div>
          <div className={s.faqList}>
            <Accordion items={FAQ} />
          </div>
        </section>

        {/* ── Closing CTA + footer ── */}
        <section className={`${s.sec} ${s.last}`}>
          <div className={s.closing}>
            <h2 className={`${s.h2} ${s.closingH}`}>Five filters. One shortlist.</h2>
            <p className={s.closingSub}>~1 min · no account</p>
            <Link href="/brief" className={`cta ${s.inkBtn} ${s.btnClose}`}>
              Find my laptop <span className={`arw ${s.arwDot}`}>→</span>
            </Link>
          </div>
          <footer className={s.footer}>
            <span>© FITLAP · prices are estimates, check the seller before buying</span>
            <span className={s.footLinks}>
              <Link href="/results">Results</Link>
              <Link href="/compare">Compare</Link>
              <a href="#faq">FAQ</a>
              <Link href="/legal">Legal</Link>
            </span>
          </footer>
        </section>
      </main>
    </>
  );
}
