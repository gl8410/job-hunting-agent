import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Download, Trash2, FileText, FileCheck, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { JobOpportunity } from '../types';

interface ResumeManagementProps {
  jobs: JobOpportunity[];
  onUpdateJob: (job: JobOpportunity) => void;
}

type SortKey = 'published_at' | 'resume_generated_at';
type SortDirection = 'asc' | 'desc';

export const ResumeManagement: React.FC<ResumeManagementProps> = ({ jobs, onUpdateJob }) => {
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({
    key: 'resume_generated_at',
    direction: 'desc'
  });
  
  // Column Width State
  const [columnWidths, setColumnWidths] = useState({
    index: 60,
    title: 220,
    company: 180,
    published: 160,
    generated: 160,
    actions: 300
  });

  // Filter jobs that have generated resumes or cover letters
  const processedJobs = useMemo(() => {
    let result = jobs.filter(job => job.generated_resume || job.generated_cover_letter);

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const getDate = (job: JobOpportunity, key: SortKey) => {
          const val = job[key];
          return val ? new Date(val).getTime() : 0;
        };

        const dateA = getDate(a, sortConfig.key);
        const dateB = getDate(b, sortConfig.key);

        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [jobs, sortConfig]);

  const handleDeleteResume = async (job: JobOpportunity) => {
    if (!confirm('Are you sure you want to delete the generated resume and cover letter?')) return;

    // Send update to clear resume and cover letter
    // Note: We're sending nulls/empty strings to clear them
    // Ideally backend should handle specific deletion logic, but setting them to null via update works if backend supports it.
    // Given the Pydantic model might ignore missing fields, we try setting to empty string or rely on a specific logic if this fails.
    // For now, let's try setting them to undefined or null on the object we send back, assuming backend handles "set field to null".
    // If backend ignores unset fields, we might need to modify backend to accept explicit None.
    // Based on standard FastAPI/Pydantic `exclude_unset=True`, we need to make sure we SEND the keys with null values.
    
    // However, existing simple generic update in App.tsx just sends the object.
    // Let's create a copy with reset fields.
    const updatedJob: any = { 
        ...job, 
        generated_resume: null, 
        resume_generated_at: null,
        generated_cover_letter: null, 
        cover_letter_generated_at: null 
    };

    onUpdateJob(updatedJob);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'desc' ? { key, direction: 'asc' } : { key, direction: 'desc' };
      }
      return { key, direction: 'desc' }; // Default to newest first
    });
  };

  // Resize Logic
  const resizeState = useRef<{ startX: number; startWidth: number; key: string } | null>(null);

  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = {
      startX: e.pageX,
      startWidth: columnWidths[key as keyof typeof columnWidths],
      key
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState.current) return;
    const { startX, startWidth, key } = resizeState.current;
    const diff = e.pageX - startX;
    setColumnWidths(prev => ({
      ...prev,
      [key]: Math.max(50, startWidth + diff)
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    resizeState.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
  }, [onMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  if (processedJobs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <FileText size={64} className="mb-4 opacity-20" />
        <p className="text-lg">No documents generated yet.</p>
        <p className="text-sm">Go to a Job Detail page to generate resumes and cover letters.</p>
      </div>
    );
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 ml-1" />
      : <ArrowDown size={14} className="text-blue-600 ml-1" />;
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="w-full"> 
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileCheck className="text-blue-600" /> Resume Management
        </h2>
        
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed" style={{ minWidth: '1000px' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                <th 
                    className="relative px-4 py-4 font-semibold w-12 group" 
                    style={{ width: columnWidths.index }}
                >
                    #
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'index')} onClick={e => e.stopPropagation()} />
                </th>
                <th 
                    className="relative px-4 py-4 font-semibold group" 
                    style={{ width: columnWidths.title }}
                >
                    Job Title
                     <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'title')} onClick={e => e.stopPropagation()} />
                </th>
                <th 
                    className="relative px-4 py-4 font-semibold group" 
                    style={{ width: columnWidths.company }}
                >
                    Company
                     <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'company')} onClick={e => e.stopPropagation()} />
                </th>
                <th 
                    className="relative px-4 py-4 font-semibold cursor-pointer hover:bg-slate-100 group select-none" 
                    style={{ width: columnWidths.published }}
                    onClick={() => handleSort('published_at')}
                >
                    <div className="flex items-center">
                        Published
                        {renderSortIcon('published_at')}
                    </div>
                     <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'published')} onClick={e => e.stopPropagation()} />
                </th>
                <th 
                    className="relative px-4 py-4 font-semibold cursor-pointer hover:bg-slate-100 group select-none" 
                    style={{ width: columnWidths.generated }}
                     onClick={() => handleSort('resume_generated_at')}
                >
                     <div className="flex items-center">
                        Generated
                        {renderSortIcon('resume_generated_at')}
                    </div>
                     <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'generated')} onClick={e => e.stopPropagation()} />
                </th>
                <th 
                    className="relative px-4 py-4 font-semibold text-right group"
                    style={{ width: columnWidths.actions }}
                >
                    Actions
                     <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'actions')} onClick={e => e.stopPropagation()} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedJobs.map((job, index) => (
                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-slate-400 truncate">{index + 1}</td>
                  <td className="px-4 py-4 font-medium text-slate-800 truncate" title={job.title}>{job.title}</td>
                  <td className="px-4 py-4 text-slate-600 truncate" title={job.company}>{job.company}</td>
                  <td className="px-4 py-4 text-slate-500 text-sm truncate">
                    {job.published_at || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-sm truncate">
                    {job.resume_generated_at 
                      ? new Date(job.resume_generated_at).toLocaleString() 
                      : 'Unknown'}
                  </td>
                  <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                    {job.generated_resume && (
                      <button
                        onClick={() => handleDownload(job.generated_resume!, `Resume - ${job.company} - ${job.title}.md`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                        title="Download Resume"
                      >
                        <Download size={14} /> Resume
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDownload(job.generated_cover_letter!, `Cover Letter - ${job.company} - ${job.title}.docx`)}
                      disabled={!job.generated_cover_letter}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm font-medium
                        ${job.generated_cover_letter 
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      title={job.generated_cover_letter ? "Download Cover Letter" : "Not generated yet"}
                    >
                      <Download size={14} /> Cover Letter
                    </button>

                    <button
                      onClick={() => handleDeleteResume(job)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-red-600 rounded-md hover:bg-red-50 hover:border-red-200 transition-colors text-sm font-medium ml-2"
                      title="Delete Documents"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};