import { Component, type ReactNode } from 'react';

// SkiaErrorBoundary — the F21 catch-and-degrade for skia SURFACE CREATION (parvati §3.4 flag 2):
// at the browser's WebGL-context ceiling, rn-skia/web's MakeWebGLCanvasSurface throws from the
// <Canvas> mount ("Cannot read properties of null (reading 'rangeMin')") — uncaught, that's a
// LogBox over the screen and a blank tile. Caught here, the consumer falls back (CardFace → the
// default face; strips/bed → an empty pane), matching the render module's every other degrade
// path. Retry = remount (navigation naturally does it).

export class SkiaErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    // deliberately quiet — the degrade IS the handling (F21); a reload/remount retries
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
