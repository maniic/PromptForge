export type Category = 'vibe_coding' | 'brainstorming' | 'qa' | 'one_shot';

export const CATEGORY_LABELS: Record<Category, string> = {
  vibe_coding: 'Vibe Coding',
  brainstorming: 'Brainstorm',
  qa: 'Q&A',
  one_shot: 'One-Shot',
};

export interface ForgeRequest {
  input: string;
}

export interface CallTiming {
  call_name: string;
  latency_ms: number;
}

export interface ForgeResponse {
  category: string;
  crafted_prompt: string;
  crafted_result: string;
  raw_result: string;
  call_timings: CallTiming[];
  total_latency_ms: number;
}

// Library types
export interface LibraryRecord {
  id: string;
  title: string;
  author_name: string;
  category: string;
  original_input: string;
  crafted_prompt: string;
  crafted_result: string;
  raw_result: string;
  total_latency_ms: number;
  upvotes: number;
  created_at: string;
}

export interface LibrarySummary {
  id: string;
  title: string;
  author_name: string;
  category: string;
  upvotes: number;
  created_at: string;
}

export interface SaveToLibraryPayload {
  title: string;
  author_name: string;
  original_input: string;
  category: string;
  crafted_prompt: string;
  crafted_result: string;
  raw_result: string;
  total_latency_ms: number;
}

// Anatomy types (Phase 6-7)
export interface AnatomySegment {
  type: string;
  text: string;
}

export interface AnatomyResult {
  segments: AnatomySegment[];
  quality_score: number;
  missing_elements: string[];
}

// X-Ray types (Phase 8)
export interface DiagnosisItem {
  element: string;
  explanation: string;
}

export interface XRayDiagnosis {
  segments: AnatomySegment[];
  quality_score: number;
  missing_elements: string[];
  diagnosis: DiagnosisItem[];
}

export interface XRayResponse {
  diagnosis: XRayDiagnosis;
  upgraded_prompt: string;
  original_result: string;
  upgraded_result: string;
  total_latency_ms: number;
}
