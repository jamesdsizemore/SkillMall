// All wizard types, initial state, and reducer — no React imports.
// WizardContext imports from here to break circular dependency.

export interface ResearchTool {
  name: string;
  category: string;
  description: string;
  artifactType: "matrix" | "canvas" | "grid" | "list" | "flowchart" | "analysis";
  artifactStructure: string;
  inputs: string[];
  outputs: string[];
  howUsed: string;
}

export interface ResearchResult {
  topic: string;
  sources: string[];
  summary: string;
  tools: ResearchTool[];
  principles: string[];
  suggestedCategory: string;
  suggestedTags: string[];
  researchUnverified?: boolean;
  partialSources?: boolean;
}

export interface InMemoryFile {
  path: string;
  content: string;
}

export interface InMemorySkillDirectory {
  slug: string;
  category: string;
  files: InMemoryFile[];
}

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  topic: string;
  sourceUrls: string[];
  researchResult: ResearchResult | null;
  selectedToolNames: string[];
  category: string;
  tags: string[];
  targetAgents: string[];
  selectedMetaTypes: string[];
  skillMdPreview: string | null;
  previewDirectory: InMemorySkillDirectory | null;
  isLoading: boolean;
  error: string | null;
}

export type WizardAction =
  | { type: "SET_TOPIC"; topic: string }
  | { type: "ADD_URL"; url: string }
  | { type: "REMOVE_URL"; index: number }
  | { type: "SET_RESEARCH_RESULT"; result: ResearchResult }
  | { type: "TOGGLE_TOOL"; toolName: string }
  | { type: "SET_METADATA"; category: string; tags: string[]; targetAgents: string[] }
  | { type: "TOGGLE_META_TYPE"; metaType: string }
  | { type: "SET_PREVIEW"; directory: InMemorySkillDirectory; skillMd: string }
  | { type: "SET_SKILL_MD_PREVIEW"; skillMd: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" };

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  topic: "",
  sourceUrls: [],
  researchResult: null,
  selectedToolNames: [],
  category: "business",
  tags: [],
  targetAgents: ["claude-code"],
  selectedMetaTypes: [
    "meta-comprehensive-analysis",
    "meta-quick-assessment",
    "meta-stakeholder-presentation",
    "meta-first-principles-exploration",
    "meta-competitive-response",
  ],
  skillMdPreview: null,
  previewDirectory: null,
  isLoading: false,
  error: null,
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_TOPIC":
      return { ...state, topic: action.topic };
    case "ADD_URL":
      return { ...state, sourceUrls: [...state.sourceUrls, action.url] };
    case "REMOVE_URL":
      return { ...state, sourceUrls: state.sourceUrls.filter((_, i) => i !== action.index) };
    case "SET_RESEARCH_RESULT":
      return {
        ...state,
        researchResult: action.result,
        selectedToolNames: action.result.tools.map((t) => t.name),
        category: action.result.suggestedCategory ?? state.category,
        tags: action.result.suggestedTags ?? state.tags,
      };
    case "TOGGLE_TOOL":
      return {
        ...state,
        selectedToolNames: state.selectedToolNames.includes(action.toolName)
          ? state.selectedToolNames.filter((n) => n !== action.toolName)
          : [...state.selectedToolNames, action.toolName],
      };
    case "SET_METADATA":
      return { ...state, category: action.category, tags: action.tags, targetAgents: action.targetAgents };
    case "TOGGLE_META_TYPE":
      return {
        ...state,
        selectedMetaTypes: state.selectedMetaTypes.includes(action.metaType)
          ? state.selectedMetaTypes.filter((m) => m !== action.metaType)
          : [...state.selectedMetaTypes, action.metaType],
      };
    case "SET_PREVIEW":
      return { ...state, previewDirectory: action.directory, skillMdPreview: action.skillMd };
    case "SET_SKILL_MD_PREVIEW":
      return {
        ...state,
        skillMdPreview: action.skillMd,
        previewDirectory: state.previewDirectory
          ? {
              ...state.previewDirectory,
              files: state.previewDirectory.files.map((file) =>
                file.path === "SKILL.md" ? { ...file, content: action.skillMd } : file
              ),
            }
          : state.previewDirectory,
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "NEXT_STEP":
      return { ...state, step: Math.min(state.step + 1, 6) as WizardState["step"] };
    case "PREV_STEP":
      return { ...state, step: Math.max(state.step - 1, 1) as WizardState["step"] };
    case "RESET":
      return INITIAL_WIZARD_STATE;
    default:
      return state;
  }
}
