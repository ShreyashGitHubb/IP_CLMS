'use client'

import { useCallback, useMemo, useState } from 'react'
import { Copy, Download, Printer, X, Check } from 'lucide-react'
import { generateQrSvg } from '@/lib/qr-code'
import type { EquipmentItem } from '@/lib/clms-api'

type AssetLabelModalProps = {
  item: EquipmentItem | null
  onClose: () => void
}

export function AssetLabelModal({ item, onClose }: AssetLabelModalProps) {
  const [copied, setCopied] = useState(false)

  const qrSvg = useMemo(() => {
    if (!item) return ''
    return generateQrSvg(item.assetTag, { size: 120, margin: 2, color: '#0f172a', background: '#ffffff' })
  }, [item])

  // Use a data URI so the browser treats the QR as a replaced element (img),
  // which guarantees correct pixel-perfect sizing inside any container.
  const qrSrc = useMemo(() => {
    if (!qrSvg) return ''
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`
  }, [qrSvg])

  if (!item) return null

  const copyTag = async () => {
    try {
      await navigator.clipboard.writeText(item.assetTag)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  const downloadSvg = useCallback(() => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CLMS-QR-${item!.assetTag}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [qrSvg, item])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Print stylesheet to isolate only the sticker during printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-asset-label, #printable-asset-label * {
            visibility: visible !important;
          }
          #printable-asset-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 2.2in !important;
            height: 1.1in !important;
            margin: 0 !important;
            padding: 6px !important;
            border: 1px dashed #666 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-lg border border-white/10 bg-[#171719] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9a80ff]">Physical Asset Label</div>
            <h2 className="mt-0.5 text-sm font-semibold text-white">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Physical Sticker Preview */}
        <div className="mt-5 flex flex-col items-center">
          <div className="text-center font-mono text-[8px] uppercase tracking-[0.16em] text-slate-400">
            Thermal Label Preview (50 × 25mm standard format)
          </div>

          <div
            id="printable-asset-label"
            className="mt-3 flex w-full max-w-[400px] items-stretch gap-0 overflow-hidden rounded border border-slate-300 bg-white shadow-xl"
          >
            {/* QR Code – rendered as <img> so it is a replaced element with reliable sizing */}
            <div className="flex shrink-0 items-center justify-center bg-white p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR code for ${item.assetTag}`}
                width={96}
                height={96}
                draggable={false}
                className="block h-24 w-24 object-contain"
              />
            </div>

            {/* Divider */}
            <div className="w-px shrink-0 bg-slate-200" />

            {/* Label Text Column */}
            <div className="flex min-w-0 flex-1 flex-col justify-between p-3 text-slate-900">
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  CLMS LAB ASSET
                </p>
                <p
                  className="mt-0.5 overflow-hidden text-[11px] font-bold leading-snug text-slate-950"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  title={item.name}
                >
                  {item.name}
                </p>
              </div>

              <div className="mt-2 space-y-0.5">
                <p className="font-mono text-[12px] font-black tracking-wider text-purple-700">
                  {item.assetTag}
                </p>
                <p className="truncate font-mono text-[8px] uppercase tracking-wide text-slate-500">
                  {item.category} · {item.location}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata info */}
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-3.5 font-mono text-[9px]">
          <div>
            <span className="text-slate-400">Asset Tag: </span>
            <span className="font-bold text-[#c9b9ff]">{item.assetTag}</span>
          </div>
          <div>
            <span className="text-slate-400">Status: </span>
            <span className="uppercase text-emerald-300">{item.status.replaceAll('_', ' ')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400">Location: </span>
            <span className="text-white">{item.location}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTag}
              title="Copy Asset Tag"
              className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Tag'}</span>
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              title="Download QR code SVG"
              className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              <span>SVG</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-[#8e73ff] px-4 text-xs font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-[#a18cff]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Sticker</span>
          </button>
        </div>
      </div>
    </div>
  )
}
