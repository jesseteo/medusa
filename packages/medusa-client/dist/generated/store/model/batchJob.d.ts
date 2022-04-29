/**
 * Generated by orval v6.7.1 🍺
 * Do not edit manually.
 * Medusa Storefront API
 * OpenAPI spec version: 1.0.0
 */
import type { BatchJobType } from "./batchJobType";
import type { BatchJobStatus } from "./batchJobStatus";
import type { BatchJobContext } from "./batchJobContext";
import type { BatchJobResult } from "./batchJobResult";
/**
 * A Batch Job.
 */
export interface BatchJob {
    /** The unique identifier for the batch job. */
    id?: string;
    /** The type of batch job. */
    type?: BatchJobType;
    /** The status of the batch job. */
    status?: BatchJobStatus;
    /** The unique identifier of the user that created the batch job. */
    created_by?: string;
    /** The context of the batch job, the type of the batch job determines what the context should contain. */
    context?: BatchJobContext;
    /** The result of the batch job. */
    result?: BatchJobResult;
    /** The date with timezone at which the resource was created. */
    created_at?: string;
    /** The date with timezone at which the resource was last updated. */
    updated_at?: string;
    /** The date with timezone at which the resource was deleted. */
    deleted_at?: string;
}
