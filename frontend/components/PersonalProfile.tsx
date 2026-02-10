import React, { useState } from 'react';
import { ResumeTemplate } from '../types';
import { Upload, Lock, FileText, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface PersonalProfileProps {
  templates: ResumeTemplate[];
  onAddTemplate: (template: ResumeTemplate) => void;
}

export const PersonalProfile: React.FC<PersonalProfileProps> = ({ templates, onAddTemplate }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [updatingPw, setUpdatingPw] = useState(false);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        
        const newTemplate = {
          name: file.name.replace(/\.[^/.]+$/, ""),
          description: "Custom uploaded Markdown template",
          style: 'modern',
          template_content: content
        };

        try {
          // Use relative path for API
          const response = await fetch('/api/templates', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // Assuming global fetch interceptor/wrapper handles Auth header or we need to add it here
                // We'll rely on App.tsx's fetchWithAuth wrapper concept if passed down, 
                // OR we just get the session token here.
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify(newTemplate)
          });
          
          if (response.ok) {
            const savedTemplate = await response.json();
            onAddTemplate(savedTemplate);
          } else {
            alert("Failed to upload template to server.");
          }
        } catch (error) {
          console.error("Template upload error:", error);
          alert("Error uploading template.");
        } finally {
          setUploading(false);
        }
      };
      
      reader.onerror = () => {
        alert("Failed to read file.");
        setUploading(false);
      };

      reader.readAsText(file);
    }
  };

  const handleChangePassword = async () => {
    if (!password) return;
    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    setUpdatingPw(true);
    try {
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            alert(`Error updating password: ${error.message}`);
        } else {
            alert("Password updated successfully!");
            setPassword('');
            setConfirm('');
        }
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    } finally {
        setUpdatingPw(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Personal Management</h2>
        <p className="text-slate-500">Manage your templates and account security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Templates Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-slate-700">Resume Templates</h3>
            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
              <Upload size={16} /> Upload .md Template
              <input type="file" className="hidden" accept=".md" onChange={handleTemplateUpload} />
            </label>
          </div>
          
          {uploading && (
             <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-pulse">
               <Loader2 className="animate-spin" size={16} />
               Uploading template...
             </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group relative">
                 <div className="absolute top-4 right-4 text-blue-500 opacity-0 group-hover:opacity-100">
                    <Check size={20} />
                 </div>
                 <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 mb-3">
                   <FileText size={20} />
                 </div>
                 <h4 className="font-bold text-slate-800">{t.name}</h4>
                 <p className="text-sm text-slate-500">{t.description}</p>
                 <span className="inline-block mt-3 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded uppercase font-bold tracking-wide">
                   {t.style}
                 </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
             <Lock size={20} className="text-slate-500" />
             <h3 className="text-lg font-semibold">Security</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
              <input 
                type="password" 
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Confirm Password</label>
              <input 
                type="password" 
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleChangePassword}
              disabled={updatingPw || !password}
              className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors mt-2 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {updatingPw && <Loader2 className="animate-spin" size={16} />}
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};