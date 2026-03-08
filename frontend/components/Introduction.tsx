import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Compass, Download, CheckCircle2, FileText, Search, ScanLine, BrainCircuit } from 'lucide-react';

interface Props {
    apiBase: string;
}

export const Introduction: React.FC<Props> = ({ apiBase }) => {
    const { i18n } = useTranslation();
    const isZh = i18n.language === 'zh';

    const downloadFile = async (path: string) => {
        try {
            const url = `${apiBase}/download/${encodeURIComponent(path)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = path;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Error downloading file:", error);
        }
    };

    // --- Bilingual content ---
    const copy = {
        title: isZh ? '欢迎使用求职助手！🚀' : 'Welcome to Job Hunter! 🚀',
        subtitle: isZh ? '你的 AI 求职领航员 — 让我们马上开始！' : 'Your AI-powered copilot for landing your dream job. Let\'s get started!',

        /* Phase 1 */
        prepTitle: isZh ? '第一阶段：战前准备 🛠️' : 'Phase 1: Preparation 🛠️',
        prepDesc: isZh ? '工欲善其事，必先利其器。两件事你需要提前准备好：' : 'Get your tools ready before the hunt. Two things to prepare:',

        step1Title: isZh ? '1. 配置简历 & 求职信模板' : '1. Set Up Resume & Cover Letter Templates',
        step1Desc: isZh
            ? '下载我们提供的 .docx 模板，用你自己的信息替换占位符（如 {公司名称}、{职位名称}），然后将填好的模板上传至"Template"模块。AI 生成简历时将以此为蓝本，保留你的排版与风格。'
            : 'Download the .docx templates below, replace placeholders like {Company name} and {Position name} with your own details, then upload them in the "Template" module. The AI will use them as the base when generating tailored resumes.',
        dlCoverLabel: isZh ? '📄 求职信模板（中文）' : '📄 Cover Letter Template (English)',
        dlResumeLabel: isZh ? '📝 简历模板（中文）' : '📝 Resume Template (English)',

        step2Title: isZh ? '2. 整理你的经验文档' : '2. Prepare Your Experience File',
        step2Desc: isZh
            ? '用 STAR 法则把你的工作亮点、项目成就写成一个 .txt 或 .md 文件。下载范例参考，写好后上传至"Brain"（经验库）模块，AI 匹配时会自动从中调取精华。'
            : 'Write your career highlights, projects, and achievements using the STAR method into a .txt or .md file. Download the example below, then import it into the "Brain" module so the AI can pull relevant content for each job.',
        dlExpLabel: isZh ? '📋 经验文档范例（中文）' : '📋 Experience File Example (English)',

        /* Phase 2 */
        huntTitle: isZh ? '第二阶段：主动出击 🎯' : 'Phase 2: Job Hunting 🎯',
        huntDesc: isZh ? '发现目标，精准攻破。四个步骤，从录入到投递一气呵成：' : 'Find the role, then win it. Four steps from discover to apply:',

        step3Title: isZh ? '1. 极速职位录入' : '1. Ingest a Job',
        step3Desc: isZh
            ? '看到心仪岗位？有两种方式：① 使用我们的 Chrome 插件，在招聘页面一键保存职位；② 截图职位详情，点击仪表盘左上角的「Read Images」上传，AI 自动解析并录入。'
            : 'Spotted a great role? Two ways to add it: ① Use the Chrome extension to save job listings with one click straight from the job board. ② Screenshot the job description and click "Read Images" on the Dashboard — the AI will parse and save it automatically.',
        dlExtLabel: isZh ? '⬇️ 下载 Chrome 插件' : '⬇️ Download Chrome Extension',

        step4Title: isZh ? '2. 深度公司洞察' : '2. Company Analysis',
        step4Desc: isZh
            ? '在职位详情页点击「深入背景调查」，AI 将从公开信息中挖掘公司文化、规模、营收模式、成长前景与潜在风险，帮你做到知己知彼。'
            : 'Open a job and click "Company Research". The AI deep-dives into the company\'s culture, size, revenue model, growth prospects, and red flags — so you walk into the interview already informed.',

        step5Title: isZh ? '3. 智能匹配分析' : '3. Match Analysis',
        step5Desc: isZh
            ? '点击「查看匹配」，AI 会把你的经验库与岗位需求逐项对比，给出总体匹配分数、优势亮点和技能缺口，帮你清晰评估成功率。'
            : 'Click "Check Match". The AI compares your experience library against the job requirements line by line, giving you an overall fit score plus a breakdown of your strengths and skill gaps.',

        step6Title: isZh ? '4. 一键生成定制材料' : '4. Generate Tailored Docs',
        step6Desc: isZh
            ? '在「简历管理」页面选择目标职位与模板，点击「生成简历」或「生成求职信」。AI 会根据职位和你的经验，自动填充并生成精准定制的 .docx 文件，直接下载即可投递。'
            : 'Go to the "Resumes" page, select the target job and template, then click "Generate Resume" or "Generate Cover Letter". The AI fills in your tailored .docx — download and apply right away!',
    };

    // --- File paths ---
    const coverFile = isZh
        ? 'Cover LetterT - AUT auto - 销售顾问，直播销售专员 - 王翠霞 - 20260226.docx'
        : 'Cover LetterT - {Company name} - {Position name} - {Name of applicant} - {Generate date}.docx';
    const resumeFile = isZh
        ? 'ResumeT - {公司名称} - {职位名称} - 王翠霞 - {Generate date}.docx'
        : 'ResumeT - {Company name} - {Position name} - Wang Cuixia - {Generate date}.docx';
    const expFile = isZh ? '经验模块 王翠霞.txt' : 'Experience Wang Cuixia.txt';

    const DownloadBtn: React.FC<{ label: string; file: string; dark?: boolean }> = ({ label, file, dark }) => (
        <button
            onClick={() => downloadFile(file)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-md text-sm transition-colors ${dark
                ? 'bg-slate-800 text-white hover:bg-slate-700 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
                }`}
        >
            <span className="flex items-center gap-2 text-left leading-snug"><FileText className="w-4 h-4 shrink-0" />{label}</span>
            <Download className="w-4 h-4 shrink-0 ml-3" />
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm my-6 font-sans">

            {/* Hero */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-blue-700 mb-3">{copy.title}</h1>
                <p className="text-lg text-slate-500">{copy.subtitle}</p>
            </div>

            {/* ── Phase 1: Preparation ── */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-2 border-b pb-3 border-slate-100">
                    <Compass className="text-blue-500 w-7 h-7" />
                    <h2 className="text-2xl font-bold text-slate-800">{copy.prepTitle}</h2>
                </div>
                <p className="text-slate-500 italic mb-6 text-sm">{copy.prepDesc}</p>

                <div className="grid md:grid-cols-2 gap-6">

                    {/* Step 1 — Templates */}
                    <div className="p-6 bg-blue-50/50 rounded-xl border border-blue-100 hover:shadow-md transition-all">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                            {copy.step1Title}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">{copy.step1Desc}</p>
                        <div className="space-y-2">
                            <DownloadBtn label={copy.dlCoverLabel} file={coverFile} />
                            <DownloadBtn label={copy.dlResumeLabel} file={resumeFile} />
                        </div>
                    </div>

                    {/* Step 2 — Experience */}
                    <div className="p-6 bg-blue-50/50 rounded-xl border border-blue-100 hover:shadow-md transition-all">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                            {copy.step2Title}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">{copy.step2Desc}</p>
                        <div className="space-y-2">
                            <DownloadBtn label={copy.dlExpLabel} file={expFile} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Phase 2: Job Hunting ── */}
            <div>
                <div className="flex items-center gap-3 mb-2 border-b pb-3 border-slate-100">
                    <Target className="text-red-500 w-7 h-7" />
                    <h2 className="text-2xl font-bold text-slate-800">{copy.huntTitle}</h2>
                </div>
                <p className="text-slate-500 italic mb-6 text-sm">{copy.huntDesc}</p>

                <div className="grid md:grid-cols-2 gap-6">

                    {/* Step 3 — Ingest */}
                    <div className="p-6 bg-red-50/30 rounded-xl border border-red-100 hover:shadow-sm transition-all">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <ScanLine className="w-5 h-5 text-red-500 shrink-0" />
                            {copy.step3Title}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">{copy.step3Desc}</p>
                        <DownloadBtn label={copy.dlExtLabel} file="extension.zip" dark />
                    </div>

                    {/* Step 4 — Company Analysis */}
                    <div className="p-6 bg-red-50/30 rounded-xl border border-red-100 hover:shadow-sm transition-all">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <Search className="w-5 h-5 text-red-500 shrink-0" />
                            {copy.step4Title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{copy.step4Desc}</p>
                    </div>

                    {/* Step 5 — Match Analysis */}
                    <div className="p-6 bg-red-50/30 rounded-xl border border-red-100 hover:shadow-sm transition-all">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-red-500 shrink-0" />
                            {copy.step5Title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{copy.step5Desc}</p>
                    </div>

                    {/* Step 6 — Generate */}
                    <div className="p-6 bg-red-50/30 rounded-xl border border-red-100 hover:shadow-sm transition-all">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                            {copy.step6Title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{copy.step6Desc}</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
