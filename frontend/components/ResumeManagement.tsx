import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2, FileText, FileCheck, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { JobOpportunity, ResumeTemplate } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { useAuth } from '../contexts/AuthContext';
import loadingSvg from '../logo/loading.svg';

const API_BASE = '/api';

interface ResumeManagementProps {
  templates?: ResumeTemplate[];
}

type SortKey = 'published_at' | 'resume_generated_at';
type SortDirection = 'asc' | 'desc';

export const ResumeManagement: React.FC<ResumeManagementProps> = ({ templates = [] }) => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();

  // Own data state — fetched directly from /api/jobs/resumes
  const [resumeJobs, setResumeJobs] = useState<JobOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResumes, setTotalResumes] = useState(0);
  const jobsPerPage = 10;

  const fetchResumeJobs = useCallback(async (page = currentPage) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * jobsPerPage;
      const params = new URLSearchParams({ skip: skip.toString(), limit: jobsPerPage.toString() });
      const res = await fetch(`${API_BASE}/jobs/resumes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-Language': i18n.language,
        }
      });
      if (!res.ok) throw new Error(`Failed to load resumes (${res.status})`);
      const data = await res.json();
      setResumeJobs(data.items);
      setTotalResumes(data.total);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [session, i18n.language, currentPage]);

  useEffect(() => { fetchResumeJobs(currentPage); }, [fetchResumeJobs, currentPage]);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({
    key: 'resume_generated_at',
    direction: 'desc'
  });

  // Column Width State
  const [columnWidths, setColumnWidths] = useState({
    index: 60,
    title: 200,
    company: 160,
    template: 160,
    published: 140,
    generated: 140,
    language: 90,
    actions: 280
  });

  // Apply sort to the fetched data
  const processedJobs = useMemo(() => {
    if (!sortConfig) return resumeJobs;
    return [...resumeJobs].sort((a, b) => {
      const getDate = (job: JobOpportunity, key: SortKey) => {
        const val = job[key];
        return val ? new Date(val as string).getTime() : 0;
      };
      const dateA = getDate(a, sortConfig.key);
      const dateB = getDate(b, sortConfig.key);
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [resumeJobs, sortConfig]);

  const handleDeleteResume = async (job: JobOpportunity) => {
    if (!confirm(t('resumes.delete_confirm'))) return;
    if (!session) return;

    try {
      const res = await fetch(`${API_BASE}/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-Language': i18n.language,
        },
        body: JSON.stringify({
          generated_resume: null,
          resume_generated_at: null,
          generated_cover_letter: null,
          cover_letter_generated_at: null,
        })
      });
      if (res.ok) {
        // Remove from local list
        setResumeJobs(prev => prev.filter(j => j.id !== job.id));
      }
    } catch (e) {
      console.error('Failed to delete resume:', e);
    }
  };

  const convertMarkdownToDocx = async (markdown: string): Promise<Blob> => {
    // Parse markdown and convert to docx
    const lines = markdown.split('\n');
    const paragraphs: Paragraph[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        paragraphs.push(new Paragraph({ text: '' }));
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        paragraphs.push(new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 }
        }));
      } else if (line.startsWith('## ')) {
        paragraphs.push(new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 120 }
        }));
      } else if (line.startsWith('# ')) {
        paragraphs.push(new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 120 }
        }));
      } else if (line.startsWith('> ')) {
        // Blockquote
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.substring(2), italics: true })],
          spacing: { before: 120, after: 120 }
        }));
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        // Bullet points
        paragraphs.push(new Paragraph({
          text: line.substring(2),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 }
        }));
      } else if (line.match(/^\d+\.\s/)) {
        // Numbered list
        const text = line.replace(/^\d+\.\s/, '');
        paragraphs.push(new Paragraph({
          text: text,
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { before: 60, after: 60 }
        }));
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold text
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true })],
          spacing: { before: 120, after: 120 }
        }));
      } else {
        // Process inline formatting (bold, italic)
        const children: TextRun[] = [];
        let currentText = line;

        // Simple inline formatting parser
        const boldRegex = /\*\*(.+?)\*\*/g;
        const italicRegex = /\*(.+?)\*/g;

        // Replace bold with placeholders to avoid conflicts
        const boldMatches: { text: string; index: number }[] = [];
        let match;
        while ((match = boldRegex.exec(currentText)) !== null) {
          boldMatches.push({ text: match[1], index: match.index });
        }

        if (boldMatches.length > 0) {
          let lastIndex = 0;
          for (const boldMatch of boldMatches) {
            if (boldMatch.index > lastIndex) {
              const normalText = currentText.substring(lastIndex, boldMatch.index);
              if (normalText) children.push(new TextRun({ text: normalText }));
            }
            children.push(new TextRun({ text: boldMatch.text, bold: true }));
            lastIndex = boldMatch.index + boldMatch.text.length + 4; // +4 for **
          }
          if (lastIndex < currentText.length) {
            children.push(new TextRun({ text: currentText.substring(lastIndex) }));
          }
        } else {
          children.push(new TextRun({ text: currentText }));
        }

        paragraphs.push(new Paragraph({
          children,
          spacing: { before: 60, after: 60 }
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    return await Packer.toBlob(doc);
  };

  /**
   * Detect if content is our JSON-wrapped docx base64 payload.
   * Format: { "type": "docx_b64", "filename": "...", "content": "<base64>" }
   */
  const parseDocxPayload = (content: string): { filename: string; content: string } | null => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.type === 'docx_b64' && parsed.content && parsed.filename) {
        return { filename: parsed.filename, content: parsed.content };
      }
    } catch {
      // Not JSON — it's a plain markdown string
    }
    return null;
  };

  const downloadBase64Docx = (base64: string, filename: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (content: string, filename: string, format: 'md' | 'docx' = 'docx') => {
    // Check if content is a docx_b64 JSON payload (new template-based generation)
    const docxPayload = parseDocxPayload(content);
    if (docxPayload) {
      downloadBase64Docx(docxPayload.content, docxPayload.filename);
      return;
    }

    // Legacy path: content is markdown
    if (format === 'docx') {
      try {
        const blob = await convertMarkdownToDocx(content);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error converting to docx:', error);
        alert('Failed to convert document to .docx format');
      }
    } else {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <img src={loadingSvg} alt="loading" className="w-12 h-12 inline-block mb-4" />
        <p className="text-sm font-medium">Loading resumes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <FileText size={64} className="mb-4 opacity-20" />
        <p className="text-lg text-red-500">Failed to load resumes</p>
        <p className="text-sm mb-4">{error}</p>
        <button onClick={fetchResumeJobs} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (processedJobs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <FileText size={64} className="mb-4 opacity-20" />
        <p className="text-lg">{t('resumes.no_docs')}</p>
        <p className="text-sm">{t('resumes.go_detail')}</p>
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
          <FileCheck className="text-blue-600" /> {t('resumes.title')}
          <button
            onClick={fetchResumeJobs}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </h2>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed" style={{ minWidth: '1100px' }}>
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
                  {t('resumes.col_title')}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'title')} onClick={e => e.stopPropagation()} />
                </th>
                <th
                  className="relative px-4 py-4 font-semibold group"
                  style={{ width: columnWidths.company }}
                >
                  {t('resumes.col_company')}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'company')} onClick={e => e.stopPropagation()} />
                </th>
                <th
                  className="relative px-4 py-4 font-semibold group"
                  style={{ width: columnWidths.template }}
                >
                  Template
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'template')} onClick={e => e.stopPropagation()} />
                </th>
                <th
                  className="relative px-4 py-4 font-semibold cursor-pointer hover:bg-slate-100 group select-none"
                  style={{ width: columnWidths.published }}
                  onClick={() => handleSort('published_at')}
                >
                  <div className="flex items-center">
                    {t('resumes.col_published')}
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
                    {t('resumes.col_generated')}
                    {renderSortIcon('resume_generated_at')}
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'generated')} onClick={e => e.stopPropagation()} />
                </th>
                <th
                  className="relative px-4 py-4 font-semibold group"
                  style={{ width: columnWidths.language }}
                >
                  {t('resumes.col_language')}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300" onMouseDown={(e) => startResize(e, 'language')} onClick={e => e.stopPropagation()} />
                </th>
                <th
                  className="relative px-4 py-4 font-semibold text-right group"
                  style={{ width: columnWidths.actions }}
                >
                  {t('resumes.col_actions')}
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
                  <td className="px-4 py-4 text-slate-600 truncate">
                    {(() => {
                      const tpl = templates.find(t => String(t.id) === String(job.selected_template_id));
                      return tpl ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100" title={tpl.name}>
                          {tpl.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-sm truncate">
                    {job.published_at || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-sm truncate">
                    {job.resume_generated_at
                      ? new Date(job.resume_generated_at).toLocaleString()
                      : 'Unknown'}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-sm">
                    <span className={`px-2 py-1 rounded-md font-medium ${job.generated_content_lang === 'zh'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                      }`}>
                      {job.generated_content_lang === 'zh' ? '中文' : job.generated_content_lang === 'en' ? 'English' : job.generated_content_lang || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                    {job.generated_resume && (
                      <button
                        onClick={() => handleDownload(job.generated_resume!, `Resume - ${job.company} - ${job.title}.docx`, 'docx')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                        title={t('resumes.download_resume')}
                      >
                        <Download size={14} /> {t('resumes.resume')}
                      </button>
                    )}

                    <button
                      onClick={() => handleDownload(job.generated_cover_letter!, `Cover Letter - ${job.company} - ${job.title}.docx`, 'docx')}
                      disabled={!job.generated_cover_letter}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm font-medium
                        ${job.generated_cover_letter
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      title={job.generated_cover_letter ? t('resumes.download_cover') : t('resumes.not_generated')}
                    >
                      <Download size={14} /> {t('resumes.cover_letter')}
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

        {/* Pagination Controls */}
        {totalResumes > jobsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 mt-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-medium text-sm flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-slate-500 font-medium">
              Page {currentPage} of {Math.ceil(totalResumes / jobsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalResumes / jobsPerPage), p + 1))}
              disabled={currentPage === Math.ceil(totalResumes / jobsPerPage)}
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-medium text-sm flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
