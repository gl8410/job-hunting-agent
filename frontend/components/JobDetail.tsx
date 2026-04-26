import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { JobOpportunity, ExperienceBlock, JobStatus, ResumeTemplate } from '../types';
import { Sparkles, BrainCircuit, ExternalLink, Info, CheckCircle, AlertTriangle, Building, Banknote, Calendar, Clock, Globe, FileText, X, Search, FileSearch, ShieldCheck, Zap, TrendingUp, ShieldAlert, ChevronDown, RefreshCw, MapPin, Layers, Tag } from 'lucide-react';
import { analyzeJobDescription, matchExperienceBlocks, generateApplicationMaterials, reinjectJob, researchCompany, generateResumeForJob, generateCoverLetterForJob } from '../services/geminiService';
import loadingSvg from '../logo/loading.svg';

interface JobDetailProps {
  job: JobOpportunity;
  blocks: ExperienceBlock[];
  templates: ResumeTemplate[];
  onUpdateJob: (job: JobOpportunity) => void;
  onRefreshJobs?: () => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, blocks, templates, onUpdateJob, onRefreshJobs }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const { user } = useAuth();

  React.useEffect(() => {
    // Priority: use job's previously used template first, then fall back to latest uploaded
    if (templates.length > 0) {
      if (job.selected_template_id && templates.some(t => String(t.id) === String(job.selected_template_id))) {
        setSelectedTemplate(String(job.selected_template_id));
      } else if (!selectedTemplate) {
        // Find latest uploaded (highest ID)
        const sorted = [...templates].sort((a, b) => Number(b.id) - Number(a.id));
        setSelectedTemplate(sorted[0].id.toString());
      }
    }
  }, [templates, job.selected_template_id]);

  const handleResearchCompany = async () => {
    if (!job.id) return;
    setLoading(t('common.loading'));
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
    setLoading(t('common.loading'));
    try {
      const updatedJob = await reinjectJob(job.id);
      onUpdateJob(updatedJob);
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
    setLoading(t('common.loading'));
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

  const handleGenerateClick = async (type: 'resume' | 'cover_letter') => {
    if (!job.id) return;

    // Resume and cover letter both generate documents, confirming both with same modal is logical and safe.
    // If it's specifically about 'resume' from UI wording, we can generalise the cost to 20 for doc generation in general.
    // Let's keep it mostly generic or explicit.

    // Set operation type to determine later
    // Let's just track the string for submission.
    setPendingGenType(type);

    setShowResumeConfirm(true);
    setLoadingCredits(true);
    try {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_credits, topup_credits')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const subCredits = data?.subscription_credits || 0;
        const topCredits = data?.topup_credits || 0;
        setUserCredits(subCredits + topCredits);
      }
    } catch (e) {
      console.error("Failed to load credits:", e);
      setUserCredits(0);
    } finally {
      setLoadingCredits(false);
    }
  };

  const [pendingGenType, setPendingGenType] = useState<'resume' | 'cover_letter' | null>(null);

  const handleGenerateDoc = async () => {
    if (!job.id || !pendingGenType) return;
    if (userCredits !== null && userCredits < 20) {
      alert("余额不足 (Insufficient credits).");
      return;
    }

    setLoading(t('common.loading'));
    setShowResumeConfirm(false);

    try {
      let updatedJob: JobOpportunity;
      if (pendingGenType === 'resume') {
        updatedJob = await generateResumeForJob(job.id, selectedTemplate);
      } else {
        updatedJob = await generateCoverLetterForJob(job.id, selectedTemplate);
      }
      onUpdateJob(updatedJob);
    } catch (e: any) {
      console.error("Doc generation error:", e);
      alert(`Generation failed: ${e.message || "Insufficient credits or unknown error"}`);
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

      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <img src={loadingSvg} alt="loading" className="w-12 h-12 inline-block mb-4" />
          <p className="text-blue-600 font-medium animate-pulse">{loading}</p>
        </div>
      )}

      {/* Resume Generate Confirm Modal */}
      {showResumeConfirm && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">确认审查费用</h3>
                  <p className="text-sm text-slate-500 mt-1">本次操作将消耗您的账户积分</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 mb-6 space-y-4">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-600">操作:</span>
                  <span className="text-slate-900">{pendingGenType === 'resume' ? '生成简历' : '生成求职信'}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-600">当前余额:</span>
                  <span className="text-slate-900">
                    {loadingCredits ? <img src={loadingSvg} alt="loading" className="w-4 h-4 inline-block" /> : `${userCredits} 积分`}
                  </span>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between items-center text-base font-bold">
                  <span className="text-slate-800">总计消耗:</span>
                  <span className="text-blue-600 text-lg">20 积分</span>
                </div>
              </div>

              {(!loadingCredits && userCredits !== null && userCredits < 20) && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                  <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                  <p>积分不足！您需要至少 20 积分才能继续此操作，请前去充值。</p>
                </div>
              )}

              <div className="text-center text-xs text-slate-400 mb-8 space-y-1">
                <p>点击确认后将立即扣除积分并开始任务。</p>
                <p>若任务失败，积分将自动通过系统日志审计退回。</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResumeConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerateDoc}
                  disabled={loadingCredits || (userCredits !== null && userCredits < 20)}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-white
                    ${loadingCredits || (userCredits !== null && userCredits < 20)
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  确认并开始
                </button>
              </div>
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
              <div className="relative group">
                <select
                  value={job.status}
                  onChange={(e) => onUpdateJob({ ...job, status: e.target.value as JobStatus })}
                  className={`appearance-none text-xs font-black uppercase pl-3 pr-8 py-2 rounded-lg border outline-none transition-all cursor-pointer shadow-sm min-w-[120px] ${getStatusStyle(job.status)}`}
                >
                  {Object.values(JobStatus).map(status => (
                    <option key={status} value={status} className="bg-white text-slate-800 font-medium">{t(`common.${status.toLowerCase()}`)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none opacity-50" />
              </div>

              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Globe className="text-blue-500" size={24} /> {t('job_detail.title')}
              </h2>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('job_detail.ingest_time')}</div>
              <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                <span>{new Date(job.created_at).toLocaleString()}</span>
                <button
                  onClick={handleReinject}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors group"
                  title="Re-ingest original data"
                >
                  <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('job_detail.role_title')}</label>
                <div className="text-2xl font-black text-slate-900 leading-tight">{job.title}</div>
              </div>

              <div className="relative group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('job_detail.company')}</label>
                <div className="text-lg font-bold text-slate-700">{job.company}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Layers size={14} /> {t('job_detail.department')}
                  </label>
                  <div className="text-slate-600 font-medium">{job.department || '—'}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <MapPin size={14} /> {t('job_detail.location')}
                  </label>
                  <div className="text-slate-600 font-medium">{job.location || '—'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Banknote size={14} /> {t('job_detail.salary')}
                </label>
                {job.salary_range ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-lg border border-emerald-100 block w-fit">
                    {job.salary_range}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Not specified</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Globe size={14} /> {t('job_detail.platform')}
                  </label>
                  <div className="text-slate-700 font-bold">{job.platform}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calendar size={14} /> {t('job_detail.published')}
                  </label>
                  <div className="text-slate-700 font-bold">{job.published_at || '—'}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <ExternalLink size={14} /> {t('job_detail.link')}
                </label>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-sm font-medium transition-colors line-clamp-2 hover:underline"
                >
                  {job.url}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* BRIEF DESCRIPTION */}
        {job.brief_description && (
          <section className="bg-white rounded-xl border-2 border-blue-50 p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex items-center gap-2 mb-4 text-blue-700">
              <h2 className="text-sm font-black uppercase tracking-widest">{t('job_detail.brief')}</h2>
              <div className="flex-1 h-px bg-blue-100"></div>
              <Info size={18} className="opacity-40" />
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              {job.brief_description}
            </p>
          </section>
        )}

        {/* SECTOR 2: Company Analysis */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Building className="text-purple-500" size={24} /> {t('job_detail.company_analysis')}
            </h2>
            <button
              onClick={handleResearchCompany}
              className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              {t('job_detail.research_button')}
            </button>
          </div>

          {job.company_analysis ? (
            <div className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1 font-bold uppercase tracking-wider">{t('job_detail.established')}</span>
                  <span className="font-semibold text-slate-700">{job.company_analysis.establishTime}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1 font-bold uppercase tracking-wider">{t('job_detail.employees')}</span>
                  <span className="font-semibold text-slate-700">{job.company_analysis.employeeCount}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1 font-bold uppercase tracking-wider">{t('job_detail.revenue')}</span>
                  <span className="font-semibold text-slate-700">{job.company_analysis.revenueModel}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1 font-bold uppercase tracking-wider">{t('job_detail.culture')}</span>
                  <span className="font-semibold text-slate-700">{job.company_analysis.culture}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-2">{t('job_detail.prospects')}</label>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{job.company_analysis.prospectAnalysis}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 block mb-2">{t('job_detail.risks')}</label>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{job.company_analysis.riskAnalysis}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 font-medium leading-relaxed shadow-sm italic text-center">
                "{job.company_analysis.seekerBrief}"
              </div>

              {job.company_analysis.rawSources && job.company_analysis.rawSources.length > 0 && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">{t('job_detail.sources')}</label>
                  <ul className="space-y-2">
                    {job.company_analysis.rawSources.map((source, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <ExternalLink size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors break-all"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Clock className="mx-auto mb-2 opacity-50" />
              <p>{t('job_detail.waiting_analysis')}</p>
            </div>
          )}
        </section>

        {/* SECTOR 3: Job Match */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BrainCircuit className="text-emerald-500" size={24} /> {t('job_detail.match_analysis')}
            </h2>
            <button
              onClick={handleMatch}
              className="text-sm px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
            >
              {t('job_detail.check_match')}
            </button>
          </div>

          {job.match_level ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full font-black uppercase text-sm border-2 ${job.match_level === 'Good' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  job.match_level === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                  {t('job_detail.match_analysis')}: {job.match_level}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{t('common.reasoning')}</label>
                <p className="text-slate-600 leading-relaxed font-medium">{job.match_reasoning}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                    <CheckCircle size={14} /> {t('common.strengths')}
                  </label>
                  <ul className="space-y-2">
                    {job.match_advantages?.map((adv, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                        <Zap size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        {adv}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">
                    <AlertTriangle size={14} /> {t('common.gaps')}
                  </label>
                  <ul className="space-y-2">
                    {job.match_weaknesses?.map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                        <ShieldAlert size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        {weak}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Zap className="mx-auto mb-2 opacity-50" />
              <p>{t('common.run_match')}</p>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg z-20 flex gap-6 items-center">
        <div className="flex-1 flex items-center gap-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest min-w-fit">{t('common.template')}</label>
          <div className="relative group flex-1 max-w-xs">
            <select
              value={selectedTemplate || job.selected_template_id || ''}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold py-2 pl-4 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer shadow-sm"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        <div className="flex gap-4 min-w-fit items-start">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleGenerateClick('resume')}
              className={`px-6 py-2.5 rounded-lg transition-colors shadow-sm font-bold flex justify-center items-center gap-2 text-white
                ${job.generated_resume ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {job.generated_resume ? <CheckCircle size={18} /> : <Sparkles size={18} />} {t('job_detail.generate_resume')}
            </button>
            {job.generated_resume && job.selected_template_id && (() => {
              const tpl = templates.find(t => String(t.id) === String(job.selected_template_id));
              return tpl ? (
                <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
                  <Tag size={10} /> {tpl.name}
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleGenerateClick('cover_letter')}
              disabled={!job.generated_resume || !templates.find(t => String(t.id) === (selectedTemplate || job.selected_template_id))?.cover_letter_content}
              className={`px-6 py-2.5 rounded-lg shadow-sm font-bold flex justify-center items-center gap-2 transition-colors
                    ${(!job.generated_resume || !templates.find(t => String(t.id) === (selectedTemplate || job.selected_template_id))?.cover_letter_content)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : job.generated_cover_letter ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
            >
              {job.generated_cover_letter ? <CheckCircle size={18} /> : <FileText size={18} />} {t('job_detail.generate_cover_letter')}
            </button>
            {job.generated_cover_letter && job.selected_template_id && (() => {
              const tpl = templates.find(t => String(t.id) === String(job.selected_template_id));
              return tpl ? (
                <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
                  <Tag size={10} /> {tpl.name}
                </span>
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
