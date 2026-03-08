---
name: fileuploadlifecycle
description: Complete file upload pipeline with queueing, progress tracking, backend polling, and graceful cancellation.
---

# File Upload Lifecycle & Tracking

## 1. Overview
The typical file upload flow involves several distinct phases: Queueing files locally, uploading them via an API with byte tracking, and then polling the backend while it processes the files through various asynchronous stages (Parsing -> Embedding -> Done/Failed).

## 2. Frontend Queue Management
Rather than relying on the native `<input type="file">` state, maintain separate states for the queued files (`UploadQueueItem[]`) and the final verified documents (`Document[]`).

### Queue Item Interface
```typescript
interface UploadQueueItem {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0 to 100
  error?: string;
}
```

### Mechanism
- A hidden `<input type="file" ref={fileInputRef} onChange={handleFileChange} />` is triggered programmatically via a custom labeled button.
- `handleFileChange` immediately appends the new file into the `UploadQueueItem[]` and clears the `fileInputRef.current.value` (so the same file can be re-selected if necessary).
- A `useEffect` watches the queue and invokes a `processUploadQueue` function sequentially (or concurrently depending on logic).

## 3. Upload Tracking & Cancellation
A robust upload requires a way to track the percentage of HTTP transmission and a way to cancel it midway.

### Implementation Checklist:
1.  **Axios `onUploadProgress`**: Hook into the API call to update the queue item's `progress` variable dynamically.
2.  **`AbortController`**: Generate a new instance per active upload. Pass the `signal` directly into your Axios interceptor/request config.
3.  **Graceful Cancellation**: If the user clicks "Cancel":
    - Call `abortController.abort()`.
    - Catch the resulting `AbortError` exception explicitly without failing the whole app.
    - Delete any backend draft entries if applicable, then remove the object from the local UI state.

```typescript
// Uploading with Progress & AbortSignal (API Layer)
export const uploadDocument = async (file: File, signal: AbortSignal, onProgress: (p: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/api/upload', formData, {
    signal,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    }
  });
  return response.data;
};
```

## 4. Polling for Backend Status
After a file is uploaded (100%), it reaches a `UPLOADING` state in the backend database. The frontend starts a polling loop to track the document's journey.

### Expected Backend Status Codes
The backend transitions the document status linearly. The frontend renders unique badges/spinners depending on this code.
1.  **`UPLOADING`**: File is transferring or awaiting queue.
2.  **`PARSING`**: MinerU or OCR is extracting text/tables.
3.  **`EMBEDDING`**: Text is being chunked and pushed to Vector/Chroma DB.
4.  **`DONE`**: Document is fully indexed and ready for retrieval.
5.  **`FAILED`**: An unrecoverable error occurred; check `error_message`.

### Polling Mechanism
Instead of websockets, short-polling efficiently tracks status changes.
- Wrap the GET request within a `setInterval` (e.g., every 2-5 seconds).
- **Optimization**: The `useEffect` managing the list of documents generally only needs to fire the polling function if at least one document remains in an active processing state (`UPLOADING`, `PARSING`, `EMBEDDING`).
- Terminate the interval the moment the document transitions to `DONE` or `FAILED`. Add a hard timeout (e.g., 30 minutes) to prevent infinite loops.

## 5. UI Best Practices
- **Queue Box**: Show pending, uploading (with a dynamic width progress bar: `<div style={{ width: \`\${item.progress}%\` }}>`), completed, and failed items directly above the main table.
- **Auto-Dismiss**: Remove successful uploads from the visual Queue Box after a brief delay (e.g., 2000ms), shifting the user's attention down to the live Document Table.
- **Fail States**: Explicitly render the HTTP error string or backend reason if a file faults. Provide a "Retry" button linked to a dedicated retry endpoint.
