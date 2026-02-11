import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          nav: {
            dashboard: "Dashboard",
            brain: "Brain",
            resumes: "Resumes",
            stats: "Stats",
            logout: "Log Out"
          },
          common: {
            search_placeholder: "Search jobs...",
            all: "ALL",
            new: "NEW",
            analyzed: "ANALYZED",
            drafting: "DRAFTING",
            applied: "APPLIED",
            interview: "INTERVIEW",
            rejected: "REJECTED",
            template: "TEMPLATE",
            reasoning: "REASONING",
            strengths: "STRENGTHS",
            gaps: "GAPS",
            run_match: "Run Match Analysis to see how you fit this role.",
            delete_confirm: "Are you sure you want to delete this job?",
            loading: "Loading...",
            save: "Save",
            cancel: "Cancel",
            edit: "Edit",
            delete: "Delete",
            add: "Add"
          },
          dashboard: {
            title: "Job Hunter",
            no_jobs: "No jobs found. Start by adding one via the browser extension!"
          },
          experience_library: {
            title: "Experience Brain",
            subtitle: "Your atomic units of career experience.",
            download: "Download",
            import: "Import / Upload",
            extracting: "Extracting...",
            new_block: "New Block",
            edit_title: "Edit Experience Block",
            new_title: "New Experience Block",
            name_label: "Experience Name",
            role_label: "Role",
            company_label: "Company",
            time_label: "Time Period",
            tags_label: "Tags (comma separated)",
            tech_stack_label: "Tech Stack (comma separated)",
            star_section: "STAR Method Content",
            situation_label: "Situation",
            task_label: "Task",
            action_label: "Action",
            result_label: "Result",
            save_button: "Save Block",
            task_preview: "Task",
            result_preview: "Result"
          },
          resumes: {
            title: "Resume Management",
            no_docs: "No documents generated yet.",
            go_detail: "Go to a Job Detail page to generate resumes and cover letters.",
            col_title: "Job Title",
            col_company: "Company",
            col_published: "Published",
            col_generated: "Generated",
            col_actions: "Actions",
            col_language: "Language",
            resume: "Resume",
            cover_letter: "Cover Letter",
            download_resume: "Download Resume",
            download_cover: "Download Cover Letter",
            not_generated: "Not generated yet",
            delete_confirm: "Are you sure you want to delete the generated resume and cover letter?"
          },
          stats: {
            title: "Job Hunt Analytics",
            pipeline: "Application Pipeline",
            sources: "Sources"
          },
          job_detail: {
            title: "Job Details",
            role_title: "Title",
            company: "Company",
            department: "Department",
            location: "Location",
            salary: "Salary Range",
            platform: "Platform",
            published: "Published",
            link: "Link",
            brief: "Brief Description",
            company_analysis: "Company Analysis",
            research_button: "Company Research",
            established: "Established",
            employees: "Employees",
            revenue: "Revenue Model",
            culture: "Culture & Environment",
            prospects: "Prospect Analysis",
            risks: "Risk Analysis",
            concerns: "Potential Concerns",
            seeker_brief: "Job Seeker Brief",
            waiting_analysis: "Waiting for deep research analysis...",
            match_analysis: "Match Analysis",
            check_match: "Check Match",
            generate_resume: "Generate Resume",
            generate_cover_letter: "Generate Cover Letter",
            ingest_time: "INGEST TIME"
          }
        }
      },
      zh: {
        translation: {
          nav: {
            dashboard: "仪表盘",
            brain: "经验库",
            resumes: "简历管理",
            stats: "统计",
            logout: "退出登录"
          },
          common: {
            search_placeholder: "搜索职位...",
            all: "全部",
            new: "新职位",
            analyzed: "已分析",
            drafting: "起草中",
            applied: "已申请",
            interview: "面试中",
            rejected: "已拒绝",
            template: "模板",
            reasoning: "匹配理由",
            strengths: "优势",
            gaps: "差距",
            run_match: "运行匹配分析以查看你是否适合此职位。",
            delete_confirm: "你确定要删除这个职位吗？",
            loading: "加载中...",
            save: "保存",
            cancel: "取消",
            edit: "编辑",
            delete: "删除",
            add: "添加"
          },
          dashboard: {
            title: "求职助手",
            no_jobs: "未找到职位。请通过浏览器插件添加职位！"
          },
          experience_library: {
            title: "经验库",
            subtitle: "你的原子级职业经验单元。",
            download: "下载",
            import: "导入 / 上传",
            extracting: "提取中...",
            new_block: "新增经验",
            edit_title: "编辑经验块",
            new_title: "新增经验块",
            name_label: "经验名称",
            role_label: "角色",
            company_label: "公司",
            time_label: "时间周期",
            tags_label: "标签 (逗号分隔)",
            tech_stack_label: "技术栈 (逗号分隔)",
            star_section: "STAR 法则内容",
            situation_label: "情境",
            task_label: "任务",
            action_label: "行动",
            result_label: "结果",
            save_button: "保存经验",
            task_preview: "任务",
            result_preview: "结果"
          },
          resumes: {
            title: "简历管理",
            no_docs: "尚未生成任何文档。",
            go_detail: "请前往职位详情页生成简历或求职信。",
            col_title: "职位名称",
            col_company: "公司",
            col_published: "发布时间",
            col_generated: "生成时间",
            col_actions: "操作",
            col_language: "语言",
            resume: "简历",
            cover_letter: "求职信",
            download_resume: "下载简历",
            download_cover: "下载求职信",
            not_generated: "尚未生成",
            delete_confirm: "你确定要删除生成的简历和求职信吗？"
          },
          stats: {
            title: "求职数据分析",
            pipeline: "求职管线",
            sources: "职位来源"
          },
          job_detail: {
            title: "职位详情",
            role_title: "职位名称",
            company: "公司",
            department: "部门",
            location: "地点",
            salary: "薪资范围",
            platform: "来源平台",
            published: "发布日期",
            link: "职位链接",
            brief: "职位简述",
            company_analysis: "公司分析",
            research_button: "深入背景调查",
            established: "成立时间",
            employees: "员工规模",
            revenue: "营收模式",
            culture: "企业文化",
            prospects: "发展前景",
            risks: "风险评估",
            concerns: "潜在负面",
            seeker_brief: "求职者小贴士",
            sources: "参考来源",
            waiting_analysis: "等待背景调查分析...",
            match_analysis: "匹配度分析",
            check_match: "查看匹配",
            generate_resume: "生成简历",
            generate_cover_letter: "生成求职信",
            ingest_time: "录入时间"
          }
        }
      }
    }
  });

export default i18n;
