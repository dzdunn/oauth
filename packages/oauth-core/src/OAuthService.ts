import { OAuthProvider } from "oauth-spi";

export interface OAuthServiceConfig {
}

export class OAuthService implements OAuthProvider {
	


	constructor(private config: OAuthServiceConfig) {

	}

	
}