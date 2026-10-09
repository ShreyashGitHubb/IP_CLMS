'use client'

import { useEffect, useState } from 'react'
import { subscribeToApiUpdates } from '@/lib/clms-api'

export function useApiLiveRevision() {
  const [revision, setRevision] = useState(0)

  useEffect(() => subscribeToApiUpdates(() => setRevision((value) => value + 1)), [])

  return revision
}
