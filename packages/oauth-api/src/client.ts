import { GrantType } from "./grant";

export enum ClientType {
	CONFIDENTIAL = 'confidential',
	PUBLIC = 'public'
}

export enum ClientAssertionType {
	BASIC,
	JWT_BEARER = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
}

export interface OAuthClient {
	/** 
	 * The client ID. 
	 */
	id: string;
	/** 
	 * The client type. 
	 */
	type: ClientType;
	/** 
	 * The allowed redirection URIs registered for the client. 
	 */
	redirectUris: Set<string>;
	/** 
	 * The grant types supported for the client. 
	 */
	supportedGrantTypes: Set<GrantType>;
	/** 
	 * The assertion type to authenticate confidential clients. 
	 */
	assertionType?: ClientAssertionType;
	/** 
	 * The client secret for a confidential client using basic authentication. 
	 */
	secret?: string;
	/**
	 * The scopes the client may request.
	 */
	scopes: Set<string>;
}
