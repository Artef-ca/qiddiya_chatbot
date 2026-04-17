declare module 'saml2-js' {
  export interface ServiceProviderOptions {
    entity_id: string;
    private_key: string;
    certificate: string;
    assert_endpoint: string;
    force_authn?: boolean;
    auth_context?: {
      comparison?: string;
      class_refs?: string[];
    };
    nameid_format?: string;
    sign_get_request?: boolean;
    allow_unencrypted_assertion?: boolean;
  }

  export interface IdentityProviderOptions {
    sso_login_url: string;
    sso_logout_url?: string;
    certificates: string[];
    sign_get_request?: boolean;
    allow_unencrypted_assertion?: boolean;
    force_authn?: boolean;
  }

  export interface SamlAssertion {
    user?: {
      [key: string]: any;
      name_id?: string;
      nameID?: string;
    };
    session_index?: string;
  }

  export class ServiceProvider {
    constructor(options: ServiceProviderOptions);
    create_login_request_url(
      idp: IdentityProvider,
      options: any,
      callback: (err: Error | null, loginUrl: string, requestId: string) => void
    ): void;
    create_logout_request_url(
      idp: IdentityProvider,
      options: { name_id: string; session_index?: string },
      callback: (err: Error | null, logoutUrl: string) => void
    ): void;
    post_assert(
      idp: IdentityProvider,
      options: { request_body: any; allow_unencrypted_assertion?: boolean },
      callback: (err: Error | null, assertion: SamlAssertion) => void
    ): void;
  }

  export class IdentityProvider {
    constructor(options: IdentityProviderOptions);
  }
}
