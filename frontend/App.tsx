import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Library, Search, BarChart3, Briefcase, UserCircle, LogOut, Trash2, Edit2, X, Check, Filter, RefreshCw, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ExperienceBlock, JobOpportunity, JobStatus, ResumeTemplate } from './types';
import { ExperienceLibrary } from './components/ExperienceLibrary';
import { JobDetail } from './components/JobDetail';
import { JobStatistics } from './components/JobStatistics';
import { PersonalProfile } from './components/PersonalProfile';
import { ResumeManagement } from './components/ResumeManagement';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Use relative path to take advantage of proxying (dev) or same-domain hosting (prod)
const API_BASE = "/api";

function AppContent() {
  const { session, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'dashboard' | 'library' | 'stats' | 'profile' | 'resumes'>('dashboard');
  const [blocks, setBlocks] = useState<ExperienceBlock[]>([]);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  
  const [selectedJobId, setSelectedJobId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJobId, setEditingJobId] = useState<string | number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
      if (!session) return new Response(null, { status: 401 });
      const headers = {
          ...options.headers,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-Language': i18n.language // Pass current language to backend
      };
      return fetch(url, { ...options, headers: headers as any });
  };

  // Initial Sync with Backend
  useEffect(() => {
    if (session) {
      refreshJobs();
      fetchWithAuth(`${API_BASE}/experience`).then(res => res.json()).then(setBlocks).catch(e => console.error(e));
      fetchWithAuth(`${API_BASE}/templates`).then(res => res.json()).then(setTemplates).catch(e => console.error(e));
    }
  }, [session]);

  const refreshJobs = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/jobs`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
    }
  };

  const handleUpdateJob = async (updatedJob: JobOpportunity) => {
    const res = await fetchWithAuth(`${API_BASE}/jobs/${updatedJob.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedJob)
    });
    if (res.ok) {
      setJobs(prev => prev.map(j => String(j.id) === String(updatedJob.id) ? updatedJob : j));
    }
  };


  const handleAddBlock = async (b: ExperienceBlock) => {
    const res = await fetchWithAuth(`${API_BASE}/experience`, {
      method: 'POST',
      body: JSON.stringify(b)
    });
    if (res.ok) {
        const saved = await res.json();
        setBlocks(prev => [...prev, saved]);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/experience/${id}`, { method: 'DELETE' });
    if (res.ok) {
        setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleDeleteJob = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!confirm(t('common.delete_confirm'))) return;
    
    const res = await fetchWithAuth(`${API_BASE}/jobs/${id}`, { method: 'DELETE' });
    if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== id));
        setSelectedJobId(prevId => prevId === id ? null : prevId);
    }
  };

  const startEditing = (e: React.MouseEvent, job: JobOpportunity) => {
    e.stopPropagation();
    setEditingJobId(job.id);
    setEditTitle(job.title);
  };

  const saveEdit = async (e: React.MouseEvent, job: JobOpportunity) => {
    e.stopPropagation();
    const updatedJob = { ...job, title: editTitle };
    
    const res = await fetchWithAuth(`${API_BASE}/jobs/${job.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedJob)
    });
    
    if (res.ok) {
      setJobs(prev => prev.map(j => String(j.id) === String(job.id) ? updatedJob : j));
      setEditingJobId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJobId(null);
  };

  const handleLogout = () => {
    signOut();
    setView('dashboard');
    setSelectedJobId(null);
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.NEW: return 'bg-blue-500';
      case JobStatus.ANALYZED: return 'bg-purple-500';
      case JobStatus.DRAFTING: return 'bg-amber-500';
      case JobStatus.APPLIED: return 'bg-green-500';
      case JobStatus.REJECTED: return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const selectedJob = jobs.find(j => String(j.id) === String(selectedJobId));

  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter(job => {
        // Filter by status
        if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
        
        // Filter by search query (title or company)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = job.title?.toLowerCase().includes(query);
          const matchesCompany = job.company?.toLowerCase().includes(query);
          return matchesTitle || matchesCompany;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [jobs, statusFilter, searchQuery]);

  const jobCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: jobs.length };
    Object.values(JobStatus).forEach(s => {
      counts[s] = jobs.filter(j => j.status === s).length;
    });
    return counts;
  }, [jobs]);

  if (!session) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-blue-200">
            <Search size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden md:block">{t('dashboard.title')}</h1>
        </div>
        
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <LayoutDashboard size={18} /> <span className="hidden sm:inline">{t('nav.dashboard')}</span>
          </button>
          <button onClick={() => setView('library')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${view === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Library size={18} /> <span className="hidden sm:inline">{t('nav.brain')}</span>
          </button>
          <button onClick={() => setView('resumes')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${view === 'resumes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Briefcase size={18} /> <span className="hidden sm:inline">{t('nav.resumes')}</span>
          </button>
          <button onClick={() => setView('stats')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${view === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <BarChart3 size={18} /> <span className="hidden sm:inline">{t('nav.stats')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors mr-2"
              title="Toggle Language"
            >
              <Languages size={18} />
              <span className="text-xs font-bold uppercase">{i18n.language}</span>
            </button>
            <div 
                onClick={() => setView('profile')}
                className={`flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer transition-opacity hover:opacity-80
                    ${view === 'profile' ? 'opacity-100' : 'opacity-70'}`}
            >
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-slate-700">{session.user.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500">Premium Account</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors 
                    ${view === 'profile' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                    <UserCircle size={24} />
                </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title={t('nav.logout')}
            >
              <LogOut size={20} />
            </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {view === 'library' && (
             <div className="h-full overflow-y-auto">
                <div className="max-w-[1600px] mx-auto">
                    <ExperienceLibrary 
                        blocks={blocks}
                        onAddBlock={handleAddBlock}
                        onUpdateBlock={handleAddBlock} 
                        onDeleteBlock={handleDeleteBlock}
                    />
                </div>
             </div>
        )}

        {view === 'stats' && (
            <div className="h-full overflow-y-auto">
                 <JobStatistics jobs={jobs} />
            </div>
        )}

        {view === 'profile' && (
            <div className="h-full overflow-y-auto">
                <PersonalProfile templates={templates} onAddTemplate={(t) => setTemplates([...templates, t])} />
            </div>
        )}

        {view === 'resumes' && (
            <div className="h-full bg-slate-50">
                <ResumeManagement jobs={jobs} onUpdateJob={handleUpdateJob} />
            </div>
        )}

        {view === 'dashboard' && (
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-1/5 bg-white border-r border-slate-200 flex flex-col min-w-[250px]">
               <div className="p-4 border-b border-slate-100 space-y-3">
                  <div className="flex gap-2">
                     <div className="flex-1 relative">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input
                         className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder={t('common.search_placeholder')}
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                       />
                       {searchQuery && (
                         <button
                           onClick={() => setSearchQuery('')}
                           className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                         >
                           <X size={14} />
                         </button>
                       )}
                     </div>
                     <button
                       onClick={refreshJobs}
                       className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors"
                       title="Refresh job list"
                     >
                        <RefreshCw size={20} />
                     </button>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <Filter size={14} className="text-slate-400 shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as JobStatus | 'ALL')}
                      className="bg-slate-50 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">{t('common.all')} {jobCounts.ALL}</option>
                      {Object.values(JobStatus).map(status => (
                        <option key={status} value={status}>{t(`common.${status.toLowerCase()}`)} {jobCounts[status] || 0}</option>
                      ))}
                    </select>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {filteredAndSortedJobs.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-slate-400">
                      <Search size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No jobs found matching "{searchQuery}"</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-blue-600 hover:underline mt-2"
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                  {filteredAndSortedJobs.length === 0 && !searchQuery && (
                    <div className="text-center py-12 px-4 text-slate-400">
                      <Briefcase size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm font-medium">{t('dashboard.no_jobs')}</p>
                    </div>
                  )}
                  {filteredAndSortedJobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-300
                            ${selectedJobId === job.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-slate-50'}`}
                      >
                         <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status as JobStatus)}`} />
                            <span className="text-xs text-slate-500 font-medium">{new Date(job.created_at).toLocaleDateString(i18n.language, {month: 'short', day: 'numeric'})}</span>
                         </div>
                         {editingJobId === job.id ? (
                           <div className="mb-1" onClick={e => e.stopPropagation()}>
                             <input
                               value={editTitle}
                               onChange={(e) => setEditTitle(e.target.value)}
                               className="w-full text-sm font-semibold border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                               autoFocus
                             />
                             <div className="flex justify-end gap-1 mt-1">
                               <button onClick={(e) => saveEdit(e, job)} className="bg-green-100 text-green-700 p-0.5 rounded hover:bg-green-200">
                                 <Check size={12} />
                               </button>
                               <button onClick={cancelEdit} className="bg-slate-100 text-slate-600 p-0.5 rounded hover:bg-slate-200">
                                 <X size={12} />
                               </button>
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="flex justify-between items-start group">
                               <h3 className={`font-semibold text-sm leading-tight mb-0.5 ${selectedJobId === job.id ? 'text-blue-800' : 'text-slate-800'}`}>{job.title}</h3>
                               <button
                                 onClick={(e) => startEditing(e, job)}
                                 className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all p-0.5"
                                 title="Rename"
                               >
                                 <Edit2 size={12} />
                               </button>
                             </div>
                             <div className="flex justify-between items-center">
                                <p className="text-xs text-slate-500 truncate">{job.company}</p>
                                <button
                                    onClick={(e) => handleDeleteJob(e, String(job.id))}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    title="Delete Job"
                                >
                                    <Trash2 size={14} />
                                </button>
                             </div>
                           </>
                         )}
                      </div>
                   ))}
                </div>
             </div>
 
             {/* Detail Area */}
             <div className="w-4/5 h-full bg-slate-100/50 p-6 overflow-hidden">
                {selectedJob ? (
                  <JobDetail
                     job={selectedJob}
                     blocks={blocks}
                     templates={templates}
                     onUpdateJob={handleUpdateJob}
                     onRefreshJobs={refreshJobs}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                     <Briefcase size={64} className="mb-4 opacity-20" />
                     <p className="text-lg mb-2">Select a job from the list to view details.</p>
                     <p className="text-sm text-slate-500">Use Chrome extension to add jobs from any website →</p>
                  </div>
                )}
             </div>
           </div>
         )}
       </main>
     </div>
   );
 }
 
 function App() {
   return (
     <AuthProvider>
       <AppContent />
     </AuthProvider>
   );
 }
 
 export default App;
