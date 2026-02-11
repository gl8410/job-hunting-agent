import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2, FileText, FileCheck, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { JobOpportunity } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface ResumeManagementProps {
  jobs: JobOpportunity[];
  onUpdateJob: (job: JobOpportunity) => void;
}

type SortKey = 'published_at' | 'resume_generated_at';
type SortDirection = 'asc' | 'desc';

export const ResumeManagement: React.FC<ResumeManagementProps> = ({ jobs, onUpdateJob }) => {
  const { t } = useTranslation();
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
    language: 100,
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
    if (!confirm(t('resumes.delete_confirm'))) return;

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

  const handleDownload = async (content: string, filename: string, format: 'md' | 'docx' = 'docx') => {
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
                  <td className="px-4 py-4 text-slate-500 text-sm truncate">
                    {job.published_at || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-sm truncate">
                    {job.resume_generated_at
                      ? new Date(job.resume_generated_at).toLocaleString()
                      : 'Unknown'}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-sm">
                    <span className={`px-2 py-1 rounded-md font-medium ${
                      job.generated_content_lang === 'zh'
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
      </div>
    </div>
  );
};
