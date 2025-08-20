import { WifiIcon } from '@heroicons/react/24/outline'

interface OfflineIndicatorProps {
  isOnline: boolean
}

export default function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  if (isOnline) return null

  return (
    <div className="offline-indicator">
      <div className="flex items-center space-x-2">
        <WifiIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Offline Mode</span>
      </div>
    </div>
  )
}
