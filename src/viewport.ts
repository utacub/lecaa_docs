// The on-screen keyboard of the operating system covers the bottom of the screen. Chrome on
// Android shrinks the page (interactive-widget in index.html); Safari on iPad, and Chrome and
// Edge with the Windows touch keyboard, only shrink the visible area (visualViewport). The app
// is fitted to that area, so the toolbars stay in place and the caret is never hidden.

import type { Editor } from '@tiptap/core';

export function fitToVisibleArea(editor: Editor) {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  let raf = 0;
  const fit = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      // Pinch zoom also shrinks the visible area: the layout is only fitted at normal scale.
      const covered = vv.scale <= 1.01 ? Math.round(window.innerHeight - vv.height) : 0;
      if (covered > 40) {
        root.style.setProperty('--app-height', `${Math.round(vv.height)}px`);
        // Safari scrolls the whole page to show the caret; the fitted app does not need it.
        if (window.scrollY) window.scrollTo(0, 0);
      } else root.style.removeProperty('--app-height');
      if (editor.isFocused) editor.commands.scrollIntoView();
    });
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
  editor.on('focus', () => setTimeout(fit, 350)); // after the keyboard has opened
}
