---
name: github publish
description: A skill to write a bilingual README for a project and add an MIT License.
---

# GitHub Publish Skill

This skill explains how to properly write a README file and add an MIT License to prepare a project for publishing on GitHub.

## 1. Write the README files

1. **Bilingual Approach**: Create two files in the root of the project:
   - `README.md` (English)
   - `README_CN.md` (Chinese)
2. **Content Structure**: Ensure both README files contain the following sections:
   - **Project Name and Description**: Very briefly explain what the project does.
   - 🚀 **Pain Points / Why Choose Us**: Provide a highly-engaging, marketing-style analysis of user pain points and how this project uniquely solves them. Use enthusiastic tones, formatting like bold text and bullet points, and liberal use of relevant emojis (e.g., 🚀, 💥, 🎯, 🔥) to make it exciting. Describe exactly how the tool acts as a "cheat code" or solves their exact frustrations.
   - 🌟 **Core Highlights (Features)**: List the main capabilities using emoji markers and punchy, sales-copy style descriptions.
   - **Prerequisites**: What needs to be installed beforehand.
   - **Installation**: Step-by-step instructions to set up the project locally.
   - **Usage**: How to run or use the project.
   - **License**: State clearly that the project is licensed under the MIT License.
3. **Marketing Consistency**: Ensure that BOTH the English (`README.md`) and Chinese (`README_CN.md`) versions share the same high-energy, marketing-focused, emoji-rich style. Do not make the English version dry if the Chinese version is engaging.

## 2. Add an MIT License

1. Create a `LICENSE` file in the root directory of the project.
2. Populate the `LICENSE` file with the standard MIT License text:

```text
MIT License

Copyright (c) [Year] [Full Name or Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
3. Customization: Automatically replace `[Year]` with the current year, and `[Full Name or Organization]` with the appropriate author or organization name.

## 3. Usage
When executing this skill:
- Review the project's source code and configuration to gather necessary details for the README.
- Write the English `README.md` and Chinese `README_CN.md`.
- Create the `LICENSE` file using the MIT License template above.
