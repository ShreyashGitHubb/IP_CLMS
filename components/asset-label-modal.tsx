'use client'

import { useMemo, useState } from 'react'
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
    // Encode the unique asset tag
    return generateQrSvg(item.assetTag, { size: 140, margin: 2, color: '#111113', background: '#ffffff' })
  }, [item])

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

  const downloadSvg = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CLMS-QR-${item.assetTag}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Print stylesheet to isolate only the label during printing */}
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
            padding: 4px !important;
            border: 1px dashed #666 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md border border-white/10 bg-[#171719] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#9a80ff]">Physical Asset Label</div>
            <h2 className="mt-0.5 text-sm font-medium text-white">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-7 w-7 items-center justify-center border border-white/10 text-[#888] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Physical Sticker Preview */}
        <div className="mt-4 flex flex-col items-center">
          <div className="text-center font-mono text-[7px] uppercase tracking-[0.14em] text-[#777780]">
            Thermal Label Preview (50 × 25mm format)
          </div>

          <div
            id="printable-asset-label"
            className="mt-2.5 flex w-[320px] items-center gap-3 border border-white/20 bg-white p-3 text-black shadow-md"
          >
            <div
              className="shrink-0"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              style={{ width: '88px', height: '88px' }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[7px] font-bold uppercase tracking-[0.18em] text-[#555]">CLMS LAB ASSET</div>
              <div className="mt-0.5 truncate text-[11px] font-bold text-black" title={item.name}>
                {item.name}
              </div>
              <div className="mt-1 font-mono text-[10px] font-extrabold tracking-wider text-black">
                {item.assetTag}
              </div>
              <div className="mt-1 truncate font-mono text-[7px] uppercase text-[#444]">
                {item.category} · {item.location}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata info */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 font-mono text-[8px]">
          <div>
            <span className="text-[#777780]">Asset Tag: </span>
            <span className="font-bold text-[#c9b9ff]">{item.assetTag}</span>
          </div>
          <div>
            <span className="text-[#777780]">Status: </span>
            <span className="uppercase text-emerald-300">{item.status.replaceAll('_', ' ')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[#777780]">Location: </span>
            <span className="text-white">{item.location}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <div className="flex gap-1.5">
            <button
              onClick={copyTag}
              title="Copy Asset Tag"
              className="inline-flex h-8 items-center gap-1.5 border border-white/10 px-2.5 text-[8px] uppercase tracking-wider text-[#aaa] hover:text-white"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy tag'}
            </button>
            <button
              onClick={downloadSvg}
              title="Download QR code SVG"
              className="inline-flex h-8 items-center gap-1.5 border border-white/10 px-2.5 text-[8px] uppercase tracking-wider text-[#aaa] hover:text-white"
            >
              <Download className="h-3 w-3" />
              SVG
            </button>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex h-8 items-center gap-2 bg-[#8e73ff] px-4 text-[9px] font-medium uppercase tracking-[0.1em] text-white hover:bg-[#a18cff]"
          >
            <Printer className="h-3.5 w-3.5" />
            Print sticker
          </button>
        </div>
      </div>
    </div>
  )
}
