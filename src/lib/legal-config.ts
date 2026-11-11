export function getLegalConfig() {
  const operatorName = process.env.BUSINESS_LEGAL_NAME?.trim() ?? "";
  const contactAddress = process.env.BUSINESS_CONTACT_ADDRESS?.trim() ?? "";
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() ?? "";
  const supportPhone = process.env.SUPPORT_PHONE?.trim() ?? "";
  const effectiveDate = process.env.POLICY_EFFECTIVE_DATE?.trim() ?? "";

  return {
    operatorName: operatorName || "Pengelola ASNPedia",
    contactAddress,
    supportEmail,
    supportPhone,
    effectiveDate,
    isComplete: Boolean(operatorName && contactAddress && supportEmail && supportPhone && effectiveDate),
  };
}
