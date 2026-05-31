// Domain types — mirror the DB schema

export type ArtifactType = "pdf" | "image" | "html";
export type ArtifactVisibility = "public" | "unlisted";
export type FeedbackType = "approval" | "suggestion" | "issue" | "question";
export type FeedbackStatus = "open" | "resolved" | "needs_review";

export interface Artifact {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  type: ArtifactType;
  mime_type: string;
  visibility: ArtifactVisibility;
  storage_path: string;
  file_size: number | null;
  original_filename: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  artifact_id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  feedback_type: FeedbackType;
  status: FeedbackStatus;
  comment: string;
  created_at: string;
}

export interface ShareLink {
  id: string;
  artifact_id: string;
  token: string;
  expires_at: string;
  label: string | null;
  created_at: string;
}

export interface FeedbackSummaryData {
  overall_assessment: string;
  open_issues: string[];
  suggestions: string[];
  questions: string[];
  approval_count: number;
}

export interface FeedbackSummary {
  id: string;
  artifact_id: string;
  summary: FeedbackSummaryData;
  feedback_count: number;
  content_hash: string | null;
  model: string | null;
  prompt_version: string | null;
  generated_at: string;
}

// API request/response shapes

export interface UpdateArtifactBody {
  title?: string;
  description?: string | null;
  tags?: string[];
  visibility?: ArtifactVisibility;
}

export interface CreateArtifactBody {
  title: string;
  description?: string;
  tags?: string[];
  type: ArtifactType;
  mime_type: string;
  visibility?: ArtifactVisibility;
  file_base64: string;
  filename: string;
}

export interface CreateFeedbackBody {
  reviewer_name: string;
  reviewer_role?: string;
  feedback_type: FeedbackType;
  comment: string;
}

export interface UpdateFeedbackStatusBody {
  feedback_id: string;
  status: FeedbackStatus;
}

export interface CreateShareLinkBody {
  artifact_id: string;
  expires_in_hours?: number;
  label?: string;
}

export interface SummarizeBody {
  force_refresh?: boolean;
}

// Artifact shape safe to expose in API responses (storage_path is internal-only)
export type ArtifactPublic = Omit<Artifact, "storage_path">;

// Utility type for service-layer results

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };
