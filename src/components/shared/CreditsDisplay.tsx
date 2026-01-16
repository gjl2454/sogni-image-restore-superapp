import React, { useState } from 'react';
import { formatCredits, getCreditStatusColor, CREDIT_COSTS } from '../../services/creditsService';
import './CreditsDisplay.css';

interface CreditsDisplayProps {
  /** Current credit balance */
  balance: number;
  /** Estimated cost for current operation */
  estimatedCost?: number;
  /** Number of images being restored */
  numberOfImages?: number;
  /** Token type (e.g., 'sogni', 'spark') */
  tokenType?: string;
  /** Show detailed breakdown */
  showDetails?: boolean;
}

/**
 * CreditsDisplay - Shows current credit balance and estimated costs
 * Compact design that fits in the navigation bar
 */
const CreditsDisplay: React.FC<CreditsDisplayProps> = ({
  balance,
  estimatedCost = 0,
  numberOfImages = 0,
  tokenType = 'credits',
  showDetails = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const statusColor = getCreditStatusColor(balance, estimatedCost);
  const remaining = balance - estimatedCost;
  const baseCostPerImage = CREDIT_COSTS.RESTORATION_PER_IMAGE;
  const hasEstimate = estimatedCost > 0 && numberOfImages > 0;

  return (
    <div 
      className="credits-display"
      onMouseEnter={() => hasEstimate && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`credits-balance credits-status-${statusColor}`}>
        <span className="credits-label">Credits</span>
        <span className="credits-value">{formatCredits(balance)}</span>
      </div>
      
      {hasEstimate && (
        <>
          <div className="credits-separator"></div>
          <div className="credits-estimate-compact">
            <span className="credits-estimate-label">Est.</span>
            <span className={`credits-estimate-value ${remaining < 0 ? 'credits-insufficient' : ''}`}>
              {formatCredits(estimatedCost, true)}
            </span>
          </div>
          
          {showTooltip && (
            <div className="credits-tooltip">
              <div className="credits-tooltip-content">
                <div className="credits-tooltip-row">
                  <span>Total cost:</span>
                  <span className="credits-tooltip-value">{formatCredits(estimatedCost, true)} credits</span>
                </div>
                <div className="credits-tooltip-row">
                  <span>Per image:</span>
                  <span className="credits-tooltip-value">{formatCredits(baseCostPerImage, true)} credits</span>
                </div>
                <div className="credits-tooltip-row">
                  <span>Images:</span>
                  <span className="credits-tooltip-value">{numberOfImages}</span>
                </div>
                {remaining >= 0 && (
                  <div className="credits-tooltip-row credits-tooltip-remaining">
                    <span>Remaining:</span>
                    <span className="credits-tooltip-value">{formatCredits(remaining, true)} credits</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CreditsDisplay;
