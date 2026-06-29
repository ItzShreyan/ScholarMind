"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCw, X, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface WorkspaceBrowserProps {
  url: string;
  title: string;
  onClose: () => void;
  onSaveAsNote?: (url: string, label: string) => void;
}

export function WorkspaceBrowser({ url, title, onClose, onSaveAsNote }: WorkspaceBrowserProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [displayUrl, setDisplayUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState("");

  // ✅ Handle iframe navigation
  const handleNavigation = useCallback((newUrl: string) => {
    try {
      // Validate URL
      const urlObj = new URL(newUrl);
      setCurrentUrl(urlObj.href);
      setDisplayUrl(newUrl);
      setError("");
    } catch {
      setError("Invalid URL. Please enter a valid web address.");
    }
  }, []);

  // ✅ Handle URL input changes
  const handleUrlInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayUrl(e.target.value);
  }, []);

  // ✅ Handle Enter key in URL bar
  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let urlToNavigate = displayUrl.trim();
      if (!urlToNavigate.startsWith("http://") && !urlToNavigate.startsWith("https://")) {
        urlToNavigate = `https://${urlToNavigate}`;
      }
      handleNavigation(urlToNavigate);
    }
  }, [displayUrl, handleNavigation]);

  // ✅ Handle back/forward navigation
  const handleBack = useCallback(() => {
    if (iframeRef.current?.contentWindow?.history) {
      iframeRef.current.contentWindow.history.back();
    }
  }, []);

  const handleForward = useCallback(() => {
    if (iframeRef.current?.contentWindow?.history) {
      iframeRef.current.contentWindow.history.forward();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.reload();
    }
  }, []);

  // ✅ Detect iframe navigation changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      try {
        const iframeUrl = iframe.contentWindow?.location.href;
        if (iframeUrl && iframeUrl !== "about:blank") {
          setCurrentUrl(iframeUrl);
          setDisplayUrl(iframeUrl);
        }
      } catch {
        // Cross-origin: can't access iframe URL
      }
    };

    const handleUnload = () => {
      setIsLoading(true);
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("unload", handleUnload);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("unload", handleUnload);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-black/20 rounded-[24px] border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {onSaveAsNote && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSaveAsNote(currentUrl, title)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Save this page as a study note"
              >
                <Save className="h-4 w-4 text-[var(--accent-sky)]" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-white/60" />
            </motion.button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 bg-black/30 rounded-[16px] border border-white/10 p-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 text-white/60" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-4 w-4 text-white/60" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCw className={`h-4 w-4 text-white/60 ${isLoading ? "animate-spin" : ""}`} />
          </motion.button>

          <input
            ref={(input) => {
              // Auto-focus on mount
              if (input && !displayUrl) input.focus();
            }}
            type="text"
            value={displayUrl}
            onChange={handleUrlInputChange}
            onKeyDown={handleUrlKeyDown}
            placeholder="Enter URL or search..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none px-2"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              let urlToNavigate = displayUrl.trim();
              if (!urlToNavigate.startsWith("http://") && !urlToNavigate.startsWith("https://")) {
                urlToNavigate = `https://${urlToNavigate}`;
              }
              handleNavigation(urlToNavigate);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-[var(--accent-sky)]" />
          </motion.button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-[var(--accent-coral)] bg-[rgba(255,125,89,0.1)] rounded-lg px-3 py-2"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Iframe Container */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10"
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-white/20 border-t-[var(--accent-sky)] rounded-full"
              />
              <p className="text-sm text-white/60">Loading page...</p>
            </div>
          </motion.div>
        )}

        <iframe
          ref={iframeRef}
          src={currentUrl}
          title={title}
          className="w-full h-full border-none bg-white"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation-by-user-activation"
        />
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-white/10 bg-black/30 text-xs text-white/50 flex items-center justify-between">
        <span className="truncate">{currentUrl}</span>
        <span>Browsing inside Studio</span>
      </div>
    </motion.div>
  );
}
