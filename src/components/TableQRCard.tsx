import { useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { cafeConfig } from "../data/cafeConfig";

interface Props {
  tableNumber: number;
  baseUrl: string;
}

export function TableQRCard({ tableNumber, baseUrl }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Format table number with leading zero (e.g. 1 -> "01", 10 -> "10")
  const tablePillText = `TABLE ${String(tableNumber).padStart(2, "0")}`;
  
  // Target URL for scanning: e.g. https://your-cafe-url.com/menu?table=3
  const targetUrl = `${baseUrl.replace(/\/$/, "")}/menu?table=${tableNumber}`;

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    // Create a temporary link to download PNG
    const link = document.createElement("a");
    link.download = `suto-cafe-table-${tableNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className={`flex flex-col items-center w-full ${tableNumber === 10 ? "print:break-before-page" : ""}`}>
      {/* Printable Card Container matching reference image styling */}
      <div className="qr-card relative flex w-full max-w-[340px] flex-col items-center overflow-hidden rounded-3xl border-2 border-blue-900/10 bg-white p-6 shadow-xl print:m-0 print:w-full print:max-w-[205px] print:break-inside-avoid print:shadow-none print:border print:border-navy print:p-2 print:rounded-2xl">
        
        {/* Decorative corner accent shapes */}
        <div className="absolute top-0 left-0 h-14 w-14 rounded-br-full bg-blueink/10 print:hidden" />
        <div className="absolute bottom-0 right-0 h-16 w-16 rounded-tl-full bg-navy/10 print:hidden" />

        {/* Brand Header */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-2xl font-black tracking-tight text-navy print:text-xs">
              {cafeConfig.name}
            </span>
            <span className="text-xl print:text-xs">☕</span>
          </div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-blueink/80 print:text-[7px] print:tracking-tight">
            GOOD FOOD · GREAT VIBES
          </p>
        </div>

        {/* Headline */}
        <div className="mt-4 text-center print:mt-1">
          <h2 className="font-display text-xl font-black uppercase tracking-wide text-navy print:text-[11px] print:leading-tight">
            ORDER FROM <br className="print:hidden" />
            <span className="text-blueink"> YOUR TABLE</span>
          </h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 print:text-[7.5px] print:mt-0">
            {cafeConfig.tagline}
          </p>
        </div>

        {/* QR Code Frame */}
        <div className="relative my-5 flex items-center justify-center rounded-2xl border-4 border-blueink/15 bg-white p-4 shadow-inner print:my-1 print:p-1.5 print:border-2 print:rounded-xl">
          {/* SVG for sharp UI display */}
          <QRCodeSVG
            value={targetUrl}
            size={160}
            level="H"
            includeMargin={false}
            fgColor="#132043"
          />

          {/* Hidden Canvas for PNG export */}
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas
              value={targetUrl}
              size={512}
              level="H"
              includeMargin={true}
              fgColor="#132043"
            />
          </div>

          {/* Side annotations */}
          <span className="absolute -left-7 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold uppercase tracking-wider text-slate-400 print:hidden">
            Scan Here ↙
          </span>
          <span className="absolute -right-7 top-1/2 -translate-y-1/2 rotate-90 text-[9px] font-bold uppercase tracking-wider text-slate-400 print:hidden">
            Good Food Awaits ↘
          </span>
        </div>

        {/* WhatsApp Badge */}
        <div className="w-full rounded-xl bg-navy px-3 py-2.5 text-center text-white shadow-md print:py-1 print:px-1 print:rounded-lg">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold print:text-[7.5px]">
            <span className="text-emerald-400">📱</span>
            <span>Scan to Order on WhatsApp</span>
          </div>
          <p className="mt-0.5 text-[9.5px] font-medium opacity-80 print:hidden">
            No need to call — simply scan and send us your order!
          </p>
        </div>

        {/* Table Number Pill Badge */}
        <div className="mt-4 inline-flex items-center justify-center rounded-full bg-blueink px-6 py-1.5 text-sm font-black tracking-wider text-white shadow-sm print:mt-1 print:px-2.5 print:py-0.5 print:text-[10px]">
          {tablePillText}
        </div>
      </div>

      {/* Interactive Actions (hidden when printing) */}
      <div className="mt-3 flex items-center gap-2 print:hidden">
        <button
          onClick={handleDownloadPNG}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          📥 Download PNG
        </button>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blueink hover:bg-blue-100"
        >
          🔗 Test Link
        </a>
      </div>
    </div>
  );
}
