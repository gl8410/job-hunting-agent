import { JobOpportunity, ExperienceBlock, AnalysisResult, MatchResult } from "../types";
import { supabase } from './supabase';

const API_BASE = "/api";

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };
    return fetch(url, { ...options, headers: headers as any });
}

export const analyzeJobDescription = async (description: string): Promise<AnalysisResult> => {
  const response = await fetchWithAuth(`${API_BASE}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ description })
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

export const matchExperienceBlocks = async (job: JobOpportunity, blocks: ExperienceBlock[]): Promise<{matches: MatchResult[], level: 'Low'|'Medium'|'Good', reasoning: string, advantages: string[], weaknesses: string[]}> => {
  const response = await fetchWithAuth(`${API_BASE}/match`, {
    method: 'POST',
    body: JSON.stringify({ job, blocks })
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
    body: JSON.stringify({ job, blocks, type, customInstructions, templateStyle })
  });
  if (!response.ok) throw new Error("Backend generation failed");
  const data = await response.json();
  return data.content;
};

export const extractExperienceFromText = async (resumeText: string): Promise<ExperienceBlock[]> => {
  const response = await fetchWithAuth(`${API_BASE}/extract-experience`, {
    method: 'POST',
    body: JSON.stringify({ text: resumeText })
  });
  if (!response.ok) throw new Error("Backend extraction failed");
  const data = await response.json();
  return data.map((b: any) => ({ ...b, id: b.id || crypto.randomUUID() }));
};

export const generateResumeForJob = async (jobId: string | number, templateId?: string): Promise<JobOpportunity> => {
  // Use window.location.origin as base for relative URLs to avoid "Invalid URL" error
  const url = new URL(`${API_BASE}/jobs/${jobId}/generate-resume`, window.location.origin);
  if (templateId) url.searchParams.append('template_id', templateId);
  
  // Convert back to relative string if preferred, or use full URL. fetch accepts full URL.
  const response = await fetchWithAuth(url.toString(), {
    method: 'POST'
  });
  if (!response.ok) throw new Error("Resume generation failed");
  return response.json();
};

export const generateCoverLetterForJob = async (jobId: string | number): Promise<JobOpportunity> => {
  const response = await fetchWithAuth(`${API_BASE}/jobs/${jobId}/generate-cover-letter`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error("Cover letter generation failed");
  return response.json();
};
