import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Bot, User, AlertTriangle, Brain, Shield, Clock, CalendarPlus, Image as ImageIcon } from "lucide-react";
import api from "../api/axiosConfig";

const AIAssistant = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! I'm your AI Medical Assistant powered by ML classification and Groq AI. I can help answer health questions, classify urgency, and provide guidance. How can I help you today?",
      classification: null
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

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

  const handleSend = async () => {
    if (!input.trim()) return;
    const cleanInput = input.trim();
    const userMessage = { role: "patient", text: cleanInput, classification: null };
    const historyPayload = messages.slice(-6).map((item) => ({
      role: item.role,
      text: item.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
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
          action: res.data?.action || null,
          imageAnalysis: res.data?.imageAnalysis || null,
          visualFinding: res.data?.visualFinding || null,
          visualConfidence: res.data?.visualConfidence ?? null,
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
        }
      ]);
    }
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "I've been having headaches for the past few days",
    "Can I get a refill on my prescription?",
    "I need to schedule a follow-up appointment",
    "I'm experiencing chest pain and shortness of breath"
  ];

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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Medical Assistant</h1>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <Brain className="w-4 h-4" />
                ML Classification + Groq AI
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-emerald-600 text-xs font-medium">Active</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg flex flex-col overflow-hidden"
        >
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
                    <div
                      className={`px-5 py-3.5 rounded-2xl ${
                        msg.role === "ai"
                          ? "bg-white border border-slate-200/60 text-slate-800 rounded-bl-md shadow-sm"
                          : "bg-blue-600 text-white rounded-br-md shadow-md shadow-blue-500/20"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>

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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-violet-50 text-violet-600 border border-violet-200">
                          <Sparkles className="w-3 h-3" />
                          {Math.round(msg.classification.confidence * 100)}% confidence
                        </span>
                        {(msg.imageAnalysis?.visualFinding || msg.visualFinding) && (
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
                        {msg.recommendAppointment && (
                          <button
                            type="button"
                            onClick={() => { window.location.href = '/appointments'; }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <CalendarPlus className="w-3 h-3" />
                            Book appointment
                          </button>
                        )}
                      </motion.div>
                    )}

                    {/* Intent-driven action cards */}
                    {msg.role === "ai" && msg.action && (
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
                        Analyzing with ML + AI...
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
            <form
              className="flex items-center gap-3"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <div className="flex-1 flex items-center gap-2">
                <label
                  htmlFor="ai-image-input"
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border text-slate-500 hover:text-blue-600 hover:border-blue-300 bg-white cursor-pointer transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ImageIcon className="w-5 h-5" />
                </label>
                <input
                  id="ai-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={loading}
                />
                <div className="flex-1 flex flex-col gap-1">
                  <input
                    className="w-full px-5 py-3 bg-white border-2 border-slate-200/60 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="Describe your symptoms or health question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                  />
                  {imagePreview && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
                      <div className="w-8 h-8 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={imagePreview} alt="Selected symptom" className="w-full h-full object-cover" />
                      </div>
                      <span>Image attached</span>
                    </div>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={`p-3 rounded-xl transition-all ${
                  loading || !input.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700'
                }`}
                disabled={loading || !input.trim()}
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIAssistant;
