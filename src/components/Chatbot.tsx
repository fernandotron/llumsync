"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./Chatbot.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  isFallback?: boolean;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `¡Hola! Soy **Sami**, tu asistente de ayuda. ¿En qué puedo orientarte hoy? 
Puedes consultarme sobre cómo funciona la **Agenda**, cómo gestionar **Pacientes**, configurar el **Control Horario**, realizar **Ventas** o ajustar **Permisos de Usuarios**.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [isShifted, setIsShifted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Monitor DOM to see if any right-side drawer/overlay is open
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDrawer = () => {
      // Find element with class containing 'agendaDrawer' or 'drawerWrapper' or 'drawerContent'
      const hasDrawer = document.querySelector('[class*="agendaDrawer"]') || 
                        document.querySelector('[class*="drawerWrapper"]') || 
                        document.querySelector('[class*="drawerContent"]');
      setIsShifted(!!hasDrawer);
    };

    checkDrawer();
    const interval = setInterval(checkDrawer, 250);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessageText = inputValue.trim();
    setInputValue("");
    
    // Append user message
    const updatedMessages = [...messages, { role: "user" as const, content: userMessageText }];
    setMessages(updatedMessages);
    setIsLoading(true);
    setShowKeyWarning(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            isFallback: data.isFallback
          }
        ]);
        if (data.isFallback) {
          setShowKeyWarning(true);
        }
      } else {
        throw new Error("API call error");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Lo siento, ha ocurrido un error al intentar conectar con el asistente. Por favor, inténtalo de nuevo más tarde."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format markdown-like text to formatted React elements
  const formatMessageContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let content = line;

      // H3 headers
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className={styles.msgHeader}>
            {line.substring(4)}
          </h4>
        );
      }

      // Unordered lists
      if (line.trim().startsWith("- ")) {
        content = line.trim().substring(2);
        return (
          <li key={idx} className={styles.msgListItem}>
            {formatInlineText(content)}
          </li>
        );
      }

      // Numbered lists
      const numberedMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numberedMatch) {
        content = numberedMatch[2];
        return (
          <li key={idx} className={styles.msgListItemNumbered} data-num={numberedMatch[1]}>
            {formatInlineText(content)}
          </li>
        );
      }

      return (
        <p key={idx} className={styles.msgParagraph}>
          {formatInlineText(line)}
        </p>
      );
    });
  };

  // Inline formatting helper for **bold** and `code`
  const formatInlineText = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className={styles.msgInlineCode}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div 
      className={styles.copilotWrapper}
      style={isShifted ? {
        right: "504px", // 480px (drawer width) + 24px (margin)
        transition: "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      } : {
        right: "24px",
        transition: "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {/* Floating Chat Bubble Button */}
      <button
        type="button"
        className={`${styles.chatBubble} ${isOpen ? styles.chatBubbleActive : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Sami AI Assistant"
      >
        {isOpen ? (
          // Close Icon
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          // Chat Icon
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Glassmorphic Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderInfo}>
              <span className={styles.chatHeaderTitle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 7.54 16.59c-.24.25-.63.27-.89.03l-1-.9c-.26-.23-.27-.63-.03-.89A8 8 0 1 0 5.47 14.8c-.23.26-.62.27-.88.04l-1-.9c-.26-.24-.26-.64-.02-.89A10 10 0 0 1 12 2z"></path>
                  <path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"></path>
                </svg>
                Sami
              </span>
              <span className={styles.chatHeaderStatus}>
                <span className={styles.statusIndicator}></span>
                Asistente de Ayuda
              </span>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              title="Cerrar chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className={styles.messagesArea}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.messageRow} ${
                  msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant
                }`}
              >
                <div
                  className={`${styles.messageBubble} ${
                    msg.role === "user" ? styles.messageBubbleUser : styles.messageBubbleAssistant
                  }`}
                >
                  {formatMessageContent(msg.content)}
                </div>
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
                <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant} ${styles.typingBubble}`}>
                  <span className={styles.typingDot}></span>
                  <span className={styles.typingDot}></span>
                  <span className={styles.typingDot}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form area */}
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-card)" }}>
            {/* API Warning */}
            {showKeyWarning && (
              <div style={{ padding: "0 16px" }}>
                <div className={styles.fallbackBanner}>
                  ⚠️ <strong>Modo Local Activo:</strong> Configura la variable <code>GEMINI_API_KEY</code> en tu archivo <code>.env</code> para habilitar respuestas libres ilimitadas basadas en Inteligencia Artificial.
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className={styles.inputArea}>
              <input
                type="text"
                className={styles.inputField}
                placeholder="Escribe tu consulta aquí..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!inputValue.trim() || isLoading}
                title="Enviar mensaje"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "1px" }}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
