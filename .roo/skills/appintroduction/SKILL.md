---
name: appintroduction
description: Instructions for creating a comprehensive user introduction and marketing material package (icon prompts, descriptions, video scripts, picture prompts) after an app is deployed.
---

# App Introduction Generation Guide

## 1. Overview
This skill defines the standard procedure for generating user-facing documentation and marketing assets immediately after a new application is deployed to the cloud. The goal is to produce a structured package containing prompts, descriptions, and scripts that the user can use to create the final polished assets.

When instructed to create an app introduction, you must analyze the application's core functionality, target audience, and module structure, then generate the following four components strictly adhering to the requirements below.

## 2. Deliverables

### A. App Icon (Prompt Generation)
You will not design the icon directly. You must write a detailed prompt that the user can feed into an image generation AI (like Midjourney or DALL-E) to create the icon.
- **Specifications:** The final file must be a PNG, 128x128 pixels, with a transparent background.
- **Style:** Simple, clear, easy to recognize, minimalism.
- **Theme:** Directly related to the app's primary function or name.
- **Output:** Provide a precise, descriptive prompt in English detailing the desired visual elements and style constraints.

### B. App Description
Write a dual-language marketing description that clearly communicates the application's value proposition.
- **Core Content Required:**
  - 3 to 5 major pain points the application solves.
  - 3 to 5 tangible benefits the application brings to the user.
- **Length Constraints:**
  - **English Version:** Must be less than 200 words.
  - **Chinese Version (中文版):** Must be less than 150 words.

### C. Demo Video Script
Write a comprehensive script for a screen recording demonstration video.
- **Specifications:** The final video will be a 1080p MP4 file.
- **Duration:** The script must fit within a 2-minute timeframe (approx. 250-300 spoken words maximum).
- **Language:** The script (both visual cues and voiceover/captions) must be written entirely in **Chinese (中文)**.
- **Format:** Use a two-column or structured format distinguishing between **[Visual/Screen Action]** (what the user sees) and **[Voiceover/Text]** (what the user hears or reads). Drive the narrative around solving the previously mentioned pain points.

### D. Module Guiding Picture Prompts
Every distinct module or major feature within the app requires a guiding picture (banner) to help users understand how to use it.
- **Specifications:** The final images will be 1280x260 pixels, PNG format.
- **Workflow Context:** The user will take UI screenshots and combine them with your prompts in another LLM (like Midjourney + structural reference or ChatGPT Vision) to generate the final guiding pictures.
- **Output:** Iterate through every module in the app and provide a dedicated English image generation prompt. The prompt must describe:
  - The overall layout and aesthetic of the 1280x260 banner.
  - How the system UI screenshot should be presented or framed (e.g., "A sleek 3D perspective of a dashboard on the right...").
  - What visual cues, arrows, or typography should be present to highlight how to use that specific module.