/**
 * Deterministic, source-linked drafting algorithms for LATER-002
 */

export interface GeneratedSubtask {
  title: string;
  estimated_hours: number;
}

export interface GeneratedCriterion {
  criterion_code: string;
  given_condition: string;
  when_action: string;
  then_expected: string;
}

/**
 * Generates a structured 4-phase Work Breakdown Structure (WBS)
 */
export function generateWbsDraft(
  taskTitle: string,
  taskDescription?: string,
  totalEstimatedHours = 24,
): { subtasks: GeneratedSubtask[] } {
  const h = Math.max(8, Number(totalEstimatedHours) || 24);

  return {
    subtasks: [
      {
        title: `Technical Architecture & Interface Spec: ${taskTitle}`,
        estimated_hours: Math.round(h * 0.2),
      },
      {
        title: `Backend Service & Persistence Layer: ${taskTitle}`,
        estimated_hours: Math.round(h * 0.4),
      },
      {
        title: `Frontend Interface & User Interaction: ${taskTitle}`,
        estimated_hours: Math.round(h * 0.25),
      },
      {
        title: `QA Verification & Regression Testing: ${taskTitle}`,
        estimated_hours: Math.max(2, Math.round(h * 0.15)),
      },
    ],
  };
}

/**
 * Generates Given-When-Then acceptance criteria from requirement metadata
 */
export function generateCriteriaDraft(
  reqCode: string,
  reqTitle: string,
  scopeDescription?: string,
): { criteria: GeneratedCriterion[] } {
  return {
    criteria: [
      {
        criterion_code: `${reqCode}-AC01`,
        given_condition: `An authorized system user accesses the ${reqTitle} interface`,
        when_action: `Valid input data satisfying boundary parameters is submitted`,
        then_expected: `The system processes the request successfully and creates an immutable audit trail`,
      },
      {
        criterion_code: `${reqCode}-AC02`,
        given_condition: `A user attempts an action with invalid, empty, or unparseable payload data`,
        when_action: `The submission is transmitted to the processing endpoint`,
        then_expected: `The system rejects the transaction with a 400 Bad Request error and displays actionable validation feedback`,
      },
      {
        criterion_code: `${reqCode}-AC03`,
        given_condition: `A user without requisite RBAC authorization attempts this operation`,
        when_action: `The request reaches the security guard layer`,
        then_expected: `Access is strictly forbidden (403 Forbidden) and recorded in security access logs`,
      },
    ],
  };
}

/**
 * Compiles deterministic release notes categorized into New Features and Bug Fixes.
 * If audience is CLIENT_SAFE, strictly filters out internal technical refactors.
 */
export function compileReleaseNotesDraft(
  versionCode: string,
  tasks: Array<{ code: string; title: string; type: string; is_bug: boolean }>,
  audience: "INTERNAL_ONLY" | "CLIENT_SAFE" = "INTERNAL_ONLY",
): {
  version: string;
  highlights: string;
  features: string[];
  bug_fixes: string[];
  audience: string;
} {
  const isClientSafe = audience === "CLIENT_SAFE";

  const features = tasks
    .filter((t) => !t.is_bug && (!isClientSafe || !t.title.toLowerCase().includes("refactor")))
    .map((t) => `${t.code}: ${t.title}`);

  const bugFixes = tasks
    .filter((t) => t.is_bug)
    .map((t) => `${t.code}: ${t.title}`);

  return {
    version: versionCode,
    highlights: `General release of ${versionCode} comprising ${features.length} feature enhancements and ${bugFixes.length} verified bug fixes.`,
    features: features.length > 0 ? features : ["General platform stability and maintenance optimizations."],
    bug_fixes: bugFixes.length > 0 ? bugFixes : ["No critical defect fixes in this release build."],
    audience,
  };
}

/**
 * Computes token Jaccard similarity between two text strings
 */
export function computeTitleSimilarity(str1: string, str2: string): number {
  const stopWords = new Set(["the", "a", "an", "and", "or", "in", "on", "for", "with", "to", "of", "is", "at"]);
  const tokenize = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w)),
    );

  const set1 = tokenize(str1);
  const set2 = tokenize(str2);

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return Number((intersection.size / union.size).toFixed(2));
}
