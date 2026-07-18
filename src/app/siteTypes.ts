import type { SectionId } from "./sectionRegistry";

export type SiteState = {
  activeSection: SectionId;
  indexOpen: boolean;
  talkOpen: boolean;
};

export type SiteAction =
  | { type: "set-section"; section: SectionId }
  | { type: "open-index" }
  | { type: "close-index" }
  | { type: "open-talk" }
  | { type: "close-talk" }
  | { type: "close-overlays" };

export const initialSiteState: SiteState = {
  activeSection: "home",
  indexOpen: false,
  talkOpen: false,
};

export function siteReducer(state: SiteState, action: SiteAction): SiteState {
  switch (action.type) {
    case "set-section":
      return state.activeSection === action.section ? state : { ...state, activeSection: action.section };
    case "open-index":
      return { ...state, indexOpen: true, talkOpen: false };
    case "close-index":
      return { ...state, indexOpen: false };
    case "open-talk":
      return { ...state, talkOpen: true, indexOpen: false };
    case "close-talk":
      return { ...state, talkOpen: false };
    case "close-overlays":
      return { ...state, indexOpen: false, talkOpen: false };
    default:
      return state;
  }
}
