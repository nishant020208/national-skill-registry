import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const QrScanner = () => {
  const navigate = useNavigate();
  const elId = "credify-qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {}
    scannerRef.current = null;
    setActive(false);
  };

  const handleResult = (text: string) => {
    // Accept full URLs or bare student UUIDs
    try {
      const url = new URL(text);
      const m = url.pathname.match(/\/verify\/([0-9a-fA-F-]{36})/);
      if (m) { stop(); navigate(`/verify/${m[1]}`); return; }
    } catch {}
    if (/^[0-9a-fA-F-]{36}$/.test(text.trim())) {
      stop(); navigate(`/verify/${text.trim()}`); return;
    }
    setError("QR code is not a valid Credify credential.");
  };

  const start = async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;
      setActive(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleResult,
        () => {}
      );
    } catch (e: any) {
      setError(e?.message || "Unable to access camera. Please allow camera permission.");
      setActive(false);
    }
  };

  useEffect(() => () => { stop(); }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-success/10 text-success text-xs font-medium mb-2">
            <ScanLine className="size-3.5" /> Employer Quick Verify
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Scan QR to verify a credential</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Point your device camera at a Credify QR code. No login or app required.
          </p>
        </div>
        {!active ? (
          <Button onClick={start} size="default"><Camera className="size-4 mr-1.5" />Start camera</Button>
        ) : (
          <Button onClick={stop} variant="outline" size="default"><CameraOff className="size-4 mr-1.5" />Stop</Button>
        )}
      </div>

      <div className="mt-5 grid md:grid-cols-[320px_1fr] gap-5 items-start">
        <div className="relative bg-surface-1 border border-border rounded-md overflow-hidden aspect-square">
          <div id={elId} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
          {!active && (
            <div className="absolute inset-0 grid place-items-center text-center p-6">
              <div>
                <ScanLine className="size-10 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Camera preview will appear here</div>
              </div>
            </div>
          )}
          {active && (
            <>
              <div className="absolute inset-8 border-2 border-primary/70 rounded-md pointer-events-none" />
              <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-primary/80 pointer-events-none animate-pulse" />
            </>
          )}
        </div>

        <div className="text-sm space-y-3">
          <div className="p-3 rounded-md bg-surface-1 border border-border">
            <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">How it works</div>
            <ol className="list-decimal list-inside text-foreground/80 space-y-1 text-sm">
              <li>Click <span className="font-medium">Start camera</span> and allow permission.</li>
              <li>Hold the candidate&apos;s QR code inside the frame.</li>
              <li>You&apos;ll be redirected to the official verification page.</li>
            </ol>
          </div>
          {error && (
            <div className="p-3 rounded-md border border-destructive/40 bg-destructive/5 text-destructive text-sm">
              {error}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Verification happens on a public, signed page — no employer account required.
          </p>
        </div>
      </div>
    </div>
  );
};
