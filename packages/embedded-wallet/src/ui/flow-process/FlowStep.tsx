import React from "react";
import { Icon, Icons } from "../icon/Icon";
import { Spinner } from "../spinner/Spinner";
import css from "./FlowStep.module.css";

export type FlowStepProps = {
  title: string;
  status: FlowStepStatus;
};

export enum FlowStepStatus {
  Pending = "pending",
  InProgress = "inProgress",
  Done = "done"
}

export type IconOrSpinner = Icons | "spinner";

const FlowStepStatusIcons: { [key in FlowStepStatus]: IconOrSpinner } = {
  [FlowStepStatus.Pending]: Icons.Hourglass,
  [FlowStepStatus.InProgress]: "spinner",
  [FlowStepStatus.Done]: Icons.Check
};

const FlowStep: React.FC<FlowStepProps> = ({ title, status = FlowStepStatus.Pending }) => {
  const icon = FlowStepStatusIcons[status];

  return (
    <li className={`${css.step} ${status === FlowStepStatus.InProgress ? css[status] : ""}`}>
      <span className={css.stepStatus}>{icon !== "spinner" ? <Icon name={icon} /> : <Spinner />}</span>
      <label className={css.stepTitle}>{title}</label>
    </li>
  );
};

export { FlowStep };
