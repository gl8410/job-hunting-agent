import React, { useState } from 'react';
import { ExperienceBlock } from '../types';
import { Plus, Edit2, Trash2, Briefcase, FileUp, Loader2, Download } from 'lucide-react';
import { extractExperienceFromText } from '../services/geminiService';

interface ExperienceLibraryProps {
  blocks: ExperienceBlock[];
  onAddBlock: (block: ExperienceBlock) => void;
  onUpdateBlock: (block: ExperienceBlock) => void;
  onDeleteBlock: (id: string) => void;
}

export const ExperienceLibrary: React.FC<ExperienceLibraryProps> = ({
  blocks,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<Partial<ExperienceBlock>>({});
  const [isImporting, setIsImporting] = useState(false);

  const handleSave = () => {
    if (!currentBlock.experience_name || !currentBlock.company) return;

    const newBlock: ExperienceBlock = {
      id: currentBlock.id || crypto.randomUUID(),
      experience_name: currentBlock.experience_name || '',
      company: currentBlock.company || '',
      role: currentBlock.role || '',
      time_period: currentBlock.time_period || '',
      tags: currentBlock.tags || [],
      tech_stack: currentBlock.tech_stack || [],
      content_star: currentBlock.content_star || { situation: '', task: '', action: '', result: '' },
      ...currentBlock
    } as ExperienceBlock;

    if (currentBlock.id) {
      onUpdateBlock(newBlock);
    } else {
      onAddBlock(newBlock);
    }
    setIsEditing(false);
    setCurrentBlock({});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    // Simulate reading file - in real app, use PDF.js for pdfs.
    // For now, we try to read as text. If binary/PDF, we might get garbage or need a library.
    // We will assume text/md/docx text content for this demo or fallback to a simulated "Extraction".
    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        try {
            const extractedBlocks = await extractExperienceFromText(text);
            if (extractedBlocks.length === 0) {
                alert("No experience blocks could be extracted from this file. Make sure it contains formatted experience units.");
                return;
            }
            
            // Remove IDs from extracted blocks before adding, so backend can assign new ones
            for (const b of extractedBlocks) {
                const { id, ...rest } = b as any;
                await onAddBlock(rest as any);
            }
            alert(`Successfully extracted and uploaded ${extractedBlocks.length} experience blocks!`);
        } catch (error) {
            alert("Failed to extract experience. Please try pasting text directly if file upload fails.");
        } finally {
            setIsImporting(false);
        }
    };
    reader.onerror = () => {
        setIsImporting(false);
        alert("Error reading file");
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const content = blocks.map(block => `
### EXPERIENCE BLOCK START ###
Experience_name: ${block.experience_name}
Company: ${block.company}
Role: ${block.role}
Time period: ${block.time_period || ''}
Tags: ${block.tags.join(', ')}
Tech Stack: ${block.tech_stack.join(', ')}

Situation:
${block.content_star.situation}

Task:
${block.content_star.task}

Action:
${block.content_star.action}

Result:
${block.content_star.result}

### EXPERIENCE BLOCK END ###
`).join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `experience_library_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openEditor = (block?: ExperienceBlock) => {
    setCurrentBlock(block || {
      tags: [],
      tech_stack: [],
      content_star: { situation: '', task: '', action: '', result: '' }
    });
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">{currentBlock.id ? 'Edit' : 'New'} Experience Block</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Experience Name</label>
            <input
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={currentBlock.experience_name || ''}
              onChange={e => setCurrentBlock({...currentBlock, experience_name: e.target.value})}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Role</label>
            <input
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={currentBlock.role || ''}
              onChange={e => setCurrentBlock({...currentBlock, role: e.target.value})}
              placeholder="e.g. Lead Developer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Company</label>
            <input
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={currentBlock.company || ''}
              onChange={e => setCurrentBlock({...currentBlock, company: e.target.value})}
              placeholder="e.g. TechCorp HK"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Time Period</label>
            <input
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={currentBlock.time_period || ''}
              onChange={e => setCurrentBlock({...currentBlock, time_period: e.target.value})}
              placeholder="e.g. 2021.06-2022.10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tags (comma separated)</label>
            <input
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={currentBlock.tags?.join(', ') || ''}
              onChange={e => setCurrentBlock({...currentBlock, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
              placeholder="Machine learning, digital transformation, predictive maintenance"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tech Stack (comma separated)</label>
            <input
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={currentBlock.tech_stack?.join(', ') || ''}
              onChange={e => setCurrentBlock({...currentBlock, tech_stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
              placeholder="Python, React, AWS, TensorFlow"
            />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-slate-700 border-b pb-2">STAR Method Content</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Situation <span className="text-slate-400 font-normal">(~150 words)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">Background/context, importance, complexity, or challenges</p>
            <textarea
              className="w-full p-2 border rounded-lg h-24 text-sm focus:ring-1 focus:ring-blue-500"
              value={currentBlock.content_star?.situation || ''}
              onChange={e => setCurrentBlock({
                ...currentBlock,
                content_star: { ...currentBlock.content_star!, situation: e.target.value }
              })}
              placeholder="Describe the background, importance, complexity, or challenges..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Task <span className="text-slate-400 font-normal">(~100 words)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">Mission/objectives that needed to be accomplished</p>
            <textarea
              className="w-full p-2 border rounded-lg h-20 text-sm focus:ring-1 focus:ring-blue-500"
              value={currentBlock.content_star?.task || ''}
              onChange={e => setCurrentBlock({
                ...currentBlock,
                content_star: { ...currentBlock.content_star!, task: e.target.value }
              })}
              placeholder="What was the mission or objective to accomplish?"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Action <span className="text-slate-400 font-normal">(~150 words)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">Specific actions you took</p>
            <textarea
              className="w-full p-2 border rounded-lg h-24 text-sm focus:ring-1 focus:ring-blue-500"
              value={currentBlock.content_star?.action || ''}
              onChange={e => setCurrentBlock({
                ...currentBlock,
                content_star: { ...currentBlock.content_star!, action: e.target.value }
              })}
              placeholder="What specifically did you do? Detail your approach and methods..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Result <span className="text-slate-400 font-normal">(~100 words)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">Achievements with evidence/metrics</p>
            <textarea
              className="w-full p-2 border rounded-lg h-20 text-sm focus:ring-1 focus:ring-blue-500"
              value={currentBlock.content_star?.result || ''}
              onChange={e => setCurrentBlock({
                ...currentBlock,
                content_star: { ...currentBlock.content_star!, result: e.target.value }
              })}
              placeholder="What quantifiable outcomes did you achieve? Include metrics and evidence..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Save Block
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Experience Brain</h2>
          <p className="text-slate-500">Your atomic units of career experience.</p>
        </div>
        <div className="flex gap-3">
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all shadow-md border border-slate-200"
                title="Download as Markdown"
            >
                <Download size={20} />
                <span>Download</span>
            </button>
            <label className={`flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all shadow-md cursor-pointer ${isImporting ? 'opacity-70 pointer-events-none' : ''}`}>
               {isImporting ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
               <span>{isImporting ? 'Extracting...' : 'Import / Upload'}</span>
               <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
            </label>
            <button
                onClick={() => openEditor()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
                <Plus size={20} /> New Block
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blocks.map(block => (
          <div key={block.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-lg transition-shadow group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEditor(block)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDeleteBlock(block.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Briefcase size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 leading-tight">{block.experience_name}</h3>
                <p className="text-sm text-slate-500">{block.company} - {block.role}</p>
                <p className="text-xs text-slate-400 mt-0.5">{block.time_period}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-900">Task:</span> {block.content_star.task.substring(0, 80)}...
              </div>
              <div className="text-sm text-slate-700 bg-green-50 p-3 rounded-lg border border-green-100">
                <span className="font-bold text-green-900">Result:</span> {block.content_star.result.substring(0, 80)}...
              </div>
            </div>

            {block.tags && block.tags.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {block.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium border border-blue-200">
                      {tag}
                    </span>
                  ))}
                  {block.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-400 text-xs rounded-md">+{block.tags.length - 3}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {block.tech_stack.slice(0, 4).map(tech => (
                <span key={tech} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium border border-slate-200">
                  {tech}
                </span>
              ))}
              {block.tech_stack.length > 4 && (
                <span className="px-2 py-1 bg-slate-100 text-slate-400 text-xs rounded-md">+{block.tech_stack.length - 4}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};