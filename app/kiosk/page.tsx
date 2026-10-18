'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  QrCode,
  ScanLine,
  Search,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react'
import { WorkspaceShell } from '@/components/workspace-shell'
import { apiRequest, type EquipmentItem, type LabUser, type LoanTransaction } from '@/lib/clms-api'
import { getSession } from '@/lib/auth'
import { AssetLabelModal } from '@/components/asset-label-modal'

export default function KioskPage() {
  const [tagInput, setTagInput] = useState('')
  const [scannedItem, setScannedItem] = useState<EquipmentItem | null>(null)
  const [activeLoan, setActiveLoan] = useState<LoanTransaction | null>(null)
  const [allUsers, setAllUsers] = useState<LabUser[]>([])
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [dueDays, setDueDays] = useState<number>(3)
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recentScans, setRecentScans] = useState<string[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [labelModalItem, setLabelModalItem] = useState<EquipmentItem | null>(null)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [maintTitle, setMaintTitle] = useState('')
  const [maintDetails, setMaintDetails] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Load users and equipment catalogue on mount
  useEffect(() => {
    const session = getSession()
    if (!session) return
    apiRequest<EquipmentItem[]>('/api/equipment')
      .then(setAllEquipment)
      .catch(() => undefined)

    if (session.user.role === 'ADMIN') {
      apiRequest<LabUser[]>('/api/users')
        .then((users) => {
          setAllUsers(users.filter((u) => u.active))
          if (users.length > 0) setSelectedUserId(String(users[0].id))
        })
        .catch(() => undefined)
    } else {
      setSelectedUserId(String(session.user.id))
    }
  }, [])

  // Auto focus input for physical USB barcode scanners
  useEffect(() => {
    inputRef.current?.focus()
  }, [scannedItem])

  // Lookup equipment by tag
  const lookupTag = async (rawTag: string, forceRefresh = false): Promise<EquipmentItem | null> => {
    const tag = rawTag.trim()
    if (!tag) return null
    setError('')
    setNotice('')
    setLoading(true)

    try {
      // Find in existing catalogue or fetch fresh
      let item = forceRefresh
        ? undefined
        : allEquipment.find((e) => e.assetTag.toLowerCase() === tag.toLowerCase() || String(e.id) === tag)
      if (!item) {
        const fresh = await apiRequest<EquipmentItem[]>('/api/equipment')
        setAllEquipment(fresh)
        item = fresh.find((e) => e.assetTag.toLowerCase() === tag.toLowerCase() || String(e.id) === tag)
      }

      if (!item) {
        setError(`No equipment found with tag or ID "${tag}".`)
        setScannedItem(null)
        setActiveLoan(null)
        return null
      }

      setScannedItem(item)
      setRecentScans((prev) => Array.from(new Set([item!.assetTag, ...prev])).slice(0, 5))

      // Items that are checked out still need their loan record, even when a damage ticket has already
      // moved them to maintenance: without it the station cannot check the item back in.
      if (item.status === 'IN_USE' || item.status === 'MAINTENANCE') {
        const transactions = await apiRequest<LoanTransaction[]>('/api/transactions')
        const loan = transactions.find((t) => t.equipmentId === item!.id && !t.returnedAt) ?? null
        setActiveLoan(loan)
      } else {
        setActiveLoan(null)
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(60)
      }
      return item
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lookup failed.')
      return null
    } finally {
      setLoading(false)
      setTagInput('')
    }
  }

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault()
    void lookupTag(tagInput)
  }

  // Camera Barcode / QR Scanner
  const startCamera = async () => {
    setError('')
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)

      // Start continuous scan loop
      if ('BarcodeDetector' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'code_39', 'data_matrix'],
        })

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = barcodes[0].rawValue.trim()
              if (detected) {
                stopCamera()
                void lookupTag(detected)
              }
            }
          } catch {
            // Ignore frame detection failures
          }
        }, 250)
      }
    } catch (cause) {
      setError('Could not access camera. Ensure camera permissions are allowed.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    if (cameraActive) {
      stopCamera()
      setTimeout(() => void startCamera(), 100)
    }
  }

  // Fast Checkout Action
  const handleFastIssue = async () => {
    if (!scannedItem || !selectedUserId) return
    const name = scannedItem.name
    setWorking(true)
    setError('')
    try {
      const dueAt = new Date()
      dueAt.setDate(dueAt.getDate() + dueDays)

      await apiRequest<LoanTransaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: scannedItem.id,
          userId: Number(selectedUserId),
          action: 'BORROW',
          dueAt: dueAt.toISOString(),
          notes: notes.trim() || 'Express Kiosk Checkout',
        }),
      })

      // Refresh item state, then report the result (lookup clears any pending message)
      await lookupTag(scannedItem.assetTag, true)
      setNotice(`Successfully issued ${name} (due ${dueAt.toLocaleDateString()}).`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not issue equipment.')
    } finally {
      setWorking(false)
    }
  }

  // Fast Return Action
  const handleFastReturn = async () => {
    if (!scannedItem || !activeLoan) return
    const name = scannedItem.name
    setWorking(true)
    setError('')
    try {
      await apiRequest<LoanTransaction>(`/api/transactions/${activeLoan.id}/return`, {
        method: 'PUT',
      })
      const refreshed = await lookupTag(scannedItem.assetTag, true)
      setNotice(
        refreshed && refreshed.status !== 'AVAILABLE'
          ? `Checked in ${name}. It stays ${refreshed.status.replaceAll('_', ' ').toLowerCase()} until its maintenance work is resolved.`
          : `Successfully checked in ${name}. Equipment is now AVAILABLE.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not return equipment.')
    } finally {
      setWorking(false)
    }
  }

  // Fast Maintenance Ticket Action
  const handleOpenMaintenance = async (e: FormEvent) => {
    e.preventDefault()
    if (!scannedItem || !maintTitle.trim()) return
    const name = scannedItem.name
    setWorking(true)
    setError('')
    try {
      await apiRequest('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: scannedItem.id,
          title: maintTitle.trim(),
          details: maintDetails.trim() || 'Flagged via Express Kiosk scanner.',
        }),
      })
      setMaintenanceOpen(false)
      setMaintTitle('')
      setMaintDetails('')
      await lookupTag(scannedItem.assetTag, true)
      setNotice(`Maintenance ticket opened for ${name}. Item marked for service.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit maintenance ticket.')
    } finally {
      setWorking(false)
    }
  }

  const borrowerUser = allUsers.find((u) => u.id === activeLoan?.userId)

  return (
    <WorkspaceShell
      title="Express Kiosk"
      eyebrow="Operate / Barcode & QR Station"
      description="Instant check-in and checkout station with live camera barcode scanner and thermal sticker printing."
    >
      {error ? (
        <div role="alert" className="mb-4 border border-red-400/30 bg-red-950/30 px-3 py-2 text-[11px] text-red-100">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="mb-4 border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-100">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column: Barcode & QR Camera Scanner */}
        <div className="space-y-4 lg:col-span-5">
          {/* Scanner Viewfinder Box */}
          <div className="border border-white/10 bg-[#171719] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-[#9a80ff]" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">Scanner Viewfinder</span>
              </div>
              {cameraActive ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400">Live Active</span>
                </div>
              ) : null}
            </div>

            <div className="relative mt-3 flex aspect-video w-full items-center justify-center overflow-hidden border border-white/10 bg-[#101012]">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {cameraActive ? (
                <>
                  {/* Glowing Sci-Fi Target Framing Corners */}
                  <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-[#9a80ff]/40">
                    <div className="absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2 border-[#9a80ff]" />
                    <div className="absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2 border-[#9a80ff]" />
                    <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-[#9a80ff]" />
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-[#9a80ff]" />
                    {/* Laser sweep line animation */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#9a80ff] to-transparent animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 rounded bg-black/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-white">
                    Align QR or Barcode in frame
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2.5 p-6 text-center text-slate-400">
                  <ScanLine className="h-9 w-9 text-slate-500" />
                  <p className="font-mono text-xs uppercase tracking-wider text-white">Camera is Standby</p>
                  <p className="max-w-xs text-xs text-slate-400">Enable video camera scanner or use physical barcode scanner below.</p>
                </div>
              )}
            </div>

            {/* Scanner Controls */}
            <div className="mt-3 flex items-center justify-between gap-2">
              {cameraActive ? (
                <>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border border-white/15 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <FlipHorizontal className="h-3.5 w-3.5" />
                    <span>Flip Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border border-red-500/30 bg-red-950/20 px-3 text-xs font-medium text-red-200 transition-colors hover:bg-red-950/40"
                  >
                    <CameraOff className="h-3.5 w-3.5" />
                    <span>Turn Off</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-[#8e73ff] px-4 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[#a18cff]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Enable Camera Scanner</span>
                </button>
              )}
            </div>
          </div>

          {/* Barcode Gun / Manual Asset Tag Input */}
          <div className="border border-white/10 bg-[#171719] p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">Hardware Scanner & Manual Tag</div>
            <form onSubmit={handleManualSubmit} className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Scan barcode or enter asset tag..."
                  className="h-10 w-full border border-white/15 bg-[#101012] px-3 font-mono text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#9a80ff]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !tagInput.trim()}
                className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm bg-[#8e73ff] px-4 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[#a18cff] disabled:opacity-40"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Lookup</span>
              </button>
            </form>

            {/* Quick tag chips from recent scans */}
            {recentScans.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400">Recent:</span>
                {recentScans.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => void lookupTag(tag)}
                    className="border border-white/10 bg-[#111113] px-2.5 py-1 font-mono text-[9px] text-[#c7b7ff] transition-colors hover:border-[#9a80ff]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Scanned Item & Context Actions */}
        <div className="space-y-4 lg:col-span-7">
          {loading ? (
            <div className="flex h-72 items-center justify-center border border-white/10 bg-[#171719] text-center font-mono text-xs uppercase tracking-wider text-slate-400">
              Looking up asset in database…
            </div>
          ) : scannedItem ? (
            <div className="border border-white/10 bg-[#171719] p-5">
              {/* Header with Asset Tag & QR Modal Trigger */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a80ff]">
                    {scannedItem.category} · Asset #{scannedItem.id}
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-white">{scannedItem.name}</h2>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[9px] text-slate-400">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-white">{scannedItem.assetTag}</span>
                    <span>📍 {scannedItem.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider ${
                      scannedItem.status === 'AVAILABLE'
                        ? 'border border-emerald-400/30 bg-emerald-950/40 text-emerald-300'
                        : scannedItem.status === 'IN_USE'
                        ? 'border border-[#9a80ff]/40 bg-[#292244] text-[#c9b9ff]'
                        : scannedItem.status === 'MAINTENANCE'
                        ? 'border border-amber-400/30 bg-amber-950/40 text-amber-300'
                        : 'border border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    ● {scannedItem.status.replaceAll('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLabelModalItem(scannedItem)}
                    title="Generate & Print Thermal QR Label"
                    className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-white/15 bg-white/5 px-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Print Sticker</span>
                  </button>
                </div>
              </div>

              {/* Status details & Contextual action workflows */}
              <div className="mt-5">
                {scannedItem.status === 'AVAILABLE' && !activeLoan ? (
                  /* AVAILABLE: Express Checkout Form */
                  <div className="space-y-4 rounded border border-emerald-400/20 bg-emerald-950/10 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-300">
                        Item Ready for Immediate Checkout
                      </h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                        {allUsers.length > 0 ? 'Assign to Student / Member' : 'Checking Out As'}
                        {allUsers.length > 0 ? (
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="h-9 w-full border border-white/15 bg-[#101012] px-2.5 font-sans text-xs text-white outline-none"
                          >
                            {allUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="mt-1 flex h-9 items-center gap-2 border border-[#9a80ff]/30 bg-[#9a80ff]/10 px-2.5">
                            <span className="inline-block h-2 w-2 rounded-full bg-[#9a80ff]" />
                            <span className="font-mono text-[10px] font-semibold text-[#c9b9ff]">
                              Your account (self-checkout)
                            </span>
                          </div>
                        )}
                      </label>

                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Loan Duration</span>
                        <div className="flex gap-1.5">
                          {[
                            [1, '1 Day'],
                            [3, '3 Days'],
                            [7, '1 Week'],
                            [14, '2 Wks'],
                          ].map(([days, label]) => (
                            <button
                              key={String(days)}
                              type="button"
                              onClick={() => setDueDays(Number(days))}
                              className={`h-9 flex-1 border font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
                                dueDays === days
                                  ? 'border-[#9a80ff] bg-[#9a80ff]/20 text-[#c9b9ff]'
                                  : 'border-white/10 bg-[#101012] text-slate-400 hover:text-white'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="space-y-1 font-mono text-[9px] uppercase tracking-wider text-slate-400 sm:col-span-2">
                        Checkout Purpose / Station Notes
                        <input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Experiment 4 Lab session"
                          className="h-9 w-full border border-white/15 bg-[#101012] px-3 font-sans text-xs text-white outline-none focus:border-[#9a80ff]"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => void handleFastIssue()}
                        disabled={working || !selectedUserId}
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-[#8e73ff] px-5 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-[#a18cff] disabled:opacity-50"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>{working ? 'Processing…' : 'Issue Equipment to Member'}</span>
                      </button>
                    </div>
                  </div>
                ) : activeLoan || scannedItem.status === 'IN_USE' ? (
                  /* On loan: Express Return / Check-in — shown even when a damage ticket moved the item to service */
                  <div className="space-y-4 rounded border border-[#9a80ff]/20 bg-[#292244]/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#9a80ff]" />
                        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#c9b9ff]">
                          Active Loan on Record
                        </h3>
                      </div>
                      {activeLoan?.dueAt && new Date(activeLoan.dueAt).getTime() < Date.now() ? (
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-amber-300">
                          Overdue Return
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-2 border-y border-white/10 py-3 font-mono text-xs">
                      <div>
                        <span className="text-slate-400">Borrowed By: </span>
                        <span className="font-semibold text-white">
                          {borrowerUser ? `${borrowerUser.name} (${borrowerUser.email})` : `User #${activeLoan?.userId ?? 'Unknown'}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Issued At: </span>
                        <span className="text-slate-200">
                          {activeLoan ? new Date(activeLoan.createdAt).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Due Date: </span>
                        <span className="text-slate-200">
                          {activeLoan?.dueAt ? new Date(activeLoan.dueAt).toLocaleDateString() : 'No due date specified'}
                        </span>
                      </div>
                      {activeLoan?.notes ? (
                        <div>
                          <span className="text-slate-400">Notes: </span>
                          <span className="text-slate-300">{activeLoan.notes}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setMaintenanceOpen(true)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap border border-amber-400/40 bg-amber-950/20 px-4 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-950/40"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Report Damage / Issue</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleFastReturn()}
                        disabled={working}
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-emerald-600 px-5 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        <span>{working ? 'Processing Check-in…' : 'One-Tap Check-in / Return'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MAINTENANCE / RETIRED */
                  <div className="rounded border border-amber-400/20 bg-amber-950/15 p-4 text-slate-300">
                    <div className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-300">
                      Equipment Under Service or Retired
                    </div>
                    <p className="mt-1 text-xs">
                      This item is marked as {scannedItem.status}. It cannot be checked out to members until released.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center border border-dashed border-white/10 bg-[#171719]/50 p-6 text-center text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-[#9a80ff]">
                <QrCode className="h-7 w-7" />
              </div>
              <div className="mt-3 text-sm font-semibold text-white">No Asset Scanned Yet</div>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
                Point the camera at an equipment sticker, scan with a barcode reader, or enter the tag code to load
                instant checkout or check-in options.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Asset Label Modal */}
      {labelModalItem ? (
        <AssetLabelModal item={labelModalItem} onClose={() => setLabelModalItem(null)} />
      ) : null}

      {/* Report Damage / Quick Maintenance Dialog */}
      {maintenanceOpen && scannedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleOpenMaintenance}
            className="w-full max-w-md border border-white/10 bg-[#171719] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="font-mono text-[8px] uppercase tracking-wider text-amber-300">Service Ticket</div>
                <h3 className="text-sm font-medium text-white">Flag {scannedItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceOpen(false)}
                className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#888] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block space-y-1 font-mono text-[8px] uppercase tracking-wider text-[#888]">
                Issue Title
                <input
                  required
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  placeholder="e.g. Probe damaged or calibration error"
                  className="h-8 w-full border border-white/10 bg-[#101012] px-2 font-sans text-[10px] text-white outline-none focus:border-[#9a80ff]"
                />
              </label>

              <label className="block space-y-1 font-mono text-[8px] uppercase tracking-wider text-[#888]">
                Description / Condition
                <textarea
                  rows={3}
                  value={maintDetails}
                  onChange={(e) => setMaintDetails(e.target.value)}
                  placeholder="Describe damage observed upon check-in"
                  className="w-full border border-white/10 bg-[#101012] p-2 font-sans text-[10px] text-white outline-none focus:border-[#9a80ff]"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMaintenanceOpen(false)}
                className="h-8 border border-white/10 px-3 text-[9px] uppercase tracking-wider text-[#aaa]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={working}
                className="inline-flex h-8 items-center gap-1.5 bg-amber-600 px-3 text-[9px] font-medium uppercase tracking-wider text-white hover:bg-amber-500"
              >
                <Wrench className="h-3 w-3" />
                {working ? 'Saving…' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </WorkspaceShell>
  )
}
