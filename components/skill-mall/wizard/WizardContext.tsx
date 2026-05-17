"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  wizardReducer,
  INITIAL_WIZARD_STATE,
  type WizardState,
  type WizardAction,
  type ResearchResult,
  type InMemorySkillDirectory,
  type InMemoryFile,
  type ResearchTool,
} from "./wizard-reducer";

// Re-export types so consumers can import from WizardContext
export type {
  WizardState,
  WizardAction,
  ResearchResult,
  ResearchTool,
  InMemoryFile,
  InMemorySkillDirectory,
};
export { INITIAL_WIZARD_STATE };

const STORAGE_KEY = "skill-mall-wizard";

const WizardStateContext = createContext<WizardState>(INITIAL_WIZARD_STATE);
const WizardDispatchContext = createContext<Dispatch<WizardAction>>(() => {});

function loadFromStorage(): WizardState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_WIZARD_STATE;
    const parsed = JSON.parse(raw) as WizardState;
    if (typeof parsed.step !== "number" || parsed.step < 1 || parsed.step > 6) {
      return INITIAL_WIZARD_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_WIZARD_STATE;
  }
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE, loadFromStorage);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, [state]);

  return (
    <WizardStateContext.Provider value={state}>
      <WizardDispatchContext.Provider value={dispatch}>
        {children}
      </WizardDispatchContext.Provider>
    </WizardStateContext.Provider>
  );
}

export function useWizardState() {
  return useContext(WizardStateContext);
}

export function useWizardDispatch() {
  return useContext(WizardDispatchContext);
}
