import { GrantType } from 'oauth-api';

export interface UserCredentials {
	username: string;
	password: string;
	session: string;
}

export interface AuthorisationRequestParams {
	grantType: GrantType;
	redirectUri?: string;
}

export interface OAuthProvider {
	authorise(): Promise<void>
}