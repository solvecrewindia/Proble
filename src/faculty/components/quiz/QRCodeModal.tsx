import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, Download, Copy } from 'lucide-react';
import { Button } from '../ui/Button';

interface QRCodeModalProps {
    url: string;
    code: string;
    onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, code, onClose }) => {
    const svgRef = useRef<any>(null);

    const downloadQRCode = () => {
        const svg = svgRef.current;
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width + 40; // Add padding
            canvas.height = img.height + 40;
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20);
                const pngFile = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                downloadLink.download = `QRCode-${code}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            }
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-white/5">
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">Assessment QR Code</h3>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center justify-center bg-white">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100">
                        <QRCode
                            ref={svgRef as any}
                            value={url}
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-sm text-neutral-500 mb-1">Access Code</p>
                        <p className="text-2xl font-mono font-bold text-neutral-900 tracking-wider bg-neutral-100 px-4 py-1 rounded-lg select-all">
                            {code}
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-white/5 grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={copyToClipboard} className="w-full">
                        <Copy className="w-4 h-4 mr-2" /> Copy Link
                    </Button>
                    <Button onClick={downloadQRCode} className="w-full">
                        <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                </div>
            </div>
        </div>
    );
};
