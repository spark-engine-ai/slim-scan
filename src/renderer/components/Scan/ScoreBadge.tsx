import React from 'react';

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const rounded = Math.round(score);

  return (
    <span className={`badge badge-${getScoreColor(score)}`}>
      {rounded}
    </span>
  );
}