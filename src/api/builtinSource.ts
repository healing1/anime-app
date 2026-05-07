import type { SourceProfile } from './sourceTypes';

// 非凡影视 — default source, verified 2026-05, ~5311 anime items
export const FFZY_TVBOX_SOURCE: SourceProfile = {
  id: 'tvbox-ffzy',
  name: '非凡影视 (ffzy)',
  type: 'tvbox',
  description: '非凡影视AppleCMS API — 5311部日韩动漫',
  baseUrl: 'https://ffzy.tv/api.php/provide/vod/',
  config: { animeTypeId: 30 },
  addedAt: Date.now(),
};

// Quantum (量子资源) — real AppleCMS API, verified 2026-05, ~4182 anime items
export const LIANGZI_TVBOX_SOURCE: SourceProfile = {
  id: 'tvbox-liangzi',
  name: '量子资源 (lziapi)',
  type: 'tvbox',
  description: '量子资源AppleCMS API — 4182部日韩动漫',
  baseUrl: 'https://cj.lziapi.com/api.php/provide/vod/',
  config: { animeTypeId: 30 },
  addedAt: Date.now(),
};

export const ALL_BUILTIN_SOURCES: SourceProfile[] = [
  FFZY_TVBOX_SOURCE,
  LIANGZI_TVBOX_SOURCE,
];

export function getExampleSourceJSON(): string {
  return JSON.stringify({
    name: '我的TVBox源',
    type: 'tvbox',
    baseUrl: 'https://example.com/api.php/provide/vod/',
    config: { animeTypeId: 30 },
  }, null, 2);
}
