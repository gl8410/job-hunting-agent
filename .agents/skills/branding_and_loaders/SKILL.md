---
name: branding_and_loaders
description: Instructions and standard assets for the application logo and 'punching mango' loading indicator.
---

# Branding and Loaders

This skill provides the standard design assets for the application, ensuring a unified brand identity and a premium user experience.

## Available Resources

The following assets are provided in the `resources/` directory of this skill:
- `loading.svg`: The primary animated loading indicator (a "punching mango" animation using internal SVG keyframes).
- `48-logo-yellow.png`: Standard small application logo.
- `96-logo-yellow.png`: Standard medium application logo.

## Implementation Guide

When developing new features or applications, follow these guidelines to integrate the loading and logo assets.

### 1. File Placement Integration
Copy the standard assets from this skill's `resources/` directory into the target application's asset directory (commonly `frontend/logo/`, `public/logo/`, or `src/assets/logo/`).

### 2. Standardizing the Loader
Replace generic CSS spinners or third-party loaders (such as `Loader2` from `lucide-react`) with the custom `loading.svg` image. 

**React/JSX Example:**
```tsx
import loadingSvg from '../logo/loading.svg';

// Usage in a button (replaces spinner)
<button disabled={isLoading}>
  {isLoading ? <img src={loadingSvg} alt="loading" className="w-4 h-4 inline-block" /> : 'Submit'}
</button>

// Usage in a full-screen or section overlay
<div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
  <img src={loadingSvg} alt="loading" className="w-12 h-12 inline-block mb-4" />
  <p className="text-blue-600 font-medium animate-pulse">Loading data...</p>
</div>
```

### 3. Animation Conflicts
The custom `loading.svg` has built-in CSS animations defined within the `.scaling-group` and `@keyframes squish` rules. 
- **Do not** apply external rotation or spinning animations (like Tailwind's `animate-spin`) to the `<img>` tag unless specifically required, as this can disrupt the intended "punching" or "squishing" aesthetics.
- Control size purely through width/height utilities (`w-4 h-4`, `w-12 h-12`).

### 4. Logo Usage
Use the `.png` logos where static branding is required (e.g., authentication pages, navigation bars, email templates).

```tsx
<img src="/logo/48-logo-yellow.png" alt="App Logo" className="w-10 h-10 drop-shadow" />
```
