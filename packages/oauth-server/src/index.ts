import express from 'express';
import { ClientAssertionType, ClientType, ErrorResponseType, GrantType, OAuthClient, resolveGrantType } from 'oauth-api';
import { OAuthService } from 'oauth-core';
import path from 'path';
// import bodyParser from 'body-parser';

const server = express();

const host = process.env.HOST || 'localhost';
const protocol = process.env.PROTOCOL || host === 'localhost' ? 'http://' : 'https://';
const port = process.env.PORT || '4000';

const serverHost = `${protocol}${host}:${port}`;
const oauthService = new OAuthService({
	host: serverHost,
	authorisationEndpoint: '/authorise'
});

server.use(express.json());
server.use(express.urlencoded({
	extended: true
}));
// server.use(bodyParser.urlencoded({
// 	extended: true
// }));

const clientRepository = new Map<string, OAuthClient>();
clientRepository.set('1', {
	id: '1',
	redirectUris: new Set([ 'http://localhost:3000' ]),
	supportedGrantTypes: new Set([ GrantType.CODE, GrantType.TOKEN ]),
	type: ClientType.CONFIDENTIAL,
	assertionType: ClientAssertionType.BASIC,
	secret: 'secret'
});

server.get('/authorise', (req, res) => {
	if (req.query.error) {
		res.send(`${req.query.error}${req.query.error_description ? ` - ${req.query.error_description}` : ''}`);
		return;
	}

	const responseType = req.query.response_type;
	if (!responseType) {
		res.statusCode = 400;
		const errorMsg = 'Authorisation request did not include response_type.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	if (typeof responseType !== 'string') {
		res.statusCode = 400;
		const errorMsg = 'Invalid response_type.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	const grantType = resolveGrantType(responseType);
	if (!grantType) {
		res.statusCode = 400;
		const errorMsg = 'Unsupported response_type.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.UNSUPPORTED_RESPONSE_TYPE);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	const clientId = req.query.client_id;
	let client: OAuthClient | undefined;
	if (typeof clientId === 'string') {
		client = clientRepository.get(clientId);
	}
	if (!client) {
		res.statusCode = 400;
		const errorMsg = 'Invalid client_id.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	if (!client.supportedGrantTypes.has(grantType)) {
		res.statusCode = 400;
		const errorMsg = 'Invalid unauthorized_client.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.UNAUTHORIZED_CLIENT);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	const redirectUri = req.query.redirect_uri;
	if (typeof redirectUri !== 'string') {
		res.statusCode = 400;
		const errorMsg = 'Invalid redirect_uri.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	if (client.redirectUris.size > 1 && !client.redirectUris.has(redirectUri)) {
		res.statusCode = 400;
		const errorMsg = 'Missing required redirect_uri.';
		const redirectParams = new URLSearchParams();
		redirectParams.append('error', ErrorResponseType.INVALID_REQUEST);
		redirectParams.append('error_description', errorMsg);
		res.redirect(`/authorise?${redirectParams.toString()}`);
		return;
	}

	// const scope = req.query.scope;


	// const state = req.query.state;


	res.sendFile(path.join(__dirname, 'login.html'));
});

server.post('/authorise', (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	const token = oauthService.authorise();
	
	console.log(req.body);
	res.send(req.body);
});

server.listen(port, () => {
	console.log(`Listening on port ${port}`);
});