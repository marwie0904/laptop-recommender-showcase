'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { toWebp } from '@/lib/resizeImage';
import { useAdminKey } from '../AdminShell';
import s from '../admin.module.css';

export function LaptopAdmin() {
  const key = useAdminKey();
  const slug = useSearchParams().get('slug');
  const laptop = useQuery(api.admin.laptops.get, slug ? { key, slug } : 'skip');
  const uploadUrl = useMutation(api.admin.photos.generateUploadUrl);
  const setPhoto = useMutation(api.admin.photos.set);
  const setStatus = useMutation(api.admin.laptops.setStatus);
  const [file, setFile] = useState<File | null>(null);
  const [credit, setCredit] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [license, setLicense] = useState('Press kit');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!slug) return <p className={s.page}>No laptop slug.</p>;
  if (laptop === undefined) return <p className={`${s.page} ${s.muted}`}>Loading…</p>;
  if (laptop === null) return <p className={s.page}>Laptop not found.</p>;

  async function put(blob: Blob): Promise<Id<'_storage'>> {
    const res = await fetch(await uploadUrl({ key }), { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return (await res.json()).storageId;
  }

  async function upload() {
    if (!file || !laptop || !slug) return;
    setBusy(true);
    setMsg('');
    try {
      const big = await toWebp(file, 1200);
      const small = await toWebp(file, 480);
      const storageId = await put(big.blob);
      const storageIdSmall = await put(small.blob);
      await setPhoto({
        key, slug, storageId, storageIdSmall, width: big.width, height: big.height,
        credit: credit.trim() || `${laptop.brand} press kit`, sourceUrl: sourceUrl.trim(), license: license.trim(),
      });
      setFile(null);
      setMsg('Photo saved. Promote this laptop to publish it.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const archived = laptop.status === 'archived';
  return (
    <div className={s.page}>
      <Link href="/admin" className={s.muted}>← All laptops</Link>
      <h1 className={s.h1}>{laptop.brand} {laptop.model} <span className={s.muted}>{laptop.slug} · {laptop.status}</span></h1>

      <h1 className={s.h1}>Photo</h1>
      {laptop.photo?.urlSmall ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a Convex storage URL */}
          <img src={laptop.photo.urlSmall} alt="" width={480} />
          <figcaption className={s.muted}>Image: {laptop.photo.credit} · {laptop.photo.license} · uploaded {laptop.photo.uploadedAt.slice(0, 10)}</figcaption>
        </figure>
      ) : <p className={s.muted}>No photo yet.</p>}
      <div className={s.form}>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input className={s.input} placeholder={`Credit (default: ${laptop.brand} press kit)`} value={credit} onChange={(e) => setCredit(e.target.value)} />
        <input className={s.input} placeholder="Source URL (press kit page)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        <input className={s.input} placeholder="License" value={license} onChange={(e) => setLicense(e.target.value)} />
        <button className={s.btn} disabled={busy || !file || !sourceUrl.trim()} onClick={upload}>Upload 480 + 1200 px WebP</button>
      </div>
      {msg && <p className={s.muted}>{msg}</p>}

      <h1 className={s.h1}>Status</h1>
      <div className={s.actions}>
        <button className={s.btnGhost} disabled={busy}
          onClick={() => setStatus({ key, slug, status: archived ? 'published' : 'archived' })}>
          {archived ? 'Publish again' : 'Archive (remove from the site on the next build)'}
        </button>
      </div>
    </div>
  );
}
