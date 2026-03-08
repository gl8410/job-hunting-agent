---
name: pdfviewer
description: Tech stack and methods for displaying, navigating, searching, and highlighting PDF files in the frontend.
---

# PDF Viewer Implementation

## 1. Overview
The project uses `react-pdf` (a React wrapper around Mozilla's `pdf.js`) to render PDF documents directly in the browser. It supports pagination, zooming, document loading states, jumping to specific locations, and dynamically highlighting text in the PDF.

## 2. Tech Stack & Dependencies
- **Core Library**: `react-pdf`
- **Worker**: `pdfjs-dist` (Loaded from CDN/unpkg for performance)
- **Icons**: `lucide-react` (for UI controls)

### Worker Configuration
Crucial step: `pdf.js` needs a web worker to parse PDFs asynchronously without blocking the main JS thread.
```typescript
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

## 3. Core Features & Implementation Details

### A. Document Loading State
A URL is passed to the `<Document>` component. We must handle `loading`, `error`, and `success` states.
```tsx
const [numPages, setNumPages] = useState<number | null>(null);

const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
};

<Document
    file={fileUrl}
    onLoadSuccess={onDocumentLoadSuccess}
    loading={<div>加载文档中...</div>}
    error={<div>PDF加载失败</div>}
>
    {/* Page goes here */}
</Document>
```

### B. Zooming & Pagination
State is maintained for `scale` and `pageNumber`. The `<Page>` component accepts these as props.
```tsx
const [pageNumber, setPageNumber] = useState<number>(1);
const [scale, setScale] = useState(1.0);

<Page
    pageNumber={pageNumber}
    scale={scale}
    renderTextLayer={true}       // Required for text selection/searching
    renderAnnotationLayer={true} // Required for links/annotations
/>
```

### C. Text Searching
To find a specific string within the PDF:
1. Iterate through every page using the loaded `pdfDocument` instance.
2. Call `await page.getTextContent()` to extract raw text.
3. If a match is found, update the `pageNumber` to auto-scroll to that page.

### D. Custom Highlighting (`customTextRenderer`)
`react-pdf` exposes a `customTextRenderer` callback fired for every text chunk rendered on the page. We use this to inject HTML `<span>` tags with background colors to highlight keywords.

```typescript
const customTextRenderer = useCallback(({ str }: { str: string }) => {
    if (highlightText && str && str.length > 3) {
        // Strip whitespace for robust comparison
        const cleanStr = str.replace(/\s+/g, '');
        const cleanHighlight = highlightText.replace(/\s+/g, '');
        
        // If the text chunk contains our keyword
        if (cleanHighlight.includes(cleanStr) || cleanStr.includes(cleanHighlight.substring(0, 20))) {
             return `<span style="background-color: rgba(255, 255, 0, 0.4);">${str}</span>`;
        }
    }
    return str; // Return string normally if no match
}, [highlightText]);
```
*Note: Pass `customTextRenderer` into the `<Page>` component.*

## 4. Key Considerations
- **Re-rendering Strategy**: Wrapping the `<Page>` in a `key` that combines `pageNumber` and `scale` (e.g., `key={'page_'+pageNumber+'_'+scale}`) can help force re-renders if layout bugs occur during zooming.
- **Mobile/Responsive**: The `<Page>` scale usually needs dynamic calculation on smaller screens.
- **Performance**: Large PDFs should limit text search context or debounce user inputs heavily to prevent UI lockups.
