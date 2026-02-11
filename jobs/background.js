// Background script

console.log("Job Agent Background Service Worker running.");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'createJob') {
        handleCreateJob(request.data, sendResponse);
        return true; // Will respond asynchronously
    }
    if (request.action === 'analyzeJob') {
        handleAnalyzeJob(request.data, sendResponse);
        return true; // Will respond asynchronously
    }
});

async function handleCreateJob(data, sendResponse) {
    try {
        const { apiBase, token, jobData } = data;
        console.log(`Creating job at: ${apiBase}/api/jobs`);
        const response = await fetch(`${apiBase}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(jobData)
        });

        if (!response.ok) {
            const error = await response.text();
            sendResponse({ success: false, status: response.status, error });
            return;
        }

        const job = await response.json();
        sendResponse({ success: true, job });
    } catch (error) {
        console.error('Create Job Error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function handleAnalyzeJob(data, sendResponse) {
    try {
        const { apiBase, token, jobId } = data;
        const response = await fetch(`${apiBase}/api/jobs/${jobId}/analyze`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            sendResponse({ success: false, status: response.status, error });
            return;
        }

        const result = await response.json();
        sendResponse({ success: true, result });
    } catch (error) {
        console.error('Analyze Job Error:', error);
        sendResponse({ success: false, error: error.message });
    }
}
