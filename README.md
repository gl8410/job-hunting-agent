English | [中文版](README_CN.md)


# Job Hunt Agent

**Job Hunt Agent** is a cutting-edge, AI-powered ultimate "cheat code" 🪄 for your job application and decision-making journey! It's designed to completely eliminate the soul-crushing friction of job hunting—providing a one-stop powerhouse to manage applications, track your career footprint, X-ray job descriptions, and **generate undeniably 🔥 tailored documents**!

### 🚀 Why You Absolutely Need It? (Hitting the Pain Points 💥)

*   😵 **Reading job posts making your eyes bleed?** 
    👉 **Let AI read it!** Instantly extracts corporate jargon & core requirements in under a minute, revealing exactly what HR actually wants!🎯
*   🕵️‍♂️ **Hundreds of companies—what do they do? Are they walking red flags?** 
    👉 **Deep-dive Corporate Background Checks!** Uncover a company’s true industry standing and potential risks in just 15 seconds. Peak scam-prevention!🛡️
*   😩 **Read requirements for 20 minutes just to realize you aren't a fit?** 
    👉 **Radar-Precision Role Matching!** Multi-dimensional insights show your exact fit for the role. Stop shooting in the dark and target like a sniper!🏹
*   🤯 **Editing your resume for EVERY single application driving you crazy?** 
    👉 **Magical Custom Resumes!** Give us ONE base template, and AI will magically fuse your past experience to perfectly mirror the job's preferences. Boom! Unique, targeted resume generated!✨
*   ✍️ **Staring at a blank screen trying to write a Cover Letter?** 
    👉 **Done in 1-Click!** Bam! A highly professional, passionately written, and hyper-relevant cover letter generated on the fly!📝

💡 **Using the Job Hunt Agent doesn't just save your sanity—it supercharges your application pipeline and skyrockets your interview chances by 5X or more 📈🔥!!**

## 🌟 Core Highlights (Features)

- 🧠 **Hardcore Job Parsing**: Tears down job descriptions like a top-tier headhunter, seamlessly aligning them with your history.
- 📦 **Personal Experience Vault**: Safely store and elevate your work data. Never forget an achievement again; always ready to deploy.
- 🎨 **Extreme Document Generation**: Generate "perfectly-in-character" tailored resume templates catered strictly for different companies and roles!
- 🌐 **Silky Smooth Bilingual & 1-Click Ingest**: Fully supports English and Chinese UIs! Features an effortless 1-click image upload to extract info, waving goodbye to copy-paste hell!
- 🔒 **Local First & Privacy Secure**: All your job tracking and personal data lives locally via SQLite. What's yours stays yours!

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm

## Setup & Installation

### Automated Setup (Windows)

We provide a PowerShell script to automate the setup process for Python and Node environments.

1. Open PowerShell in the project root directory.
2. Run the script:
   ```powershell
   .\run_locally.ps1
   ```
3. Update `backend/.env` with your API keys (e.g., `PHARSE_LLM_API_KEY`, `EMBEDDING_API_KEY`, etc.).

### Manual Setup

#### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Activate the virtual environment
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory (refer to setup instructions for needed environment variables such as `DATABASE_URL`).

#### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Usage

### Using the Browser Extension

To fully utilize the job hunting assistant, you need to use the browser extension located in the `/jobs` directory to ingest job postings.

1.  Open the extension management page in your browser (e.g., `chrome://extensions/` in Chrome/Edge).
2.  Enable **Developer mode**.
3.  Click **Load unpacked** and select the `jobs` folder in this project root.
4.  Once installed, you can use the extension on supported recruitment websites to quickly capture job information and send it to the Job Hunt Agent.

### Running the Application

You must run the backend and frontend in separate terminals.

**Terminal 1 (Backend):**
```bash
cd backend
# Activate venv if not already active
uvicorn app.main:app --reload --port 8004
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Finally, open your browser at `http://localhost:3004` (or the port indicated by Vite).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
