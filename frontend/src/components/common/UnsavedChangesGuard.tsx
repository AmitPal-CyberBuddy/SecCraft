import { useContext, useEffect } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom'

function RouterGuard({ when, message }: { when: boolean; message: string }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && (
    currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
  ))
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(message)) blocker.proceed()
    else blocker.reset()
  }, [blocker, message])
  return null
}

/** Data-router guard covers links, navigate() and Back/Forward; document guard covers hard exits. */
export function UnsavedChangesGuard({ when, message }: { when: boolean; message: string }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext)
  useEffect(() => {
    if (!when) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const externalLink = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.download || link.target === '_blank') return
      const sameOrigin = link.origin === window.location.origin
      if (sameOrigin && link.pathname === window.location.pathname && link.search === window.location.search) return
      if (dataRouter) return // router handles SPA links; beforeunload handles hard exits without a double prompt
      if (!window.confirm(message)) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', externalLink, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', externalLink, true) }
  }, [when, message, dataRouter])
  return dataRouter ? <RouterGuard when={when} message={message} /> : null
}
