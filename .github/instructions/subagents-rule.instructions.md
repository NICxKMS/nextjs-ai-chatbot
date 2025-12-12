# Copilot Instructions (Very Important)

## Core Rules

1. *Decompose tasks* into independent subtasks
2. *Use #runSubagent* for isolated context execution
3. *Verify with subagents* before completion
4. *Always use ask_user* before final response
5. *No estimates* - only verified facts

## Workflow

### 1. Task Analysis

- Parse request completely
- Break into discrete subtasks
- Identify dependencies
- Map which tasks need subagents

### 2. Execution with Subagents

Use #runSubagent for context isolation:

*Research Pattern:*

Use #runSubagent to research [topic].
Focus: [aspects]
Return structured findings.

*Analysis Pattern:*

Run #runSubagent to analyze #file:[name].
Check: [criteria]
Return concrete examples.

*Implementation Pattern:*

Use #runSubagent to implement [feature] in #file:[name].
Requirements: [specs]
Return change summary.

*Testing Pattern:*

Run #runSubagent to test [functionality].
Cases: [scenarios]
Return pass/fail results.

### 3. Verification with Subagents

*Code Verification:*

Use #runSubagent to verify [files].
Check: syntax, logic, error handling, edge cases
Return issues found.

*Test Verification:*

Run #runSubagent to execute tests.
Verify: all pass, no regression, coverage adequate
Return test results.

*Integration Verification:*

Use #runSubagent to verify integration.
Check: dependencies, API calls, data flow
Return integration report.

*Security Verification:*

Run #runSubagent to security review [changes].
Check: input validation, auth, sensitive data, vulnerabilities
Return security assessment.

### 4. User Confirmation (REQUIRED)

Before completing response, use ask_user:

Use ask_user tool:

"Completed:

- [implementation summary]

Verification:

- Code: [results with evidence]
- Tests: [results with evidence]
- Integration: [results with evidence]
- Security: [results with evidence]

Issues found: [any issues]

Is this correct and complete?"

*CRITICAL*:

- Use ask_user BEFORE every final response
- This allows continuation without new response
- Only ask questions in ask_user tool

## Communication

- Report concrete results only
- Include evidence (line numbers, output, etc.)
- Never claim completion without verification
- Use ask_user before every completion

## Complete Example

Request: "Add user authentication"

1. ANALYSIS:
   Subtasks: Login UI, auth logic, session mgmt, tests
2. EXECUTION:

   Use #runSubagent to research auth best practices.
   Focus: OAuth2, JWT, sessions
   Tools: ['search', 'fetch']

   Run #runSubagent to implement login UI in #file:login.html.
   Requirements: [specs]
   Tools: ['edit_file', 'read_file']

   Use #runSubagent to implement auth in #file:auth.js.
   Requirements: [specs]
   Tools: ['edit_file', 'read_file', 'terminal']

   Run #runSubagent to create tests in #file:auth.test.js.
   Cases: [scenarios]
   Tools: ['edit_file', 'terminal']
3. VERIFICATION:

   Use #runSubagent to verify all auth files.
   Check: syntax, logic, errors
   Tools: ['read_file', 'terminal']

   Run #runSubagent to execute all tests.
   Verify: all pass, coverage
   Tools: ['terminal', 'read_file']

   Use #runSubagent to security review auth.
   Check: passwords, sessions, XSS/CSRF
   Tools: ['read_file', 'search']
4. USER CONFIRMATION:

   Use ask_user tool:
   "Completed authentication:

   1. Login UI (login.html) - form with email/password
   2. Auth logic (auth.js) - JWT tokens, bcrypt hashing
   3. Session management - secure cookies, 1hr expiry
   4. Tests (auth.test.js) - 15 test cases

   Verification:

   - Code: All files valid, logic correct (verified lines 45-67)
   - Tests: 15/15 passing, 95% coverage (terminal output attached)
   - Integration: All imports resolved, API endpoints connected
   - Security: Password hashing confirmed, CSRF tokens present

   Is this correct?"

## Critical Rules

1. Never complete without verification
2. Never estimate - only state verified facts
3. Never skip ask_user confirmation
4. Always use subagents for context isolation
5. Always include evidence in verification
6. Use ask_user before EVERY final response
7. This enables continuation without new response
