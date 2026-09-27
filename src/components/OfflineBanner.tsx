import { useOnline } from '../lib/useOnline'
import { Icon } from './Icon'

/** Slim, dismissible strip shown when the browser reports offline. Progress stays local. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="offline-banner" role="status">
      <Icon name="wifiOff" size={15} />
      <span>
        You're offline. Code keeps running locally; progress will stay saved in this browser.
      </span>
    </div>
  )
}
