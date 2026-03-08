export enum JobStatus {
  NEW = 'NEW',
  ANALYZED = 'ANALYZED',
  DRAFTING = 'DRAFTING',
  APPLIED = 'APPLIED',
  INTERVIEW = 'INTERVIEW',
  REJECTED = 'REJECTED'
}

export interface ExperienceBlock {
  id: string | number;
  experience_name: string;
  company: string;
  role: string;
  time_period: string;
  tags: string[];
  tech_stack: string[];
  content_star: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  perspectives?: {
    leadership?: string;
    technical?: string;
  };
}

export interface ResumeTemplate {
  id: string | number;
  name: string;
  description: string;
  style: 'modern' | 'classic' | 'creative';
  template_content?: string;
  cover_letter_content?: string;
}

export interface CompanyAnalysis {
  establishTime?: string;
  revenueModel?: string;
  employeeCount?: string;
  negativeNews?: string;
  culture?: string;
  seekerBrief?: string;
  prospectAnalysis?: string;
  riskAnalysis?: string;
  rawSources?: Array<{ title: string; url: string }>;
  detailed_research_log?: string; // Stores the full simulated "Tavily" output
}

export interface JobOpportunity {
  id: string | number;
  url?: string;
  platform: string;
  title: string;
  company: string;
  department?: string;
  location?: string;
  description_markdown: string;
  description_raw?: string;
  brief_description?: string;
  salary_range?: string;
  published_at?: string;
  created_at: number; // Ingest time

  // Sector 2 Data
  company_analysis?: CompanyAnalysis;

  // Sector 3 Data
  key_skills?: string[];
  matched_block_ids?: string[];
  match_level?: 'Low' | 'Medium' | 'Good';
  match_reasoning?: string;
  match_advantages?: string[];
  match_weaknesses?: string[];

  status: JobStatus;
  generated_resume?: string;
  resume_generated_at?: string; // ISO Date string
  generated_cover_letter?: string;
  cover_letter_generated_at?: string; // ISO Date string
  selected_template_id?: string;
  generated_content_lang?: string;
}

export interface AnalysisResult {
  title?: string;
  company?: string;
  department?: string;
  location?: string;
  salary_range?: string;
  published_at?: string;
  brief_description?: string;
  keySkills: string[];
  company_analysis: CompanyAnalysis;
}

export interface MatchResult {
  blockId: string;
  score: number;
  reasoning: string;
}
