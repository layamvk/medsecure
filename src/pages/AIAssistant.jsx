import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Bot, User, AlertTriangle, Brain, Shield, Clock,
  CalendarPlus, Image as ImageIcon, Camera, X, Upload, FileText,
  Activity, Eye, Pill, Stethoscope, Zap, MessageSquare, ChevronRight
} from "lucide-react";
import api from "../api/axiosConfig";
import { ActionCardRenderer } from "../components/ActionCards";

const AIAssistant = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! I'm MedSecure AI — your intelligent medical assistant. I can analyse symptoms, book appointments, suggest medications, check insurance, and guide you through the platform. How can I help you today?",
      classification: null,
      actionCards: [],
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({ messageCount: 0, activeIntent: null });
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    selectImageFile(file);
  };

  const selectImageFile = (file) => {
    if (!file) {
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10 MB.");
      return;
    }
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // ── Drag-and-drop handlers ──
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) selectImageFile(file);
  }, []);

  const buildDynamicLocalFallback = (text) => {
    const query = text.toLowerCase();
    const emergency = query.includes("chest pain") || query.includes("can't breathe") || query.includes("cannot breathe") || query.includes("difficulty breathing");
    const medium = query.includes("fever") || query.includes("vomit") || query.includes("headache") || query.includes("dizziness");

    const severity = emergency ? "critical" : medium ? "medium" : "low";
    const category = emergency || medium ? "symptoms" : "general_question";
    const recommendAppointment = emergency || medium;
    const symptomTags = [];

    if (query.includes("fever")) symptomTags.push("fever");
    if (query.includes("headache")) symptomTags.push("headache");
    if (query.includes("dizziness")) symptomTags.push("dizziness");
    if (query.includes("chest pain")) symptomTags.push("chest pain");

    const responseText = emergency
      ? "Your symptoms may be urgent. Please seek immediate medical care or contact emergency services now. If possible, avoid driving yourself and ask someone to help you reach care quickly."
      : medium
        ? "Based on your message, this seems to need clinical review soon. Please monitor symptoms, stay hydrated, and schedule an appointment if symptoms persist or worsen. Seek urgent care sooner if red-flag symptoms appear."
        : "Thanks for sharing your concern. Based on the current details, start with self-care and symptom monitoring. If your condition changes or does not improve, please book a medical appointment for personalized evaluation.";

    return {
      responseText,
      classification: {
        category,
        severity,
        confidence: emergency ? 0.88 : medium ? 0.74 : 0.62,
        emergencyDetected: emergency,
        recommendAppointment,
        symptomTags,
        recommended_action: emergency ? "urgent medical attention" : medium ? "monitor symptoms" : "self care"
      },
      recommendAppointment,
      symptomTags,
      recommendedAction: emergency ? "urgent medical attention" : medium ? "monitor symptoms" : "self care",
      fallbackUsed: true,
    };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="w-3 h-3" />;
      case 'high': return <AlertTriangle className="w-3 h-3" />;
      default: return <Shield className="w-3 h-3" />;
    }
  };

  const handleSend = async (overrideMessage = null) => {
    const textToSend = overrideMessage || input.trim();
    if (!textToSend && !selectedImage) return;
    const cleanInput = textToSend || (selectedImage ? "Please analyze this medical image." : "");
    const userMessage = { role: "patient", text: cleanInput, classification: null, imagePreview: imagePreview || null, actionCards: [] };
    const historyPayload = messages.slice(-8).map((item) => ({
      role: item.role,
      text: item.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideMessage) setInput("");
    setLoading(true);

    try {
      let res;
      if (selectedImage) {
        const formData = new FormData();
        formData.append("message", cleanInput);
        formData.append("history", JSON.stringify(historyPayload));
        formData.append("image", selectedImage);
        res = await api.post("/ai/chat", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post("/ai/chat", {
          message: cleanInput,
          history: historyPayload,
        });
      }

      const responseText = res.data?.responseText || res.data?.aiResponse || res.data?.response || "I couldn't generate a response right now.";
      const classification = res.data?.classification || {
        category: res.data?.category || "general_question",
        severity: res.data?.severity || "low",
        confidence: res.data?.confidence || 0.6,
        emergencyDetected: false,
        recommendAppointment: res.data?.recommendAppointment || false,
        symptomTags: res.data?.symptomTags || [],
        recommended_action: res.data?.recommendedAction || "self care",
      };

      // Update session info
      if (res.data?.session) {
        setSessionInfo(res.data.session);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: responseText,
          classification,
          recommendAppointment: Boolean(res.data?.recommendAppointment || classification?.recommendAppointment),
          symptomTags: res.data?.symptomTags || classification?.symptomTags || [],
          recommendedAction: res.data?.recommendedAction || classification?.recommended_action,
          fallbackUsed: Boolean(res.data?.fallbackUsed),
          intent: res.data?.intent,
          intentConfidence: res.data?.intentConfidence,
          action: res.data?.action || null,
          actionCards: res.data?.actionCards || [],
          // Rich image analysis
          imageAnalysis: res.data?.imageAnalysis || null,
          visualFinding: res.data?.visualFinding || null,
          visualConfidence: res.data?.visualConfidence ?? null,
          imageType: res.data?.imageType || null,
          imageLowConfidence: res.data?.imageLowConfidence || false,
          imageWarning: res.data?.imageWarning || null,
          imageFindings: res.data?.imageFindings || null,
          imageMedications: res.data?.imageMedications || null,
          imageDosageSummary: res.data?.imageDosageSummary || null,
          imageInstructions: res.data?.imageInstructions || null,
          imageDetails: res.data?.imageDetails || null,
        }
      ]);
    } catch (e) {
      console.error("Error contacting AI service:", e);
      const fallback = buildDynamicLocalFallback(cleanInput);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: fallback.responseText,
          classification: fallback.classification,
          recommendAppointment: fallback.recommendAppointment,
          symptomTags: fallback.symptomTags,
          recommendedAction: fallback.recommendedAction,
          fallbackUsed: fallback.fallbackUsed,
          actionCards: [],
        }
      ]);
    }
    clearImage();
    setLoading(false);
  };

  // Handler for interactive action cards (e.g., "Book Appointment" button sends a message)
  const handleActionCardMessage = (messageText) => {
    if (!messageText || loading) return;
    setInput("");
    handleSend(messageText);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "I've been having headaches for the past few days",
    "Book me an appointment in Cardiology",
    "Show me my upcoming appointments",
    "What medicine can I take for a fever?",
    "Tell me about insurance coverage options",
    "I'm experiencing chest pain and shortness of breath",
    "Analyze my X-ray for any abnormalities",
    "I have a rash on my arm — what could it be?"
  ];

  /** Map image types to icons */
  const imageTypeIcon = (type) => {
    switch (type) {
      case 'xray': return <Activity className="w-3.5 h-3.5" />;
      case 'prescription': return <Pill className="w-3.5 h-3.5" />;
      case 'injury': return <Stethoscope className="w-3.5 h-3.5" />;
      case 'skin_condition': return <Eye className="w-3.5 h-3.5" />;
      default: return <ImageIcon className="w-3.5 h-3.5" />;
    }
  };

  const imageTypeLabel = (type) => {
    switch (type) {
      case 'xray': return 'X-Ray';
      case 'prescription': return 'Prescription';
      case 'injury': return 'Injury';
      case 'skin_condition': return 'Skin Condition';
      default: return 'Image';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-8 px-6">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MedSecure AI Assistant</h1>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Intent-Aware Universal Assistant
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-emerald-600 text-xs font-medium">Active</span>
                {sessionInfo.activeIntent && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-violet-100 text-violet-600 font-medium flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {sessionInfo.activeIntent.replace('_', ' ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`flex-1 bg-white/60 backdrop-blur-xl rounded-3xl border shadow-lg flex flex-col overflow-hidden transition-colors ${isDragging ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-300/50' : 'border-white/40'}`}
        >
          {/* Drag overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm rounded-3xl pointer-events-none"
              >
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-12 h-12 text-blue-500" />
                  <p className="text-blue-700 font-semibold text-lg">Drop medical image here</p>
                  <p className="text-blue-500 text-sm">X-ray, prescription, injury photo, or skin condition</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className={`flex items-end gap-3 ${msg.role === "patient" ? "justify-end" : "justify-start"}`}
                >
                  {/* AI Avatar */}
                  {msg.role !== "patient" && (
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[75%] ${msg.role === "patient" ? "order-first" : ""}`}>
                    {/* User image preview */}
                    {msg.role === "patient" && msg.imagePreview && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-blue-400/30 max-w-[200px] ml-auto">
                        <img src={msg.imagePreview} alt="Uploaded" className="w-full h-auto max-h-40 object-cover" />
                      </div>
                    )}

                    <div
                      className={`px-5 py-3.5 rounded-2xl ${
                        msg.role === "ai"
                          ? "bg-white border border-slate-200/60 text-slate-800 rounded-bl-md shadow-sm"
                          : "bg-blue-600 text-white rounded-br-md shadow-md shadow-blue-500/20"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* ── IMAGE ANALYSIS CARD (AI messages only) ── */}
                    {msg.role === "ai" && msg.imageType && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="mt-3 ml-1 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-4 shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            {imageTypeIcon(msg.imageType)}
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-indigo-900">
                              {imageTypeLabel(msg.imageType)} Analysis
                            </span>
                            {typeof msg.visualConfidence === 'number' && (
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${msg.visualConfidence >= 0.7 ? 'bg-emerald-100 text-emerald-700' : msg.visualConfidence >= 0.4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {Math.round(msg.visualConfidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Low confidence warning */}
                        {msg.imageLowConfidence && (
                          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{msg.imageWarning || "Image analysis confidence is low. Please consult a healthcare professional."}</span>
                          </div>
                        )}

                        {/* Primary finding */}
                        {msg.visualFinding && (
                          <div className="mb-2 text-sm text-slate-700">
                            <span className="font-medium text-indigo-800">Finding: </span>
                            {msg.visualFinding}
                          </div>
                        )}

                        {/* Detailed findings list */}
                        {msg.imageFindings && msg.imageFindings.length > 0 && msg.imageType !== 'prescription' && (
                          <div className="mb-2 space-y-1.5">
                            {msg.imageFindings.map((f, fi) => (
                              <div key={fi} className="flex items-start gap-2 text-xs">
                                <span className={`inline-block mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${f.confidence >= 0.7 ? 'bg-emerald-400' : f.confidence >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                <div>
                                  <span className="font-medium text-slate-800">{f.finding}</span>
                                  <span className="ml-1 text-slate-500">({Math.round((f.confidence || 0) * 100)}%)</span>
                                  {f.region && <span className="ml-1 text-slate-400">— {f.region}</span>}
                                  {f.indicators && f.indicators.length > 0 && (
                                    <div className="text-slate-400 mt-0.5">Indicators: {f.indicators.join(', ')}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Prescription: medications */}
                        {msg.imageMedications && msg.imageMedications.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-indigo-800 mb-1 flex items-center gap-1">
                              <Pill className="w-3 h-3" /> Medications Detected
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.imageMedications.map((m, mi) => (
                                <span key={mi} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white border border-indigo-200 text-indigo-800 font-medium">
                                  {m.name}{m.dosage ? ` — ${m.dosage}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prescription: dosage summary */}
                        {msg.imageDosageSummary && (
                          <div className="text-xs text-slate-600 mb-1">
                            <span className="font-medium">Dosage: </span>{msg.imageDosageSummary}
                          </div>
                        )}

                        {/* Prescription: instructions */}
                        {msg.imageInstructions && msg.imageInstructions.length > 0 && (
                          <div className="text-xs text-slate-600 mb-1">
                            <span className="font-medium">Instructions: </span>{msg.imageInstructions.join(', ')}
                          </div>
                        )}

                        {/* Technical details (collapsible feel — always-open for brevity) */}
                        {msg.imageDetails && (
                          <div className="mt-2 pt-2 border-t border-indigo-100 flex flex-wrap gap-2">
                            {Object.entries(msg.imageDetails).map(([k, v]) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 font-mono">
                                {k}: {typeof v === 'number' ? v.toFixed(3) : v}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ML Classification Badge (AI messages only) */}
                    {msg.role === "ai" && msg.classification && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap gap-2 mt-2 ml-1"
                      >
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border ${getSeverityColor(msg.classification.severity || msg.classification.urgency)}`}>
                          {getUrgencyIcon(msg.classification.severity || msg.classification.urgency)}
                          {(msg.classification.severity || msg.classification.urgency || 'low').toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          <Brain className="w-3 h-3" />
                          {(msg.classification.category || 'general_question').replace('_', ' ')}
                        </span>
                        {msg.intent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                            <Zap className="w-3 h-3" />
                            {(msg.intent || '').replace('_', ' ')}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-violet-50 text-violet-600 border border-violet-200">
                          <Sparkles className="w-3 h-3" />
                          {Math.round(msg.classification.confidence * 100)}% confidence
                        </span>
                        {/* Legacy simple image badge (only show when no rich imageType analysis card) */}
                        {!msg.imageType && (msg.imageAnalysis?.visualFinding || msg.visualFinding) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                            <ImageIcon className="w-3 h-3" />
                            {(msg.imageAnalysis?.visualFinding || msg.visualFinding)}
                            {typeof (msg.imageAnalysis?.confidence ?? msg.visualConfidence) === 'number' && (
                              <span>
                                {` (${Math.round((msg.imageAnalysis?.confidence ?? msg.visualConfidence) * 100)}%)`}
                              </span>
                            )}
                          </span>
                        )}
                        {(msg.symptomTags || msg.classification.symptomTags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                            #{tag}
                          </span>
                        ))}
                        {msg.classification.emergencyDetected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-700 border border-red-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                        {msg.recommendAppointment && !msg.actionCards?.some(c => c.cardType === 'appointment_suggestion' || c.cardType === 'appointment_booking' || c.cardType === 'appointment_confirmed') && (
                          <button
                            type="button"
                            onClick={() => handleActionCardMessage("I'd like to book an appointment")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <CalendarPlus className="w-3 h-3" />
                            Book appointment
                          </button>
                        )}
                      </motion.div>
                    )}

                    {/* ── NEW: Structured Action Cards from Intent Executor ── */}
                    {msg.role === "ai" && msg.actionCards && msg.actionCards.length > 0 && (
                      <ActionCardRenderer
                        cards={msg.actionCards}
                        onAction={handleActionCardMessage}
                      />
                    )}

                    {/* ── LEGACY: Inline action cards (backward compat) ── */}
                    {msg.role === "ai" && msg.action && (!msg.actionCards || msg.actionCards.length === 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mt-3 ml-1 space-y-2"
                      >
                        {msg.action.type === 'SHOW_APPOINTMENTS' && Array.isArray(msg.action.appointments) && (
                          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-800 shadow-sm">
                            <div className="font-semibold mb-1 flex items-center gap-2">
                              <CalendarPlus className="w-3 h-3 text-blue-600" />
                              Upcoming appointments
                            </div>
                            {msg.action.appointments.length === 0 ? (
                              <p>No upcoming appointments were found for your account.</p>
                            ) : (
                              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {msg.action.appointments.slice(0, 5).map((appt) => (
                                  <li key={appt._id} className="flex justify-between gap-3">
                                    <span className="font-medium">
                                      {appt.date ? new Date(appt.date).toLocaleDateString() : 'Date TBD'}
                                    </span>
                                    <span className="text-slate-600 truncate">
                                      {(appt.doctorName || (appt.department || 'Clinic'))}
                                    </span>
                                    <span className="text-slate-500">
                                      {appt.time || 'Time TBD'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {msg.action.type === 'APPOINTMENT_FLOW' && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-slate-800 shadow-sm">
                            <div className="font-semibold mb-1 flex items-center gap-2">
                              <CalendarPlus className="w-3 h-3 text-emerald-600" />
                              Appointment details needed
                            </div>
                            <p className="mb-1">Please reply with:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              <li>Department (e.g., Cardiology, Neurology)</li>
                              <li>Date in format YYYY-MM-DD</li>
                              <li>Preferred time in format HH:MM</li>
                            </ul>
                            {Array.isArray(msg.action.missingFields) && msg.action.missingFields.length > 0 && (
                              <p className="mt-1 text-slate-600">
                                Missing: {msg.action.missingFields.join(', ')}
                              </p>
                            )}
                          </div>
                        )}

                        {msg.action.type === 'APPOINTMENT_CREATED' && msg.action.appointment && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-slate-800 shadow-sm">
                            <div className="font-semibold mb-1 flex items-center gap-2">
                              <CalendarPlus className="w-3 h-3 text-emerald-600" />
                              Appointment booked
                            </div>
                            <p>
                              {msg.action.appointment.date ? new Date(msg.action.appointment.date).toLocaleDateString() : 'Date TBD'}
                              {" "}at {msg.action.appointment.time || 'Time TBD'} — {msg.action.appointment.department || 'Clinic'}
                            </p>
                          </div>
                        )}

                        {msg.action.type === 'NAVIGATE' && (
                          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-800 shadow-sm flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold mb-0.5">
                                Quick navigation
                              </div>
                              <p className="text-slate-600">
                                The assistant suggests opening a related section to continue.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(msg.action.target || '/')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                            >
                              Go
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Patient Avatar */}
                  {msg.role === "patient" && (
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-end gap-3 justify-start"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200/60 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-slate-400 ml-2 flex items-center gap-1">
                        <Brain className="w-3 h-3 animate-pulse" />
                        Detecting intent & generating response...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* Suggested Questions (only show when few messages) */}
          {messages.length <= 1 && (
            <div className="px-6 pb-4">
              <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    onClick={() => { setInput(q); }}
                    className="px-3 py-2 text-xs bg-white/80 hover:bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all hover:border-blue-300"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200/60 bg-slate-50/50">
            {/* Image preview bar */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-50/80 border border-indigo-200"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-indigo-200 bg-white flex-shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-indigo-800 truncate">{selectedImage?.name || 'Image attached'}</p>
                    <p className="text-[10px] text-indigo-500">{selectedImage ? `${(selectedImage.size / 1024).toFixed(1)} KB` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              {/* Image upload button */}
              <label
                htmlFor="ai-image-input"
                title="Upload medical image"
                className={`flex items-center justify-center w-10 h-10 rounded-xl border text-slate-500 hover:text-blue-600 hover:border-blue-300 bg-white cursor-pointer transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ImageIcon className="w-5 h-5" />
              </label>
              <input
                ref={fileInputRef}
                id="ai-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={loading}
              />

              {/* Camera capture button */}
              <label
                htmlFor="ai-camera-input"
                title="Capture with camera"
                className={`flex items-center justify-center w-10 h-10 rounded-xl border text-slate-500 hover:text-emerald-600 hover:border-emerald-300 bg-white cursor-pointer transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Camera className="w-5 h-5" />
              </label>
              <input
                ref={cameraInputRef}
                id="ai-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
                disabled={loading}
              />

              {/* Text input */}
              <div className="flex-1">
                <input
                  className="w-full px-5 py-3 bg-white border-2 border-slate-200/60 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder={selectedImage ? "Describe your concern or send image for analysis…" : "Describe your symptoms or health question..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
              </div>

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={`p-3 rounded-xl transition-all ${
                  loading || (!input.trim() && !selectedImage)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700'
                }`}
                disabled={loading || (!input.trim() && !selectedImage)}
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Universal assistant: symptoms, appointments, medicines, insurance, image analysis. Drag & drop images or type your question.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIAssistant;
