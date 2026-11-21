// «Obre a Edge»: the natural voices of Microsoft Edge (Joana, Enric, Elvira, Álvaro…) exist only
// inside Edge. On Windows, from another browser or from the app installed with Chrome, the MP3
// dialog can open LECAA Docs in Edge with the open document, through Edge's own link scheme
// (microsoft-edge:https://…). Edge keeps its own storage, so the document travels in the link:
// title and content, compressed, in the fragment (#mp3=…), which never reaches the server. Images
// are left out (the MP3 does not need them, and they would make the link too long). Edge opens it
// as a new document of its list and shows the MP3 dialog.
//
// microsoft-edge: is not a documented public scheme (Edge may change it), and links that are too
// long may not reach Edge, so a long document is saved as .docx instead and Edge opens empty.

import type { JSONContent } from '@tiptap/core';

const UA = typeof navigator === 'undefined' ? '' : navigator.userAgent;
const MAX_LINK = 2000; // conservative: Chromium has been reported to limit app-protocol links to 2048

// Windows, not already in Edge, and a web address Edge can open.
export const canOpenInEdge = () => /Windows/.test(UA) && !/Edg\//.test(UA) && !('__TAURI_INTERNALS__' in window)
  && /^https?:$/.test(location.protocol) && typeof CompressionStream !== 'undefined';

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream)).arrayBuffer());
}

function withoutImages(node: JSONContent): JSONContent {
  return { ...node, content: node.content?.filter(n => n.type !== 'image').map(withoutImages) };
}

const appUrl = () => location.origin + location.pathname;

// The microsoft-edge: link with the document, or null when it would be too long.
export async function edgeLink(title: string, content: JSONContent): Promise<string | null> {
  const json = new TextEncoder().encode(JSON.stringify({ title, content: withoutImages(content) }));
  const link = `microsoft-edge:${appUrl()}#mp3=${toB64(await pipe(json, new CompressionStream('deflate-raw')))}`;
  return link.length <= MAX_LINK ? link : null;
}

// The link that opens the app in Edge with no document, only the MP3 dialog.
export const emptyEdgeLink = () => `microsoft-edge:${appUrl()}#mp3`;

// In Edge, when the app was opened from such a link: the document it brings (or only the request
// to show the MP3 dialog). The fragment is removed, so that a reload does not repeat it.
export async function readHandoff(): Promise<{ doc: { title: string; content: JSONContent } | null } | null> {
  const m = /^#mp3(?:=([\w-]+))?$/.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, '', appUrl() + location.search);
  if (!m[1]) return { doc: null };
  try {
    const doc = JSON.parse(new TextDecoder().decode(await pipe(fromB64(m[1]), new DecompressionStream('deflate-raw'))));
    return typeof doc?.title === 'string' && doc.content?.type === 'doc' ? { doc: { title: doc.title.slice(0, 200), content: withoutImages(doc.content) } } : { doc: null };
  } catch { return { doc: null }; }
}
