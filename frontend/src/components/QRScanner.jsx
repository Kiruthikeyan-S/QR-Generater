import React, { useState, useRef } from 'react';
import {
  Scan, FileText, UploadCloud, Copy, Check, ExternalLink,
  Eye, RefreshCw, AlertCircle, Maximize2, X, Barcode, Layers, Sparkles, CheckCircle2
} from 'lucide-react';

export default function QRScanner() {
  const [scanMode, setScanMode] = useState('codes'); // 'codes' | 'document'
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (!file.type.match('image.*')) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const executeScan = async (fileToScan = selectedFile, mode = scanMode) => {
    if (!fileToScan) {
      setError('Please select or drop an image first.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', fileToScan);

    const endpoint = mode === 'document' ? '/api/scan-document-codes' : '/api/scan-code';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Scan failed.');
      }

      setScanResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setScanMode(newMode);
    if (selectedFile) {
      executeScan(selectedFile, newMode);
    }
  };

  const copyText = (text, index) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (index === 'ocr') {
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const allCodes = scanResult?.all_codes || [];
  const ocrData = scanResult?.ocr;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Card: Scanner Control & Dropzone */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm space-y-5">
        
        {/* Card Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Scan className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">QR & Barcode Scanner</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Multi-pass optical reader supporting QR, Code 128, EAN, UPC, Data Matrix, Aztec & PDF417.
            </p>
          </div>
        </div>

        {/* Mode Selector Segmented Pill */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => switchMode('codes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanMode === 'codes'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-4 h-4 text-sky-600" />
            <span>Codes Only</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode('document')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanMode === 'document'
                ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Combined OCR + Codes</span>
          </button>
        </div>

        {/* Drag & Drop Upload Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden ${
            dragActive
              ? 'border-sky-500 bg-sky-50/50 scale-[1.01]'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="flex flex-col items-center space-y-2">
              <img
                src={previewUrl}
                alt="Selected Image"
                className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1"
              />
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                {selectedFile?.name}
              </span>
              <span className="text-[10px] text-sky-600 hover:underline">Click to change image</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Drag & Drop Image Here</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Supports JPG, JPEG, PNG (Single image)</p>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button: Scan Image Now */}
        <div>
          <button
            type="button"
            onClick={() => executeScan()}
            disabled={loading || !selectedFile}
            className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm flex items-center justify-center gap-2 text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4 stroke-[2.4]" />
            )}
            <span>Scan Image Now</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

      </div>

      {/* Right Card: Ready to Scan / Results View */}
      <div className="lg:col-span-7 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm space-y-4 min-h-[480px]">
        
        {!scanResult && !loading ? (
          /* Empty State: Ready to Scan */
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Scan className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-slate-900">Ready to Scan</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload any shipping label, invoice, product barcode, or QR code image to decode all optical symbologies.
              </p>
            </div>
          </div>
        ) : loading ? (
          /* Loading State */
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Executing Optical Multi-Pass Engine...</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pass 1 (Native) → Pass 2 (Multi-Scale) → Pass 3 (Bands) → Pass 4 (CLAHE) → Pass 5 (Rotations)
              </p>
            </div>
          </div>
        ) : (
          /* Scanned Results View */
          <div className="space-y-5">
            
            {/* Header & Badges */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Optical Detection Results</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Image: {scanResult.image_dimensions?.width} × {scanResult.image_dimensions?.height} px
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  {allCodes.length} Optical Code(s) Found
                </span>
                <button
                  onClick={() => setModalImage(scanResult.annotated_image)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Fullscreen Image"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center gap-3 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Legend:</span>
              <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                Purple: 2D Matrix (QR / Data Matrix)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Orange: 1D Linear Barcode
              </span>
              {scanMode === 'document' && (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Green: OCR Text (&gt;75% Conf)
                </span>
              )}
            </div>

            {/* Annotated Image */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center p-2 min-h-[260px] max-h-[400px]">
              <img
                src={scanResult.annotated_image}
                alt="Optical Detection Overlay"
                className="max-h-[380px] w-auto object-contain rounded-lg cursor-zoom-in"
                onClick={() => setModalImage(scanResult.annotated_image)}
              />
            </div>

            {/* Decoded Codes List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Decoded Payloads ({allCodes.length})
              </h4>

              {allCodes.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No optical symbologies detected in this image.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {allCodes.map((code, idx) => {
                    const is2D = code.symbology_type === '2D';
                    const isCopied = copiedIndex === idx;
                    const isUrl = code.text?.startsWith('http://') || code.text?.startsWith('https://');

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          is2D
                            ? 'bg-purple-50/40 border-purple-200/80'
                            : 'bg-amber-50/40 border-amber-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              is2D
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              [{code.symbology_type}: {code.format}]
                            </span>
                            {code.classification?.badge && (
                              <span className="text-[11px] font-semibold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                {code.classification.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {code.pass_found}
                          </span>
                        </div>

                        {/* Content text */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 my-1.5">
                          <span className="text-xs font-mono text-slate-900 break-all select-all block">
                            {code.text}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {isUrl && (
                            <a
                              href={code.text}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs px-2.5 py-1 rounded-lg border border-sky-200 transition-colors font-medium"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open URL</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => copyText(code.text, idx)}
                            className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200 transition-colors font-medium cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* OCR Extracted Document Text */}
            {scanMode === 'document' && ocrData && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Document OCR Extracted Text
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Avg Confidence: {ocrData.average_confidence}%
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(ocrData.raw_text, 'ocr')}
                      className="text-xs flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 font-medium cursor-pointer"
                    >
                      {copiedOcr ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap">
                  {ocrData.raw_text || <span className="text-slate-400 italic">No readable text found.</span>}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Fullscreen Zoom Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-white rounded-3xl p-3 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={modalImage}
              alt="High Resolution Overlay"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
