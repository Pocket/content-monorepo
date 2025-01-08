export const infraConfig = {
  pagerduty: {
    // these policy id values come directly from pagerduty.
    // these ids should not change unless new policies are created in pagerduty,
    // at which point we would need to update these values.
    escalationPolicyIdCritical: 'PQ2EUPZ',
    escalationPolicyIdNonCritical: 'PXOQVEP',
  },
};
