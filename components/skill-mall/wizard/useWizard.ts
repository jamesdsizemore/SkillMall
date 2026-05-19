"use client";

import { useWizardState, useWizardDispatch, type ResearchResult, type InMemorySkillDirectory } from "./WizardContext";

export function useWizard() {
  const state = useWizardState();
  const dispatch = useWizardDispatch();

  const setTopic = (topic: string) => dispatch({ type: "SET_TOPIC", topic });
  const addUrl = (url: string) => dispatch({ type: "ADD_URL", url });
  const removeUrl = (index: number) => dispatch({ type: "REMOVE_URL", index });
  const setResearchResult = (result: ResearchResult) => dispatch({ type: "SET_RESEARCH_RESULT", result });
  const toggleTool = (toolName: string) => dispatch({ type: "TOGGLE_TOOL", toolName });
  const setMetadata = (category: string, tags: string[], targetAgents: string[]) =>
    dispatch({ type: "SET_METADATA", category, tags, targetAgents });
  const toggleMetaType = (metaType: string) => dispatch({ type: "TOGGLE_META_TYPE", metaType });
  const setPreview = (directory: InMemorySkillDirectory, skillMd: string) =>
    dispatch({ type: "SET_PREVIEW", directory, skillMd });
  const setSkillMdPreview = (skillMd: string) => dispatch({ type: "SET_SKILL_MD_PREVIEW", skillMd });
  const setLoading = (loading: boolean) => dispatch({ type: "SET_LOADING", loading });
  const setError = (error: string | null) => dispatch({ type: "SET_ERROR", error });
  const nextStep = () => dispatch({ type: "NEXT_STEP" });
  const prevStep = () => dispatch({ type: "PREV_STEP" });
  const reset = () => dispatch({ type: "RESET" });

  return {
    ...state,
    setTopic,
    addUrl,
    removeUrl,
    setResearchResult,
    toggleTool,
    setMetadata,
    toggleMetaType,
    setPreview,
    setSkillMdPreview,
    setLoading,
    setError,
    nextStep,
    prevStep,
    reset,
  };
}
