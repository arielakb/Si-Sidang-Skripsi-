export type WorkflowStepStatus = "done" | "active" | "pending" | "danger";

export type WorkflowStep = {
  key: string;
  label: string;
  description?: string;
  status: WorkflowStepStatus;
};

type WorkflowStepperProps = {
  steps: WorkflowStep[];
};

function getStepSymbol(status: WorkflowStepStatus) {
  if (status === "done") return "✓";
  if (status === "active") return "●";
  if (status === "danger") return "!";
  return "";
}

export default function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <div className="workflow-stepper">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={`workflow-step workflow-step-${step.status}`}
        >
          <div className="workflow-step-index">
            {getStepSymbol(step.status) || index + 1}
          </div>

          <div>
            <strong>{step.label}</strong>
            {step.description ? <span>{step.description}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}