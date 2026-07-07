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
  if (status === "done") return "check";
  if (status === "active") return "radio_button_checked";
  if (status === "danger") return "error";
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
          <div className="workflow-step-icon">
            {getStepSymbol(step.status) ? (
              <span className="material-symbols-outlined">
                {getStepSymbol(step.status)}
              </span>
            ) : (
              <span>{index + 1}</span>
            )}
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