declare module '@node-saml/node-saml' {
  export interface SamlConfig {
    entryPoint: string;
    issuer: string;
    callbackUrl: string;
    idpCert: string;
    identifierFormat: string | null;
    wantAssertionsSigned?: boolean;
    wantAuthnResponseSigned?: boolean;
    disableRequestedAuthnContext?: boolean;
    acceptedClockSkewMs?: number;
    authnContext?: string[];
  }

  export class SAML {
    constructor(config: SamlConfig);
    getAuthorizeUrlAsync(RelayState: string, host?: string, options?: any): Promise<string>;
  }
}
