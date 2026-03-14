'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Loader2, Check, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { saveToLibrary } from '@/lib/api';
import type { SaveToLibraryPayload } from '@/types/api';

const CATEGORY_LABELS: Record<string, string> = {
  vibe_coding: 'Vibe Coding',
  brainstorming: 'Brainstorm',
  qa: 'Q&A',
  one_shot: 'One-Shot',
};

interface SavePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  originalInput: string;
  craftedPrompt: string;
  craftedResult: string;
  rawResult: string;
  totalLatencyMs: number;
}

export function SavePromptModal({
  isOpen,
  onClose,
  category,
  originalInput,
  craftedPrompt,
  craftedResult,
  rawResult,
  totalLatencyMs,
}: SavePromptModalProps) {
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (title.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      const payload: SaveToLibraryPayload = {
        title: title.trim(),
        author_name: authorName.trim() || 'Anonymous',
        original_input: originalInput,
        category,
        crafted_prompt: craftedPrompt,
        crafted_result: craftedResult,
        raw_result: rawResult,
        total_latency_ms: totalLatencyMs,
      };
      await saveToLibrary(payload);
      setSaved(true);
    } catch {
      setError('Save failed — please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setTitle('');
      setAuthorName('');
      setSaved(false);
      setError('');
    }, 300);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-[#0e0e0e] border-l border-[#1a1a1a] flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#151515] shrink-0">
              <h2 className="text-sm font-semibold text-[#ddd]">Save to Community Library</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-md hover:bg-white/5 text-[#555] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 px-5 py-5">
              {saved ? (
                /* Success state */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-12 gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-[#ccc]">Saved to the community library!</p>
                  <Link
                    href="/library"
                    onClick={handleClose}
                    className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/5 transition-all duration-200"
                  >
                    <BookOpen className="h-3 w-3" />
                    View in Library
                  </Link>
                </motion.div>
              ) : (
                /* Form */
                <div className="flex flex-col gap-5">
                  {/* Title */}
                  <div>
                    <label htmlFor="save-title" className="block text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-2">
                      Prompt title *
                    </label>
                    <input
                      id="save-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your prompt a name..."
                      maxLength={100}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#1a1a1a] bg-[#080808] text-sm text-[#ddd] placeholder:text-[#3a3a3a] outline-none focus:border-red-500/40 transition-colors"
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label htmlFor="save-author" className="block text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-2">
                      Your name
                    </label>
                    <input
                      id="save-author"
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Anonymous"
                      maxLength={50}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#1a1a1a] bg-[#080808] text-sm text-[#ddd] placeholder:text-[#3a3a3a] outline-none focus:border-red-500/40 transition-colors"
                    />
                  </div>

                  {/* Read-only info */}
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="rounded-lg border border-[#161616] bg-[#0a0a0a] p-3">
                      <span className="text-[10px] font-semibold text-[#444] uppercase tracking-wider">Category</span>
                      <p className="text-[13px] text-[#999] mt-1">{CATEGORY_LABELS[category] ?? category}</p>
                    </div>
                    <div className="rounded-lg border border-[#161616] bg-[#0a0a0a] p-3">
                      <span className="text-[10px] font-semibold text-[#444] uppercase tracking-wider">Your input</span>
                      <p className="text-[13px] text-[#666] mt-1 italic line-clamp-3">{originalInput}</p>
                    </div>
                    <div className="rounded-lg border border-[#161616] bg-[#0a0a0a] p-3">
                      <span className="text-[10px] font-semibold text-[#444] uppercase tracking-wider">Prompt preview</span>
                      <p className="text-[13px] text-[#999] mt-1 line-clamp-4">
                        {craftedPrompt.length > 200 ? craftedPrompt.slice(0, 200) + '...' : craftedPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-[12px] text-red-400">{error}</p>
                  )}

                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    disabled={title.trim().length < 3 || saving}
                    className={[
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                      title.trim().length >= 3 && !saving
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400'
                        : 'bg-[#1a1010] text-[#4a2020] cursor-not-allowed',
                    ].join(' ')}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save to community'
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
