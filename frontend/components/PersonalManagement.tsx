import React, { useState } from 'react';
import { ResumeTemplate } from '../types';
import { Upload, FileText, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import loadingSvg from '../logo/loading.svg';

interface PersonalManagementProps {
    templates: ResumeTemplate[];
    onAddTemplate: (template: ResumeTemplate) => void;
    onUpdateTemplate?: (template: ResumeTemplate) => void;
    onDeleteTemplate?: (id: string | number) => void;
}

export const PersonalManagement: React.FC<PersonalManagementProps> = ({
    templates,
    onAddTemplate,
    onUpdateTemplate,
    onDeleteTemplate,
}) => {
    const [uploading, setUploading] = useState<string | null>(null);

    const handleCreateTemplatePair = async () => {
        const name = prompt('Enter a name for the new template pair:');
        if (!name) return;

        setUploading('creating');
        const newTemplate = {
            name,
            description: 'Custom paired template',
            style: 'docx',
        };

        try {
            const response = await fetch('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify(newTemplate),
            });

            if (response.ok) {
                const savedTemplate = await response.json();
                onAddTemplate(savedTemplate);
            } else {
                alert('Failed to create template pair.');
            }
        } catch (error) {
            console.error('Template creation error:', error);
            alert('Error creating template.');
        } finally {
            setUploading(null);
        }
    };

    const handleDocumentUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        template: ResumeTemplate,
        type: 'resume' | 'cover_letter',
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.docx')) {
            alert('Only .docx files are supported.');
            e.target.value = '';
            return;
        }

        setUploading(`upload-${template.id}-${type}`);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            const base64Content = dataUrl.split(',')[1];

            const updateData =
                type === 'resume'
                    ? { template_content: base64Content }
                    : { cover_letter_content: base64Content };

            try {
                const response = await fetch(`/api/templates/${template.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    },
                    body: JSON.stringify(updateData),
                });

                if (response.ok) {
                    const updatedTemplate = await response.json();
                    if (onUpdateTemplate) onUpdateTemplate(updatedTemplate);
                } else {
                    alert(`Failed to upload ${type}.`);
                }
            } catch (error) {
                console.error(`${type} upload error:`, error);
                alert(`Error uploading ${type}.`);
            } finally {
                setUploading(null);
                e.target.value = '';
            }
        };
        reader.onerror = () => {
            alert('Failed to read file.');
            setUploading(null);
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteTemplate = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this template pair entirely?')) return;
        try {
            const response = await fetch(`/api/templates/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            });
            if (response.ok && onDeleteTemplate) {
                onDeleteTemplate(id);
            } else {
                alert('Failed to delete template pair.');
            }
        } catch (error) {
            console.error('Template deletion error:', error);
            alert('Error deleting template.');
        }
    };

    const handleClearDocument = async (
        template: ResumeTemplate,
        type: 'resume' | 'cover_letter',
    ) => {
        if (
            !window.confirm(
                `Are you sure you want to remove the ${type.replace('_', ' ')} from this template pair?`,
            )
        )
            return;
        setUploading(`clear-${template.id}-${type}`);

        const updateData =
            type === 'resume'
                ? { template_content: null }
                : { cover_letter_content: null };

        try {
            const response = await fetch(`/api/templates/${template.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify(updateData),
            });

            if (response.ok) {
                const updatedTemplate = await response.json();
                if (onUpdateTemplate) onUpdateTemplate(updatedTemplate);
            } else {
                alert(`Failed to clear ${type}.`);
            }
        } catch (error) {
            console.error(`${type} clear error:`, error);
            alert(`Error clearing ${type}.`);
        } finally {
            setUploading(null);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Personal Management</h2>
                <p className="text-slate-500">Manage your resume & cover letter template groups.</p>
            </div>

            {/* Templates Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-slate-700">
                        Resume &amp; Cover Letter Templates
                    </h3>
                    <button
                        onClick={handleCreateTemplatePair}
                        disabled={uploading === 'creating'}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm disabled:opacity-50"
                    >
                        {uploading === 'creating' ? (
                            <img src={loadingSvg} alt="loading" className="w-4 h-4 inline-block" />
                        ) : (
                            <Plus size={16} />
                        )}
                        New Template Pair
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {templates.map((t) => (
                        <div
                            key={t.id}
                            className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors relative flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-bold text-slate-800 text-lg">{t.name}</h4>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded uppercase font-bold tracking-wide">
                                        {t.style}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">{t.description}</p>
                            </div>

                            <div className="flex flex-col gap-2 min-w-[200px]">
                                {/* Resume */}
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-xs font-semibold text-slate-600">Resume:</span>
                                    {t.template_content ? (
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            <button
                                                onClick={() => handleClearDocument(t, 'resume')}
                                                disabled={!!uploading}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="Remove Resume"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                            {uploading === `upload-${t.id}-resume` ? (
                                                <img src={loadingSvg} alt="loading" className="w-3 h-3 inline-block" />
                                            ) : (
                                                <Upload size={12} />
                                            )}{' '}
                                            Upload
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".docx"
                                                onChange={(e) => handleDocumentUpload(e, t, 'resume')}
                                                disabled={!!uploading}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Cover Letter */}
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                                    <span className="text-xs font-semibold text-slate-600">Cover Letter:</span>
                                    {t.cover_letter_content ? (
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            <button
                                                onClick={() => handleClearDocument(t, 'cover_letter')}
                                                disabled={!!uploading}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="Remove Cover Letter"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                            {uploading === `upload-${t.id}-cover_letter` ? (
                                                <img src={loadingSvg} alt="loading" className="w-3 h-3 inline-block" />
                                            ) : (
                                                <Upload size={12} />
                                            )}{' '}
                                            Upload
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".docx"
                                                onChange={(e) => handleDocumentUpload(e, t, 'cover_letter')}
                                                disabled={!!uploading}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="absolute top-2 right-2">
                                <button
                                    onClick={() => handleDeleteTemplate(t.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                                    title="Delete Pair"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {templates.length === 0 && (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No template pairs created yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
