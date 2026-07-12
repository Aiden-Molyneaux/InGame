// The lifecycle / state kit (component-map §5.6 · design-spec §1.6) — the ONE shared load\empty\error\
// offline\terminal\transient family, built once and themed (0070 tokens), consumed by every screen's
// state matrix. Barrel export. `StateFrame` is intentionally NOT exported — it is the kit-internal
// dashed-silhouette wrapper, not a §1.5 component.
export { Skeleton, type SkeletonVariant } from './Skeleton';
export { LoadError } from './LoadError';
export { EmptyState } from './EmptyState';
export { Offline } from './Offline';
export { Unavailable } from './Unavailable';
export { Toast, type ToastTone } from './Toast';
