import type { ReactNode } from 'react'

type SurfaceProps = { children: ReactNode; className?: string; delay?: number; stagger?: number }
/** Legacy composition API, now stationary: route/history navigation never replays an introduction. */
function StableSurface({ children, className = '' }: SurfaceProps) {
  return <div className={className}>{children}</div>
}
export const PageTransition = StableSurface
export const StaggerContainer = StableSurface
export const StaggerItem = StableSurface
export const FadeIn = StableSurface
export const ScaleIn = StableSurface
