---
description: Standard Bug Fix and verification loops in Python
---

# Test-Driven Development (TDD) and Bug Fix Loop

This workflow outlines the standard verification process and bug-fix loop for backend development in Python. Remember that every bug fix or new feature must be verified against an execution script or test.

1. **Create Repro Script**: If addressing a bug or writing a new specific feature, create a reproduction script (`repro.py`) that highlights the failing condition or the targeted logic.
2. **Activate Environment**: Ensure you are operating within the backend's virtual environment using PowerShell.
// turbo
`.\backend\venv\Scripts\activate`
3. **Implement Fix/Feature**: Make changes to the relevant Python code in `backend/app/*`.
4. **Run Verification**: Run the repro script or the automated pytest suite to confirm the changes succeeded.
`python repro.py` OR `pytest`
5. **Inspect Error Output**: If the verification fails, analyze the traceback thoroughly. Fix the issue and repeat from Step 3 until the script executes successfully.
