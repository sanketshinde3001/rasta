import type { PhotoAI } from "./data";
import { SUB_TO_CAT } from "./taxonomy";

export const PHOTO_UNRELATED = "This photo does not appear to show a road, drainage, manhole or footpath problem. Please replace it with a clear photo of the actual issue, or remove it and describe your road complaint.";
export const PHOTO_UNVERIFIED = "We could not verify this photo. It has not been accepted as road evidence. Try again later, or remove the photo and describe your road complaint.";
export const TRIAGE_REVIEW_VERSION = 2;

export function isAcceptedPhoto(ai: PhotoAI | null | undefined): ai is PhotoAI & { by: "claude"; is_road_issue: true } {
  return !!ai && ai.by === "claude" && ai.is_road_issue === true &&
    Object.prototype.hasOwnProperty.call(SUB_TO_CAT, ai.subcategory) && SUB_TO_CAT[ai.subcategory] === ai.category;
}
