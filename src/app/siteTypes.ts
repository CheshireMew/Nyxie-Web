import type { SectionId } from "../content/siteContent";

export type SiteState = {
  activeSection: SectionId;
  soundOn: boolean;
  indexOpen: boolean;
  talkOpen: boolean;
  headerCompact: boolean;
};

export type SiteAction =
  | { type: "set-section"; section: SectionId }
  | { type: "set-header-compact"; compact: boolean }
  | { type: "toggle-sound" }
  | { type: "set-sound"; soundOn: boolean }
  | { type: "open-index" }
  | { type: "close-index" }
  | { type: "open-talk" }
  | { type: "close-talk" }
  | { type: "close-overlays" };

export const initialSiteState: SiteState = {
  activeSection: "home",
  soundOn: false,
  indexOpen: false,
  talkOpen: false,
  headerCompact: false,
};

export function siteReducer(state: SiteState, action: SiteAction): SiteState {
  switch (action.type) {
    case "set-section":
      return state.activeSection === action.section ? state : { ...state, activeSection: action.section };
    case "set-header-compact":
      return state.headerCompact === action.compact ? state : { ...state, headerCompact: action.compact };
    case "toggle-sound":
      return { ...state, soundOn: !state.soundOn };
    case "set-sound":
      return state.soundOn === action.soundOn ? state : { ...state, soundOn: action.soundOn };
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
