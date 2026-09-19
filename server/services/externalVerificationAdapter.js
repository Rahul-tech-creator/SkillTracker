/**
 * External Integration Gateway Adapter
 * Provides interface for government / EPFO / employer portal external queries.
 * Enforces truthful state: When real external integration credentials/gateways are unavailable,
 * returns PENDING_EXTERNAL_INTEGRATION instead of fabricating checks.
 */

const checkExternalPortal = async ({ identityToken, uan, employerRegistrationNumber } = {}) => {
  return {
    status: 'PENDING_EXTERNAL_INTEGRATION',
    isAvailable: false,
    externalSource: 'EPFO_NSDC_INTEGRATION_GATEWAY',
    checkedAt: new Date(),
    message:
      'Direct external government / employer database integration is pending authorized production API gateway credentials. Local multi-source verification (Trainee self-report, Provider attestation, Employer cross-check, Documentary evidence) is active and authoritative.',
  };
};

module.exports = {
  checkExternalPortal,
};
