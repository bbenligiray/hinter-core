# `ingest-reports`

## Description
Processes incoming reports from peers (located in `peers/{ALIAS}-{PUBLIC_KEY}/incoming/`). For each report not previously ingested, it analyzes the content and creates a new corresponding entry in the user's `entries/` directory. The AI learns from user feedback on these ingested entries to improve future processing.

## Invocation / Arguments
*   **Invocation**: User typically says: `ingest-reports [source_peer_alias]`
    *   Example: `ingest-reports` (processes all unprocessed reports from all peers)
    *   Example: `ingest-reports alice` (processes unprocessed reports only from peer 'alice')
*   **Parameters**:
    *   `{SOURCE_PEER_ALIAS}` (optional):
        *   The alias of a specific peer whose incoming reports should be processed.
        *   If not provided, reports from all peers are considered.

## Core Logic / Procedure
1.  **Data Retrieval**:
    *   **User Entries (for Context & Processed Status Check)**:
        *   Execute `ai/tools/read-entries.sh` to get all existing user entries. This provides context for understanding incoming report information AND allows checking for already ingested reports (those with `_from_[alias]` in filename and correct `SOURCE_REPORT` metadata).
        *   Ingest the COMPLETE output.
    *   **Incoming Reports Content**:
        *   Execute `ai/tools/read-incoming-reports.sh` to get the content of all incoming reports from all peers, along with their metadata (Peer-Alias, Peer-Public-Key, Report-Filename).
        *   Ingest the COMPLETE output. This script handles iterating through peer directories.
2.  **Identify Target Reports & Determine Processing Status**:
    *   The output from `ai/tools/read-incoming-reports.sh` provides a list of all available incoming reports and their content.
    *   If `{SOURCE_PEER_ALIAS}` is specified by the user, filter this list to only include reports where `Peer-Alias` matches `{SOURCE_PEER_ALIAS}`.
    *   For each report obtained from the script:
        *   Let `{INCOMING_REPORT_PATH}` be constructed as `data/peers/{Peer-Alias}-{Peer-Public-Key}/incoming/{Report-Filename}` using the metadata from the script.
        *   Check among the ingested user entries (from `read-entries.sh` output) if an entry already exists in `entries/` that has a `<!-- SOURCE_REPORT: {INCOMING_REPORT_PATH} -->` metadata tag.
        *   If such an entry exists, this report is considered "processed". Otherwise, it's "unprocessed".
    *   Filter the list to include only "unprocessed" reports.
    *   If no unprocessed reports are found for the given scope, provide "No New Reports" output.
3.  **Process Each Unprocessed Report**:
    *   For each unprocessed report (identified in step 2, with its content already available from `read-incoming-reports.sh` output):
        *   Let `{PEER_ALIAS}` be the `Peer-Alias` from the script's metadata for this report.
        *   Let `{REPORT_FILENAME}` be the `Report-Filename` from the script's metadata.
        *   Let `{INCOMING_REPORT_PATH}` be `data/peers/{PEER_ALIAS}-{Peer-Public-Key}/incoming/{REPORT_FILENAME}`.
        *   **Content Analysis**: Analyze the pre-fetched report content to extract key information, entities, opportunities, events, or insights.
        *   **Contextualization**: Cross-reference information with existing user entries (from step 1) to understand its relevance, potential connections, or contradictions.
        *   **Apply Learned Preferences**: Use insights from previous user feedback on ingested entries (see "AI Learning"). Filter or prioritize information based on these learned patterns.
        *   **Create New Entry in `entries/`**:
            *   Construct filename: `YYYYMMDDHHMMSS_from_[peer_alias]_[report_timestamp_short].md` (e.g., `20250530180000_from_alice_202505291030.md`). The first timestamp is current, `report_timestamp_short` is from the incoming report's filename.
            *   Use the "Ingested Entry Format" below. Ensure the `<!-- SOURCE_REPORT: ... -->` tag correctly points to the `{INCOMING_REPORT_PATH}`.
            *   Populate with extracted and organized information.
            *   Save to `entries/`. If creation fails, trigger "Entry Creation Failed" error for this report but continue with others.
            *   (The creation of this new entry in `entries/` with the correct `SOURCE_REPORT` metadata effectively marks the incoming report as processed for future runs.)
4.  **Confirm Success**: After processing all targeted reports, provide a summary success output.

## Ingested Entry Format (Template to be filled by AI)
```markdown
<!-- SOURCE_REPORT: peers/[peer_alias-PUBLIC_KEY]/incoming/[YYYYMMDDHHMMSS_of_report].md -->
<!-- SOURCE_PEER_ALIAS: [peer_alias] -->
<!-- INGESTION_TIMESTAMP: [YYYYMMDDHHMMSS of ingestion] -->
<!-- AI_CONFIDENCE_RELEVANCE: [High/Medium/Low, based on content and learned preferences] -->

# Information from [peer_alias] (Report: [YYYYMMDDHHMMSS_of_report])

## Key Information Extracted
[Organized summary of the relevant information extracted from the report. This could be bullet points, paragraphs, or structured data depending on the report's content.]
*   [Point 1]
*   [Point 2]

## AI Notes / Context (If any)
[Optional: Any brief notes from the AI about how this information relates to existing entries, or potential areas of interest for the user.]

## User Feedback & Notes
<!--
    User, please review this ingested information:
    - Is this information relevant and correctly interpreted?
    - Should future reports from [peer_alias] with similar content be prioritized or de-prioritized?
    - Any other notes for AI learning?
-->
[Leave this section blank for the user to fill in]
```

## User Interaction & Confirmation
*   Primary interaction is the user invoking the command.
*   Feedback is provided by the user editing the generated `_from_[peer_alias].md` entries, especially the "User Feedback & Notes" section.

## Success Output
*   "Successfully ingested {N} reports from {M} peer(s). Created {K} new entries in `entries/`."
*   If no new reports: "No new reports found to ingest." or "No new reports found from peer `{SOURCE_PEER_ALIAS}`."

## Error Handling & Responses
*   **No Peers Directory**: "Error: `peers/` directory not found."
*   **Invalid Peer Directory**: "Warning: Invalid directory structure for peer `{PEER_DIR_NAME}`. Skipping."
*   **Corrupted Report File**: "Warning: Could not read or process report `{REPORT_PATH}`. Skipping."
*   **Entry Creation Failed**: "Error: Failed to create entry for report `{REPORT_PATH}`. Please check permissions."
*   **Read Entries Failed**: "Error: Could not read existing entries for context/status check."

## AI Learning
*   The AI must learn from user edits and annotations in the "User Feedback & Notes" section of the ingested entries.
*   This includes learning:
    *   What types of information from specific peers are considered relevant or irrelevant.
    *   How to better interpret or summarize report content.
    *   Adjusting the `AI_CONFIDENCE_RELEVANCE` score for future similar reports.
*   This feedback loop is critical for improving the quality and relevance of future report ingestions.

## Dependencies
*   Relies on `ai/tools/read-entries.sh` for context from existing user entries and for checking the processed status of incoming reports.
*   Relies on `ai/tools/read-incoming-reports.sh` for accessing the content and metadata of all incoming reports.
*   Needs AI capabilities for information extraction, summarization, relevance assessment, and learning from feedback.
