import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { XMarkIcon, ArrowDownTrayIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

/**
 * QrCodeModal — reusable modal that displays a QR code for any URL.
 * Used by both compound invites and family invites for one-click visual sharing.
 *
 * Props:
 *   url      — string URL to encode
 *   title    — header (e.g. "QR لرابط الدعوة")
 *   subtitle — optional caption (e.g. compound name, relationship)
 *   onClose  — function
 */
const QrCodeModal = ({ url, title = 'QR للرابط', subtitle, onClose }) => {
  const downloadPng = () => {
    const svg = document.querySelector('[data-qr-svg]');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `homeme_invite_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        URL.revokeObjectURL(svgUrl);
        toast.success('تم تنزيل QR بنجاح');
      }, 'image/png');
    };
    img.src = svgUrl;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ الرابط');
    } catch {
      toast.error('فشل النسخ');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
        data-testid="qr-code-modal"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="text-right flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" data-testid="qr-modal-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* QR */}
        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 inline-block" data-testid="qr-code-svg-wrap">
          <QRCodeSVG
            value={url}
            size={240}
            level="M"
            includeMargin={false}
            data-qr-svg=""
          />
        </div>

        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          امسح الكود بالكاميرا أو ببرنامج قارئ QR لفتح الرابط مباشرة
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={copy}
            data-testid="qr-modal-copy"
            className="flex-1 bg-gray-900 hover:bg-black text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            <span>نسخ الرابط</span>
          </button>
          <button
            onClick={downloadPng}
            data-testid="qr-modal-download"
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>تنزيل PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrCodeModal;
