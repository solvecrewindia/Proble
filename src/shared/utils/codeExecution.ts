/**
 * Unified Code Execution Service using Judge0 CE
 * Supports Python, JavaScript, C++, C, Java
 */

export interface TestCase {
    input: string;
    output: string;
}

export interface TestCaseResult {
    index: number;
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error?: string;
}

export interface ExecutionResponse {
    allPassed: boolean;
    combinedStdout: string;
    combinedStderr: string;
    results: TestCaseResult[];
}

const LANGUAGE_ID_MAP: Record<string, number> = {
    python: 71,
    python3: 71,
    py: 71,
    javascript: 63,
    js: 63,
    node: 63,
    cpp: 54,
    'c++': 54,
    c: 50,
    java: 62,
};

const normalizeOutput = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.replace(/\r\n/g, '\n').trim();
};

export async function executeSingleRun(
    language: string,
    sourceCode: string,
    stdin: string = ''
): Promise<{ stdout: string; stderr: string; passed: boolean; status: string }> {
    const langKey = (language || 'python').toLowerCase().trim();
    const languageId = LANGUAGE_ID_MAP[langKey] || 71;

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        attempt++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch('https://ce.judge0.com/submissions?wait=true', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    source_code: sourceCode,
                    language_id: languageId,
                    stdin: stdin || '',
                }),
            });

            clearTimeout(timeoutId);

            if (response.status === 429 || response.status === 503) {
                if (attempt < maxRetries) {
                    const delay = Math.floor(Math.random() * 800) + 500 * attempt;
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Execution service responded with status ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const stdout = data.stdout || '';
            const stderr = data.stderr || data.compile_output || '';
            const statusDesc = data.status?.description || 'Unknown';
            const isAccepted = data.status?.id === 3;

            return {
                stdout,
                stderr,
                passed: isAccepted,
                status: statusDesc,
            };
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (attempt < maxRetries && err.name !== 'AbortError') {
                const delay = Math.floor(Math.random() * 600) + 400 * attempt;
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            const errMsg = err.name === 'AbortError' ? 'Execution timed out (15s limit)' : err.message || 'Execution error';
            return {
                stdout: '',
                stderr: errMsg,
                passed: false,
                status: 'Error',
            };
        }
    }

    return {
        stdout: '',
        stderr: 'Execution service busy, please try again.',
        passed: false,
        status: 'Error',
    };
}

export async function runTestCases({
    language,
    studentCode,
    driverCode,
    testCases = [],
}: {
    language: string;
    studentCode: string;
    driverCode?: string;
    testCases: TestCase[];
}): Promise<ExecutionResponse> {
    const codeToRun = driverCode ? `${studentCode}\n\n${driverCode}` : studentCode;
    const cleanCases = (testCases || []).filter(tc => tc && (tc.input !== undefined || tc.output !== undefined));

    // If no test cases, perform a single run to check for compilation/runtime errors
    if (cleanCases.length === 0) {
        const result = await executeSingleRun(language, codeToRun, '');
        return {
            allPassed: !result.stderr,
            combinedStdout: result.stdout,
            combinedStderr: result.stderr,
            results: [
                {
                    index: 1,
                    input: '(none)',
                    expected: '(none)',
                    actual: normalizeOutput(result.stdout),
                    passed: !result.stderr,
                    error: result.stderr,
                },
            ],
        };
    }

    let allPassed = true;
    let combinedStdout = '';
    let combinedStderr = '';
    const results: TestCaseResult[] = [];

    for (let i = 0; i < cleanCases.length; i++) {
        const tc = cleanCases[i];
        const run = await executeSingleRun(language, codeToRun, tc.input || '');

        const actual = normalizeOutput(run.stdout);
        const expected = normalizeOutput(tc.output);
        const passed = actual === expected && !run.stderr;

        if (!passed) {
            allPassed = false;
        }

        combinedStdout += `Test Case ${i + 1}:\nInput: ${tc.input}\nOutput: ${actual}\nExpected: ${expected}\nResult: ${passed ? 'PASSED' : 'FAILED'}\n\n`;
        if (run.stderr) {
            combinedStderr += `[Case ${i + 1} Error] ${run.stderr}\n`;
        }

        results.push({
            index: i + 1,
            input: tc.input,
            expected,
            actual,
            passed,
            error: run.stderr || (actual !== expected ? `Expected: "${expected}", Got: "${actual}"` : undefined),
        });
    }

    return {
        allPassed,
        combinedStdout: combinedStdout.trim(),
        combinedStderr: combinedStderr.trim(),
        results,
    };
}
