import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export const PersonalProfile: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [updatingPw, setUpdatingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!password) return;
    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    setUpdatingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
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
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Account Settings</h2>
        <p className="text-slate-500">Manage your account security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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