## Requirements

should follow
INVEST principles ensure requirements are:

- Independent: Can be developed without dependencies
- Negotiable: Flexible for discussion and refinement
- Valuable: Provides real business/user value
- Estimable: Can be assessed for effort and cost
- Small: Completable within a single iteration
- Testable: Clear criteria for verification

### REQ-<CATEGORY>-NNN — <Concise, action-oriented title>

**User Story:** As a [role], I want [feature], so that [benefit].

**Traceability**

- **Category:** <FUNC|UI|DATA|SEC|PERF|REL|USAB|SCAL|VAL> (Tags: FLOW, PARAMS as needed)
- **Source:** PRD p<X>: <Exact Section Title> [bullet <a|b|c|...>] | **[NEW]** | **[ASSUMPTION]**
- **Quote (≤25 words):** "<verbatim text from PRD row/section>"
- **Mapping:** VERBATIM | RESTATED | NEW

**Platform(s):** <Mobile | WebView | Backend>
**Parameters (Defaults):** <name=value; remote-config?> (e.g., token_validity_s=60, max_regen=2, session_validity_m=5)
**Termination Conditions:** <enumerate end/destroy cases from PRD row>

#### Acceptance Criteria (EARS)

1. WHEN [event/context from PRD "Positive:"] THEN system SHALL [observable response].
2. IF [condition from PRD "Positive:"] THEN system SHALL [observable response].
3. WHEN [timeout/expiry threshold] THEN system SHALL [observable response].
4. IF [user cancels/changes menu/closes tab/etc.] THEN system SHALL [observable response].

**UI Copy (if UI):** <exact strings; e.g., "Permintaan Kode Verifikasi">
**Logging/Audit (if applicable):** <map to Activity Log fields required by PRD>
**Notes**

- **Delta:** Differences from PRD, assumptions, or rationale for NEW items.
- **Edge Cases:** Non-happy paths worth testing.
- **Technical Constraints:** Performance/security/integration constraints impacting scope.
