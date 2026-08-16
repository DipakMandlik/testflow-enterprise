import {
  ExecutionStatus,
  type AppState,
  type Evidence,
  type Notification,
  type StepResult,
  type TestStep,
} from "@/types/domain";

const now = Date.UTC(2026, 7, 12, 9, 0, 0);
const iso = (offsetHours: number) => new Date(now + offsetHours * 3600_000).toISOString();

interface StepSeed {
  action: string;
  expected: string;
  evidenceRequired?: boolean;
}

function steps(testCaseId: string, seeds: StepSeed[]): TestStep[] {
  return seeds.map((s, i) => ({
    id: `${testCaseId}-s${i + 1}`,
    testCaseId,
    index: i + 1,
    action: s.action,
    expected: s.expected,
    evidenceRequired: s.evidenceRequired ?? false,
  }));
}

const testSteps: TestStep[] = [
  ...steps("tc-auth-001", [
    {
      action: "Open the Tata Electronics MES portal on the validation workstation.",
      expected: "Login screen renders with Employee ID and Password fields.",
    },
    {
      action: "Enter a valid Employee ID (TE-1001) and the correct password.",
      expected: "Credentials are accepted and the OTP challenge is displayed.",
    },
    {
      action: "Enter an invalid six-digit OTP.",
      expected: "Error message 'Invalid verification code' appears; session is not created.",
      evidenceRequired: true,
    },
    {
      action: "Enter the correct OTP within the validity window.",
      expected: "Session cookie is issued and the role dashboard loads within 3 seconds.",
    },
    {
      action: "Attempt login with a deactivated Employee ID.",
      expected: "Access is denied with 'Account inactive' and an audit record is written.",
    },
    {
      action: "Trigger five consecutive failed password attempts.",
      expected: "Account is temporarily locked for 15 minutes.",
    },
    {
      action: "Sign out and verify the session is destroyed.",
      expected: "Protected routes redirect back to the login screen.",
    },
  ]),
  ...steps("tc-pwr-014", [
    {
      action: "Connect the power module to the programmable DC source at 12 V nominal.",
      expected: "Module enumerates and reports READY over the diagnostic bus.",
    },
    {
      action: "Ramp input voltage to the upper threshold of 15.5 V.",
      expected: "Module remains operational; no over-voltage flag raised below 16.0 V.",
    },
    {
      action: "Exceed the threshold to 16.4 V for 500 ms.",
      expected: "Over-voltage protection engages within 20 ms and output is latched off.",
      evidenceRequired: true,
    },
    {
      action: "Return input to 12 V and issue a protection reset command.",
      expected: "Module clears the fault and resumes regulated output at 5.00 V ±1%.",
    },
    {
      action: "Record efficiency at 25%, 50% and 100% rated load.",
      expected: "Efficiency remains above 91% across the measured load points.",
    },
    {
      action: "Capture the diagnostic event log for the run.",
      expected: "Log contains one over-voltage event with a matching timestamp.",
      evidenceRequired: true,
    },
  ]),
  ...steps("tc-thm-008", [
    {
      action: "Place the assembly in the thermal chamber and stabilise at 25 °C.",
      expected: "Reported die temperature is within ±2 °C of chamber temperature.",
    },
    {
      action: "Ramp the chamber to 95 °C at 2 °C per minute under full load.",
      expected: "Thermal throttling begins at 88 °C ±3 °C.",
    },
    {
      action: "Hold at 105 °C for two minutes.",
      expected: "Thermal shutdown asserts and the fault pin is driven low.",
      evidenceRequired: true,
    },
    {
      action: "Cool to 60 °C and verify automatic recovery.",
      expected: "Device restarts and resumes full clock frequency.",
    },
    {
      action: "Verify the thermal event is reported to the host telemetry channel.",
      expected: "Telemetry contains shutdown and recovery events in order.",
    },
  ]),
  ...steps("tc-sig-003", [
    {
      action: "Attach the differential probe to the high-speed lane under test.",
      expected: "Probe compensation passes and the eye diagram is visible.",
    },
    {
      action: "Run the compliance pattern at 5 Gbps for 60 seconds.",
      expected: "Eye height exceeds 180 mV and eye width exceeds 0.65 UI.",
      evidenceRequired: true,
    },
    {
      action: "Measure total jitter at BER 1e-12.",
      expected: "Total jitter is below 0.35 UI.",
    },
    {
      action: "Repeat the measurement with the maximum specified cable length.",
      expected: "Link trains successfully with no CRC errors recorded.",
    },
  ]),
  ...steps("tc-dsp-006", [
    {
      action: "Flash the display driver firmware release candidate to the target board.",
      expected: "Firmware version reported matches the release candidate build number.",
    },
    {
      action: "Render the colour-bar calibration pattern at 60 Hz.",
      expected: "All bars render with no banding and no dropped frames.",
      evidenceRequired: true,
    },
    {
      action: "Switch refresh rate from 60 Hz to 120 Hz during playback.",
      expected: "Transition completes without visible tearing within two frames.",
    },
    {
      action: "Set backlight to 10% and measure luminance uniformity.",
      expected: "Uniformity deviation across nine points stays under 12%.",
    },
    {
      action: "Enter and exit panel self-refresh three times.",
      expected: "Panel resumes each time with no corruption of the frame buffer.",
    },
  ]),
  ...steps("tc-int-011", [
    {
      action: "Start the end-to-end line integration run with the MES sequencer.",
      expected: "All four stations report READY and the run identifier is allocated.",
    },
    {
      action: "Process a batch of ten units through the full station chain.",
      expected: "Each unit receives a traceability record with station timestamps.",
    },
    {
      action: "Force a station timeout on the thermal station.",
      expected: "Sequencer quarantines the affected unit and continues the batch.",
      evidenceRequired: true,
    },
    {
      action: "Reconcile the batch report with the station-level records.",
      expected: "Counts match exactly and the quarantined unit is flagged.",
    },
  ]),
];

