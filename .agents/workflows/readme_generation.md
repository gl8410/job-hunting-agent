---
description: Workflow for generating and maintaining bilingual README files (English and Chinese)
---

# Bilingual README Generation Workflow

Use this workflow to generate a Chinese version of an existing English `README.md` and maintain cross-links between them.

## Steps

1. **Analyze existing README**: Read the `README.md` file to understand the project structure, features, and setup instructions.
2. **Translate to Chinese**: Translate all sections of the `README.md` into accurate and professional Chinese.
3. **Create README_CN.md**: Write the translated content to a new file named `README_CN.md` in the project root.
4. **Add Language Switchers**:
    - In `README.md`, add a line at the top: `English | [中文版](README_CN.md)`
    - In `README_CN.md`, add a line at the top: `[English](README.md) | 中文版`
5. **Maintain Sync**: Whenever changes are made to one README, ensure the corresponding changes are applied and translated in the other version.
