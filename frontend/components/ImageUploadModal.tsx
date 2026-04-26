import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Image as ImageIcon, AlertCircle, Link } from 'lucide-react';
import { JobOpportunity } from '../types';
import loadingSvg from '../logo/loading.svg';

interface ImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (job: JobOpportunity) => void;
    apiBase: string;
    session: any;
}

export function ImageUploadModal({ isOpen, onClose, onSuccess, apiBase, session }: ImageUploadModalProps) {
    const { t, i18n } = useTranslation();
    const [images, setImages] = useState<string[]>([]);
    const [jobUrl, setJobUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError(t('image_upload.err_only_images'));
            return;
        }

        // Check file size (limit to ~5MB per image to be safe for base64 payload)
        if (file.size > 5 * 1024 * 1024) {
            setError(t('image_upload.err_size'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                // Strip the common data url prefix to only send raw base64 to backend
                const base64Data = result.split(',')[1] || result;
                setImages((prev) => [...prev, base64Data]);
                setError(null);
            }
        };
        reader.onerror = () => setError(t('image_upload.err_read'));
        reader.readAsDataURL(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(processFile);
        }
    }, []);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            Array.from(e.clipboardData.files).forEach(processFile);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach(processFile);
        }
        // clear input so same file can be selected again if removed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (images.length === 0) {
            setError(t('image_upload.err_empty'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${apiBase}/jobs/from-images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'X-Language': i18n.language
                },
                body: JSON.stringify({
                    images: images,
                    language: i18n.language,
                    url: jobUrl.trim() || null,
                })
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const newJob = await response.json();
            onSuccess(newJob);
            setImages([]);
            setJobUrl('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to process images.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onPaste={handlePaste}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="text-blue-600" size={20} />
                        {t('image_upload.title')}
                    </h2>
                    <button onClick={onClose} disabled={isLoading} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Job URL Input */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <Link size={14} className="text-slate-400" />
                            {t('image_upload.job_link')} <span className="text-slate-400 font-normal">{t('image_upload.optional')}</span>
                        </label>
                        <input
                            type="url"
                            value={jobUrl}
                            onChange={e => setJobUrl(e.target.value)}
                            placeholder="https://example.com/jobs/12345"
                            disabled={isLoading}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                        />
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${images.length === 0 ? 'border-slate-300 hover:border-blue-400 bg-slate-50' : 'border-slate-200 bg-slate-100/50'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium mb-1">{t('image_upload.drag_drop')}</p>
                        <p className="text-slate-400 text-sm mb-4">{t('image_upload.paste_clipboard')}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                        >
                            {t('image_upload.browse')}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                        />
                    </div>

                    {images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                            {images.map((imgB64, idx) => (
                                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100 flex items-center justify-center">
                                    <img src={`data:image/jpeg;base64,${imgB64}`} alt={`Upload ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 mt-auto">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                    >
                        {t('image_upload.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={images.length === 0 || isLoading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors
              ${images.length === 0 || isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'}`}
                    >
                        {isLoading ? (
                            <>
                                <img src={loadingSvg} alt="loading" className="w-4 h-4 inline-block" />
                                {t('image_upload.analyzing')}
                            </>
                        ) : (
                            t('image_upload.analyze_btn')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
