import { SAML, SamlConfig } from "@node-saml/node-saml";

let samlInstance: SAML | null = null;

export const getSaml = (): SAML => {
  if (samlInstance) return samlInstance;

  if (!process.env.SAML_ENTRY_POINT)
    throw new Error("Missing SAML_ENTRY_POINT");
  if (!process.env.SAML_ISSUER) throw new Error("Missing SAML_ISSUER");
  if (!process.env.SAML_CALLBACK_URL)
    throw new Error("Missing SAML_CALLBACK_URL");
  if (!process.env.SAML_CERT) throw new Error("Missing SAML_CERT");

  const rawCert = process.env.SAML_CERT.replace(/\\n/g, "\n"); // normalize line breaks

  const samlConfig: SamlConfig = {
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    callbackUrl: process.env.SAML_CALLBACK_URL,
    idpCert: rawCert,
    identifierFormat: null,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    disableRequestedAuthnContext: true,
    acceptedClockSkewMs: 1000 * 60 * 5,
    authnContext: [],
  };

  samlInstance = new SAML(samlConfig);
  return samlInstance;
};

export const getSamlLoginRedirect = async (): Promise<string> => {
  const saml = getSaml();

  // Latest node-saml API: RelayState, host, options
  const url = await saml.getAuthorizeUrlAsync("/", undefined, {});

  return url;
};
