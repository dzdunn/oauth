import { OAuthProvider } from "oauth-spi";

export interface OAuthServiceConfig {
	host: string;
	authorisationEndpoint: string;
}

export class OAuthService implements OAuthProvider {
	
	private host: string;

	constructor(config: OAuthServiceConfig) {
		this.host = config.host;
	}

	authorise(): Promise<void> {
		throw new Error("Method not implemented.");
	}
	
}