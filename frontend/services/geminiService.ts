import i18n from 'i18next';
import { JobOpportunity, ExperienceBlock, AnalysisResult, MatchResult } from "../types";
import { supabase } from './supabase';

const API_BASE = "/api";

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'Accept-Language': i18n.language
  };
  return fetch(url, { ...options, headers: headers as any });
}

export const analyzeJobDescription = async (description: string): Promise<AnalysisResult> => {
  const response = await fetchWithAuth(`${API_BASE}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ description, language: i18n.language })
  });
  if (!response.ok) throw new Error("Backend analysis failed");
  return response.json();
};

export const reinjectJob = async (jobId: number): Promise<JobOpportunity> => {
  const response = await fetchWithAuth(`${API_BASE}/jobs/${jobId}/analyze`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error("Backend reinjection failed");
  return response.json();
};

export const researchCompany = async (jobId: number): Promise<JobOpportunity> => {
  const response = await fetchWithAuth(`${API_BASE}/jobs/${jobId}/research-company`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error("Company research failed");
  return response.json();
};

export const matchExperienceBlocks = async (job: JobOpportunity, blocks: ExperienceBlock[]): Promise<{ matches: MatchResult[], level: 'Low' | 'Medium' | 'Good', reasoning: string, advantages: string[], weaknesses: string[] }> => {
  const response = await fetchWithAuth(`${API_BASE}/match`, {
    method: 'POST',
    body: JSON.stringify({ job, blocks, language: i18n.language })
  });
  if (!response.ok) throw new Error("Backend matching failed");
  const data = await response.json();
  return {
    matches: data.matches,
    level: data.level,
    reasoning: data.reasoning,
    advantages: data.advantages,
    weaknesses: data.weaknesses
  };
};

export const generateApplicationMaterials = async (
  job: JobOpportunity,
  blocks: ExperienceBlock[],
  customInstructions: string,
  templateStyle: string = "modern",
  type: "resume" | "cover_letter"
): Promise<string> => {
  const response = await fetchWithAuth(`${API_BASE}/generate`, {
    method: 'POST',
    body: JSON.stringify({ job, blocks, type, customInstructions, templateStyle, language: i18n.language })
  });
  if (!response.ok) throw new Error("Backend generation failed");
  const data = await response.json();
  return data.content;
};

export const extractExperienceFromText = async (resumeText: string): Promise<ExperienceBlock[]> => {
  const response = await fetchWithAuth(`${API_BASE}/extract-experience`, {
    method: 'POST',
    body: JSON.stringify({ text: resumeText, language: i18n.language })
  });
  if (!response.ok) throw new Error("Backend extraction failed");
  const data = await response.json();

  // Use a fallback for crypto.randomUUID which is only available in Secure Contexts (HTTPS)
  const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  };

  return data.map((b: any) => ({ ...b, id: b.id || generateId() }));
};

export const generateResumeForJob = async (jobId: string | number, templateId?: string): Promise<JobOpportunity> => {
  const url = new URL(`${API_BASE}/jobs/${jobId}/generate-resume`, window.location.origin);
  if (templateId) url.searchParams.append('template_id', templateId);

  const response = await fetchWithAuth(url.toString(), {
    method: 'POST'
  });
  if (!response.ok) throw new Error("Resume generation failed");
  return response.json();
};

export const generateCoverLetterForJob = async (jobId: string | number, templateId?: string): Promise<JobOpportunity> => {
  const url = new URL(`${API_BASE}/jobs/${jobId}/generate-cover-letter`, window.location.origin);
  if (templateId) url.searchParams.append('template_id', templateId);
  const response = await fetchWithAuth(url.toString(), {
    method: 'POST'
  });
  if (!response.ok) throw new Error("Cover letter generation failed");
  return response.json();
};
