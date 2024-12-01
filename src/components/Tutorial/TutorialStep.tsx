import React from 'react';

interface TutorialStepProps {
  step: {
    id: number;
    title: string;
    description: string;
    action: string;
  };
  total: number;
  onSkip: () => void;
}

export const TutorialStep: React.FC<TutorialStepProps> = ({ step, total, onSkip }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-cyan-400">{step.title}</h3>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Skip Tutorial
        </button>
      </div>
      <p className="text-gray-300">{step.description}</p>
      <div className="flex justify-between items-center mt-2">
        <span className="text-cyan-400">{step.action}</span>
        <span className="text-sm text-gray-400">Step {step.id} of {total}</span>
      </div>
    </div>
  );
}; 