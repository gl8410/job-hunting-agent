import React from 'react';
import { useTranslation } from 'react-i18next';
import { JobOpportunity, JobStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface JobStatisticsProps {
  statusCounts: Record<string, number>;
  platformCounts: Record<string, number>;
}

export const JobStatistics: React.FC<JobStatisticsProps> = ({ statusCounts, platformCounts }) => {
  const { t } = useTranslation();
  const statusData = Object.values(JobStatus).map(status => ({
    name: t(`common.${status.toLowerCase()}`),
    value: statusCounts[status] || 0,
    color: 
      status === JobStatus.NEW ? '#3b82f6' : 
      status === JobStatus.APPLIED ? '#22c55e' : 
      status === JobStatus.REJECTED ? '#ef4444' : 
      status === JobStatus.INTERVIEW ? '#a855f7' : '#94a3b8'
  }));

  const platformData = Object.entries(platformCounts).map(([key, value]) => ({ name: key, value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF8', '#F472B6'];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <h2 className="text-3xl font-bold text-slate-800">{t('stats.title')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-slate-700">{t('stats.pipeline')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-slate-700">{t('stats.sources')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};