import {
  ExecutionStatus,
  type AppState,
  type CheckResult,
  type CheckType,
  type Evidence,
  type FailureSeverity,
  type Notification,
  type TemplateCategory,
  type TemplateCheck,
} from "@/types/domain";

const now = Date.UTC(2026, 7, 12, 9, 0, 0);
const iso = (offsetHours: number) => new Date(now + offsetHours * 3600_000).toISOString();

const TEMPLATE_ID = "tpl-ojas-eqt-r3";

interface CheckSeed {
  code: string;
  title: string;
  description: string;
  instruction: string;
  expectedResult: string;
  acceptanceCriteria: string;
  testType: CheckType;
  mandatory?: boolean;
  allowNA?: boolean;
  evidenceRequired?: boolean;
  measurementUnit?: string | null;
  measurementMin?: number | null;
  measurementMax?: number | null;
  defaultFailureCategory?: string | null;
}

interface CategorySeed {
  name: string;
  checks: CheckSeed[];
}

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: "Check IN",
    checks: [
      {
        code: "CHK-001",
        title: "Check IN",
        description:
          'Verify the unit correctly completes the "Check IN" scenario defined in the FATP EQT test plan for Check IN.',
        instruction:
          'Execute the "Check IN" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Check IN" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Check IN".',
        testType: "binary",
        mandatory: true,
        evidenceRequired: true,
        defaultFailureCategory: "Other",
      },
    ],
  },
  {
    name: "Shipping Setting",
    checks: [
      {
        code: "SHP-001",
        title: "Shipping Setting",
        description:
          'Verify the unit correctly completes the "Shipping Setting" scenario defined in the FATP EQT test plan for Shipping Setting.',
        instruction:
          'Execute the "Shipping Setting" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Shipping Setting" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Shipping Setting".',
        testType: "binary",
        mandatory: true,
        evidenceRequired: true,
        defaultFailureCategory: "Other",
      },
    ],
  },
  {
    name: "Activation",
    checks: [
      {
        code: "ACT-001",
        title: "Activation",
        description:
          'Verify the unit correctly completes the "Activation" scenario defined in the FATP EQT test plan for Activation.',
        instruction:
          'Execute the "Activation" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Activation" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Activation".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Software",
      },
    ],
  },
  {
    name: "Acoustics",
    checks: [
      {
        code: "ACO-001",
        title: "RCAM + Mic 2/3 Stress Test",
        description:
          'Verify the unit correctly completes the "RCAM + Mic 2/3 Stress Test" scenario defined in the FATP EQT test plan for Acoustics.',
        instruction:
          'Execute the "RCAM + Mic 2/3 Stress Test" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "RCAM + Mic 2/3 Stress Test" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "RCAM + Mic 2/3 Stress Test".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Acoustic",
      },
      {
        code: "ACO-002",
        title: "RCAM + Mic 2/3",
        description:
          'Measure "RCAM + Mic 2/3" against the qualified reference range for the OJAS EQT programme.',
        instruction:
          'Run the "RCAM + Mic 2/3" scenario on the calibrated bench and record the measured value at completion.',
        expectedResult: 'Peak output between 60 dB and 90 dB during the "RCAM + Mic 2/3" scenario.',
        acceptanceCriteria: "60 dB ≤ measured level ≤ 90 dB.",
        testType: "measurement",
        mandatory: true,
        measurementUnit: "dB",
        measurementMin: 60,
        measurementMax: 90,
        defaultFailureCategory: "Acoustic",
      },
      {
        code: "ACO-003",
        title: "RCAM + Mic 2/3 + Strobe Stress Test",
        description:
          'Verify "RCAM + Mic 2/3 + Strobe Stress Test", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "RCAM + Mic 2/3 + Strobe Stress Test" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "RCAM + Mic 2/3 + Strobe Stress Test" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "RCAM + Mic 2/3 + Strobe Stress Test" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Acoustic",
      },
      {
        code: "ACO-004",
        title: "FCAM + Mic 3",
        description:
          'Verify the unit correctly completes the "FCAM + Mic 3" scenario defined in the FATP EQT test plan for Acoustics.',
        instruction:
          'Execute the "FCAM + Mic 3" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "FCAM + Mic 3" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "FCAM + Mic 3".',
        testType: "binary",
        defaultFailureCategory: "Acoustic",
      },
    ],
  },
  {
    name: "Battery and Charging",
    checks: [
      {
        code: "BAT-001",
        title: "Charging when Device is OFF",
        description:
          'Verify the unit correctly completes the "Charging when Device is OFF" scenario defined in the FATP EQT test plan for Battery and Charging.',
        instruction:
          'Execute the "Charging when Device is OFF" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Charging when Device is OFF" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Charging when Device is OFF".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Electrical",
      },
      {
        code: "BAT-002",
        title: "Charging when Device is ON",
        description:
          'Verify the unit correctly completes the "Charging when Device is ON" scenario defined in the FATP EQT test plan for Battery and Charging.',
        instruction:
          'Execute the "Charging when Device is ON" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Charging when Device is ON" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Charging when Device is ON".',
        testType: "binary",
        defaultFailureCategory: "Electrical",
      },
      {
        code: "BAT-003",
        title: "Time to Charge from Battery Trap",
        description:
          'Measure "Time to Charge from Battery Trap" against the qualified reference range for the OJAS EQT programme.',
        instruction:
          'Run the "Time to Charge from Battery Trap" scenario on the calibrated bench and record the measured value at completion.',
        expectedResult:
          "Full charge from the battery-trap threshold completes between 90 and 150 minutes.",
        acceptanceCriteria: "90 min ≤ measured charge time ≤ 150 min.",
        testType: "measurement",
        mandatory: true,
        measurementUnit: "min",
        measurementMin: 90,
        measurementMax: 150,
        defaultFailureCategory: "Electrical",
      },
      {
        code: "BAT-004",
        title: "Time to Discharge from Full Charge to battery trap",
        description:
          'Measure "Time to Discharge from Full Charge to battery trap" against the qualified reference range for the OJAS EQT programme.',
        instruction:
          'Run the "Time to Discharge from Full Charge to battery trap" scenario on the calibrated bench and record the measured value at completion.',
        expectedResult:
          "Discharge from full charge to the battery-trap threshold completes between 240 and 420 minutes.",
        acceptanceCriteria: "240 min ≤ measured discharge time ≤ 420 min.",
        testType: "measurement",
        measurementUnit: "min",
        measurementMin: 240,
        measurementMax: 420,
        defaultFailureCategory: "Electrical",
      },
      {
        code: "BAT-005",
        title: "Charging Test with 15V adapters",
        description:
          'Verify the unit correctly completes the "Charging Test with 15V adapters" scenario defined in the FATP EQT test plan for Battery and Charging.',
        instruction:
          'Execute the "Charging Test with 15V adapters" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Charging Test with 15V adapters" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Charging Test with 15V adapters".',
        testType: "binary",
        defaultFailureCategory: "Electrical",
      },
      {
        code: "BAT-006",
        title: "Scenarios Testing - Dual Camera Recording",
        description:
          'Verify the unit correctly completes the "Scenarios Testing - Dual Camera Recording" scenario defined in the FATP EQT test plan for Battery and Charging.',
        instruction:
          'Execute the "Scenarios Testing - Dual Camera Recording" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Scenarios Testing - Dual Camera Recording" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Scenarios Testing - Dual Camera Recording".',
        testType: "binary",
        defaultFailureCategory: "Electrical",
      },
      {
        code: "BAT-007",
        title: "Charging - Accelerometer Coex",
        description:
          'Verify the unit correctly completes the "Charging - Accelerometer Coex" scenario defined in the FATP EQT test plan for Battery and Charging.',
        instruction:
          'Execute the "Charging - Accelerometer Coex" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Charging - Accelerometer Coex" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Charging - Accelerometer Coex".',
        testType: "binary",
        defaultFailureCategory: "Electrical",
      },
    ],
  },
  {
    name: "Button",
    checks: [
      {
        code: "BTN-001",
        title: "DUT Squeeze test in Cases",
        description:
          'Verify the unit correctly completes the "DUT Squeeze test in Cases" scenario defined in the FATP EQT test plan for Button.',
        instruction:
          'Execute the "DUT Squeeze test in Cases" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "DUT Squeeze test in Cases" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "DUT Squeeze test in Cases".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-002",
        title: "Tritium Press w/ gloves",
        description:
          'Verify "Tritium Press w/ gloves", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Press w/ gloves" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Press w/ gloves" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Press w/ gloves" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-003",
        title: "Tritium Press w/ contaminants",
        description:
          'Verify "Tritium Press w/ contaminants", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Press w/ contaminants" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Press w/ contaminants" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Press w/ contaminants" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-004",
        title: "Tritium Press after submerge",
        description:
          'Verify "Tritium Press after submerge", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Press after submerge" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Press after submerge" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Press after submerge" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-005",
        title: "Tritium Press w/ Coex",
        description:
          'Verify "Tritium Press w/ Coex", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Press w/ Coex" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Press w/ Coex" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Press w/ Coex" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-006",
        title: "Tritium cycle press",
        description:
          'Verify "Tritium cycle press", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium cycle press" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium cycle press" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium cycle press" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-007",
        title: "Tritium press and hold",
        description:
          'Verify "Tritium press and hold", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium press and hold" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium press and hold" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium press and hold" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-008",
        title: "Tritium temperature stress",
        description:
          'Verify "Tritium temperature stress", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium temperature stress" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium temperature stress" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium temperature stress" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-009",
        title: "Tritium Press issue with cases",
        description:
          'Verify "Tritium Press issue with cases", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Press issue with cases" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Press issue with cases" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Press issue with cases" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-010",
        title: "Volume & Hold Button in Cases",
        description:
          'Verify the unit correctly completes the "Volume & Hold Button in Cases" scenario defined in the FATP EQT test plan for Button.',
        instruction:
          'Execute the "Volume & Hold Button in Cases" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Volume & Hold Button in Cases" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Volume & Hold Button in Cases".',
        testType: "binary",
        defaultFailureCategory: "Mechanical",
      },
      {
        code: "BTN-011",
        title: "Ringer Button in cases",
        description:
          'Verify the unit correctly completes the "Ringer Button in cases" scenario defined in the FATP EQT test plan for Button.',
        instruction:
          'Execute the "Ringer Button in cases" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Ringer Button in cases" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Ringer Button in cases".',
        testType: "binary",
        defaultFailureCategory: "Mechanical",
      },
    ],
  },
  {
    name: "Camera",
    checks: [
      {
        code: "CAM-001",
        title: "Mechanical Stress Plan",
        description:
          'Verify the unit correctly completes the "Mechanical Stress Plan" scenario defined in the FATP EQT test plan for Camera.',
        instruction:
          'Execute the "Mechanical Stress Plan" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Mechanical Stress Plan" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Mechanical Stress Plan".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-002",
        title: "Thermal Stress",
        description:
          'Capture and evaluate "Thermal Stress" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "Thermal Stress" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Thermal Stress" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Thermal Stress" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-003",
        title: "Electrical Stress Plan",
        description:
          'Verify the unit correctly completes the "Electrical Stress Plan" scenario defined in the FATP EQT test plan for Camera.',
        instruction:
          'Execute the "Electrical Stress Plan" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Electrical Stress Plan" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Electrical Stress Plan".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-004",
        title: "Ingress",
        description:
          'Verify the unit correctly completes the "Ingress" scenario defined in the FATP EQT test plan for Camera.',
        instruction:
          'Execute the "Ingress" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Ingress" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Ingress".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-005",
        title: "RCAM Tapping/Shaking Noise SOP",
        description:
          'Verify the unit correctly completes the "RCAM Tapping/Shaking Noise SOP" scenario defined in the FATP EQT test plan for Camera.',
        instruction:
          'Execute the "RCAM Tapping/Shaking Noise SOP" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "RCAM Tapping/Shaking Noise SOP" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "RCAM Tapping/Shaking Noise SOP".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-006",
        title: "FCAM Portrait Mode",
        description:
          'Capture and evaluate "FCAM Portrait Mode" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "FCAM Portrait Mode" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Portrait Mode" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Portrait Mode" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-007",
        title: "RCAM Video Normal Light",
        description:
          'Capture and evaluate "RCAM Video Normal Light" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "RCAM Video Normal Light" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "RCAM Video Normal Light" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "RCAM Video Normal Light" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-008",
        title: "FCAM Video Mode Normal Light #1",
        description:
          'Capture and evaluate "FCAM Video Mode Normal Light #1" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "FCAM Video Mode Normal Light #1" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Video Mode Normal Light #1" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Video Mode Normal Light #1" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-009",
        title: "RCAM Cinematic",
        description:
          'Capture and evaluate "RCAM Cinematic" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "RCAM Cinematic" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "RCAM Cinematic" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "RCAM Cinematic" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-010",
        title: "FCAM Cinematic",
        description:
          'Capture and evaluate "FCAM Cinematic" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "FCAM Cinematic" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Cinematic" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Cinematic" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-011",
        title: "CA Setup",
        description:
          'Verify the unit correctly completes the "CA Setup" scenario defined in the FATP EQT test plan for Camera.',
        instruction:
          'Execute the "CA Setup" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "CA Setup" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "CA Setup".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-012",
        title: "RCAM Standard Flare Test",
        description:
          'Capture and evaluate "RCAM Standard Flare Test" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "RCAM Standard Flare Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "RCAM Standard Flare Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "RCAM Standard Flare Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-013",
        title: "FCAM Standard Flare Test",
        description:
          'Capture and evaluate "FCAM Standard Flare Test" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "FCAM Standard Flare Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Standard Flare Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Standard Flare Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-014",
        title: "FCAM Haze Test",
        description:
          'Capture and evaluate "FCAM Haze Test" against the qualified reference image/video set for the OJAS EQT Camera programme.',
        instruction:
          'Run the "FCAM Haze Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Haze Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Haze Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "CAM-015",
        title: "Tritium Rear-Camera Functional testing with case",
        description:
          'Verify "Tritium Rear-Camera Functional testing with case", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Rear-Camera Functional testing with case" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Rear-Camera Functional testing with case" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Rear-Camera Functional testing with case" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-016",
        title: "Tritium Case Squeeze",
        description:
          'Verify "Tritium Case Squeeze", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium Case Squeeze" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium Case Squeeze" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium Case Squeeze" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "CAM-017",
        title: "Tritium FCAM Camera Functional testing with case",
        description:
          'Verify "Tritium FCAM Camera Functional testing with case", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Tritium FCAM Camera Functional testing with case" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Tritium FCAM Camera Functional testing with case" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Tritium FCAM Camera Functional testing with case" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Functional",
      },
    ],
  },
  {
    name: "Wifi",
    checks: [
      {
        code: "WIFI-001",
        title: "WiFi & Bluetooth",
        description:
          'Verify the unit correctly completes the "WiFi & Bluetooth" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi & Bluetooth" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi & Bluetooth" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi & Bluetooth".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-002",
        title: "WiFi Sleep Wake",
        description:
          'Verify the unit correctly completes the "WiFi Sleep Wake" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi Sleep Wake" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi Sleep Wake" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi Sleep Wake".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-003",
        title: "WiFi Range and Data Transfer Test",
        description:
          'Verify the unit correctly completes the "WiFi Range and Data Transfer Test" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi Range and Data Transfer Test" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi Range and Data Transfer Test" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi Range and Data Transfer Test".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-004",
        title: "WiFi Association Test Room Temp",
        description:
          'Verify the unit correctly completes the "WiFi Association Test Room Temp" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi Association Test Room Temp" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi Association Test Room Temp" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi Association Test Room Temp".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-005",
        title: "WiFi Association Test Cold Temp with Gyro drift",
        description:
          'Verify the unit correctly completes the "WiFi Association Test Cold Temp with Gyro drift" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi Association Test Cold Temp with Gyro drift" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi Association Test Cold Temp with Gyro drift" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi Association Test Cold Temp with Gyro drift".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-006",
        title: "WiFi Association Test Hot Temp with Gyro drift",
        description:
          'Verify the unit correctly completes the "WiFi Association Test Hot Temp with Gyro drift" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi Association Test Hot Temp with Gyro drift" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi Association Test Hot Temp with Gyro drift" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi Association Test Hot Temp with Gyro drift".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-007",
        title: "WiFi Connect Disconnect Hot Temp",
        description:
          'Verify the unit correctly completes the "WiFi Connect Disconnect Hot Temp" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "WiFi Connect Disconnect Hot Temp" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "WiFi Connect Disconnect Hot Temp" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "WiFi Connect Disconnect Hot Temp".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-008",
        title: "Wifi Speed App Server Setup and Test Process",
        description:
          'Verify the unit correctly completes the "Wifi Speed App Server Setup and Test Process" scenario defined in the FATP EQT test plan for Wifi.',
        instruction:
          'Execute the "Wifi Speed App Server Setup and Test Process" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Wifi Speed App Server Setup and Test Process" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Wifi Speed App Server Setup and Test Process".',
        testType: "binary",
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-009",
        title: "Wifi - SSID 6GHZ (Specific SSID based Testing)",
        description:
          'Verify "Wifi - SSID 6GHZ (Specific SSID based Testing)", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Wifi - SSID 6GHZ (Specific SSID based Testing)" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Wifi - SSID 6GHZ (Specific SSID based Testing)" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Wifi - SSID 6GHZ (Specific SSID based Testing)" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-010",
        title: "Wifi - SSID 5GHZ (Specific SSID based Testing)",
        description:
          'Verify "Wifi - SSID 5GHZ (Specific SSID based Testing)", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Wifi - SSID 5GHZ (Specific SSID based Testing)" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Wifi - SSID 5GHZ (Specific SSID based Testing)" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Wifi - SSID 5GHZ (Specific SSID based Testing)" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-011",
        title: "Wifi - SSID 2.4GHZ (Specific SSID based Testing)",
        description:
          'Verify "Wifi - SSID 2.4GHZ (Specific SSID based Testing)", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Wifi - SSID 2.4GHZ (Specific SSID based Testing)" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Wifi - SSID 2.4GHZ (Specific SSID based Testing)" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Wifi - SSID 2.4GHZ (Specific SSID based Testing)" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-012",
        title: "Wifi - Combined SSID",
        description:
          'Verify "Wifi - Combined SSID", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Wifi - Combined SSID" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Wifi - Combined SSID" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Wifi - Combined SSID" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-013",
        title: "BT Gaming Console: Sony Dual Sense/XBox One/8Bit Duo Pr",
        description:
          'Verify "BT Gaming Console: Sony Dual Sense/XBox One/8Bit Duo Pr", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "BT Gaming Console: Sony Dual Sense/XBox One/8Bit Duo Pr" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "BT Gaming Console: Sony Dual Sense/XBox One/8Bit Duo Pr" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "BT Gaming Console: Sony Dual Sense/XBox One/8Bit Duo Pr" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-014",
        title: "Extended Air Pod Testing",
        description:
          'Verify "Extended Air Pod Testing", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Extended Air Pod Testing" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Extended Air Pod Testing" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Extended Air Pod Testing" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
      {
        code: "WIFI-015",
        title: "LE Device Connectivity",
        description:
          'Verify "LE Device Connectivity", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "LE Device Connectivity" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "LE Device Connectivity" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "LE Device Connectivity" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Connectivity",
      },
    ],
  },
  {
    name: "Fcam",
    checks: [
      {
        code: "FCAM-001",
        title: "Mic/FCAM Stress Test (Mic 1, 2 and 3)",
        description:
          'Capture and evaluate "Mic/FCAM Stress Test (Mic 1, 2 and 3)" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "Mic/FCAM Stress Test (Mic 1, 2 and 3)" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Mic/FCAM Stress Test (Mic 1, 2 and 3)" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Mic/FCAM Stress Test (Mic 1, 2 and 3)" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-002",
        title: "FCAM Photo Stress Test",
        description:
          'Capture and evaluate "FCAM Photo Stress Test" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Photo Stress Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Photo Stress Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Photo Stress Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-003",
        title: "Portrait Mode",
        description:
          'Capture and evaluate "Portrait Mode" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "Portrait Mode" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Portrait Mode" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Portrait Mode" output versus the reference image.',
        testType: "visual",
        mandatory: true,
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-004",
        title: "FCAM Video Thermal Stress",
        description:
          'Capture and evaluate "FCAM Video Thermal Stress" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Video Thermal Stress" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Video Thermal Stress" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Video Thermal Stress" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-005",
        title: "FCAM Photo/Portrait Thermal Stress",
        description:
          'Capture and evaluate "FCAM Photo/Portrait Thermal Stress" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Photo/Portrait Thermal Stress" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Photo/Portrait Thermal Stress" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Photo/Portrait Thermal Stress" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-006",
        title: "FCAM Photo/Portrait Thermal Stress Low Light",
        description:
          'Capture and evaluate "FCAM Photo/Portrait Thermal Stress Low Light" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Photo/Portrait Thermal Stress Low Light" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Photo/Portrait Thermal Stress Low Light" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Photo/Portrait Thermal Stress Low Light" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-007",
        title: "Fcam Photo w/ HP",
        description:
          'Capture and evaluate "Fcam Photo w/ HP" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "Fcam Photo w/ HP" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Fcam Photo w/ HP" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Fcam Photo w/ HP" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-008",
        title: "Portrait w/ HP",
        description:
          'Capture and evaluate "Portrait w/ HP" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "Portrait w/ HP" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Portrait w/ HP" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Portrait w/ HP" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-009",
        title: "FCAM Video w/ HP",
        description:
          'Capture and evaluate "FCAM Video w/ HP" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Video w/ HP" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Video w/ HP" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Video w/ HP" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-010",
        title: "FCAM Photo w/ SP",
        description:
          'Capture and evaluate "FCAM Photo w/ SP" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Photo w/ SP" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Photo w/ SP" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Photo w/ SP" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-011",
        title: "FCAM Video w/ SP",
        description:
          'Capture and evaluate "FCAM Video w/ SP" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Video w/ SP" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Video w/ SP" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Video w/ SP" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-012",
        title: "Fcam Photo/Video Repeat with SP",
        description:
          'Capture and evaluate "Fcam Photo/Video Repeat with SP" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "Fcam Photo/Video Repeat with SP" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Fcam Photo/Video Repeat with SP" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Fcam Photo/Video Repeat with SP" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-013",
        title: "FCAM Photo Mode Normal Light",
        description:
          'Capture and evaluate "FCAM Photo Mode Normal Light" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Photo Mode Normal Light" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Photo Mode Normal Light" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Photo Mode Normal Light" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-014",
        title: "FCAM Monocular Portrait Test",
        description:
          'Capture and evaluate "FCAM Monocular Portrait Test" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Monocular Portrait Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Monocular Portrait Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Monocular Portrait Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-015",
        title: "FCAM Photo Mode Low Light",
        description:
          'Capture and evaluate "FCAM Photo Mode Low Light" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Photo Mode Low Light" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Photo Mode Low Light" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Photo Mode Low Light" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-016",
        title: "FCAM Portrait Mode Low Light",
        description:
          'Capture and evaluate "FCAM Portrait Mode Low Light" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Portrait Mode Low Light" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Portrait Mode Low Light" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Portrait Mode Low Light" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-017",
        title: "FCAM Night Mode Flash ON",
        description:
          'Capture and evaluate "FCAM Night Mode Flash ON" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Night Mode Flash ON" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Night Mode Flash ON" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Night Mode Flash ON" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-018",
        title: "FCAM Video Mode Normal Light #2",
        description:
          'Capture and evaluate "FCAM Video Mode Normal Light #2" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Video Mode Normal Light #2" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Video Mode Normal Light #2" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Video Mode Normal Light #2" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-019",
        title: "FCAM Pink Flare",
        description:
          'Capture and evaluate "FCAM Pink Flare" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Pink Flare" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Pink Flare" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Pink Flare" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-020",
        title: "FCAM Purple Flare",
        description:
          'Capture and evaluate "FCAM Purple Flare" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Purple Flare" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Purple Flare" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Purple Flare" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "FCAM-021",
        title: "FCAM Butterfly Flare",
        description:
          'Capture and evaluate "FCAM Butterfly Flare" against the qualified reference image/video set for the OJAS EQT Fcam programme.',
        instruction:
          'Run the "FCAM Butterfly Flare" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "FCAM Butterfly Flare" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "FCAM Butterfly Flare" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
    ],
  },
  {
    name: "Front Optical Sensing",
    checks: [
      {
        code: "FOS-001",
        title: "Jindo Coex",
        description:
          'Verify "Jindo Coex", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Jindo Coex" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Jindo Coex" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Jindo Coex" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-002",
        title: "Grimaldi Coex",
        description:
          'Verify "Grimaldi Coex", where applicable accessories/environment are available for this station.',
        instruction:
          'Execute the "Grimaldi Coex" procedure per the station SOP; mark N/A if the required accessory or condition is not available at this station.',
        expectedResult:
          'Unit passes "Grimaldi Coex" cleanly, or the check is marked N/A when the scenario does not apply.',
        acceptanceCriteria:
          'No functional fault observed during "Grimaldi Coex" when the scenario applies.',
        testType: "ternary",
        allowNA: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-003",
        title: "Prox Raise To",
        description:
          'Verify the unit correctly completes the "Prox Raise To" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Prox Raise To" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Prox Raise To" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Prox Raise To".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-004",
        title: "Delay on Active Phone Call",
        description:
          'Verify the unit correctly completes the "Delay on Active Phone Call" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Delay on Active Phone Call" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Delay on Active Phone Call" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Delay on Active Phone Call".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-005",
        title: "Voicemail Test",
        description:
          'Verify the unit correctly completes the "Voicemail Test" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Voicemail Test" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Voicemail Test" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Voicemail Test".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-006",
        title: "FaceID Enrollment",
        description:
          'Verify the unit correctly completes the "FaceID Enrollment" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "FaceID Enrollment" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "FaceID Enrollment" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "FaceID Enrollment".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-007",
        title: "FaceID Periocular",
        description:
          'Verify the unit correctly completes the "FaceID Periocular" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "FaceID Periocular" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "FaceID Periocular" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "FaceID Periocular".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-008",
        title: "Face Down Testing (New Camera Session Enablement)",
        description:
          'Verify the unit correctly completes the "Face Down Testing (New Camera Session Enablement)" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Face Down Testing (New Camera Session Enablement)" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Face Down Testing (New Camera Session Enablement)" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Face Down Testing (New Camera Session Enablement)".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-009",
        title: "Face Down - Hey Siri Mic Indicator Test",
        description:
          'Verify the unit correctly completes the "Face Down - Hey Siri Mic Indicator Test" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Face Down - Hey Siri Mic Indicator Test" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Face Down - Hey Siri Mic Indicator Test" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Face Down - Hey Siri Mic Indicator Test".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-010",
        title: "Secure Indicator Visibility: Scenario 1",
        description:
          'Verify the unit correctly completes the "Secure Indicator Visibility: Scenario 1" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Secure Indicator Visibility: Scenario 1" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Secure Indicator Visibility: Scenario 1" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Secure Indicator Visibility: Scenario 1".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "FOS-011",
        title: "Secure Indicator Visibility: Scenario 2",
        description:
          'Verify the unit correctly completes the "Secure Indicator Visibility: Scenario 2" scenario defined in the FATP EQT test plan for Front Optical Sensing.',
        instruction:
          'Execute the "Secure Indicator Visibility: Scenario 2" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Secure Indicator Visibility: Scenario 2" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Secure Indicator Visibility: Scenario 2".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
    ],
  },
  {
    name: "Rear Optical Sensing",
    checks: [
      {
        code: "ROS-001",
        title: "Peridot: Macro Mode",
        description:
          'Capture and evaluate "Peridot: Macro Mode" against the qualified reference image/video set for the OJAS EQT Rear Optical Sensing programme.',
        instruction:
          'Run the "Peridot: Macro Mode" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Peridot: Macro Mode" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Peridot: Macro Mode" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "ROS-002",
        title: "Peridot: Measure App",
        description:
          'Verify the unit correctly completes the "Peridot: Measure App" scenario defined in the FATP EQT test plan for Rear Optical Sensing.',
        instruction:
          'Execute the "Peridot: Measure App" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Peridot: Measure App" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Peridot: Measure App".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "ROS-003",
        title: "Strobe: Extended Duration Testing",
        description:
          'Capture and evaluate "Strobe: Extended Duration Testing" against the qualified reference image/video set for the OJAS EQT Rear Optical Sensing programme.',
        instruction:
          'Run the "Strobe: Extended Duration Testing" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Strobe: Extended Duration Testing" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Strobe: Extended Duration Testing" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "ROS-004",
        title: "Strobe: Torch Test",
        description:
          'Capture and evaluate "Strobe: Torch Test" against the qualified reference image/video set for the OJAS EQT Rear Optical Sensing programme.',
        instruction:
          'Run the "Strobe: Torch Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Strobe: Torch Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Strobe: Torch Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "ROS-005",
        title: "Strobe: Low and No Light Images",
        description:
          'Capture and evaluate "Strobe: Low and No Light Images" against the qualified reference image/video set for the OJAS EQT Rear Optical Sensing programme.',
        instruction:
          'Run the "Strobe: Low and No Light Images" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Strobe: Low and No Light Images" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Strobe: Low and No Light Images" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
    ],
  },
  {
    name: "Touch",
    checks: [
      {
        code: "TCH-001",
        title: "Multi Touch #1",
        description:
          'Verify the unit correctly completes the "Multi Touch #1" scenario defined in the FATP EQT test plan for Touch.',
        instruction:
          'Execute the "Multi Touch #1" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Multi Touch #1" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Multi Touch #1".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "TCH-002",
        title: "Multi Touch #2",
        description:
          'Verify the unit correctly completes the "Multi Touch #2" scenario defined in the FATP EQT test plan for Touch.',
        instruction:
          'Execute the "Multi Touch #2" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Multi Touch #2" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Multi Touch #2".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "TCH-003",
        title: "Touch #1",
        description:
          'Verify the unit correctly completes the "Touch #1" scenario defined in the FATP EQT test plan for Touch.',
        instruction:
          'Execute the "Touch #1" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Touch #1" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Touch #1".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Functional",
      },
      {
        code: "TCH-004",
        title: "Touch #2",
        description:
          'Verify the unit correctly completes the "Touch #2" scenario defined in the FATP EQT test plan for Touch.',
        instruction:
          'Execute the "Touch #2" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Touch #2" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Touch #2".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "TCH-005",
        title: "Touch around Vapor Chamber Stress Test",
        description:
          'Verify the unit correctly completes the "Touch around Vapor Chamber Stress Test" scenario defined in the FATP EQT test plan for Touch.',
        instruction:
          'Execute the "Touch around Vapor Chamber Stress Test" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Touch around Vapor Chamber Stress Test" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Touch around Vapor Chamber Stress Test".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
      {
        code: "TCH-006",
        title: "Smart Tap to Wake",
        description:
          'Verify the unit correctly completes the "Smart Tap to Wake" scenario defined in the FATP EQT test plan for Touch.',
        instruction:
          'Execute the "Smart Tap to Wake" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Smart Tap to Wake" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Smart Tap to Wake".',
        testType: "binary",
        defaultFailureCategory: "Functional",
      },
    ],
  },
  {
    name: "Display",
    checks: [
      {
        code: "DIS-001",
        title: "Display Patterns #1",
        description:
          'Capture and evaluate "Display Patterns #1" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Display Patterns #1" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Display Patterns #1" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Display Patterns #1" output versus the reference image.',
        testType: "visual",
        mandatory: true,
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-002",
        title: "Display Patterns #2",
        description:
          'Capture and evaluate "Display Patterns #2" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Display Patterns #2" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Display Patterns #2" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Display Patterns #2" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-003",
        title: "Night Shift",
        description:
          'Capture and evaluate "Night Shift" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Night Shift" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Night Shift" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Night Shift" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-004",
        title: "Birefringence Test",
        description:
          'Capture and evaluate "Birefringence Test" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Birefringence Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Birefringence Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Birefringence Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-005",
        title: "Display - Flicker & FFR",
        description:
          'Capture and evaluate "Display - Flicker & FFR" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Display - Flicker & FFR" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Display - Flicker & FFR" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Display - Flicker & FFR" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-006",
        title: "Display - PRC",
        description:
          'Capture and evaluate "Display - PRC" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Display - PRC" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Display - PRC" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Display - PRC" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-007",
        title: "Display - DBV",
        description:
          'Capture and evaluate "Display - DBV" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Display - DBV" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Display - DBV" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Display - DBV" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-008",
        title: "Low Brightness Ghosting Test",
        description:
          'Capture and evaluate "Low Brightness Ghosting Test" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Low Brightness Ghosting Test" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Low Brightness Ghosting Test" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Low Brightness Ghosting Test" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-009",
        title: "Display Flashing Transient",
        description:
          'Capture and evaluate "Display Flashing Transient" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Display Flashing Transient" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Display Flashing Transient" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Display Flashing Transient" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-010",
        title: "Aurora",
        description:
          'Capture and evaluate "Aurora" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Aurora" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Aurora" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Aurora" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
      {
        code: "DIS-011",
        title: "Always On Display",
        description:
          'Capture and evaluate "Always On Display" against the qualified reference image/video set for the OJAS EQT Display programme.',
        instruction:
          'Run the "Always On Display" capture sequence on the calibrated optical test rig and inspect every output frame for defects.',
        expectedResult:
          'Output for "Always On Display" matches the reference sample: correct exposure, colour and framing with no visible artefacts.',
        acceptanceCriteria:
          'No blur, banding, flare artefact, ghosting or colour cast in the "Always On Display" output versus the reference image.',
        testType: "visual",
        evidenceRequired: true,
        defaultFailureCategory: "Visual",
      },
    ],
  },
  {
    name: "SWDL",
    checks: [
      {
        code: "SWD-001",
        title: "SWDL",
        description:
          'Verify the unit correctly completes the "SWDL" scenario defined in the FATP EQT test plan for SWDL.',
        instruction:
          'Execute the "SWDL" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "SWDL" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria: 'No functional fault, error state or deviation observed during "SWDL".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Software",
      },
    ],
  },
  {
    name: "Check Out",
    checks: [
      {
        code: "OUT-001",
        title: "Check Out",
        description:
          'Verify the unit correctly completes the "Check Out" scenario defined in the FATP EQT test plan for Check Out.',
        instruction:
          'Execute the "Check Out" procedure per the station SOP and observe the outcome against the reference device.',
        expectedResult:
          'Unit completes "Check Out" without fault, error, dropout or unexpected behaviour.',
        acceptanceCriteria:
          'No functional fault, error state or deviation observed during "Check Out".',
        testType: "binary",
        mandatory: true,
        defaultFailureCategory: "Other",
      },
    ],
  },
];

function buildCategoriesAndChecks(): { categories: TemplateCategory[]; checks: TemplateCheck[] } {
  const categories: TemplateCategory[] = [];
  const checks: TemplateCheck[] = [];
  let sequence = 1;
  CATEGORY_SEEDS.forEach((cat, catIndex) => {
    const categoryId = `cat-${cat.name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    categories.push({
      id: categoryId,
      templateId: TEMPLATE_ID,
      name: cat.name,
      sequence: catIndex + 1,
    });
    for (const c of cat.checks) {
      checks.push({
        id: `chk-${c.code.toLowerCase()}`,
        templateId: TEMPLATE_ID,
        categoryId,
        sequence: sequence++,
        checkCode: c.code,
        title: c.title,
        description: c.description,
        instruction: c.instruction,
        expectedResult: c.expectedResult,
        acceptanceCriteria: c.acceptanceCriteria,
        testType: c.testType,
        mandatory: c.mandatory ?? false,
        allowNA: c.allowNA ?? false,
        evidenceRequired: c.evidenceRequired ?? false,
        measurementUnit: c.measurementUnit ?? null,
        measurementMin: c.measurementMin ?? null,
        measurementMax: c.measurementMax ?? null,
        defaultFailureCategory: c.defaultFailureCategory ?? null,
      });
    }
  });
  return { categories, checks };
}

const { categories: templateCategories, checks: templateChecks } = buildCategoriesAndChecks();

function checkId(code: string) {
  const found = templateChecks.find((c) => c.checkCode === code);
  if (!found) throw new Error(`Unknown seed check code: ${code}`);
  return found.id;
}

const pixel =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iIzE2MWExZiIvPjx0ZXh0IHg9IjE2MCIgeT0iOTUiIGZpbGw9IiNmZmIzMzMiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPmNhcHR1cmUucG5nPC90ZXh0Pjwvc3ZnPg==";

function evidenceItem(input: {
  id: string;
  executionId: string;
  templateCheckId: string;
  attempt: number;
  filename: string;
  capturedAt: string;
}): Evidence {
  return {
    ...input,
    mimeType: "image/svg+xml",
    size: 184320,
    dataUrl: pixel,
    capturedById: "u-priya",
  };
}

function results(executionId: string, entries: Partial<CheckResult>[]): CheckResult[] {
  return entries.map((e, i) => ({
    id: `${executionId}-cr${i + 1}`,
    executionId,
    templateCheckId: "",
    attempt: 1,
    status: "not_started",
    actualResult: "",
    measurementValue: null,
    failureCategory: null,
    failureSeverity: null,
    failureDescription: "",
    testerNotes: "",
    reviewerNotes: "",
    retestReason: null,
    testerId: "u-priya",
    completedAt: null,
    updatedAt: null,
    ...e,
  }));
}

const notifications: Notification[] = [
  {
    id: "n-1",
    userId: "u-priya",
    title: "Retest required",
    body: "Rajesh Kumar requested a retest on 1 check(s) for EX-1043 (OJAS-00453).",
    href: "/executions/exec-3",
    read: false,
    createdAt: iso(-20),
  },
  {
    id: "n-2",
    userId: "u-priya",
    title: "New unit assigned",
    body: "OJAS-00451 (OJAS EQT Functional Test Rev 3) is assigned to you at EQT-01.",
    href: "/my-tests",
    read: false,
    createdAt: iso(-72),
  },
  {
    id: "n-3",
    userId: "u-rajesh",
    title: "Execution submitted for verification",
    body: "EX-1044 (OJAS-00454) submitted by Priya Sharma.",
    href: "/reviews/exec-4",
    read: false,
    createdAt: iso(-7),
  },
];

export function createSeedState(): AppState {
  return {
    session: null,
    pendingLoginUserId: null,
    failureCategories: [
      "Functional",
      "Mechanical",
      "Electrical",
      "Software",
      "Visual",
      "Performance",
      "Connectivity",
      "Acoustic",
      "Safety",
      "Other",
    ],
    users: [
      {
        id: "u-priya",
        employeeId: "TE-1001",
        name: "Priya Sharma",
        email: "priya.sharma@pibythree.example",
        role: "tester",
        active: true,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-vikram",
        employeeId: "TE-1002",
        name: "Vikram Iyer",
        email: "vikram.iyer@pibythree.example",
        role: "tester",
        active: true,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-meera",
        employeeId: "TE-1003",
        name: "Meera Nair",
        email: "meera.nair@pibythree.example",
        role: "tester",
        active: false,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-rajesh",
        employeeId: "TE-2001",
        name: "Rajesh Kumar",
        email: "rajesh.kumar@pibythree.example",
        role: "quality_checker",
        active: true,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-anita",
        employeeId: "TE-3001",
        name: "Anita Desai",
        email: "anita.desai@pibythree.example",
        role: "manager",
        active: true,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-arjun",
        employeeId: "TE-4001",
        name: "Arjun Nair",
        email: "arjun.nair@pibythree.example",
        role: "senior_manager",
        active: true,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-kavya",
        employeeId: "TE-5001",
        name: "Kavya Menon",
        email: "kavya.menon@pibythree.example",
        role: "template_manager",
        active: true,
        plantIds: ["p-hosur"],
      },
      {
        id: "u-admin",
        employeeId: "TE-9001",
        name: "Admin User",
        email: "platform.admin@pibythree.example",
        role: "admin",
        active: true,
        plantIds: ["p-hosur"],
      },
    ],
    plants: [{ id: "p-hosur", code: "HOS", name: "Hosur" }],
    locations: [
      { id: "loc-eqt-line", plantId: "p-hosur", name: "Building A — EQT Line" },
      { id: "loc-lab", plantId: "p-hosur", name: "Building B — Acoustics & Camera Lab" },
    ],
    stations: [
      {
        id: "sta-eqt-01",
        plantId: "p-hosur",
        locationId: "loc-eqt-line",
        code: "EQT-01",
        name: "EQT Station 1",
        status: "active",
      },
      {
        id: "sta-eqt-02",
        plantId: "p-hosur",
        locationId: "loc-eqt-line",
        code: "EQT-02",
        name: "EQT Station 2",
        status: "active",
      },
      {
        id: "sta-eqt-03",
        plantId: "p-hosur",
        locationId: "loc-lab",
        code: "EQT-03",
        name: "EQT Station 3",
        status: "active",
      },
      {
        id: "sta-eqt-04",
        plantId: "p-hosur",
        locationId: "loc-lab",
        code: "EQT-04",
        name: "EQT Station 4",
        status: "maintenance",
      },
    ],
    devices: [
      {
        id: "dev-01",
        stationId: "sta-eqt-01",
        name: "TAB-EQT-01-01",
        status: "online",
        lastSeenAt: iso(-0.1),
        assignedTesterId: "u-priya",
      },
      {
        id: "dev-02",
        stationId: "sta-eqt-02",
        name: "TAB-EQT-02-01",
        status: "online",
        lastSeenAt: iso(-0.2),
        assignedTesterId: "u-priya",
      },
      {
        id: "dev-03",
        stationId: "sta-eqt-03",
        name: "TAB-EQT-03-01",
        status: "online",
        lastSeenAt: iso(-0.5),
        assignedTesterId: "u-vikram",
      },
      {
        id: "dev-04",
        stationId: "sta-eqt-04",
        name: "TAB-EQT-04-01",
        status: "offline",
        lastSeenAt: iso(-30),
        assignedTesterId: null,
      },
    ],
    templates: [
      {
        id: TEMPLATE_ID,
        familyCode: "OJAS-EQT",
        name: "OJAS EQT Functional Test",
        revision: 3,
        status: "published",
        createdById: "u-kavya",
        createdAt: iso(-400),
        updatedById: "u-kavya",
        updatedAt: iso(-350),
        approvedById: "u-kavya",
        publishedAt: iso(-350),
        totalChecks: templateChecks.length,
        mandatoryChecks: templateChecks.filter((c) => c.mandatory).length,
      },
    ],
    templateCategories,
    templateChecks,
    units: [
      { id: "unit-451", usn: "USN-OJAS-000451", familyCode: "OJAS-EQT", createdAt: iso(-100) },
      { id: "unit-452", usn: "USN-OJAS-000452", familyCode: "OJAS-EQT", createdAt: iso(-100) },
      { id: "unit-453", usn: "USN-OJAS-000453", familyCode: "OJAS-EQT", createdAt: iso(-100) },
      { id: "unit-454", usn: "USN-OJAS-000454", familyCode: "OJAS-EQT", createdAt: iso(-100) },
      { id: "unit-455", usn: "USN-OJAS-000455", familyCode: "OJAS-EQT", createdAt: iso(-160) },
      { id: "unit-456", usn: "USN-OJAS-000456", familyCode: "OJAS-EQT", createdAt: iso(-100) },
    ],
    assignments: [
      {
        id: "as-1",
        unitId: "unit-451",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-01",
        priority: "critical",
        dueAt: iso(48),
        assignedById: "u-anita",
        assignedAt: iso(-72),
      },
      {
        id: "as-2",
        unitId: "unit-452",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-01",
        priority: "critical",
        dueAt: iso(24),
        assignedById: "u-anita",
        assignedAt: iso(-96),
      },
      {
        id: "as-3",
        unitId: "unit-453",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-02",
        priority: "high",
        dueAt: iso(12),
        assignedById: "u-anita",
        assignedAt: iso(-120),
      },
      {
        id: "as-4",
        unitId: "unit-454",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-01",
        priority: "high",
        dueAt: iso(36),
        assignedById: "u-anita",
        assignedAt: iso(-30),
      },
      {
        id: "as-5",
        unitId: "unit-455",
        templateId: TEMPLATE_ID,
        testerId: "u-vikram",
        stationId: "sta-eqt-03",
        priority: "medium",
        dueAt: iso(60),
        assignedById: "u-anita",
        assignedAt: iso(-160),
      },
      {
        id: "as-6",
        unitId: "unit-456",
        templateId: TEMPLATE_ID,
        testerId: "u-vikram",
        stationId: "sta-eqt-04",
        priority: "medium",
        dueAt: iso(72),
        assignedById: "u-anita",
        assignedAt: iso(-14),
      },
    ],
    executions: [
      {
        id: "exec-1",
        code: "EX-1041",
        assignmentId: "as-1",
        unitId: "unit-451",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-01",
        status: ExecutionStatus.ASSIGNED,
        locationVerifiedAt: null,
        stationVerifiedAt: null,
        startedAt: null,
        submittedAt: null,
        completedAt: null,
        updatedAt: iso(-72),
        summary: "",
        round: 1,
      },
      {
        id: "exec-2",
        code: "EX-1042",
        assignmentId: "as-2",
        unitId: "unit-452",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-01",
        status: ExecutionStatus.IN_PROGRESS,
        locationVerifiedAt: iso(-26),
        stationVerifiedAt: iso(-26),
        startedAt: iso(-26),
        submittedAt: null,
        completedAt: null,
        updatedAt: iso(-20),
        summary: "",
        round: 1,
      },
      {
        id: "exec-3",
        code: "EX-1043",
        assignmentId: "as-3",
        unitId: "unit-453",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-02",
        status: ExecutionStatus.RETEST_REQUIRED,
        locationVerifiedAt: iso(-60),
        stationVerifiedAt: iso(-60),
        startedAt: iso(-60),
        submittedAt: iso(-46),
        completedAt: null,
        updatedAt: iso(-20),
        summary: "Speaker output measured outside the acceptance range on first pass.",
        round: 1,
      },
      {
        id: "exec-4",
        code: "EX-1044",
        assignmentId: "as-4",
        unitId: "unit-454",
        templateId: TEMPLATE_ID,
        testerId: "u-priya",
        stationId: "sta-eqt-01",
        status: ExecutionStatus.PENDING_REVIEW,
        locationVerifiedAt: iso(-12),
        stationVerifiedAt: iso(-12),
        startedAt: iso(-12),
        submittedAt: iso(-7),
        completedAt: null,
        updatedAt: iso(-7),
        summary: "Flash test marginal under low light; documented with evidence.",
        round: 1,
      },
      {
        id: "exec-5",
        code: "EX-1045",
        assignmentId: "as-5",
        unitId: "unit-455",
        templateId: TEMPLATE_ID,
        testerId: "u-vikram",
        stationId: "sta-eqt-03",
        status: ExecutionStatus.COMPLETED,
        locationVerifiedAt: iso(-160),
        stationVerifiedAt: iso(-160),
        startedAt: iso(-160),
        submittedAt: iso(-150),
        completedAt: iso(-140),
        updatedAt: iso(-140),
        summary: "All checks passed on OJAS-00455.",
        round: 1,
      },
      {
        id: "exec-6",
        code: "EX-1046",
        assignmentId: "as-6",
        unitId: "unit-456",
        templateId: TEMPLATE_ID,
        testerId: "u-vikram",
        stationId: "sta-eqt-04",
        status: ExecutionStatus.REJECTED,
        locationVerifiedAt: iso(-10),
        stationVerifiedAt: iso(-10),
        startedAt: iso(-10),
        submittedAt: iso(-9),
        completedAt: null,
        updatedAt: iso(-8),
        summary: "Multiple mandatory checks incomplete on submission.",
        round: 1,
      },
    ],
    checkResults: [
      ...results("exec-2", [
        {
          templateCheckId: checkId("CHK-001"),
          status: "passed",
          actualResult: "No visible transport damage.",
          completedAt: iso(-25),
          updatedAt: iso(-25),
        },
        {
          templateCheckId: checkId("SHP-001"),
          status: "passed",
          actualResult: "Shipping settings match the assignment record.",
          completedAt: iso(-25),
          updatedAt: iso(-25),
        },
        { templateCheckId: checkId("ACT-001"), status: "in_progress", updatedAt: iso(-20) },
      ]),
      ...results("exec-3", [
        {
          templateCheckId: checkId("CHK-001"),
          status: "passed",
          actualResult: "No visible transport damage.",
          completedAt: iso(-59),
          updatedAt: iso(-59),
        },
        {
          templateCheckId: checkId("SHP-001"),
          status: "passed",
          actualResult: "Seals intact, no damage.",
          completedAt: iso(-59),
          updatedAt: iso(-59),
        },
        {
          templateCheckId: checkId("ACT-001"),
          status: "passed",
          actualResult: "Boot logo at 1.8 s; activation status ACTIVATED at 64 s.",
          completedAt: iso(-58),
          updatedAt: iso(-58),
        },
        {
          templateCheckId: checkId("ACO-001"),
          status: "passed",
          actualResult: "RCAM + Mic 2/3 stress scenario completed cleanly.",
          completedAt: iso(-57),
          updatedAt: iso(-57),
        },
        // ACO-002 attempt 1: failed measurement, out of range — retained forever as history.
        {
          id: "exec-3-cr-aco002-1",
          templateCheckId: checkId("ACO-002"),
          attempt: 1,
          status: "failed",
          measurementValue: 94.2,
          failureCategory: "Acoustic",
          failureSeverity: "medium" as FailureSeverity,
          failureDescription: "Peak output measured at 94.2 dB, above the 90 dB acceptance limit.",
          testerNotes: "Repeated twice with the same result on the calibrated SPL meter.",
          completedAt: iso(-50),
          updatedAt: iso(-50),
        },
        // ACO-002 attempt 2: created by requestRetest, awaiting the tester.
        {
          id: "exec-3-cr-aco002-2",
          templateCheckId: checkId("ACO-002"),
          attempt: 2,
          status: "retest_required",
          reviewerNotes:
            "Re-measure with the reference SPL meter and confirm calibration certificate is current.",
          retestReason:
            "Re-measure with the reference SPL meter and confirm calibration certificate is current.",
          updatedAt: iso(-20),
        },
        {
          templateCheckId: checkId("BAT-001"),
          status: "passed",
          actualResult: "Charging indicator active at 2.6 s.",
          completedAt: iso(-56),
          updatedAt: iso(-56),
        },
        {
          templateCheckId: checkId("BAT-003"),
          status: "passed",
          measurementValue: 118,
          actualResult: "118 min measured.",
          completedAt: iso(-56),
          updatedAt: iso(-56),
        },
        {
          templateCheckId: checkId("BTN-001"),
          status: "passed",
          actualResult: "No squeeze-induced faults observed in case.",
          completedAt: iso(-55),
          updatedAt: iso(-55),
        },
        {
          templateCheckId: checkId("CAM-001"),
          status: "passed",
          actualResult: "Mechanical stress plan completed without fault.",
          completedAt: iso(-55),
          updatedAt: iso(-55),
        },
        {
          templateCheckId: checkId("WIFI-001"),
          status: "passed",
          actualResult: "Associated and paired within spec.",
          completedAt: iso(-54),
          updatedAt: iso(-54),
        },
        {
          templateCheckId: checkId("FCAM-003"),
          status: "passed",
          actualResult: "Portrait capture matches reference sample.",
          completedAt: iso(-54),
          updatedAt: iso(-54),
        },
        {
          templateCheckId: checkId("FOS-006"),
          status: "passed",
          actualResult: "FaceID enrollment completed successfully.",
          completedAt: iso(-53),
          updatedAt: iso(-53),
        },
        {
          templateCheckId: checkId("ROS-002"),
          status: "passed",
          actualResult: "Measure app reported accurate readings.",
          completedAt: iso(-53),
          updatedAt: iso(-53),
        },
        {
          templateCheckId: checkId("TCH-003"),
          status: "passed",
          actualResult: "Touch response accurate across the panel.",
          completedAt: iso(-52),
          updatedAt: iso(-52),
        },
        {
          templateCheckId: checkId("DIS-001"),
          status: "passed",
          actualResult: "Display pattern capture matches reference.",
          completedAt: iso(-52),
          updatedAt: iso(-52),
        },
        {
          templateCheckId: checkId("SWD-001"),
          status: "passed",
          actualResult: "Software download completed and verified.",
          completedAt: iso(-51),
          updatedAt: iso(-51),
        },
        {
          templateCheckId: checkId("OUT-001"),
          status: "passed",
          actualResult: "Check-out completed; unit ready for release.",
          completedAt: iso(-46),
          updatedAt: iso(-46),
        },
      ]),
      ...results("exec-4", [
        {
          templateCheckId: checkId("CHK-001"),
          status: "passed",
          actualResult: "No visible transport damage.",
          completedAt: iso(-11),
          updatedAt: iso(-11),
        },
        {
          templateCheckId: checkId("SHP-001"),
          status: "passed",
          actualResult: "Seals intact, no damage.",
          completedAt: iso(-11),
          updatedAt: iso(-11),
        },
        {
          templateCheckId: checkId("ACT-001"),
          status: "passed",
          actualResult: "Boot logo at 2.4 s; activation status ACTIVATED at 71 s.",
          completedAt: iso(-11),
          updatedAt: iso(-11),
        },
        {
          templateCheckId: checkId("ACO-001"),
          status: "passed",
          actualResult: "RCAM + Mic 2/3 stress scenario completed cleanly.",
          completedAt: iso(-10),
          updatedAt: iso(-10),
        },
        {
          templateCheckId: checkId("ACO-002"),
          status: "passed",
          measurementValue: 78.4,
          actualResult: "78.4 dB measured.",
          completedAt: iso(-10),
          updatedAt: iso(-10),
        },
        {
          templateCheckId: checkId("BAT-001"),
          status: "passed",
          actualResult: "Charging indicator active at 3 s.",
          completedAt: iso(-9),
          updatedAt: iso(-9),
        },
        {
          templateCheckId: checkId("BAT-003"),
          status: "passed",
          measurementValue: 112,
          actualResult: "112 min measured.",
          completedAt: iso(-9),
          updatedAt: iso(-9),
        },
        {
          templateCheckId: checkId("BTN-001"),
          status: "passed",
          actualResult: "No squeeze-induced faults observed in case.",
          completedAt: iso(-9),
          updatedAt: iso(-9),
        },
        {
          templateCheckId: checkId("CAM-001"),
          status: "passed",
          actualResult: "Mechanical stress plan completed without fault.",
          completedAt: iso(-9),
          updatedAt: iso(-9),
        },
        {
          templateCheckId: checkId("CAM-004"),
          status: "failed",
          actualResult: "Minor moisture ingress observed after the environmental stress cycle.",
          failureCategory: "Mechanical",
          failureSeverity: "low" as FailureSeverity,
          failureDescription:
            "Trace moisture ingress detected at the USB-C port seal after the ingress stress cycle.",
          testerNotes: "Retested twice with the same result; seal may need rework.",
          completedAt: iso(-8),
          updatedAt: iso(-8),
        },
        {
          templateCheckId: checkId("WIFI-001"),
          status: "passed",
          actualResult: "Associated and paired within spec.",
          completedAt: iso(-8),
          updatedAt: iso(-8),
        },
        {
          templateCheckId: checkId("FCAM-003"),
          status: "passed",
          actualResult: "Portrait capture matches reference sample.",
          completedAt: iso(-8),
          updatedAt: iso(-8),
        },
        {
          templateCheckId: checkId("FOS-006"),
          status: "passed",
          actualResult: "FaceID enrollment completed successfully.",
          completedAt: iso(-7),
          updatedAt: iso(-7),
        },
        {
          templateCheckId: checkId("ROS-002"),
          status: "passed",
          actualResult: "Measure app reported accurate readings.",
          completedAt: iso(-7),
          updatedAt: iso(-7),
        },
        {
          templateCheckId: checkId("TCH-003"),
          status: "passed",
          actualResult: "Touch response accurate across the panel.",
          completedAt: iso(-7),
          updatedAt: iso(-7),
        },
        {
          templateCheckId: checkId("DIS-001"),
          status: "passed",
          actualResult: "Display pattern capture matches reference.",
          completedAt: iso(-7),
          updatedAt: iso(-7),
        },
        {
          templateCheckId: checkId("SWD-001"),
          status: "passed",
          actualResult: "Software download completed and verified.",
          completedAt: iso(-7),
          updatedAt: iso(-7),
        },
        {
          templateCheckId: checkId("OUT-001"),
          status: "passed",
          actualResult: "Check-out completed; unit ready for release.",
          completedAt: iso(-7),
          updatedAt: iso(-7),
        },
      ]),
      ...results(
        "exec-5",
        templateChecks.map((c) => ({
          templateCheckId: c.id,
          status: "passed" as const,
          actualResult: "Within specification.",
          measurementValue:
            c.testType === "measurement"
              ? ((c.measurementMin ?? 0) + (c.measurementMax ?? 0)) / 2
              : null,
          testerId: "u-vikram",
          completedAt: iso(-150),
          updatedAt: iso(-150),
        })),
      ),
      ...results("exec-6", [
        {
          templateCheckId: checkId("CHK-001"),
          status: "passed",
          actualResult: "No visible transport damage.",
          testerId: "u-vikram",
          completedAt: iso(-9),
          updatedAt: iso(-9),
        },
      ]),
    ],
    evidence: [
      evidenceItem({
        id: "ev-1",
        executionId: "exec-3",
        templateCheckId: checkId("ACO-002"),
        attempt: 1,
        filename: "spl-meter-reading.png",
        capturedAt: iso(-50),
      }),
      evidenceItem({
        id: "ev-2",
        executionId: "exec-4",
        templateCheckId: checkId("CAM-004"),
        attempt: 1,
        filename: "ingress-inspection.png",
        capturedAt: iso(-8),
      }),
      evidenceItem({
        id: "ev-3",
        executionId: "exec-4",
        templateCheckId: checkId("FCAM-003"),
        attempt: 1,
        filename: "portrait-mode-capture.png",
        capturedAt: iso(-8),
      }),
      evidenceItem({
        id: "ev-4",
        executionId: "exec-4",
        templateCheckId: checkId("CHK-001"),
        attempt: 1,
        filename: "unit-receipt.png",
        capturedAt: iso(-11),
      }),
      evidenceItem({
        id: "ev-5",
        executionId: "exec-4",
        templateCheckId: checkId("SHP-001"),
        attempt: 1,
        filename: "packaging-seals.png",
        capturedAt: iso(-11),
      }),
      evidenceItem({
        id: "ev-6",
        executionId: "exec-4",
        templateCheckId: checkId("DIS-001"),
        attempt: 1,
        filename: "display-pattern-capture.png",
        capturedAt: iso(-7),
      }),
    ],
    reviews: [
      {
        id: "rv-1",
        executionId: "exec-3",
        reviewerId: "u-rajesh",
        decision: "retest_requested",
        comment:
          "Acoustic output exceeds the acceptance range. Re-measure with the reference SPL meter and confirm calibration certificate is current.",
        affectedCheckIds: [checkId("ACO-002")],
        createdAt: iso(-20),
        round: 1,
      },
      {
        id: "rv-2",
        executionId: "exec-5",
        reviewerId: "u-rajesh",
        decision: "approved",
        comment: "All checks passed with adequate evidence. Approved for release sign-off.",
        affectedCheckIds: [],
        createdAt: iso(-140),
        round: 1,
      },
      {
        id: "rv-3",
        executionId: "exec-6",
        reviewerId: "u-rajesh",
        decision: "rejected",
        comment:
          "Only 1 of 17 mandatory checks recorded; unit was submitted prematurely. Re-run from Check-in.",
        affectedCheckIds: [],
        createdAt: iso(-8),
        round: 1,
      },
    ],
    notifications,
    audit: [
      {
        id: "au-1",
        actorId: "u-anita",
        action: "assignment.created",
        entity: "Assignment",
        entityId: "as-1",
        createdAt: iso(-72),
        metadata: { unit: "USN-OJAS-000451", tester: "Priya Sharma" },
      },
      {
        id: "au-2",
        actorId: "u-priya",
        action: "execution.submitted",
        entity: "Execution",
        entityId: "exec-3",
        createdAt: iso(-46),
        metadata: { code: "EX-1043" },
      },
      {
        id: "au-3",
        actorId: "u-rajesh",
        action: "review.retest_requested",
        entity: "Execution",
        entityId: "exec-3",
        createdAt: iso(-20),
        metadata: { code: "EX-1043", checks: 1 },
      },
      {
        id: "au-4",
        actorId: "u-priya",
        action: "execution.submitted",
        entity: "Execution",
        entityId: "exec-4",
        createdAt: iso(-7),
        metadata: { code: "EX-1044" },
      },
      {
        id: "au-5",
        actorId: "u-rajesh",
        action: "review.approved",
        entity: "Execution",
        entityId: "exec-5",
        createdAt: iso(-140),
        metadata: { code: "EX-1045" },
      },
      {
        id: "au-6",
        actorId: "u-rajesh",
        action: "review.rejected",
        entity: "Execution",
        entityId: "exec-6",
        createdAt: iso(-8),
        metadata: { code: "EX-1046" },
      },
      {
        id: "au-7",
        actorId: "u-kavya",
        action: "template.published",
        entity: "Template",
        entityId: TEMPLATE_ID,
        createdAt: iso(-350),
        metadata: { familyCode: "OJAS-EQT", revision: 3 },
      },
    ],
  };
}
