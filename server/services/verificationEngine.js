/**
 * Outcome Verification & Consistency Engine
 * Computes deterministic confidence score and detects cross-field discrepancies.
 */

const OutcomeVerification = require('../models/OutcomeVerification');
const OutcomeEvidence = require('../models/OutcomeEvidence');

/**
 * Compute the Confidence Score from verification signals and discrepancy penalties
 * @param {Object} params
 * @returns {Object} { confidenceScore, signals, discrepancies, status, level }
 */
const computeVerificationConfidence = ({
  hasTraineeDeclaration = true,
  hasProviderConfirmation = false,
  hasEmployerConfirmation = false,
  hasDocumentaryEvidence = false,
  evidenceItems = [],
  traineeData = {},
  employerData = {},
}) => {
  let traineeScore = hasTraineeDeclaration ? 20 : 0;
  let providerScore = hasProviderConfirmation ? 20 : 0;
  let employerScore = hasEmployerConfirmation ? 30 : 0;

  // Documentary Evidence contribution: up to 20 points
  let docScore = 0;
  if (hasDocumentaryEvidence || (evidenceItems && evidenceItems.length > 0)) {
    const validEvidenceCount = evidenceItems.filter((e) =>
      ['APPOINTMENT_LETTER', 'SALARY_SLIP', 'BANK_STATEMENT_CREDIT', 'AUTHORIZED_EXTERNAL_PORTAL'].includes(e.evidenceType)
    ).length;
    docScore = Math.min(20, Math.max(10, validEvidenceCount * 10));
  }

  // Field Consistency Matching (+10 points if role, status, joining date match)
  let consistencyScore = 0;
  const discrepancies = [];
  let discrepancyPenalties = 0;

  if (hasEmployerConfirmation && employerData) {
    // 1. Employee Recognition Check
    if (employerData.isEmployeeRecognized === false) {
      discrepancies.push({
        field: 'unrecognizedEmployee',
        traineeReportedValue: traineeData.employerName || 'Reported Employer',
        employerReportedValue: 'NOT_RECOGNIZED',
        severity: 'CRITICAL',
        description: 'Employer official states candidate is not on payroll or recognized records.',
        penaltyDeduction: 60,
      });
      discrepancyPenalties += 60;
    } else {
      consistencyScore += 4;
    }

    // 2. Role Consistency
    if (traineeData.jobRole && employerData.employerReportedRole) {
      const tRole = traineeData.jobRole.toLowerCase().trim();
      const eRole = employerData.employerReportedRole.toLowerCase().trim();
      if (tRole === eRole || tRole.includes(eRole) || eRole.includes(tRole)) {
        consistencyScore += 3;
      } else {
        discrepancies.push({
          field: 'jobRole',
          traineeReportedValue: traineeData.jobRole,
          employerReportedValue: employerData.employerReportedRole,
          severity: 'MEDIUM',
          description: `Role mismatch: Trainee reported "${traineeData.jobRole}", Employer reported "${employerData.employerReportedRole}".`,
          penaltyDeduction: 15,
        });
        discrepancyPenalties += 15;
      }
    } else if (employerData.roleConfirmed) {
      consistencyScore += 3;
    }

    // 3. Joining Date Consistency
    if (traineeData.joiningDate && employerData.employerReportedJoiningDate) {
      const tDate = new Date(traineeData.joiningDate).getTime();
      const eDate = new Date(employerData.employerReportedJoiningDate).getTime();
      const diffDays = Math.abs(tDate - eDate) / (1000 * 60 * 60 * 24);
      if (diffDays <= 30) {
        consistencyScore += 3;
      } else {
        discrepancies.push({
          field: 'joiningDate',
          traineeReportedValue: new Date(traineeData.joiningDate).toISOString().split('T')[0],
          employerReportedValue: new Date(employerData.employerReportedJoiningDate).toISOString().split('T')[0],
          severity: diffDays > 90 ? 'HIGH' : 'LOW',
          description: `Joining date discrepancy: ${Math.round(diffDays)} days difference.`,
          penaltyDeduction: diffDays > 90 ? 20 : 10,
        });
        discrepancyPenalties += diffDays > 90 ? 20 : 10;
      }
    } else if (employerData.joiningDateConfirmed) {
      consistencyScore += 3;
    }

    // 4. Wage Consistency
    if (traineeData.monthlySalary) {
      const tSalary = Number(traineeData.monthlySalary);
      if (employerData.employerReportedSalary) {
        const eSalary = Number(employerData.employerReportedSalary);
        const salaryDiff = Math.abs(tSalary - eSalary);
        const diffPercent = eSalary > 0 ? (salaryDiff / eSalary) * 100 : 0;
        if (diffPercent > 15) {
          discrepancies.push({
            field: 'salary',
            traineeReportedValue: `₹${tSalary.toLocaleString()}`,
            employerReportedValue: `₹${eSalary.toLocaleString()}`,
            severity: 'HIGH',
            description: `Salary mismatch: Trainee reported ₹${tSalary.toLocaleString()}, Employer reported ₹${eSalary.toLocaleString()} (${Math.round(diffPercent)}% discrepancy, exceeds 15% audit threshold).`,
            penaltyDeduction: 25,
          });
          discrepancyPenalties += 25;
        } else {
          consistencyScore += 4;
        }
      } else if (employerData.employerWageBandReported) {
        const band = employerData.employerWageBandReported; // e.g. '₹20,000–₹25,000'
        const match = band.match(/₹?([\d,]+)[^\d]+₹?([\d,]+)/);
        if (match) {
          const min = parseInt(match[1].replace(/,/g, ''), 10);
          const max = parseInt(match[2].replace(/,/g, ''), 10);
          if (tSalary < min * 0.85 || tSalary > max * 1.25) {
            discrepancies.push({
              field: 'salary',
              traineeReportedValue: `₹${tSalary.toLocaleString()}`,
              employerReportedValue: band,
              severity: 'HIGH',
              description: `Salary mismatch: Trainee reported ₹${tSalary.toLocaleString()}, which diverges by >15% from confirmed band ${band}.`,
              penaltyDeduction: 25,
            });
            discrepancyPenalties += 25;
          } else {
            consistencyScore += 4;
          }
        }
      }
    }
  }

  // Raw sum
  const rawSum = traineeScore + providerScore + employerScore + docScore + consistencyScore;
  const finalScore = Math.min(100, Math.max(0, rawSum - discrepancyPenalties));

  // Determine Verification Level
  let verificationLevel = 'LEVEL_1_SELF_REPORTED';
  if (docScore >= 15) {
    verificationLevel = 'LEVEL_4_DOCUMENTARY_EVIDENCE';
  } else if (hasEmployerConfirmation && (!discrepancies.some((d) => d.severity === 'CRITICAL'))) {
    verificationLevel = 'LEVEL_3_EMPLOYER_CONFIRMED';
  } else if (hasProviderConfirmation) {
    verificationLevel = 'LEVEL_2_PROVIDER_CONFIRMED';
  }

  // Determine Verification Status
  let status = 'PENDING_REVIEW';
  if (discrepancies.length > 0 && discrepancies.some((d) => d.severity === 'CRITICAL' || d.severity === 'HIGH')) {
    status = 'DISCREPANCY_FLAGGED';
  } else if (finalScore >= 75) {
    status = 'VERIFIED';
  } else if (finalScore >= 40) {
    status = 'PARTIALLY_VERIFIED';
  }

  return {
    confidenceScore: finalScore,
    verificationLevel,
    status,
    signals: {
      traineeSelfReport: traineeScore,
      providerConfirmed: providerScore,
      employerConfirmed: employerScore,
      documentaryEvidence: docScore,
      fieldConsistency: consistencyScore,
      discrepancyDeductions: discrepancyPenalties,
    },
    discrepancies,
  };
};

module.exports = {
  computeVerificationConfidence,
};
