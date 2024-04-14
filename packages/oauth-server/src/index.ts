import express from 'express';
import { ClientAssertionType, ClientType, ErrorResponseType, GrantType, OAuthClient, resolveGrantType } from 'oauth-api';
import { UserRepository } from 'oauth-spi';
import path from 'path';
import qs from 'qs';
import { URLSearchParams } from 'url';
import { Endpoints } from './endpoints';

const server = express();

// const host = process.env.HOST || 'localhost';
// const protocol = process.env.PROTOCOL || host === 'localhost' ? 'http://' : 'https://';
const port = process.env.PORT || '4000';

const userRepository: UserRepository = {
	async authenticate() {
		return {
			result: false
		};
	}
};

server.use(express.json());
server.use(express.urlencoded({
	extended: true
}));

const clientRepository = new Map<string, OAuthClient>();
clientRepository.set('1', {
	id: '1',
	redirectUris: new Set([ 'http://localhost:3000' ]),
	supportedGrantTypes: new Set([ GrantType.CODE, GrantType.TOKEN ]),
	type: ClientType.CONFIDENTIAL,
	assertionType: ClientAssertionType.BASIC,
	secret: 'secret',
	scopes: new Set([ 'dummyScope' ])
});

server.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'client.html'));
});

server.get(Endpoints.AUTHORISATION, (req, res) => {
	if (req.query.error) {
		res.statusCode = 400;
		res.send(`${req.query.error}${req.query.error_description ? ` - ${req.query.error_description}` : ''}`);
		return;
	}

	const responseType = req.query.response_type;
	if (!responseType) {
		const errorMsg = 'Authorisation request did not include response_type.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	if (typeof responseType !== 'string') {
		const errorMsg = 'Malformed response_type parameter.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	const grantType = resolveGrantType(responseType);
	if (!grantType) {
		const errorMsg = 'Unsupported response_type parameter.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.UNSUPPORTED_RESPONSE_TYPE);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	const clientId = req.query.client_id;
	let client: OAuthClient | undefined;
	if (typeof clientId === 'string') {
		client = clientRepository.get(clientId);
	}
	if (!client) {
		const errorMsg = 'Invalid client_id parameter.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	if (!client.supportedGrantTypes.has(grantType)) {
		const errorMsg = `Client is not authorized for grant type ${grantType}.`;
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.UNAUTHORIZED_CLIENT);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	const redirectUri = req.query.redirect_uri;
	if (redirectUri && typeof redirectUri !== 'string') {
		const errorMsg = 'Invalid redirect_uri parameter.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	if (redirectUri && client.redirectUris.size > 1 && !client.redirectUris.has(redirectUri)) {
		const errorMsg = 'Missing required redirect_uri parameter.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	const scope = req.query.scope;
	if (typeof scope === 'string') {
		const scopes = scope.split(' ');
		const invalidScopes = scopes.filter(s => !client.scopes.has(s));
		if (invalidScopes.length > 0) {
			const errorMsg = 'Invalid scope parameter.';
			const redirectParams = new URLSearchParams();
			redirectParams.append('error', ErrorResponseType.INVALID_SCOPE);
			redirectParams.append('error_description', errorMsg);
			res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
			return;
		}
	}

	const state = req.query.state;
	if (!state) {
		const errorMsg = 'Missing required state parameter.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`${Endpoints.AUTHORISATION}?${redirectParams.toString()}`);
		return;
	}

	res.redirect(`${Endpoints.LOGIN}?${qs.stringify(req.query)}`);
});

server.get(Endpoints.LOGIN, (req, res) => {
	res.sendFile(path.join(__dirname, 'login.html'));
});

server.post(Endpoints.AUTHORISATION, async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	const authenticationResult = await userRepository.authenticate({
		username,
		password
	});

	if (!authenticationResult.result) {
		res.send(401);
		return;
	}
});

server.listen(port, () => {
	console.log(`Listening on port ${port}`);
});