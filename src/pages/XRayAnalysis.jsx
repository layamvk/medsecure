import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, ScanLine, AlertTriangle, CheckCircle2, Info,
  XCircle, Loader2, Image as ImageIcon, Shield, Activity,
  ChevronDown, ChevronUp, Zap, FileImage, RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

// ─── Confidence helpers ──────────────────────────────────────────────────────
const getConfidenceColor = (level) => {
  switch (level) {
    case 'high':      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' };
    case 'moderate':  return { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-500' };
    case 'uncertain': return { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     bar: 'bg-red-500' };
    default:          return { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   bar: 'bg-slate-400' };
  }
};

const getRiskColor = (level) => {
  switch (level) {
    case 'high':   return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'low':    return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'none':   return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:       return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getConfidenceLabel = (level) => {
  switch (level) {
    case 'high':      return 'High Confidence';
    case 'moderate':  return 'Moderate Confidence';
    case 'uncertain': return 'Uncertain';
    default:          return 'Unknown';
  }
};

// ─── Component ───────────────────────────────────────────────────────────────
const XRayAnalysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef(null);

  // ── File handling ──
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, WEBP, or TIFF image.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File too large. Maximum size is 15 MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    setError(null);
  }, []);

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Analyze ──
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await api.post('/xray/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60s for large images + AI
      });

      setAnalysisResult(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Render ──
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
          <ScanLine className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">X-Ray Analysis</h1>
          <p className="text-sm text-slate-500">Upload an X-ray image for AI-powered analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: Upload + Preview ── */}
        <div className="space-y-5">
          {/* Upload Area */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Upload X-Ray Image</h2>
            </div>

            <div className="p-5">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/tiff"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <FileImage className={`w-7 h-7 ${isDragOver ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">
                      {isDragOver ? 'Drop your X-ray here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WEBP, TIFF — up to 15 MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <AnimatePresence>
            {previewUrl && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-violet-600" />
                    <h2 className="font-semibold text-slate-800">Preview</h2>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

                <div className="p-4">
                  <div className="relative bg-black rounded-xl overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="X-ray preview"
                      className="w-full max-h-[400px] object-contain"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{selectedFile?.name}</span>
                    <span>{(selectedFile?.size / 1024).toFixed(0)} KB</span>
                  </div>

                  {/* Analyze Button */}
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing X-Ray…
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Analyze X-Ray
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 text-sm">Analysis Error</p>
                  <p className="text-red-600 text-sm mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right column: Results ── */}
        <div className="space-y-5">
          <AnimatePresence>
            {isAnalyzing && !analysisResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-100 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                      <ScanLine className="w-4 h-4 text-violet-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-800">Analyzing X-Ray</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Processing image, running detection algorithms, and generating AI explanation…
                    </p>
                  </div>
                  <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                      animate={{ width: ['0%', '60%', '80%', '95%'] }}
                      transition={{ duration: 8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* ── Primary Finding Card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h2 className="font-semibold text-slate-800">Detected Condition</h2>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Primary finding */}
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        analysisResult.riskLevel === 'none'
                          ? 'bg-emerald-100'
                          : analysisResult.riskLevel === 'high'
                            ? 'bg-red-100'
                            : 'bg-amber-100'
                      }`}>
                        {analysisResult.riskLevel === 'none' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className={`w-5 h-5 ${analysisResult.riskLevel === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-lg capitalize">
                          {analysisResult.primaryFinding}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(analysisResult.riskLevel)}`}>
                            Risk: {analysisResult.riskLevel || 'unknown'}
                          </span>
                          {analysisResult.processingTimeMs && (
                            <span className="text-xs text-slate-400">
                              {(analysisResult.processingTimeMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    {(() => {
                      const c = getConfidenceColor(analysisResult.confidenceLevel);
                      const pct = ((analysisResult.confidence || 0) * 100).toFixed(0);
                      return (
                        <div className={`${c.bg} ${c.border} border rounded-xl p-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-semibold ${c.text}`}>
                              {getConfidenceLabel(analysisResult.confidenceLevel)}
                            </span>
                            <span className={`text-lg font-bold ${c.text}`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${c.bar}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          {analysisResult.confidenceLevel === 'uncertain' && (
                            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Results are uncertain — professional evaluation is strongly recommended.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── All Findings ── */}
                {analysisResult.findings && analysisResult.findings.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <ScanLine className="w-5 h-5 text-violet-600" />
                      <h2 className="font-semibold text-slate-800">
                        All Findings ({analysisResult.findings.length})
                      </h2>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {analysisResult.findings.map((f, i) => {
                        const pct = ((f.confidence || 0) * 100).toFixed(0);
                        return (
                          <div key={i} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 text-sm capitalize">{f.finding}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRiskColor(f.riskLevel)}`}>
                                    {f.riskLevel}
                                  </span>
                                  <span className="text-xs text-slate-400">Region: {f.region}</span>
                                </div>
                                {f.indicators && f.indicators.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {f.indicators.map((ind, j) => (
                                      <span key={j} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                        {ind}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      f.confidence >= 0.8 ? 'bg-emerald-500' :
                                      f.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-600 w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── AI Explanation ── */}
                {analysisResult.aiExplanation && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <h2 className="font-semibold text-slate-800">AI Explanation</h2>
                    </div>

                    <div className="p-5">
                      <div className="prose prose-sm prose-slate max-w-none">
                        {analysisResult.aiExplanation.split('\n').map((line, i) => (
                          <p key={i} className="text-slate-700 text-sm leading-relaxed mb-2 last:mb-0">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Image Quality ── */}
                {analysisResult.quality && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-slate-500" />
                      <h2 className="font-semibold text-slate-800">Image Quality</h2>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-slate-600">Quality Score:</span>
                        <span className={`font-bold text-sm ${
                          analysisResult.quality.quality >= 0.7 ? 'text-emerald-600' :
                          analysisResult.quality.quality >= 0.4 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {(analysisResult.quality.quality * 100).toFixed(0)}%
                        </span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              analysisResult.quality.quality >= 0.7 ? 'bg-emerald-500' :
                              analysisResult.quality.quality >= 0.4 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${(analysisResult.quality.quality * 100).toFixed(0)}%` }}
                          />
                        </div>
                      </div>

                      {analysisResult.quality.issues && analysisResult.quality.issues.length > 0 && (
                        <div className="space-y-1.5">
                          {analysisResult.quality.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Technical Details (Collapsible) ── */}
                {analysisResult.details && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Technical Details</span>
                      </div>
                      {showDetails ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 grid grid-cols-2 gap-2">
                            {Object.entries(analysisResult.details).map(([key, value]) => (
                              <div key={key} className="bg-slate-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</p>
                                <p className="text-sm font-medium text-slate-700">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── Safety Disclaimer ── */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Medical Disclaimer</p>
                    <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                      {analysisResult.disclaimer || 'This analysis is informational and not a medical diagnosis. Please consult a qualified medical professional for accurate evaluation.'}
                    </p>
                  </div>
                </div>

                {/* Re-analyze button */}
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-analyze Image
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state (no file selected) */}
          {!analysisResult && !isAnalyzing && (
            <div className="bg-white/60 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">Results will appear here</p>
              <p className="text-sm text-slate-400 mt-1">Upload an X-ray image and click "Analyze X-Ray" to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Safety Banner ── */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Important:</span> This analysis is informational and not a medical diagnosis.
          Always consult a qualified healthcare professional for accurate evaluation and treatment.
        </p>
      </div>
    </div>
  );
};

export default XRayAnalysis;
