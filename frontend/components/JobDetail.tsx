import React, { useState } from 'react';
import { JobOpportunity, ExperienceBlock, JobStatus, ResumeTemplate } from '../types';
import { Sparkles, BrainCircuit, ExternalLink, Info, CheckCircle, AlertTriangle, Building, Banknote, Calendar, Clock, Globe, FileText, X, Search, FileSearch, ShieldCheck, Zap, TrendingUp, ShieldAlert, ChevronDown, RefreshCw, MapPin, Layers } from 'lucide-react';
import { analyzeJobDescription, matchExperienceBlocks, generateApplicationMaterials, reinjectJob, researchCompany, generateResumeForJob, generateCoverLetterForJob } from '../services/geminiService';

interface JobDetailProps {
  job: JobOpportunity;
  blocks: ExperienceBlock[];
  templates: ResumeTemplate[];
  onUpdateJob: (job: JobOpportunity) => void;
  onRefreshJobs?: () => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, blocks, templates, onUpdateJob, onRefreshJobs }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0]?.id || '');

  const handleResearchCompany = async () => {
    if (!job.id) return;
    setLoading('Researching Company...');
    try {
      const updatedJob = await researchCompany(job.id);
      onUpdateJob(updatedJob);
    } catch (e: any) {
      console.error("Company research error:", e);
      alert(`Company research failed: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  };

  const handleReinject = async () => {
    if (!job.id) return;
    setLoading('Re-ingesting and Analyzing Job...');
    try {
        const updatedJob = await reinjectJob(job.id);
        onUpdateJob(updatedJob);
        // Refresh job list after successful re-ingestion
        if (onRefreshJobs) {
          onRefreshJobs();
        }
    } catch (e) {
        alert("Re-ingestion failed.");
    } finally {
        setLoading(null);
    }
  };

  const handleMatch = async () => {
    setLoading('Matching Experience...');
    try {
      const { matches, level, reasoning, advantages, weaknesses } = await matchExperienceBlocks(job, blocks);
      const matchedIds = matches.filter(m => m.score > 60).map(m => m.blockId);

      onUpdateJob({
        ...job,
        matched_block_ids: matchedIds,
        match_level: level,
        match_reasoning: reasoning,
        match_advantages: advantages,
        match_weaknesses: weaknesses
      });
    } catch (e) {
      alert("Match failed.");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateDoc = async (type: 'resume' | 'cover_letter') => {
    if (!job.id) return;
    setLoading(`Generating ${type === 'resume' ? 'Resume' : 'Cover Letter'}...`);
    try {
      let updatedJob: JobOpportunity;
      if (type === 'resume') {
        updatedJob = await generateResumeForJob(job.id, selectedTemplate);
      } else {
        updatedJob = await generateCoverLetterForJob(job.id);
      }
      onUpdateJob(updatedJob);
    } catch (e: any) {
      console.error("Doc generation error:", e);
      alert(`Generation failed: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  };

  const getStatusStyle = (status: JobStatus) => {
    switch (status) {
      case JobStatus.NEW: return 'bg-blue-50 text-blue-600 border-blue-200';
      case JobStatus.ANALYZED: return 'bg-purple-50 text-purple-600 border-purple-200';
      case JobStatus.DRAFTING: return 'bg-amber-50 text-amber-600 border-amber-200';
      case JobStatus.APPLIED: return 'bg-green-50 text-green-600 border-green-200';
      case JobStatus.INTERVIEW: return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case JobStatus.REJECTED: return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-blue-600 font-medium animate-pulse">{loading}</p>
        </div>
      )}

      {/* Full Research Modal */}
      {showResearchModal && job.company_analysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <FileSearch size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold text-slate-800">Deep Research Log: {job.company}</h3>
                      <p className="text-sm text-slate-500">Aggregated from simulated Tavily API results</p>
                   </div>
                </div>
                <button onClick={() => setShowResearchModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                   <X size={24} className="text-slate-400" />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-mono text-sm bg-slate-50 p-6 rounded-xl border border-slate-200">
                   {job.company_analysis.detailed_research_log}
                </div>
                
                <div className="mt-8 space-y-4">
                   <h4 className="text-lg font-bold border-b pb-2">Verification Sources</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {job.company_analysis.rawSources?.map((src, i) => (
                         <a key={i} href={src.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group">
                            <Globe size={16} className="text-slate-400 group-hover:text-blue-500" />
                            <span className="text-sm text-slate-600 group-hover:text-blue-700 font-medium truncate">{src.title}</span>
                            <ExternalLink size={14} className="ml-auto opacity-0 group-hover:opacity-100" />
                         </a>
                      ))}
                   </div>
                </div>
             </div>
             <div className="p-6 border-t border-slate-100 bg-slate-50 text-right">
                <button 
                  onClick={() => setShowResearchModal(false)}
                  className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
                >
                  Close Research
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
        
        {/* SECTOR 1: Job Details */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {/* STATUS DROPDOWN */}
              <div className="relative group">
                <select 
                  value={job.status}
                  onChange={(e) => onUpdateJob({ ...job, status: e.target.value as JobStatus })}
                  className={`appearance-none text-xs font-black uppercase pl-3 pr-8 py-2 rounded-lg border outline-none transition-all cursor-pointer shadow-sm min-w-[120px] ${getStatusStyle(job.status)}`}
                >
                  {Object.values(JobStatus).map(status => (
                    <option key={status} value={status} className="bg-white text-slate-800 font-medium">{status}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none opacity-50" />
              </div>

              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Globe className="text-blue-500" size={24} /> Job Details
              </h2>
            </div>
            
            <div className="text-right flex items-center gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400 block">Ingest Time</span>
                <span className="text-sm text-slate-700">{new Date(job.created_at).toLocaleString()}</span>
              </div>
              <button
                onClick={handleReinject}
                className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-all"
                title="Re-ingest/Re-analyze"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Title</label>
                <div className="font-bold text-lg text-slate-900">{job.title}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Company</label>
                <div className="text-slate-700">{job.company}</div>
              </div>
              <div className="flex gap-4">
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><Layers size={12}/> Department</label>
                    <div className="text-slate-700">{job.department || '—'}</div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin size={12}/> Location</label>
                    <div className="text-slate-700">{job.location || '—'}</div>
                 </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                 <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><Banknote size={12}/> Salary Range</label>
                 <div className="text-slate-700 font-medium bg-green-50 text-green-700 px-3 py-1 rounded-md inline-block border border-green-100">
                    {job.salary_range || 'Not specified'}
                 </div>
              </div>
              <div className="flex gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><Globe size={12}/> Platform</label>
                    <div className="text-slate-700 capitalize">{job.platform}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><Calendar size={12}/> Published</label>
                    <div className="text-slate-700">{job.published_at || 'Unknown'}</div>
                  </div>
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><ExternalLink size={12}/> Link</label>
                 <a href={job.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block text-sm">
                    {job.url || 'No URL'}
                 </a>
              </div>
            </div>
          </div>

          {job.brief_description && (
             <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100 mt-6 relative">
                 <div className="absolute top-4 right-4 text-blue-200">
                     <Info size={48} className="opacity-20" />
                 </div>
                 <h3 className="text-sm font-bold text-blue-800 mb-4 uppercase tracking-wide">Brief Description</h3>
                 <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                     {job.brief_description}
                 </div>
             </div>
          )}
        </section>

        {/* SECTOR 2: Company Analysis */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building className="text-purple-500" size={24} /> Company Analysis
             </h2>
             <button
               onClick={handleResearchCompany}
               className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
             >
               Company Research
             </button>
          </div>

          {job.company_analysis ? (
             <div className="space-y-6 animate-fade-in-up">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-400 block mb-1 font-bold uppercase">Established</span>
                      <span className="font-semibold text-slate-700">{job.company_analysis.establishTime}</span>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-400 block mb-1 font-bold uppercase">Employees</span>
                      <span className="font-semibold text-slate-700">{job.company_analysis.employeeCount}</span>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                      <span className="text-xs text-slate-400 block mb-1 font-bold uppercase">Revenue Model</span>
                      <span className="font-semibold text-slate-700">{job.company_analysis.revenueModel}</span>
                   </div>
                </div>

                {/* Cultural & Strategic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                       <h3 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2 tracking-wide">
                          <Zap size={16} className="text-blue-500" /> Culture & Environment
                       </h3>
                       <p className="text-sm text-slate-600 leading-relaxed">{job.company_analysis.culture}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                       <h3 className="font-bold text-emerald-700 mb-2 text-sm flex items-center gap-2 tracking-wide">
                          <TrendingUp size={16} className="text-emerald-500" /> Prospect Analysis
                       </h3>
                       <p className="text-sm text-emerald-800 leading-relaxed">{job.company_analysis.prospectAnalysis}</p>
                    </div>
                </div>

                {/* Risk and Concerns Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-100/50">
                       <h3 className="font-bold text-amber-700 mb-2 text-sm flex items-center gap-2 tracking-wide">
                          <ShieldAlert size={16} className="text-amber-500" /> Risk Analysis
                       </h3>
                       <p className="text-sm text-amber-800 leading-relaxed">{job.company_analysis.riskAnalysis}</p>
                    </div>
                    
                    {job.company_analysis.negativeNews && job.company_analysis.negativeNews !== 'None found' ? (
                       <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start shadow-sm">
                          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                          <div>
                             <h4 className="text-sm font-bold text-red-700">Potential Concerns</h4>
                             <p className="text-sm text-red-600 leading-relaxed">{job.company_analysis.negativeNews}</p>
                          </div>
                       </div>
                    ) : (
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center italic text-slate-400 text-sm">
                            No significant negative news found.
                        </div>
                    )}
                </div>

                {/* Job Seeker Brief (Bottom) */}
                <div className="pt-2">
                   <h3 className="font-bold text-slate-700 mb-2 text-sm uppercase tracking-widest text-center flex items-center justify-center gap-3">
                      <div className="h-px w-8 bg-slate-200"></div>
                      Job Seeker Brief
                      <div className="h-px w-8 bg-slate-200"></div>
                   </h3>
                   <p className="text-sm text-slate-700 bg-blue-50 p-4 rounded-xl border border-blue-100 font-medium leading-relaxed shadow-sm italic text-center">
                      "{job.company_analysis.seekerBrief}"
                   </p>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setShowSources(!showSources)}
                        className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Globe size={14} /> {showSources ? 'Hide Links' : 'Sources'}
                      </button>
                      <button 
                        onClick={() => setShowResearchModal(true)}
                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold transition-colors"
                      >
                        <Search size={14} /> See Detail
                      </button>
                   </div>
                   
                   {showSources && (
                      <div className="absolute right-6 bottom-16 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-10 w-64 animate-fade-in-up">
                         <div className="flex justify-between items-center mb-2 border-b pb-2">
                            <span className="text-xs font-bold text-slate-400">RESEARCH SOURCES</span>
                            <X size={12} className="cursor-pointer text-slate-300 hover:text-slate-600" onClick={() => setShowSources(false)} />
                         </div>
                         <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {job.company_analysis.rawSources?.map((src, i) => (
                               <a key={i} href={src.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline truncate">
                                  {src.title}
                               </a>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             </div>
          ) : (
             <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Clock className="mx-auto mb-2 opacity-50" />
                <p>Waiting for deep research analysis...</p>
             </div>
          )}
        </section>

        {/* SECTOR 3: Job Match */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BrainCircuit className="text-emerald-500" size={24} /> Match Analysis
             </h2>
             <button 
               onClick={handleMatch}
               className="text-sm px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
             >
               Check Match
             </button>
           </div>

           {job.match_level ? (
              <div className="animate-fade-in-up space-y-8">
                 <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg text-white font-bold text-lg shadow-sm
                       ${job.match_level === 'Good' ? 'bg-green-500' : job.match_level === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                       {job.match_level} Fit
                    </div>
                    <div className="h-px flex-1 bg-slate-100"></div>
                 </div>

                 {/* 300-word Detailed Reasoning */}
                 <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Zap size={14} className="text-yellow-500" /> Comprehensive Match Analysis
                    </h3>
                    <div className="text-slate-600 text-sm leading-relaxed prose prose-slate max-w-none">
                       {job.match_reasoning?.split('\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-4 last:mb-0">
                             {paragraph}
                          </p>
                       ))}
                    </div>
                 </div>
                 
                 {/* Advantages & Weaknesses Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Advantages */}
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                          <ShieldCheck size={18} /> Competitive Advantages
                       </h3>
                       <div className="space-y-3">
                          {job.match_advantages?.map((adv, idx) => (
                             <div key={idx} className="flex gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-emerald-900 font-medium">{adv}</span>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                          <AlertTriangle size={18} /> Areas for Improvement
                       </h3>
                       <div className="space-y-3">
                          {job.match_weaknesses?.map((weak, idx) => (
                             <div key={idx} className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-amber-900 font-medium">{weak}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           ) : (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <BrainCircuit className="mx-auto mb-2 opacity-50" />
                <p>Run match analysis to evaluate fit, strengths, and gaps.</p>
              </div>
           )}
        </section>

        {/* Results Preview (Optional) */}
        {(job.generated_resume || job.generated_cover_letter) && (
             <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <FileText className="text-blue-500" size={24} /> Generated Drafts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {job.generated_resume && (
                       <div className="p-4 bg-slate-50 rounded border border-slate-200">
                          <h4 className="font-bold text-sm mb-2">Resume Draft</h4>
                          <div className="text-xs text-slate-500 h-32 overflow-hidden">{job.generated_resume.substring(0,200)}...</div>
                       </div>
                   )}
                   {job.generated_cover_letter && (
                       <div className="p-4 bg-slate-50 rounded border border-slate-200">
                          <h4 className="font-bold text-sm mb-2">Cover Letter Draft</h4>
                          <div className="text-xs text-slate-500 h-32 overflow-hidden">{job.generated_cover_letter.substring(0,200)}...</div>
                       </div>
                   )}
                </div>
             </section>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg z-20 flex gap-4 items-center">
         <div className="flex-1 max-w-xs">
            <select 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
            >
                {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.style})</option>
                ))}
            </select>
         </div>
         <button 
           onClick={() => handleGenerateDoc('resume')}
           className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex justify-center items-center gap-2"
         >
           <Sparkles size={18} /> Generate Resume
         </button>
         <button
           onClick={() => handleGenerateDoc('cover_letter')}
           disabled={!job.generated_resume}
           className={`flex-1 px-4 py-2.5 rounded-lg shadow-sm font-medium flex justify-center items-center gap-2 transition-colors
             ${!job.generated_resume
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-900'}`}
         >
           <FileText size={18} /> Generate Cover Letter
         </button>
      </div>
    </div>
  );
};