function results(
  executionId: string,
  testCaseId: string,
  filled: Record<number, Partial<StepResult>>,
): StepResult[] {
  return testSteps
    .filter((s) => s.testCaseId === testCaseId)
    .map((s) => ({
      id: `${executionId}-${s.id}`,
      executionId,
      stepId: s.id,
      status: "not_started" as const,
      actual: "",
      comment: "",
      updatedAt: null,
      ...filled[s.index],
    }));
}

const pixel =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iIzE2MWExZiIvPjx0ZXh0IHg9IjE2MCIgeT0iOTUiIGZpbGw9IiNmZmIzMzMiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPmNhcHR1cmUucG5nPC90ZXh0Pjwvc3ZnPg==";

const evidence: Evidence[] = [
  {
    id: "ev-1",
    executionId: "exec-2",
    stepId: "tc-pwr-014-s3",
    filename: "ovp-latch-scope-capture.png",
    mimeType: "image/svg+xml",
    size: 184320,
    dataUrl: pixel,
    uploadedById: "u-priya",
    uploadedAt: iso(-20),
  },
  {
    id: "ev-2",
    executionId: "exec-3",
    stepId: "tc-thm-008-s3",
    filename: "thermal-shutdown-trace.png",
    mimeType: "image/svg+xml",
    size: 221184,
    dataUrl: pixel,
    uploadedById: "u-priya",
    uploadedAt: iso(-48),
  },
  {
    id: "ev-3",
    executionId: "exec-4",
    stepId: "tc-sig-003-s2",
    filename: "eye-diagram-5gbps.png",
    mimeType: "image/svg+xml",
    size: 265216,
    dataUrl: pixel,
    uploadedById: "u-priya",
    uploadedAt: iso(-8),
  },
];

