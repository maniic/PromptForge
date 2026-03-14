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
