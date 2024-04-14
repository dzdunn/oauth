import express, { Response } from 'express';
import session from 'express-session';
import { ClientAssertionType, ClientType, ErrorResponseType, GrantType, OAuthClient, resolveGrantType } from 'oauth-api';
import { UserRepository } from 'oauth-spi';
import path from 'path';
import qs from 'qs';
import { URLSearchParams } from 'url';
import { Endpoint } from './endpoints';

const server = express();

const host = process.env.HOST || 'localhost';
const protocol = process.env.PROTOCOL || host === 'localhost' ? 'http://' : 'https://';
const port = process.env.PORT || '4000';

const userRepository: UserRepository = {
	async authenticate() {
		return {
			result: true
		};
	}
};

server.use(express.json());
server.use(express.urlencoded({
	extended: true
}));
server.use(session({
	resave: true,
	secret: 'secret',
	saveUninitialized: false
}));

const clientRepository = new Map<string, OAuthClient>();
clientRepository.set('1', {
	id: '1',
	redirectUris: new Set([ 'http://localhost:3000/oidc/callback' ]),
	supportedGrantTypes: new Set([ GrantType.CODE, GrantType.TOKEN ]),
	type: ClientType.CONFIDENTIAL,
	assertionType: ClientAssertionType.BASIC,
	secret: 'secret',
	scopes: new Set([ 'dummyScope' ])
});

server.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'client.html'));
});

interface AuthRequestParams {
	state: string;
	clientId: string;
	grantType: GrantType;
	scope?: string;
	redirectUri: string;
}

const authRequestStore = new Map<string, AuthRequestParams>();

interface RedirectErrorParams {
	error: ErrorResponseType;
	description: string;

}

function redirectError(res: Response, endpoint: Endpoint, params: RedirectErrorParams) {
	const redirectParams = new URLSearchParams();
	redirectParams.append('error', params.error);
	redirectParams.append('error_description', params.description);
	res.redirect(`${endpoint}?${redirectParams.toString()}`);
}

server.get(Endpoint.AUTHORISATION, (req, res) => {
	if (req.query.error) {
		res.statusCode = 400;
		res.send(`${req.query.error}${req.query.error_description ? ` - ${req.query.error_description}` : ''}`);
		return;
	}

	const responseType = req.query.response_type;
	if (!responseType) {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Authorisation request did not include response_type.'
		});
		return;
	}

	if (typeof responseType !== 'string') {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Malformed response_type parameter.'
		});
		return;
	}

	const grantType = resolveGrantType(responseType);
	if (!grantType) {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.UNSUPPORTED_RESPONSE_TYPE,
			description: 'Unsupported response_type parameter.'
		});
		return;
	}

	const clientId = req.query.client_id;
	if (typeof clientId !== 'string') {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Malformed client_id parameter.'
		});
		return;
	}

	const client = clientRepository.get(clientId);
	if (!client) {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Invalid client_id parameter.'
		});
		return;
	}

	if (!client.supportedGrantTypes.has(grantType)) {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.UNAUTHORIZED_CLIENT,
			description: `Client is not authorized for grant type ${grantType}.`
		});
		return;
	}

	let redirectUri = req.query.redirect_uri;
	if (redirectUri && typeof redirectUri !== 'string') {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: `Client is not authorized for grant type ${grantType}.`
		});
		return;
	}

	if (redirectUri && client.redirectUris.size > 1 && !client.redirectUris.has(redirectUri)) {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Missing required redirect_uri parameter.'
		});
		return;
	} else {
		redirectUri = [ ...client.redirectUris ][0];
	}

	let scope: string | undefined;
	if (typeof req.query.scope === 'string') {
		scope = req.query.scope;
		const scopes = scope.split(' ');
		const invalidScopes = scopes.filter(s => !client.scopes.has(s));
		if (invalidScopes.length > 0) {
			redirectError(res, Endpoint.AUTHORISATION, {
				error: ErrorResponseType.INVALID_SCOPE,
				description: 'Invalid scope parameter.'
			});
			return;
		}
	}

	const state = req.query.state;
	if (!state || typeof state !== 'string') {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Missing required state parameter.'
		});
		return;
	}

	authRequestStore.set(state, {
		state,
		redirectUri,
		grantType,
		clientId,
		scope
	});
	res.redirect(`${Endpoint.LOGIN}?${qs.stringify(req.query)}`);
});

server.get(Endpoint.LOGIN, (req, res) => {
	res.sendFile(path.join(__dirname, 'login.html'));
});

server.post(Endpoint.AUTHORISATION, async (req, res) => {
	const state = req.query.state;
	if (typeof state !== 'string') {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Missing required state parameter.'
		});
		return;
	}

	const authRequestParams = authRequestStore.get(state);
	if (!authRequestParams) {
		redirectError(res, Endpoint.AUTHORISATION, {
			error: ErrorResponseType.INVALID_REQUEST,
			description: 'Invalid state parameter.'
		});
		return;
	}

	const username = req.body.username;
	const password = req.body.password;

	if (typeof username !== 'string' || typeof password !== 'string') {
		res.sendStatus(422);
		return;
	}

	const authenticationResult = await userRepository.authenticate({
		username,
		password
	});

	if (!authenticationResult.result) {
		res.sendStatus(401);
		return;
	}

	const code = 'dummy-code';

	res.redirect(`${authRequestParams.redirectUri}?${qs.stringify({
		...req.query,
		code
	})}`);


});

server.listen(port, () => {
	console.log(`Listening on ${protocol}${host}:${port}`);
});