const notifications: Notification[] = [
  {
    id: "n-1",
    userId: "u-priya",
    title: "Revision requested",
    body: "Rajesh Kumar sent EX-1043 (TC-THM-008) back for revision.",
    href: "/executions/exec-3",
    read: false,
    createdAt: iso(-40),
  },
  {
    id: "n-2",
    userId: "u-priya",
    title: "New test assigned",
    body: "TC-AUTH-001 Employee Login Validation is assigned to you.",
    href: "/my-tests",
    read: false,
    createdAt: iso(-72),
  },
  {
    id: "n-3",
    userId: "u-rajesh",
    title: "Execution submitted for review",
    body: "EX-1044 (TC-SIG-003) submitted by Priya Sharma.",
    href: "/reviews/exec-4",
    read: false,
    createdAt: iso(-7),
  },
];

export function createSeedState(): AppState {
  return {
    session: null,
    pendingLoginUserId: null,
    users: [
      {
        id: "u-priya",
        employeeId: "TE-1001",
        name: "Priya Sharma",
        email: "priya.sharma@tataelectronics.example",
        role: "tester",
        active: true,
        projectIds: ["p-semi", "p-power", "p-display"],
      },
      {
        id: "u-rajesh",
        employeeId: "TE-2001",
        name: "Rajesh Kumar",
        email: "rajesh.kumar@tataelectronics.example",
        role: "reviewer",
        active: true,
        projectIds: ["p-semi", "p-power", "p-display"],
      },
      {
        id: "u-anita",
        employeeId: "TE-3001",
        name: "Anita Desai",
        email: "anita.desai@tataelectronics.example",
        role: "manager",
        active: true,
        projectIds: ["p-semi", "p-power", "p-display"],
      },
      {
        id: "u-admin",
        employeeId: "TE-9001",
        name: "Admin User",
        email: "platform.admin@tataelectronics.example",
        role: "admin",
        active: true,
        projectIds: ["p-semi", "p-power", "p-display"],
      },
      {
        id: "u-vikram",
        employeeId: "TE-1002",
        name: "Vikram Iyer",
        email: "vikram.iyer@tataelectronics.example",
        role: "tester",
        active: true,
        projectIds: ["p-power"],
      },
      {
        id: "u-meera",
        employeeId: "TE-1003",
        name: "Meera Nair",
        email: "meera.nair@tataelectronics.example",
        role: "tester",
        active: false,
        projectIds: ["p-display"],
      },
    ],
    projects: [
      {
        id: "p-semi",
        code: "SEMI-VAL",
        name: "Semiconductor Validation",
        description: "Wafer-level and package-level validation for the 2026 controller family.",
        active: true,
      },
      {
        id: "p-power",
        code: "PWR-QA",
        name: "Power Module QA",
        description: "Qualification of automotive-grade power modules and protection circuits.",
        active: true,
      },
      {
        id: "p-display",
        code: "DSP-DRV",
        name: "Display Driver Testing",
        description: "Firmware and panel-level verification for display driver ICs.",
        active: true,
      },
    ],
    modules: [
      { id: "m-auth", projectId: "p-semi", name: "Authentication" },
      { id: "m-sig", projectId: "p-semi", name: "Signal Integrity" },
      { id: "m-int", projectId: "p-semi", name: "Integration" },
      { id: "m-pwr", projectId: "p-power", name: "Power Management" },
      { id: "m-thm", projectId: "p-power", name: "Thermal" },
      { id: "m-dsp", projectId: "p-display", name: "Display" },
    ],
    environments: [
      { id: "e-lab-a", projectId: "p-semi", name: "Validation Lab A" },
      { id: "e-lab-b", projectId: "p-power", name: "Power Bench B" },
      { id: "e-chamber", projectId: "p-power", name: "Thermal Chamber 2" },
      { id: "e-panel", projectId: "p-display", name: "Panel Rig 1" },
    ],
    testCases: [
      {
        id: "tc-auth-001",
        code: "TC-AUTH-001",
        title: "Employee Login Validation",
        description:
          "Verify MES portal authentication for shop-floor employees including OTP challenge, lockout and session teardown.",
        projectId: "p-semi",
        moduleId: "m-auth",
        environmentId: "e-lab-a",
        priority: "critical",
        version: "3.2",
        preconditions: [
          "MES portal build 2026.08.1 deployed to Validation Lab A.",
          "Employee records TE-1001 and TE-1099 (inactive) exist in the directory.",
        ],
        testData: "TE-1001 / valid password, TE-1099 / deactivated account, OTP validity 120 s.",
      },
      {
        id: "tc-pwr-014",
        code: "TC-PWR-014",
        title: "Power Module Threshold Validation",
        description:
          "Validate over-voltage protection thresholds, latch behaviour and efficiency of the 5 V rail power module.",
        projectId: "p-power",
        moduleId: "m-pwr",
        environmentId: "e-lab-b",
        priority: "critical",
        version: "2.0",
        preconditions: [
          "Programmable DC source calibrated within the last 30 days.",
          "Module firmware PM-1.4.7 flashed.",
        ],
        testData: "Nominal 12 V, OVP threshold 16.0 V, load steps 25/50/100%.",
      },
      {
        id: "tc-thm-008",
        code: "TC-THM-008",
        title: "Thermal Protection Verification",
        description:
          "Verify throttling, shutdown and recovery behaviour of the assembly across the specified thermal envelope.",
        projectId: "p-power",
        moduleId: "m-thm",
        environmentId: "e-chamber",
        priority: "high",
        version: "1.6",
        preconditions: ["Chamber profile THM-STD-02 loaded.", "Telemetry logger connected."],
        testData: "Ramp 2 °C/min, throttle 88 °C, shutdown 105 °C, recovery 60 °C.",
      },
      {
        id: "tc-sig-003",
        code: "TC-SIG-003",
        title: "Signal Integrity Validation",
        description:
          "Measure eye diagram, jitter and link stability of the high-speed serial lane under compliance patterns.",
        projectId: "p-semi",
        moduleId: "m-sig",
        environmentId: "e-lab-a",
        priority: "high",
        version: "4.1",
        preconditions: ["Scope bandwidth ≥ 16 GHz.", "Compliance fixture SI-FX-3 attached."],
        testData: "5 Gbps pattern, BER target 1e-12, cable lengths 0.5 m and 3 m.",
      },
      {
        id: "tc-dsp-006",
        code: "TC-DSP-006",
        title: "Display Driver Refresh Rate Verification",
        description:
          "Verify refresh-rate switching, luminance uniformity and self-refresh recovery for the display driver release candidate.",
        projectId: "p-display",
        moduleId: "m-dsp",
        environmentId: "e-panel",
        priority: "medium",
        version: "1.1",
        preconditions: ["Panel rig calibrated.", "RC firmware DD-2026.7 available."],
        testData: "60 Hz / 120 Hz profiles, backlight 10% and 100%.",
      },
      {
        id: "tc-int-011",
        code: "TC-INT-011",
        title: "Line Integration Traceability Run",
        description:
          "End-to-end integration run across four stations verifying traceability records and fault quarantine.",
        projectId: "p-semi",
        moduleId: "m-int",
        environmentId: "e-lab-a",
        priority: "medium",
        version: "1.0",
        preconditions: ["MES sequencer in integration mode.", "Batch of ten pilot units staged."],
        testData: "Batch INT-2026-114, four stations, forced timeout on thermal station.",
      },
    ],
    testSteps,
    assignments: [
      {
        id: "as-1",
        testCaseId: "tc-auth-001",
        testerId: "u-priya",
        assignedById: "u-anita",
        assignedAt: iso(-72),
        dueAt: iso(48),
        priority: "critical",
      },
      {
        id: "as-2",
        testCaseId: "tc-pwr-014",
        testerId: "u-priya",
        assignedById: "u-anita",
        assignedAt: iso(-96),
        dueAt: iso(24),
        priority: "critical",
      },
      {
        id: "as-3",
        testCaseId: "tc-thm-008",
        testerId: "u-priya",
        assignedById: "u-anita",
        assignedAt: iso(-120),
        dueAt: iso(12),
        priority: "high",
      },
      {
        id: "as-4",
        testCaseId: "tc-sig-003",
        testerId: "u-priya",
        assignedById: "u-anita",
        assignedAt: iso(-30),
        dueAt: iso(36),
        priority: "high",
      },
      {
        id: "as-5",
        testCaseId: "tc-dsp-006",
        testerId: "u-vikram",
        assignedById: "u-anita",
        assignedAt: iso(-60),
        dueAt: iso(60),
        priority: "medium",
      },
      {
        id: "as-6",
        testCaseId: "tc-int-011",
        testerId: "u-vikram",
        assignedById: "u-anita",
        assignedAt: iso(-14),
        dueAt: iso(72),
        priority: "medium",
      },
    ],
    executions: [
      {
        id: "exec-1",
        code: "EX-1041",
        assignmentId: "as-1",
        testCaseId: "tc-auth-001",
        testerId: "u-priya",
        status: ExecutionStatus.ASSIGNED,
        startedAt: null,
        submittedAt: null,
        completedAt: null,
        updatedAt: iso(-72),
        blockReason: null,
        summary: "",
        round: 1,
      },
      {
        id: "exec-2",
        code: "EX-1042",
        assignmentId: "as-2",
        testCaseId: "tc-pwr-014",
        testerId: "u-priya",
        status: ExecutionStatus.IN_PROGRESS,
        startedAt: iso(-26),
        submittedAt: null,
        completedAt: null,
        updatedAt: iso(-20),
        blockReason: null,
        summary: "",
        round: 1,
      },
      {
        id: "exec-3",
        code: "EX-1043",
        assignmentId: "as-3",
        testCaseId: "tc-thm-008",
        testerId: "u-priya",
        status: ExecutionStatus.SENT_BACK,
        startedAt: iso(-60),
        submittedAt: iso(-46),
        completedAt: null,
        updatedAt: iso(-40),
        blockReason: null,
        summary: "Thermal shutdown observed at 108 °C, outside the specified window.",
        round: 1,
      },
      {
        id: "exec-4",
        code: "EX-1044",
        assignmentId: "as-4",
        testCaseId: "tc-sig-003",
        testerId: "u-priya",
        status: ExecutionStatus.SUBMITTED,
        startedAt: iso(-12),
        submittedAt: iso(-7),
        completedAt: null,
        updatedAt: iso(-7),
        blockReason: null,
        summary: "Eye diagram within limits; jitter marginal at 3 m cable length.",
        round: 1,
      },
      {
        id: "exec-5",
        code: "EX-1045",
        assignmentId: "as-5",
        testCaseId: "tc-dsp-006",
        testerId: "u-vikram",
        status: ExecutionStatus.COMPLETED,
        startedAt: iso(-160),
        submittedAt: iso(-150),
        completedAt: iso(-140),
        updatedAt: iso(-140),
        blockReason: null,
        summary: "All display driver checks passed on RC firmware DD-2026.7.",
        round: 1,
      },
      {
        id: "exec-6",
        code: "EX-1046",
        assignmentId: "as-6",
        testCaseId: "tc-int-011",
        testerId: "u-vikram",
        status: ExecutionStatus.BLOCKED,
        startedAt: iso(-10),
        submittedAt: null,
        completedAt: null,
        updatedAt: iso(-9),
        blockReason: "Thermal station offline pending maintenance work order WO-88231.",
        summary: "",
        round: 1,
      },
    ],
    stepResults: [
      ...results("exec-1", "tc-auth-001", {}),
      ...results("exec-2", "tc-pwr-014", {
        1: { status: "passed", actual: "Module enumerated and reported READY in 1.2 s.", updatedAt: iso(-25) },
        2: { status: "passed", actual: "No fault flags raised up to 15.5 V.", updatedAt: iso(-24) },
        3: {
          status: "passed",
          actual: "OVP engaged at 16.05 V within 14 ms; output latched off.",
          updatedAt: iso(-22),
        },
        4: { status: "in_progress", actual: "", updatedAt: iso(-20) },
      }),
      ...results("exec-3", "tc-thm-008", {
        1: { status: "passed", actual: "Die temperature reported 25.8 °C at stabilisation.", updatedAt: iso(-58) },
        2: { status: "passed", actual: "Throttling started at 89.4 °C.", updatedAt: iso(-55) },
        3: {
          status: "failed",
          actual: "Shutdown asserted only at 108.2 °C, above the 105 °C limit.",
          comment: "Repeated twice with the same result. Chamber calibration certificate attached.",
          updatedAt: iso(-50),
        },
        4: { status: "passed", actual: "Device recovered at 59.1 °C and resumed full clock.", updatedAt: iso(-48) },
        5: { status: "passed", actual: "Telemetry contains shutdown and recovery events in order.", updatedAt: iso(-47) },
      }),
      ...results("exec-4", "tc-sig-003", {
        1: { status: "passed", actual: "Probe compensation passed; eye visible.", updatedAt: iso(-11) },
        2: { status: "passed", actual: "Eye height 196 mV, eye width 0.71 UI.", updatedAt: iso(-10) },
        3: { status: "passed", actual: "Total jitter measured at 0.32 UI.", updatedAt: iso(-9) },
        4: {
          status: "failed",
          actual: "At 3 m cable length the link retrained twice and logged 4 CRC errors.",
          comment: "Suspect fixture loss budget; recommend re-run with certified cable.",
          updatedAt: iso(-8),
        },
      }),
      ...results("exec-5", "tc-dsp-006", {
        1: { status: "passed", actual: "Firmware reported DD-2026.7-rc3.", updatedAt: iso(-155) },
        2: { status: "passed", actual: "Colour bars rendered cleanly, no dropped frames.", updatedAt: iso(-154) },
        3: { status: "passed", actual: "Transition completed in one frame.", updatedAt: iso(-153) },
        4: { status: "passed", actual: "Uniformity deviation 9.4%.", updatedAt: iso(-152) },
        5: { status: "passed", actual: "Three self-refresh cycles with no corruption.", updatedAt: iso(-151) },
      }),
      ...results("exec-6", "tc-int-011", {
        1: { status: "blocked", actual: "Thermal station did not report READY.", updatedAt: iso(-9) },
      }),
    ],
    evidence,
    reviews: [
      {
        id: "rv-1",
        executionId: "exec-3",
        reviewerId: "u-rajesh",
        decision: "sent_back",
        comment:
          "Shutdown threshold deviation needs a second run with a freshly calibrated chamber probe before we accept the failure.",
        createdAt: iso(-40),
        round: 1,
      },
      {
        id: "rv-2",
        executionId: "exec-5",
        reviewerId: "u-rajesh",
        decision: "approved",
        comment: "All steps passed with adequate evidence. Approved for release sign-off.",
        createdAt: iso(-140),
        round: 1,
      },
    ],
    notifications,
    audit: [
      {
        id: "au-1",
        actorId: "u-anita",
        action: "assignment.created",
        entity: "TestAssignment",
        entityId: "as-1",
        createdAt: iso(-72),
        metadata: { testCase: "TC-AUTH-001", tester: "Priya Sharma" },
      },
      {
        id: "au-2",
        actorId: "u-priya",
        action: "execution.submitted",
        entity: "TestExecution",
        entityId: "exec-3",
        createdAt: iso(-46),
        metadata: { code: "EX-1043" },
      },
      {
        id: "au-3",
        actorId: "u-rajesh",
        action: "review.revision_requested",
        entity: "TestExecution",
        entityId: "exec-3",
        createdAt: iso(-40),
        metadata: { code: "EX-1043" },
      },
      {
        id: "au-4",
        actorId: "u-priya",
        action: "execution.submitted",
        entity: "TestExecution",
        entityId: "exec-4",
        createdAt: iso(-7),
        metadata: { code: "EX-1044" },
      },
      {
        id: "au-5",
        actorId: "u-rajesh",
        action: "review.approved",
        entity: "TestExecution",
        entityId: "exec-5",
        createdAt: iso(-140),
        metadata: { code: "EX-1045" },
      },
    ],
  };
}
