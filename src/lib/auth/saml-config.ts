import saml2 from 'saml2-js';

// SAML Configuration Interface
export interface SamlConfig {
  entryPoint: string; // Azure AD SSO URL
  issuer: string; // Your application's entity ID
  callbackUrl: string; // ACS (Assertion Consumer Service) URL
  cert: string; // SAML certificate for verification
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
}

// Get SAML configuration from environment variables
export function getSamlConfig(): SamlConfig {
  const entryPoint = process.env.SAML_ENTRY_POINT;
  const issuer = process.env.SAML_ISSUER;
  const callbackUrl = process.env.SAML_CALLBACK_URL;
  const cert = process.env.SAML_CERT;

  if (!entryPoint || !issuer || !callbackUrl || !cert) {
    throw new Error(
      'Missing required SAML configuration. Please set SAML_ENTRY_POINT, SAML_ISSUER, SAML_CALLBACK_URL, and SAML_CERT environment variables.'
    );
  }

  return {
    entryPoint,
    issuer,
    callbackUrl,
    cert: cert.replace(/\\n/g, '\n'), // Handle newlines in certificate
    signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || 'sha256',
    digestAlgorithm: process.env.SAML_DIGEST_ALGORITHM || 'sha256',
  };
}

// Create SAML Service Provider (SP) options
export function getServiceProviderOptions(): saml2.ServiceProviderOptions {
  const config = getSamlConfig();

  return {
    entity_id: config.issuer,
    private_key: process.env.SAML_PRIVATE_KEY?.replace(/\\n/g, '\n') || '', // Optional: for signed requests
    certificate: config.cert,
    assert_endpoint: config.callbackUrl,
    allow_unencrypted_assertion: process.env.SAML_ALLOW_UNENCRYPTED !== 'false', // Allow unencrypted by default (Azure AD typically sends unencrypted)
    force_authn: process.env.SAML_FORCE_AUTHN === 'true',
    auth_context: {
      comparison: 'exact',
      class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'],
    },
    nameid_format: process.env.SAML_NAMEID_FORMAT || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    sign_get_request: process.env.SAML_SIGN_GET_REQUEST === 'true',
  };
}

// Create SAML Identity Provider (IdP) options
export function getIdentityProviderOptions(): saml2.IdentityProviderOptions {
  const config = getSamlConfig();

  return {
    sso_login_url: config.entryPoint,
    sso_logout_url: process.env.SAML_LOGOUT_URL || config.entryPoint.replace('/samlp', '/samlp/logout'),
    certificates: [config.cert],
    force_authn: process.env.SAML_FORCE_AUTHN === 'true',
    sign_get_request: process.env.SAML_SIGN_GET_REQUEST === 'true',
    allow_unencrypted_assertion: process.env.SAML_ALLOW_UNENCRYPTED !== 'false', // Allow unencrypted by default (Azure AD typically sends unencrypted)
  };
}

// Create SAML Service Provider instance
export function createServiceProvider(): saml2.ServiceProvider {
  return new saml2.ServiceProvider(getServiceProviderOptions());
}

// Create SAML Identity Provider instance
export function createIdentityProvider(): saml2.IdentityProvider {
  return new saml2.IdentityProvider(getIdentityProviderOptions());
}
